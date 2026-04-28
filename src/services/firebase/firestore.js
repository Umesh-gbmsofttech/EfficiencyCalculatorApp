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

export const getWorkers = async ({ role, uid } = {}) => {
  const normalizedRole = role === "worker" ? "operator" : role;
  const safeRole = normalizedRole || "admin";
  console.log("[Workers] role:", safeRole);
  if (safeRole === "admin") {
    console.log("[Workers] query path:", "users (all)");
    const q = query(collection(db, COLLECTIONS.USERS), where("isActive", "==", true));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((worker) => worker.role !== "admin")
      .sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
  }

  if (!uid) return [];
  console.log("[Workers] query path:", `users (self:${uid})`);
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
  if (resolvedRole !== "admin") {
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

export const getMachines = async () => {
  const q = query(collection(db, COLLECTIONS.MACHINES), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const createMachine = async (data) => {
  await addDoc(collection(db, COLLECTIONS.MACHINES), {
    ...data,
    imageUrl: normalizeImageUrl(data.imageUrl),
    expectedOutputPerHour: Number(data.expectedOutputPerHour),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const addMachine = async (data) => {
  await createMachine(data);
};

export const editMachine = async (id, data) => {
  await updateDoc(doc(db, COLLECTIONS.MACHINES, id), {
    ...data,
    imageUrl: normalizeImageUrl(data.imageUrl),
    expectedOutputPerHour: Number(data.expectedOutputPerHour),
    updatedAt: serverTimestamp()
  });
};

export const removeMachine = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.MACHINES, id));
};

export const createEfficiencyLog = async ({
  machine,
  worker,
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
  if (!worker?.uid) {
    const err = new Error("Invalid log payload: userId is required.");
    err.code = "invalid-argument";
    throw err;
  }
  const expectedOutput = calculateExpectedOutput(machine.expectedOutputPerHour, workingHours, downtime);
  const efficiency = calculateEfficiency(outputProduced, expectedOutput);

  const timestamp = Timestamp.now();
  const shiftDate = getShiftDate(timestamp);
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
    partName: String(partName || "").trim(),
    operationCode: String(operationCode || "").trim(),
    cycleTime: Number(cycleTime || 0),
    breakdownReason: String(breakdownReason || "").trim(),
    operatorName: worker.fullName,
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

  if (isWorkerScope) {
    const [machinesSnap, logsSnap] = await Promise.all([
      getDocs(query(collection(db, COLLECTIONS.MACHINES))),
      getDocs(query(collection(db, COLLECTIONS.LOGS), where("userId", "==", uid)))
    ]);

    return {
      workers: 0,
      machines: machinesSnap.size,
      logs: logsSnap.size
    };
  }

  const [workersSnap, machinesSnap, logsSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.USERS))),
    getDocs(query(collection(db, COLLECTIONS.MACHINES))),
    getDocs(query(collection(db, COLLECTIONS.LOGS)))
  ]);

  return {
    workers: workersSnap.size,
    machines: machinesSnap.size,
    logs: logsSnap.size
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
    const records = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((item) => {
        const date = item.timestamp?.toDate?.() || null;
        return date ? date >= since : false;
      })
      .reverse();
    console.info("[Firestore] getEfficiencyTrend", { uid: uid || "all", role, resultCount: records.length });
    return records;
  } catch (error) {
    if (!isIndexOrRetryableError(error)) throw error;
    const fallbackConstraints = [limit(Math.max(days * 40, 100))];
    if (uid) fallbackConstraints.unshift(where("userId", "==", uid));
    const fallbackQuery = query(collection(db, COLLECTIONS.LOGS), ...fallbackConstraints);
    const fallbackSnap = await getDocs(fallbackQuery);
    const records = fallbackSnap.docs
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
    console.info("[Firestore] getEfficiencyTrend fallback", { uid: uid || "all", role, resultCount: records.length });
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
    if (role !== "admin" && ownerId !== uid) return false;
    if (filters.workerId && ownerId !== filters.workerId) return false;
    if (filters.machineId && item.machineId !== filters.machineId) return false;
    if (!isSameOrAfter(ts, start) || !isSameOrBefore(ts, end)) return false;
    return true;
  });
};

const buildPrimaryLogsQuery = ({ role, uid, filters = {}, cursor = null, pageSize = 12 }) => {
  const constraints = [];
  if (role !== "admin") constraints.push(where("userId", "==", uid));
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
  if (role === "admin") {
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
  console.info("[Firestore] getLogsPage fallback", { uid: uid || "all", role, resultCount: filtered.length });

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
    console.info("[Firestore] getLogsPage", { uid: uid || "all", role: normalizedRole, resultCount: records.length });

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
