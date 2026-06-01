import { Timestamp, collection, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./firebase/config";
import { COLLECTIONS } from "../constants/collections";
import { aggregateReports } from "../utils/calculations";

const toDate = (value) => value?.toDate?.() || (value ? new Date(value) : new Date());
const monthKey = (date) => `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, "0")}`;

const monthRange = (year, monthNumber) => ({
  from: new Date(year, monthNumber - 1, 1, 0, 0, 0, 0),
  to: new Date(year, monthNumber, 0, 23, 59, 59, 999)
});

const yearRange = (year) => ({
  from: new Date(year, 0, 1, 0, 0, 0, 0),
  to: new Date(year, 11, 31, 23, 59, 59, 999)
});

const periodFromReport = (report = {}) => {
  const date = toDate(report.timestamp);
  const month = String(report.month || monthKey(date));
  return {
    month,
    year: Number(report.year || date.getFullYear()),
    monthNumber: Number(month.split("_")[1] || date.getMonth() + 1)
  };
};

const getReportsForRange = async ({ field, id, from, to }) => {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.REPORTS),
      where(field, "==", id),
      where("timestamp", ">=", Timestamp.fromDate(from)),
      where("timestamp", "<=", Timestamp.fromDate(to))
    )
  );
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
};

const writeOperatorStats = async ({ operatorId, month, year, monthNumber }) => {
  if (!operatorId) return;
  const monthly = monthRange(year, monthNumber);
  const yearly = yearRange(year);
  const [monthlyReports, yearlyReports] = await Promise.all([
    getReportsForRange({ field: "userId", id: operatorId, ...monthly }),
    getReportsForRange({ field: "userId", id: operatorId, ...yearly })
  ]);
  const monthlyStats = aggregateReports(monthlyReports);
  const yearlyStats = aggregateReports(yearlyReports);
  const monthlyMachineCount = new Set(monthlyReports.map((item) => item.machineId).filter(Boolean)).size;
  const yearlyMachineCount = new Set(yearlyReports.map((item) => item.machineId).filter(Boolean)).size;

  await Promise.all([
    setDoc(
      doc(db, COLLECTIONS.OPERATOR_MONTHLY_STATS, `${operatorId}_${month}`),
      {
        operatorId,
        month,
        year,
        totalProduction: monthlyStats.production,
        totalRuntimeMinutes: monthlyStats.runtimeMinutes,
        totalDowntimeMinutes: monthlyStats.downtimeMinutes,
        expectedProduction: monthlyStats.expectedProduction,
        actualProduction: monthlyStats.production,
        efficiency: monthlyStats.efficiency,
        machineCount: monthlyMachineCount,
        reportCount: monthlyStats.totalJobs,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    ),
    setDoc(
      doc(db, COLLECTIONS.OPERATOR_YEARLY_STATS, `${operatorId}_${year}`),
      {
        operatorId,
        year,
        totalProduction: yearlyStats.production,
        totalRuntimeMinutes: yearlyStats.runtimeMinutes,
        totalDowntimeMinutes: yearlyStats.downtimeMinutes,
        expectedProduction: yearlyStats.expectedProduction,
        actualProduction: yearlyStats.production,
        efficiency: yearlyStats.efficiency,
        machineCount: yearlyMachineCount,
        reportCount: yearlyStats.totalJobs,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )
  ]);
};

const writeMachineStats = async ({ machineId, month, year, monthNumber }) => {
  if (!machineId) return;
  const monthly = monthRange(year, monthNumber);
  const yearly = yearRange(year);
  const [monthlyReports, yearlyReports] = await Promise.all([
    getReportsForRange({ field: "machineId", id: machineId, ...monthly }),
    getReportsForRange({ field: "machineId", id: machineId, ...yearly })
  ]);
  const monthlyStats = aggregateReports(monthlyReports);
  const yearlyStats = aggregateReports(yearlyReports);
  const monthlyOperatorCount = new Set(monthlyReports.map((item) => item.userId).filter(Boolean)).size;
  const yearlyOperatorCount = new Set(yearlyReports.map((item) => item.userId).filter(Boolean)).size;

  await Promise.all([
    setDoc(
      doc(db, COLLECTIONS.MACHINE_MONTHLY_STATS, `${machineId}_${month}`),
      {
        machineId,
        month,
        year,
        totalProduction: monthlyStats.production,
        runtimeMinutes: monthlyStats.runtimeMinutes,
        downtimeMinutes: monthlyStats.downtimeMinutes,
        expectedProduction: monthlyStats.expectedProduction,
        actualProduction: monthlyStats.production,
        efficiency: monthlyStats.efficiency,
        operatorCount: monthlyOperatorCount,
        reportCount: monthlyStats.totalJobs,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    ),
    setDoc(
      doc(db, COLLECTIONS.MACHINE_YEARLY_STATS, `${machineId}_${year}`),
      {
        machineId,
        year,
        totalProduction: yearlyStats.production,
        runtimeMinutes: yearlyStats.runtimeMinutes,
        downtimeMinutes: yearlyStats.downtimeMinutes,
        expectedProduction: yearlyStats.expectedProduction,
        actualProduction: yearlyStats.production,
        efficiency: yearlyStats.efficiency,
        operatorCount: yearlyOperatorCount,
        reportCount: yearlyStats.totalJobs,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )
  ]);
};

const affectedKeys = (reports = []) => {
  const map = new Map();
  reports.filter(Boolean).forEach((report) => {
    const period = periodFromReport(report);
    if (report.userId) map.set(`operator:${report.userId}:${period.month}`, { type: "operator", operatorId: report.userId, ...period });
    if (report.machineId) map.set(`machine:${report.machineId}:${period.month}`, { type: "machine", machineId: report.machineId, ...period });
  });
  return Array.from(map.values());
};

export const refreshStatsForReports = async (reports = [], { includeMachine = false } = {}) => {
  const reportList = Array.isArray(reports) ? reports : [reports];
  const affected = affectedKeys(reportList);
  await Promise.all(
    affected.map((item) => {
      if (item.type === "operator") return writeOperatorStats(item);
      if (!includeMachine) return Promise.resolve();
      return writeMachineStats(item);
    })
  );
};

export default { refreshStatsForReports };
