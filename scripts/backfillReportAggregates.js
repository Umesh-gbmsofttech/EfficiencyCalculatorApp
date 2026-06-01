const { admin, db, calculateMetrics, monthKeyFromDate } = require("./firebaseAdmin");

const pageSize = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || 5000);

const monthRange = (year, monthNumber) => ({
  from: admin.firestore.Timestamp.fromDate(new Date(year, monthNumber - 1, 1, 0, 0, 0, 0)),
  to: admin.firestore.Timestamp.fromDate(new Date(year, monthNumber, 0, 23, 59, 59, 999))
});

const yearRange = (year) => ({
  from: admin.firestore.Timestamp.fromDate(new Date(year, 0, 1, 0, 0, 0, 0)),
  to: admin.firestore.Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59, 999))
});

const aggregate = (docs, dimension) => {
  const machines = new Set();
  const operators = new Set();
  const totals = docs.reduce(
    (acc, docSnap) => {
      const data = docSnap.data() || {};
      const metrics = calculateMetrics(data);
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
    { reportCount: 0, totalRuntimeMinutes: 0, totalDowntimeMinutes: 0, expectedProduction: 0, actualProduction: 0, totalProduction: 0 }
  );
  totals.efficiency = totals.expectedProduction > 0 ? Number(((totals.actualProduction / totals.expectedProduction) * 100).toFixed(2)) : 0;
  if (dimension === "operator") totals.machineCount = machines.size;
  if (dimension === "machine") totals.operatorCount = operators.size;
  return totals;
};

const periodFromReport = (data) => {
  const date = data.timestamp?.toDate?.() || new Date();
  const month = String(data.month || monthKeyFromDate(date));
  return {
    month,
    year: Number(data.year || date.getFullYear()),
    monthNumber: Number(month.split("_")[1] || date.getMonth() + 1)
  };
};

const recomputeOperator = async ({ operatorId, month, year, monthNumber }) => {
  const monthly = monthRange(year, monthNumber);
  const yearly = yearRange(year);
  const [monthSnap, yearSnap] = await Promise.all([
    db.collection("reports").where("userId", "==", operatorId).where("timestamp", ">=", monthly.from).where("timestamp", "<=", monthly.to).get(),
    db.collection("reports").where("userId", "==", operatorId).where("timestamp", ">=", yearly.from).where("timestamp", "<=", yearly.to).get()
  ]);
  await Promise.all([
    db.collection("operatorMonthlyStats").doc(`${operatorId}_${month}`).set({ operatorId, month, year, ...aggregate(monthSnap.docs, "operator"), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }),
    db.collection("operatorYearlyStats").doc(`${operatorId}_${year}`).set({ operatorId, year, ...aggregate(yearSnap.docs, "operator"), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
  ]);
};

const recomputeMachine = async ({ machineId, month, year, monthNumber }) => {
  const monthly = monthRange(year, monthNumber);
  const yearly = yearRange(year);
  const [monthSnap, yearSnap] = await Promise.all([
    db.collection("reports").where("machineId", "==", machineId).where("timestamp", ">=", monthly.from).where("timestamp", "<=", monthly.to).get(),
    db.collection("reports").where("machineId", "==", machineId).where("timestamp", ">=", yearly.from).where("timestamp", "<=", yearly.to).get()
  ]);
  const monthStats = aggregate(monthSnap.docs, "machine");
  const yearStats = aggregate(yearSnap.docs, "machine");
  await Promise.all([
    db.collection("machineMonthlyStats").doc(`${machineId}_${month}`).set({ machineId, month, year, runtimeMinutes: monthStats.totalRuntimeMinutes, downtimeMinutes: monthStats.totalDowntimeMinutes, ...monthStats, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }),
    db.collection("machineYearlyStats").doc(`${machineId}_${year}`).set({ machineId, year, runtimeMinutes: yearStats.totalRuntimeMinutes, downtimeMinutes: yearStats.totalDowntimeMinutes, ...yearStats, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
  ]);
};

const run = async () => {
  const snap = await db.collection("reports").orderBy("timestamp", "desc").limit(pageSize).get();
  const affected = new Map();
  snap.docs.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const period = periodFromReport(data);
    if (data.userId) affected.set(`operator:${data.userId}:${period.month}`, { type: "operator", operatorId: data.userId, ...period });
    if (data.machineId) affected.set(`machine:${data.machineId}:${period.month}`, { type: "machine", machineId: data.machineId, ...period });
  });

  for (const item of affected.values()) {
    if (item.type === "operator") await recomputeOperator(item);
    if (item.type === "machine") await recomputeMachine(item);
  }

  console.log(JSON.stringify({ ok: true, reportsScanned: snap.size, aggregatesRebuilt: affected.size }, null, 2));
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.app().delete();
  });
