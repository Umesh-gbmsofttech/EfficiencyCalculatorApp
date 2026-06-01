const admin = require("firebase-admin");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

admin.initializeApp();

exports.deleteWorkerCompletely = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const roleDoc = await admin.firestore().collection("roles").doc(callerUid).get();
  const callerRole = roleDoc.exists ? roleDoc.data()?.role : null;
  if (callerRole !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can delete users.");
  }

  const targetUid = String(request.data?.uid || "").trim();
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "Target uid is required.");
  }
  if (targetUid === callerUid) {
    throw new HttpsError("failed-precondition", "Admin cannot delete own account.");
  }

  const db = admin.firestore();
  const batch = db.batch();
  const [reportsSnap, legacyLogsSnap, attendanceSnap] = await Promise.all([
    db.collection("reports").where("userId", "==", targetUid).get(),
    db.collection("logs").where("userId", "==", targetUid).get(),
    db.collection("attendance").where("userId", "==", targetUid).get()
  ]);
  reportsSnap.docs.forEach((d) => batch.delete(d.ref));
  legacyLogsSnap.docs.forEach((d) => batch.delete(d.ref));
  attendanceSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(db.collection("users").doc(targetUid));
  batch.delete(db.collection("roles").doc(targetUid));
  batch.delete(db.collection("salaryConfigs").doc(targetUid));
  await batch.commit();

  try {
    await admin.auth().deleteUser(targetUid);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }

  return { ok: true };
});

const requireAdmin = async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Authentication required.");
  const roleDoc = await admin.firestore().collection("roles").doc(callerUid).get();
  if (roleDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can run this operation.");
  }
  return callerUid;
};

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const cycleTimeFromLegacy = (data) => {
  const cycleTime = asNumber(data.cycleTimeMinutes ?? data.cycleTime, 0);
  if (cycleTime > 0) return cycleTime;
  const expectedPerHour = asNumber(data.expectedOutputPerHour, 0);
  return expectedPerHour > 0 ? Number((60 / expectedPerHour).toFixed(4)) : 0;
};

const calculateReportMetrics = (data) => {
  const start = data.jobStartTime?.toDate?.();
  const end = data.jobEndTime?.toDate?.();
  const runtimeFromTimestamps = start && end ? Math.max(0, (end.getTime() - start.getTime()) / 60000) : null;
  const runtimeMinutes = asNumber(data.runtimeMinutes, runtimeFromTimestamps ?? Math.max(0, (asNumber(data.workingHours) - asNumber(data.downtime)) * 60));
  const cycleTimeMinutes = cycleTimeFromLegacy(data);
  const expectedProduction = cycleTimeMinutes > 0 ? Number((runtimeMinutes / cycleTimeMinutes).toFixed(2)) : asNumber(data.expectedOutput);
  const actualProduction = asNumber(data.actualProduction ?? data.actualQty ?? data.outputProduced);
  const efficiency = expectedProduction > 0 ? Number(((actualProduction / expectedProduction) * 100).toFixed(2)) : 0;
  return {
    runtimeMinutes,
    downtimeMinutes: asNumber(data.downtimeMinutes, asNumber(data.downtime) * 60),
    cycleTimeMinutes,
    expectedOutput: expectedProduction,
    expectedProduction,
    actualProduction,
    efficiency
  };
};

const monthKeyFromDate = (date) => `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, "0")}`;
const monthRange = (year, monthNumber) => ({
  from: admin.firestore.Timestamp.fromDate(new Date(year, monthNumber - 1, 1, 0, 0, 0, 0)),
  to: admin.firestore.Timestamp.fromDate(new Date(year, monthNumber, 0, 23, 59, 59, 999))
});
const yearRange = (year) => ({
  from: admin.firestore.Timestamp.fromDate(new Date(year, 0, 1, 0, 0, 0, 0)),
  to: admin.firestore.Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59, 999))
});

const periodFromReport = (report = {}) => {
  const date = report.timestamp?.toDate?.() || new Date();
  return {
    year: Number(report.year || date.getFullYear()),
    month: String(report.month || monthKeyFromDate(date)),
    monthNumber: Number(String(report.month || monthKeyFromDate(date)).split("_")[1] || date.getMonth() + 1)
  };
};

const aggregateReportDocs = (docs, dimensionField) => {
  const machines = new Set();
  const operators = new Set();
  const totals = docs.reduce(
    (acc, docSnap) => {
      const data = docSnap.data() || {};
      const metrics = calculateReportMetrics(data);
      if (data.machineId) machines.add(data.machineId);
      if (data.userId) operators.add(data.userId);
      acc.reportCount += 1;
      acc.totalRuntimeMinutes += metrics.runtimeMinutes;
      acc.totalDowntimeMinutes += metrics.downtimeMinutes;
      acc.expectedProduction += metrics.expectedProduction;
      acc.actualProduction += metrics.actualProduction;
      acc.totalProduction += metrics.actualProduction;
      return acc;
    },
    {
      reportCount: 0,
      totalRuntimeMinutes: 0,
      totalDowntimeMinutes: 0,
      expectedProduction: 0,
      actualProduction: 0,
      totalProduction: 0
    }
  );
  totals.efficiency = totals.expectedProduction > 0 ? Number(((totals.actualProduction / totals.expectedProduction) * 100).toFixed(2)) : 0;
  if (dimensionField === "operatorId") totals.machineCount = machines.size;
  if (dimensionField === "machineId") totals.operatorCount = operators.size;
  return totals;
};

