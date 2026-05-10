import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "./config";
import { COLLECTIONS } from "../../constants/collections";

const firstDay = (year, month) => new Date(year, month - 1, 1, 0, 0, 0, 0);
const lastDay = (year, month) => new Date(year, month, 0, 23, 59, 59, 999);
const monthKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

export const upsertSalaryConfig = async (userId, config = {}) => {
  await setDoc(
    doc(db, COLLECTIONS.SALARY_CONFIGS, userId),
    {
      salaryType: config.salaryType || "monthly",
      baseAmount: Number(config.baseAmount || 0),
      workingDaysPerMonth: Number(config.workingDaysPerMonth || 26),
      bonusDays: Number(config.bonusDays || 0),
      penaltyDays: Number(config.penaltyDays || 0),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const getSalaryConfig = async (userId) => {
  const snap = await getDoc(doc(db, COLLECTIONS.SALARY_CONFIGS, userId));
  return snap.exists() ? snap.data() : null;
};

const calculateEfficiencyDeduction = (logs = []) => {
  if (!logs.length) return 0;
  const avgEfficiency = logs.reduce((s, l) => s + Number(l.efficiency || 0), 0) / logs.length;
  const downtime = logs.reduce((s, l) => s + Number(l.downtime || l.machineDowntime || 0), 0);
  const rejected = logs.reduce((s, l) => s + Number(l.rejectedQty || 0), 0);
  const inefficiencyLoss = Math.max(0, 100 - avgEfficiency) * 0.25;
  const downtimeLoss = downtime * 0.15;
  const rejectLoss = rejected * 0.2;
  return Number((inefficiencyLoss + downtimeLoss + rejectLoss).toFixed(2));
};

export const calculateMonthlySalary = async ({ userId, year, month }) => {
  const config = await getSalaryConfig(userId);
  if (!config) return null;

  const from = Timestamp.fromDate(firstDay(year, month));
  const to = Timestamp.fromDate(lastDay(year, month));

  let attendanceSnap;
  let logsSnap;
  const settlementSnap = await getDoc(doc(db, COLLECTIONS.SALARY_SETTLEMENTS, `${userId}_${monthKey(year, month)}`));
  try {
    [attendanceSnap, logsSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, COLLECTIONS.ATTENDANCE),
          where("userId", "==", userId),
          where("loginTime", ">=", from),
          where("loginTime", "<=", to)
        )
      ),
      getDocs(
        query(
          collection(db, COLLECTIONS.LOGS),
          where("userId", "==", userId),
          where("timestamp", ">=", from),
          where("timestamp", "<=", to)
        )
      )
    ]);
  } catch (error) {
    const canFallback = error?.code === "failed-precondition" || String(error?.message || "").toLowerCase().includes("index");
    if (!canFallback) throw error;
    [attendanceSnap, logsSnap] = await Promise.all([
      getDocs(query(collection(db, COLLECTIONS.ATTENDANCE), where("userId", "==", userId), limit(1000))),
      getDocs(query(collection(db, COLLECTIONS.LOGS), where("userId", "==", userId), limit(2000)))
    ]);
  }

  const attendance = attendanceSnap.docs
    .map((d) => d.data())
    .filter((a) => {
      const dt = a.loginTime?.toDate?.();
      return dt ? dt >= from.toDate() && dt <= to.toDate() : false;
    });
  const logs = logsSnap.docs
    .map((d) => d.data())
    .filter((l) => {
      const dt = l.timestamp?.toDate?.();
      return dt ? dt >= from.toDate() && dt <= to.toDate() : false;
    });
  const presentDays = new Set(attendance.filter((a) => a.isPresent).map((a) => a.shiftDate)).size;
  const expected = Number(config.workingDaysPerMonth || 26);
  const dailyBase = Number(config.baseAmount || 0) / Math.max(1, expected);
  const bonus = presentDays >= expected ? Number(config.bonusDays || 0) : 0;
  const penalty = presentDays < expected ? Number(config.penaltyDays || 0) : 0;
  const efficiencyDeduction = calculateEfficiencyDeduction(logs);
  const grossDays = Math.max(0, presentDays + bonus - penalty);
  const grossAmount = grossDays * dailyBase;
  const netAmount = Number(Math.max(0, grossAmount - efficiencyDeduction).toFixed(2));

  return {
    month: monthKey(year, month),
    presentDays,
    expectedDays: expected,
    bonusDaysApplied: bonus,
    penaltyDaysApplied: penalty,
    efficiencyDeduction,
    grossAmount: Number(grossAmount.toFixed(2)),
    netAmount,
    isSettled: settlementSnap.exists()
  };
};

