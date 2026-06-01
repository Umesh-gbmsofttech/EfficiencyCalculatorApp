import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "./firebase/config";
import { COLLECTIONS } from "../constants/collections";

export const getOperatorMonthlyStats = async ({ operatorId, year, max = 12 } = {}) => {
  const constraints = [where("operatorId", "==", operatorId), orderBy("year", "desc"), orderBy("month", "desc"), limit(max)];
  if (year) constraints.unshift(where("year", "==", Number(year)));
  const snap = await getDocs(query(collection(db, COLLECTIONS.OPERATOR_MONTHLY_STATS), ...constraints));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
};

export const getOperatorYearlyStats = async ({ operatorId, max = 5 } = {}) => {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.OPERATOR_YEARLY_STATS), where("operatorId", "==", operatorId), orderBy("year", "desc"), limit(max))
  );
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
};

export const getOperatorMonthDetail = async ({ operatorId, month } = {}) => {
  const snap = await getDoc(doc(db, COLLECTIONS.OPERATOR_MONTHLY_STATS, `${operatorId}_${month}`));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export default {
  getOperatorMonthlyStats,
  getOperatorYearlyStats,
  getOperatorMonthDetail
};