const recomputeOperatorStats = async ({ operatorId, year, month, monthNumber }) => {
  if (!operatorId || !year || !monthNumber) return;
  const db = admin.firestore();
  const monthly = monthRange(year, monthNumber);
  const yearly = yearRange(year);
  const [monthSnap, yearSnap] = await Promise.all([
    db.collection("reports").where("userId", "==", operatorId).where("timestamp", ">=", monthly.from).where("timestamp", "<=", monthly.to).get(),
    db.collection("reports").where("userId", "==", operatorId).where("timestamp", ">=", yearly.from).where("timestamp", "<=", yearly.to).get()
  ]);
  const monthStats = aggregateReportDocs(monthSnap.docs, "operatorId");
  const yearStats = aggregateReportDocs(yearSnap.docs, "operatorId");
  await Promise.all([
    db.collection("operatorMonthlyStats").doc(`${operatorId}_${month}`).set({
      operatorId,
      month,
      year,
      ...monthStats,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true }),
    db.collection("operatorYearlyStats").doc(`${operatorId}_${year}`).set({
      operatorId,
      year,
      ...yearStats,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
  ]);
};

const recomputeMachineStats = async ({ machineId, year, month, monthNumber }) => {
  if (!machineId || !year || !monthNumber) return;
  const db = admin.firestore();
  const monthly = monthRange(year, monthNumber);
  const yearly = yearRange(year);
  const [monthSnap, yearSnap] = await Promise.all([
    db.collection("reports").where("machineId", "==", machineId).where("timestamp", ">=", monthly.from).where("timestamp", "<=", monthly.to).get(),
    db.collection("reports").where("machineId", "==", machineId).where("timestamp", ">=", yearly.from).where("timestamp", "<=", yearly.to).get()
  ]);
  const monthStats = aggregateReportDocs(monthSnap.docs, "machineId");
  const yearStats = aggregateReportDocs(yearSnap.docs, "machineId");
  await Promise.all([
    db.collection("machineMonthlyStats").doc(`${machineId}_${month}`).set({
      machineId,
      month,
      year,
      runtimeMinutes: monthStats.totalRuntimeMinutes,
      downtimeMinutes: monthStats.totalDowntimeMinutes,
      ...monthStats,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true }),
    db.collection("machineYearlyStats").doc(`${machineId}_${year}`).set({
      machineId,
      year,
      runtimeMinutes: yearStats.totalRuntimeMinutes,
      downtimeMinutes: yearStats.totalDowntimeMinutes,
      ...yearStats,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
  ]);
};

const normalizeReportForStats = (report) => {
  const period = periodFromReport(report);
  return {
    operatorId: report.userId,
    machineId: report.machineId,
    ...period
  };
};

const uniqueAffectedStats = (before, after) => {
  const affected = new Map();
  [before, after].filter(Boolean).forEach((report) => {
    const normalized = normalizeReportForStats(report);
    if (normalized.operatorId) affected.set(`operator:${normalized.operatorId}:${normalized.year}:${normalized.month}`, { type: "operator", ...normalized });
    if (normalized.machineId) affected.set(`machine:${normalized.machineId}:${normalized.year}:${normalized.month}`, { type: "machine", ...normalized });
  });
  return Array.from(affected.values());
};

exports.migrateLogsToReports = onCall(async (request) => {
  const callerUid = await requireAdmin(request);
  const db = admin.firestore();
  const limit = Math.min(asNumber(request.data?.limit, 250), 500);
  const snap = await db.collection("logs").orderBy("timestamp", "desc").limit(limit).get();
  let migrated = 0;
  let skipped = 0;
  const batch = db.batch();

  snap.docs.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const timestamp = data.timestamp || admin.firestore.Timestamp.now();
    const date = timestamp.toDate?.() || new Date();
    const month = data.month || monthKeyFromDate(date);
    const year = asNumber(data.year, date.getFullYear());
    const metrics = calculateReportMetrics(data);
    if (!data.userId || !data.machineId || metrics.cycleTimeMinutes <= 0) {
      skipped += 1;
      return;
    }
    const targetRef = db.collection("reports").doc(docSnap.id);
    batch.set(
      targetRef,
      {
        ...data,
        ...metrics,
        schemaVersion: 2,
        recordType: "productionReport",
        jobId: String(data.jobId || ""),
        jobStartTime: data.jobStartTime || null,
        jobEndTime: data.jobEndTime || null,
        shiftDate: String(data.shiftDate || ""),
        month,
        year,
        timestamp,
        migratedFrom: "logs",
        migratedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    migrated += 1;
  });

  if (migrated) await batch.commit();
  const report = {
    ok: true,
    migrated,
    skipped,
    scanned: snap.size,
    executedBy: callerUid,
    executedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  await db.collection("settings").doc("lastLogsToReportsMigration").set(report, { merge: true });
  return { ok: true, migrated, skipped, scanned: snap.size };
});

exports.backfillReportAggregates = onCall(async (request) => {
  await requireAdmin(request);
  const db = admin.firestore();
  const limit = Math.min(asNumber(request.data?.limit, 1000), 5000);
  const snap = await db.collection("reports").orderBy("timestamp", "desc").limit(limit).get();
  const affected = new Map();
  snap.docs.forEach((docSnap) => {
    uniqueAffectedStats(null, docSnap.data()).forEach((item) => {
      affected.set(`${item.type}:${item.operatorId || item.machineId}:${item.year}:${item.month}`, item);
    });
  });
  for (const item of affected.values()) {
    if (item.type === "operator") await recomputeOperatorStats(item);
    if (item.type === "machine") await recomputeMachineStats(item);
  }
  return { ok: true, reportsScanned: snap.size, aggregatesRebuilt: affected.size };
});

exports.onReportWrittenUpdateAggregates = onDocumentWritten("reports/{reportId}", async (event) => {
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const after = event.data?.after?.exists ? event.data.after.data() : null;
  const affected = uniqueAffectedStats(before, after);
  await Promise.all(
    affected.map((item) => {
      if (item.type === "operator") return recomputeOperatorStats(item);
      if (item.type === "machine") return recomputeMachineStats(item);
      return Promise.resolve();
    })
  );
});

exports.getReportSummary = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Authentication required.");

  const roleDoc = await admin.firestore().collection("roles").doc(callerUid).get();
  const isAdmin = roleDoc.data()?.role === "admin";
  const userId = String(request.data?.userId || "").trim();
  const machineId = String(request.data?.machineId || "").trim();
  const from = request.data?.from ? admin.firestore.Timestamp.fromDate(new Date(request.data.from)) : null;
  const to = request.data?.to ? admin.firestore.Timestamp.fromDate(new Date(request.data.to)) : null;

  if (userId && userId !== callerUid && !isAdmin) {
    throw new HttpsError("permission-denied", "Operators can only summarize their own reports.");
  }

  let ref = admin.firestore().collection("reports");
  if (userId) ref = ref.where("userId", "==", userId);
  if (machineId) ref = ref.where("machineId", "==", machineId);
  if (from) ref = ref.where("timestamp", ">=", from);
  if (to) ref = ref.where("timestamp", "<=", to);

  const snap = await ref.limit(1000).get();
  const summary = snap.docs.reduce(
    (acc, item) => {
      const data = item.data();
      const metrics = calculateReportMetrics(data);
      acc.totalJobs += 1;
      acc.runtimeMinutes += metrics.runtimeMinutes;
      acc.downtimeMinutes += metrics.downtimeMinutes;
      acc.production += metrics.actualProduction;
      acc.expectedProduction += metrics.expectedProduction;
      return acc;
    },
    { totalJobs: 0, runtimeMinutes: 0, downtimeMinutes: 0, production: 0, expectedProduction: 0 }
  );
  summary.efficiency = summary.expectedProduction > 0 ? Number(((summary.production / summary.expectedProduction) * 100).toFixed(2)) : 0;
  summary.utilization = summary.runtimeMinutes + summary.downtimeMinutes > 0
    ? Number(((summary.runtimeMinutes / (summary.runtimeMinutes + summary.downtimeMinutes)) * 100).toFixed(2))
    : 0;
  return summary;
});

exports.repairMissingUsers = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Authentication required.");
  const roleDoc = await admin.firestore().collection("roles").doc(callerUid).get();
  const callerRole = roleDoc.exists ? roleDoc.data()?.role : null;
  if (callerRole !== "admin") throw new HttpsError("permission-denied", "Only admins can repair users.");

  const repaired = [];
  let nextPageToken;
  do {
    const batchUsers = await admin.auth().listUsers(1000, nextPageToken);
    nextPageToken = batchUsers.pageToken;
    for (const authUser of batchUsers.users) {
      const uid = authUser.uid;
      const email = authUser.email || "";
      const [userRef, roleRef] = [
        admin.firestore().collection("users").doc(uid),
        admin.firestore().collection("roles").doc(uid)
      ];
      const [userSnap, roleSnap] = await Promise.all([userRef.get(), roleRef.get()]);
      const role = (roleSnap.exists ? roleSnap.data()?.role : null) || "operator";
      if (!userSnap.exists) {
        await userRef.set({
          uid,
          email,
          fullName: authUser.displayName || "Worker",
          phoneNumber: authUser.phoneNumber || "",
          role,
          isActive: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      if (!roleSnap.exists) {
        await roleRef.set({
          uid,
          role,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      if (!userSnap.exists || !roleSnap.exists) repaired.push(uid);
    }
  } while (nextPageToken);
  return { repaired };
});