export const settleMonthlySalary = async ({ userId, year, month, actorUid }) => {
  const summary = await calculateMonthlySalary({ userId, year, month });
  if (!summary) return null;
  const id = `${userId}_${monthKey(year, month)}`;
  await setDoc(
    doc(db, COLLECTIONS.SALARY_SETTLEMENTS, id),
    {
      ...summary,
      userId,
      settledBy: actorUid,
      settledAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  );
  return summary;
};

export const calculateSalaryRecord = async ({ userId, baseSalary = 0, perPartRate = 0, bonus = 0, deduction = 0, month, actorUid }) => {
  const [y, m] = String(month).split("-").map(Number);
  const from = Timestamp.fromDate(firstDay(y, m));
  const to = Timestamp.fromDate(lastDay(y, m));
  const [attendanceSnap, logsSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.ATTENDANCE), where("userId", "==", userId), where("loginTime", ">=", from), where("loginTime", "<=", to))),
    getDocs(query(collection(db, COLLECTIONS.LOGS), where("userId", "==", userId), where("timestamp", ">=", from), where("timestamp", "<=", to)))
  ]);
  const attendance = attendanceSnap.docs.map((d) => d.data());
  const logs = logsSnap.docs.map((d) => d.data());
  const attendanceDays = new Set(attendance.filter((a) => a.isPresent !== false).map((a) => a.shiftDate)).size;
  const totalProduction = logs.reduce((sum, l) => sum + Number(l.actualQty || l.outputProduced || 0), 0);
  const computedBonus = Number(bonus || 0);
  const computedDeduction = Number(deduction || 0);
  const finalSalary = totalProduction * Number(perPartRate || 0) + computedBonus - computedDeduction;
  const id = `${userId}_${month}`;
  const payload = {
    userId,
    month,
    baseSalary: Number(baseSalary || 0),
    perPartRate: Number(perPartRate || 0),
    attendanceDays,
    totalProduction,
    bonus: computedBonus,
    deduction: computedDeduction,
    finalSalary: Number(finalSalary.toFixed(2)),
    locked: false,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    calculatedBy: actorUid || ""
  };
  await setDoc(doc(db, COLLECTIONS.SALARY_RECORDS, id), payload, { merge: true });
  return { id, ...payload };
};

export const lockSalaryRecord = async (recordId) => {
  await updateDoc(doc(db, COLLECTIONS.SALARY_RECORDS, recordId), {
    locked: true,
    updatedAt: serverTimestamp()
  });
};

export const getSalaryRecords = async ({ userId, max } = {}) => {
  const constraints = [orderBy("month", "desc")];
  if (userId) constraints.unshift(where("userId", "==", userId));
  if (max) constraints.push(limit(max));
  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.SALARY_RECORDS), ...constraints));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    const canFallback = error?.code === "failed-precondition" || String(error?.message || "").toLowerCase().includes("index");
    if (!canFallback) throw error;
    const fallbackConstraints = [];
    if (userId) fallbackConstraints.push(where("userId", "==", userId));
    if (max) fallbackConstraints.push(limit(Math.max(max * 4, 20)));
    const fallbackSnap = await getDocs(query(collection(db, COLLECTIONS.SALARY_RECORDS), ...fallbackConstraints));
    return fallbackSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(b.month || "").localeCompare(String(a.month || "")))
      .slice(0, max || 100);
  }
};
