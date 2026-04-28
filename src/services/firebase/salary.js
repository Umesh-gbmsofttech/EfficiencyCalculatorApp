import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
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

  const [attendanceSnap, logsSnap, settlementSnap] = await Promise.all([
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
    ),
    getDoc(doc(db, COLLECTIONS.SALARY_SETTLEMENTS, `${userId}_${monthKey(year, month)}`))
  ]);

  const attendance = attendanceSnap.docs.map((d) => d.data());
  const logs = logsSnap.docs.map((d) => d.data());
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
