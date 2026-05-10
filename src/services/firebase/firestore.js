import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
  setDoc
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "./config";
import { COLLECTIONS } from "../../constants/collections";
import { calculateEfficiency, calculateExpectedOutput } from "../../utils/calculations";
import { toDateRange } from "../../utils/formatters";
import { getShiftDate } from "../../utils/shift";
import { getAttendanceForUserShift } from "./attendance";
import { getShiftType } from "../../utils/shift";
import { hasAccess } from "../../utils/access";
import { logInfo } from "../../utils/logger";
import { createAuditLog } from "./auditService";

export const normalizeImageUrl = (url = "") => {
  const trimmed = String(url).trim();
  if (!trimmed) return "";
  if (trimmed.includes("drive.google.com/file/d/")) {
    const id = trimmed.split("/d/")[1]?.split("/")[0];
    if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
  }
  return trimmed;
};

export const getUserProfile = async (uid) => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
};

export const getUserRole = async (uid) => {
  const roleRef = doc(db, COLLECTIONS.ROLES, uid);
  const snap = await getDoc(roleRef);
  return snap.exists() ? snap.data() : null;
};

export const getPartsMaster = async () => {
  const normalized = (snap) =>
    snap.docs
      .map((d) => ({ id: d.id, ...d.data(), active: d.data().active ?? d.data().isActive ?? true }))
      .filter((item) => item.active !== false && item.isActive !== false);

  const [partsResult, legacyResult] = await Promise.allSettled([
    getDocs(query(collection(db, COLLECTIONS.PARTS), orderBy("partName", "asc"))),
    getDocs(query(collection(db, COLLECTIONS.PARTS_MASTER), orderBy("partName", "asc")))
  ]);

  const merged = new Map();
  if (partsResult.status === "fulfilled") {
    normalized(partsResult.value).forEach((part) => merged.set(part.id, part));
  }
  if (legacyResult.status === "fulfilled") {
    normalized(legacyResult.value).forEach((part) => {
      if (!merged.has(part.id)) merged.set(part.id, part);
    });
  }
  return Array.from(merged.values()).sort((a, b) => String(a.partName || "").localeCompare(String(b.partName || "")));
};

export const createPartMaster = async (data) => {
  const payload = {
    partName: String(data.partName || "").trim(),
    partNumber: String(data.partNumber || "").trim(),
    operationCode: String(data.operationCode || "").trim(),
    setupNumber: String(data.setupNumber || "").trim(),
    cycleTime: Number(data.cycleTime || 0),
    drawingNumber: String(data.drawingNumber || "").trim(),
    customerName: String(data.customerName || "").trim(),
    machineCompatibility: Array.isArray(data.machineCompatibility) ? data.machineCompatibility : [],
    machineId: data.machineId || "",
    isActive: data.isActive !== false,
    active: data.active !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const ref = await addDoc(collection(db, COLLECTIONS.PARTS), payload);
  if (data.actorUid) {
    await createAuditLog({ action: "create", entityType: "part", entityId: ref.id, changedBy: data.actorUid, after: payload });
  }
  return ref.id;
};

export const updatePartMaster = async (id, data) => {
  const ref = doc(db, COLLECTIONS.PARTS, id);
  const beforeSnap = await getDoc(ref);
  const payload = {
    partName: String(data.partName || "").trim(),
    partNumber: String(data.partNumber || "").trim(),
    operationCode: String(data.operationCode || "").trim(),
    setupNumber: String(data.setupNumber || "").trim(),
    cycleTime: Number(data.cycleTime || 0),
    drawingNumber: String(data.drawingNumber || "").trim(),
    customerName: String(data.customerName || "").trim(),
    machineCompatibility: Array.isArray(data.machineCompatibility) ? data.machineCompatibility : [],
    machineId: data.machineId || "",
    isActive: data.isActive !== false,
    active: data.active !== false,
    updatedAt: serverTimestamp()
  };
  await updateDoc(ref, payload);
  if (data.actorUid) {
    await createAuditLog({ action: "update", entityType: "part", entityId: id, changedBy: data.actorUid, before: beforeSnap.data() || null, after: payload });
  }
};

export const removePartMaster = async (id, { force = false, actorUid = "" } = {}) => {
  const [machineSnap, jobSnap, partSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.MACHINES), where("partIds", "array-contains", id), limit(5))),
    getDocs(query(collection(db, COLLECTIONS.JOBS), where("linkedPartId", "==", id), limit(5))),
    getDoc(doc(db, COLLECTIONS.PARTS, id))
  ]);
  const hasDependencies = machineSnap.size > 0 || jobSnap.size > 0;
  if (hasDependencies && !force) {
    const err = new Error("Part is currently assigned to machines/jobs.");
    err.code = "failed-precondition";
    throw err;
  }
  await deleteDoc(doc(db, COLLECTIONS.PARTS, id));
  if (actorUid) {
    await createAuditLog({ action: "delete", entityType: "part", entityId: id, changedBy: actorUid, before: partSnap.data() || null, after: null });
  }
};

