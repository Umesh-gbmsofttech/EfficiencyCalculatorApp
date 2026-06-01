import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "./firebase/config";
import { COLLECTIONS } from "../constants/collections";

export const getMachineMonthlyStats = async ({ machineId, year, max = 12 } = {}) => {
  const constraints = [where("machineId", "==", machineId), orderBy("year", "desc"), orderBy("month", "desc"), limit(max)];
  if (year) constraints.unshift(where("year", "==", Number(year)));
  const snap = await getDocs(query(collection(db, COLLECTIONS.MACHINE_MONTHLY_STATS), ...constraints));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
};

export const getMachineYearlyStats = async ({ machineId, max = 5 } = {}) => {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.MACHINE_YEARLY_STATS), where("machineId", "==", machineId), orderBy("year", "desc"), limit(max))
  );
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
};

export const getMachineMonthDetail = async ({ machineId, month } = {}) => {
  const snap = await getDoc(doc(db, COLLECTIONS.MACHINE_MONTHLY_STATS, `${machineId}_${month}`));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export default {
  getMachineMonthlyStats,
  getMachineYearlyStats,
  getMachineMonthDetail
};
