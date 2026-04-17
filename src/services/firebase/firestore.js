import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
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
  Timestamp
} from "firebase/firestore";
import { db } from "./config";
import { COLLECTIONS } from "../../constants/collections";
import { calculateEfficiency, calculateExpectedOutput } from "../../utils/calculations";
import { toDateRange } from "../../utils/formatters";

export const getUserProfile = async (uid) => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
};

export const getWorkers = async () => {
  const q = query(collection(db, COLLECTIONS.USERS), orderBy("fullName", "asc"));
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

export const deleteWorker = async (id) => {
  const batch = writeBatch(db);
  batch.set(
    doc(db, COLLECTIONS.USERS, id),
    {
      isActive: false,
      role: "worker",
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  batch.set(
    doc(db, COLLECTIONS.ROLES, id),
    {
      role: "worker",
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  await batch.commit();
};

export const getMachines = async () => {
  const q = query(collection(db, COLLECTIONS.MACHINES), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const createMachine = async (data) => {
  await addDoc(collection(db, COLLECTIONS.MACHINES), {
    ...data,
    expectedOutputPerHour: Number(data.expectedOutputPerHour),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const editMachine = async (id, data) => {
  await updateDoc(doc(db, COLLECTIONS.MACHINES, id), {
    ...data,
    expectedOutputPerHour: Number(data.expectedOutputPerHour),
    updatedAt: serverTimestamp()
  });
};

export const removeMachine = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.MACHINES, id));
};

export const createEfficiencyLog = async ({ machine, worker, workingHours, outputProduced, downtime }) => {
  const expectedOutput = calculateExpectedOutput(machine.expectedOutputPerHour, workingHours, downtime);
  const efficiency = calculateEfficiency(outputProduced, expectedOutput);

  await addDoc(collection(db, COLLECTIONS.LOGS), {
    machineId: machine.id,
    machineName: machine.name,
    workerId: worker.uid,
    workerName: worker.fullName,
    workingHours: Number(workingHours),
    outputProduced: Number(outputProduced),
    downtime: Number(downtime),
    expectedOutput,
    efficiency,
    timestamp: serverTimestamp()
  });

  return { expectedOutput, efficiency };
};

export const getDashboardStats = async (uid) => {
  const [workersSnap, machinesSnap, logsSnap] = await Promise.all([
    getCountFromServer(query(collection(db, COLLECTIONS.USERS))),
    getCountFromServer(query(collection(db, COLLECTIONS.MACHINES))),
    getCountFromServer(
      uid
        ? query(collection(db, COLLECTIONS.LOGS), where("workerId", "==", uid))
        : query(collection(db, COLLECTIONS.LOGS))
    )
  ]);

  return {
    workers: workersSnap.data().count,
    machines: machinesSnap.data().count,
    logs: logsSnap.data().count
  };
};

export const getEfficiencyTrend = async ({ uid, days = 7 }) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const constraints = [where("timestamp", ">=", Timestamp.fromDate(since)), orderBy("timestamp", "asc")];
  if (uid) constraints.push(where("workerId", "==", uid));

  const q = query(collection(db, COLLECTIONS.LOGS), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getLogsPage = async ({ role, uid, filters = {}, cursor = null, pageSize = 12 }) => {
  const constraints = [orderBy("timestamp", "desc"), limit(pageSize)];

  if (role !== "admin") {
    constraints.unshift(where("workerId", "==", uid));
  }

  if (filters.workerId) constraints.unshift(where("workerId", "==", filters.workerId));
  if (filters.machineId) constraints.unshift(where("machineId", "==", filters.machineId));

  const start = toDateRange(filters.dateFrom);
  const end = toDateRange(filters.dateTo, true);
  if (start) constraints.unshift(where("timestamp", ">=", Timestamp.fromDate(start)));
  if (end) constraints.unshift(where("timestamp", "<=", Timestamp.fromDate(end)));

  if (cursor) constraints.push(startAfter(cursor));

  const q = query(collection(db, COLLECTIONS.LOGS), ...constraints);
  const snap = await getDocs(q);

  return {
    records: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === pageSize
  };
};