export const getWorkers = async ({ role, uid } = {}) => {
  const normalizedRole = role === "worker" ? "operator" : role;
  const safeRole = normalizedRole || "admin";
  logInfo("Workers", "role", safeRole);
  if (hasAccess(safeRole, ["admin"])) {
    logInfo("Workers", "query path", "users (all)");
    const q = query(collection(db, COLLECTIONS.USERS), where("isActive", "==", true));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
  }

  if (!uid) return [];
  logInfo("Workers", "query path", `users (self:${uid})`);
  const q = query(collection(db, COLLECTIONS.USERS), where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((worker) => worker.isActive !== false);
};

export const updateWorker = async (id, data) => {
  const batch = writeBatch(db);
  batch.update(doc(db, COLLECTIONS.USERS, id), {
    ...data,
    updatedAt: serverTimestamp()
  });

  if (data.role) {
    batch.set(
      doc(db, COLLECTIONS.ROLES, id),
      {
        uid: id,
        role: data.role,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  await batch.commit();
};

export const deleteWorker = async (id, { actorUid, actorRole } = {}) => {
  let resolvedRole = actorRole;
  if (!resolvedRole && actorUid) {
    const roleDoc = await getUserRole(actorUid);
    resolvedRole = roleDoc?.role || null;
  }
  if (!hasAccess(resolvedRole, ["admin"])) {
    const error = new Error("Only admins can delete workers.");
    error.code = "permission-denied";
    throw error;
  }

  try {
    const functions = getFunctions();
    const callable = httpsCallable(functions, "deleteWorkerCompletely");
    await callable({ uid: id });
  } catch (error) {
    const code = String(error?.code || "");
    const shouldFallback = code.includes("not-found") || code.includes("unavailable") || code.includes("internal");
    if (!shouldFallback) throw error;
    const batch = writeBatch(db);
    batch.delete(doc(db, COLLECTIONS.USERS, id));
    batch.delete(doc(db, COLLECTIONS.ROLES, id));
    await batch.commit();
  }
};

export const repairMissingUsers = async () => {
  const functions = getFunctions();
  const callable = httpsCallable(functions, "repairMissingUsers");
  const response = await callable({});
  return response?.data || { repaired: [] };
};

export const getMachines = async () => {
  const q = query(collection(db, COLLECTIONS.MACHINES), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const partIds = Array.isArray(data.partIds)
      ? data.partIds
      : data.partId
        ? [data.partId]
        : [];
    const jobIds = Array.isArray(data.jobIds) ? data.jobIds : data.jobId ? [data.jobId] : [];
    return {
      id: d.id,
      ...data,
      name: data.name || data.machineName || "",
      code: data.code || data.machineCode || "",
      machineName: data.machineName || data.name || "",
      machineCode: data.machineCode || data.code || "",
      active: data.active !== false,
      schemaVersion: Number(data.schemaVersion || 1),
      partIds,
      jobIds
    };
  });
};

export const createMachine = async (data) => {
  const partIds = Array.isArray(data.partIds)
    ? data.partIds.filter(Boolean)
    : data.partId
      ? [data.partId]
      : [];
  const payload = {
    ...data,
    machineName: String(data.name || data.machineName || "").trim(),
    machineCode: String(data.code || data.machineCode || "").trim(),
    partIds,
    partId: partIds[0] || "",
    jobIds: Array.isArray(data.jobIds) ? data.jobIds.filter(Boolean) : [],
    active: data.active !== false,
    schemaVersion: 3,
    imageUrl: normalizeImageUrl(data.imageUrl),
    expectedOutputPerHour: Number(data.expectedOutputPerHour),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const ref = await addDoc(collection(db, COLLECTIONS.MACHINES), payload);
  if (data.actorUid) {
    await createAuditLog({ action: "create", entityType: "machine", entityId: ref.id, changedBy: data.actorUid, after: payload });
  }
};

export const addMachine = async (data) => {
  await createMachine(data);
};

export const editMachine = async (id, data) => {
  const partIds = Array.isArray(data.partIds)
    ? data.partIds.filter(Boolean)
    : data.partId
      ? [data.partId]
      : [];
  const ref = doc(db, COLLECTIONS.MACHINES, id);
  const beforeSnap = await getDoc(ref);
  const jobIds = Array.isArray(data.jobIds) ? data.jobIds.filter(Boolean) : [];
  const payload = {
    ...data,
    machineName: String(data.name || data.machineName || "").trim(),
    machineCode: String(data.code || data.machineCode || "").trim(),
    partIds,
    partId: partIds[0] || "",
    jobIds,
    active: data.active !== false,
    schemaVersion: 3,
    imageUrl: normalizeImageUrl(data.imageUrl),
    expectedOutputPerHour: Number(data.expectedOutputPerHour),
    updatedAt: serverTimestamp()
  };
  await updateDoc(ref, payload);
  if (data.actorUid) {
    const before = beforeSnap.data() || {};
    const prevParts = Array.isArray(before.partIds) ? before.partIds : [];
    const prevJobs = Array.isArray(before.jobIds) ? before.jobIds : [];
    const addedParts = partIds.filter((idItem) => !prevParts.includes(idItem));
    const removedParts = prevParts.filter((idItem) => !partIds.includes(idItem));
    const addedJobs = jobIds.filter((idItem) => !prevJobs.includes(idItem));
    const removedJobs = prevJobs.filter((idItem) => !jobIds.includes(idItem));
    await createAuditLog({ action: "update", entityType: "machine", entityId: id, changedBy: data.actorUid, before: beforeSnap.data() || null, after: payload });
    if (addedParts.length || removedParts.length || addedJobs.length || removedJobs.length) {
      await createAuditLog({
        action: "mapping-change",
        entityType: "machine",
        entityId: id,
        changedBy: data.actorUid,
        before: { partIds: prevParts, jobIds: prevJobs },
        after: { partIds, jobIds, addedParts, removedParts, addedJobs, removedJobs }
      });
    }
  }
};

export const removeMachine = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.MACHINES, id));
};

export const createEfficiencyLog = async ({
  machine,
  worker,
  actorRole,
  part,
  job,
  workingHours,
  outputProduced,
  downtime,
  partName = "",
  operationCode = "",
  cycleTime = 0,
  plannedQty = 0,
  actualQty = null,
  rejectedQty = 0,
  breakdownReason = ""
}) => {
  const normalizedRole = actorRole === "worker" ? "operator" : actorRole;
  if (normalizedRole !== "operator" && normalizedRole !== "admin") {
    const roleErr = new Error("Only operators can create production logs.");
    roleErr.code = "permission-denied";
    throw roleErr;
  }
  if (!worker?.uid) {
    const err = new Error("Invalid log payload: userId is required.");
    err.code = "invalid-argument";
    throw err;
  }
  const expectedOutput = calculateExpectedOutput(machine.expectedOutputPerHour, workingHours, downtime);
  const efficiency = calculateEfficiency(outputProduced, expectedOutput);

  const timestamp = Timestamp.now();
  const shiftDate = getShiftDate(timestamp);
  const shiftType = getShiftType(timestamp);
  const attendance = await getAttendanceForUserShift({ userId: worker.uid, shiftDate });
  if (!attendance) {
    const err = new Error("Attendance required before submitting production logs.");
    err.code = "failed-precondition";
    throw err;
  }
  const actual = actualQty === null ? Number(outputProduced) : Number(actualQty);
  await addDoc(collection(db, COLLECTIONS.LOGS), {
    machineId: machine.id,
    machineName: machine.name,
    machineCode: machine.code || "",
    machineImageUrl: normalizeImageUrl(machine.imageUrl),
    workerId: worker.uid,
    userId: worker.uid,
    workerName: worker.fullName,
    workingHours: Number(workingHours),
    outputProduced: Number(outputProduced),
    actualQty: actual,
    plannedQty: Number(plannedQty || 0),
    rejectedQty: Number(rejectedQty || 0),
    partId: part?.id || "",
    jobId: job?.id || "",
    jobName: String(job?.jobName || "").trim(),
    jobCode: String(job?.jobCode || "").trim(),
    partName: String(partName || "").trim(),
    operationCode: String(operationCode || "").trim(),
    cycleTime: Number(cycleTime || 0),
    breakdownReason: String(breakdownReason || "").trim(),
    operatorName: worker.fullName,
    shiftType,
    downtime: Number(downtime),
    machineDowntime: Number(downtime),
    expectedOutput,
    efficiency,
    timestamp,
    shiftDate,
    createdAt: serverTimestamp()
  });

  return { expectedOutput, efficiency };
};

export const logEfficiency = async (payload) => createEfficiencyLog(payload);

export const createUserProfile = async (uid, profileData = {}) => {
  await setDoc(
    doc(db, COLLECTIONS.USERS, uid),
    {
      uid,
      ...profileData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const getDashboardStats = async (params) => {
  const uid = typeof params === "string" ? params : params?.uid;
  const isWorkerScope = Boolean(uid);

  const safeSize = (result) => (result.status === "fulfilled" ? result.value.size : 0);

  if (isWorkerScope) {
    const [machinesSnap, logsSnap] = await Promise.allSettled([
      getDocs(query(collection(db, COLLECTIONS.MACHINES))),
      getDocs(query(collection(db, COLLECTIONS.LOGS), where("userId", "==", uid)))
    ]);

    return {
      workers: 0,
      machines: safeSize(machinesSnap),
      logs: safeSize(logsSnap)
    };
  }

  const [workersSnap, machinesSnap, logsSnap] = await Promise.allSettled([
    getDocs(query(collection(db, COLLECTIONS.USERS))),
    getDocs(query(collection(db, COLLECTIONS.MACHINES))),
    getDocs(query(collection(db, COLLECTIONS.LOGS)))
  ]);

  return {
    workers: safeSize(workersSnap),
    machines: safeSize(machinesSnap),
    logs: safeSize(logsSnap)
  };
};

export const getEfficiencyTrend = async ({ uid, days = 7 }) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const constraints = [orderBy("timestamp", "desc"), limit(Math.max(days * 20, 50))];
  if (uid) constraints.unshift(where("userId", "==", uid));
  const role = uid ? "operator" : "admin";
  try {
    const q = query(collection(db, COLLECTIONS.LOGS), ...constraints);
    const snap = await getDocs(q);
    let records = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((item) => {
        const date = item.timestamp?.toDate?.() || null;
        return date ? date >= since : false;
      })
      .reverse();
    if (!records.length && !uid) {
      records = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .slice(0, 7)
        .reverse();
    }
    logInfo("Firestore", "getEfficiencyTrend", { uid: uid || "all", role, resultCount: records.length });
    return records;
  } catch (error) {
    if (!isIndexOrRetryableError(error)) throw error;
    const fallbackConstraints = [limit(Math.max(days * 40, 100))];
    if (uid) fallbackConstraints.unshift(where("userId", "==", uid));
    const fallbackQuery = query(collection(db, COLLECTIONS.LOGS), ...fallbackConstraints);
    const fallbackSnap = await getDocs(fallbackQuery);
    let records = fallbackSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((item) => {
        const date = item.timestamp?.toDate?.() || null;
        return date ? date >= since : false;
      })
      .sort((a, b) => {
        const aDate = a.timestamp?.toDate?.()?.getTime?.() || 0;
        const bDate = b.timestamp?.toDate?.()?.getTime?.() || 0;
        return aDate - bDate;
      });
    if (!records.length && !uid) {
      records = fallbackSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .slice(0, 7)
        .reverse();
    }
    logInfo("Firestore", "getEfficiencyTrend fallback", { uid: uid || "all", role, resultCount: records.length });
    return records;
  }
};

const isSameOrAfter = (date, start) => (!start ? true : date >= start);
const isSameOrBefore = (date, end) => (!end ? true : date <= end);
const isIndexOrRetryableError = (error) =>
  error?.code === "failed-precondition" ||
  error?.code === "unavailable" ||
  String(error?.message || "").toLowerCase().includes("index");

const applyLogFilters = ({ records, role, uid, filters }) => {
  const start = toDateRange(filters.dateFrom);
  const end = toDateRange(filters.dateTo, true);
  return records.filter((item) => {
    const ts = item.timestamp?.toDate?.();
    if (!ts) return false;
    const ownerId = item.userId || item.workerId;
    if (!hasAccess(role, ["admin"]) && ownerId !== uid) return false;
    if (filters.workerId && ownerId !== filters.workerId) return false;
    if (filters.machineId && item.machineId !== filters.machineId) return false;
    if (!isSameOrAfter(ts, start) || !isSameOrBefore(ts, end)) return false;
    return true;
  });
};

const buildPrimaryLogsQuery = ({ role, uid, filters = {}, cursor = null, pageSize = 12 }) => {
  const constraints = [];
  if (!hasAccess(role, ["admin"])) constraints.push(where("userId", "==", uid));
  if (filters.workerId) constraints.push(where("userId", "==", filters.workerId));
  if (filters.machineId) constraints.push(where("machineId", "==", filters.machineId));
  const start = toDateRange(filters.dateFrom);
  const end = toDateRange(filters.dateTo, true);
  if (start) constraints.push(where("timestamp", ">=", Timestamp.fromDate(start)));
  if (end) constraints.push(where("timestamp", "<=", Timestamp.fromDate(end)));
  constraints.push(orderBy("timestamp", "desc"), limit(pageSize));
  if (cursor) constraints.push(startAfter(cursor));
  return query(collection(db, COLLECTIONS.LOGS), ...constraints);
};

const getFallbackLogsPage = async ({ role, uid, filters, cursor = null, pageSize = 12 }) => {
  const baseConstraints = [limit(pageSize * 8)];
  if (cursor) baseConstraints.push(startAfter(cursor));

  let raw = [];
  let snapDocs = [];
  if (hasAccess(role, ["admin"])) {
    const q = query(collection(db, COLLECTIONS.LOGS), ...baseConstraints);
    const snap = await getDocs(q);
    raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    snapDocs = snap.docs;
  } else {
    const userIdSnap = await getDocs(query(collection(db, COLLECTIONS.LOGS), where("userId", "==", uid), ...baseConstraints));
    const workerIdSnap = await getDocs(query(collection(db, COLLECTIONS.LOGS), where("workerId", "==", uid), ...baseConstraints));
    const dedup = new Map();
    [...userIdSnap.docs, ...workerIdSnap.docs].forEach((d) => dedup.set(d.id, { id: d.id, ...d.data() }));
    raw = Array.from(dedup.values());
    snapDocs = [...userIdSnap.docs, ...workerIdSnap.docs];
  }

  const filtered = applyLogFilters({ records: raw, role, uid, filters })
    .sort((a, b) => {
      const aTime = a.timestamp?.toDate?.()?.getTime?.() || 0;
      const bTime = b.timestamp?.toDate?.()?.getTime?.() || 0;
      return bTime - aTime;
    })
    .slice(0, pageSize);
  const lastId = filtered.length ? filtered[filtered.length - 1].id : null;
  const lastDoc = lastId ? snapDocs.find((d) => d.id === lastId) || null : null;
  logInfo("Firestore", "getLogsPage fallback", { uid: uid || "all", role, resultCount: filtered.length });

  return {
    records: filtered,
    cursor: lastDoc,
    hasMore: filtered.length === pageSize
  };
};

export const getLogsPage = async ({ role, uid, filters = {}, cursor = null, pageSize = 12 }) => {
  const normalizedRole = role === "worker" ? "operator" : role;
  try {
    const q = buildPrimaryLogsQuery({ role: normalizedRole, uid, filters, cursor, pageSize });
    const snap = await getDocs(q);
    const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    logInfo("Firestore", "getLogsPage", { uid: uid || "all", role: normalizedRole, resultCount: records.length });

    return {
      records,
      cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      hasMore: snap.docs.length === pageSize
    };
  } catch (error) {
    const canFallback = isIndexOrRetryableError(error);
    if (!canFallback) throw error;
    return getFallbackLogsPage({ role: normalizedRole, uid, filters, cursor, pageSize });
  }
};

export const updateEfficiencyLog = async (id, data) => {
  await updateDoc(doc(db, COLLECTIONS.LOGS, id), {
    workingHours: Number(data.workingHours),
    outputProduced: Number(data.outputProduced),
    downtime: Number(data.downtime),
    machineDowntime: Number(data.machineDowntime ?? data.downtime),
    expectedOutput: Number(data.expectedOutput),
    efficiency: Number(data.efficiency),
    partName: String(data.partName ?? ""),
    operationCode: String(data.operationCode ?? ""),
    cycleTime: Number(data.cycleTime ?? 0),
    plannedQty: Number(data.plannedQty ?? 0),
    actualQty: Number(data.actualQty ?? data.outputProduced),
    rejectedQty: Number(data.rejectedQty ?? 0),
    breakdownReason: String(data.breakdownReason ?? ""),
    updatedAt: serverTimestamp()
  });
};

export const deleteEfficiencyLog = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.LOGS, id));
};
