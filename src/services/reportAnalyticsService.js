import { Timestamp, collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "./firebase/config";
import { COLLECTIONS } from "../constants/collections";
import { aggregateReports } from "../utils/calculations";

const rangeForPeriod = ({ period = "daily", date = new Date(), month, year } = {}) => {
  const base = date instanceof Date ? date : new Date(date);
  const y = Number(year || base.getFullYear());
  const m = Number(month || base.getMonth() + 1) - 1;
  if (period === "yearly") {
    return { from: new Date(y, 0, 1, 0, 0, 0, 0), to: new Date(y, 11, 31, 23, 59, 59, 999) };
  }
  if (period === "monthly") {
    return { from: new Date(y, m, 1, 0, 0, 0, 0), to: new Date(y, m + 1, 0, 23, 59, 59, 999) };
  }
  return {
    from: new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0),
    to: new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999)
  };
};

export const getReportAnalytics = async ({ period = "daily", date, month, year, machineId = "", operatorId = "", limitTo = 500 } = {}) => {
  const { from, to } = rangeForPeriod({ period, date, month, year });
  const constraints = [
    where("timestamp", ">=", Timestamp.fromDate(from)),
    where("timestamp", "<=", Timestamp.fromDate(to)),
    orderBy("timestamp", "desc"),
    limit(limitTo)
  ];
  if (machineId) constraints.unshift(where("machineId", "==", machineId));
  if (operatorId) constraints.unshift(where("userId", "==", operatorId));
  const snap = await getDocs(query(collection(db, COLLECTIONS.REPORTS), ...constraints));
  const reports = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  return {
    period,
    from,
    to,
    reports,
    summary: aggregateReports(reports),
    trend: reports
      .slice()
      .reverse()
      .map((item) => ({
        id: item.id,
        timestamp: item.timestamp,
        efficiency: Number(item.efficiency || 0),
        production: Number(item.actualProduction || item.outputProduced || 0)
      }))
  };
};

export default { getReportAnalytics };
