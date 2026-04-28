import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "./config";
import { COLLECTIONS } from "../../constants/collections";
import { getShiftDate } from "../../utils/shift";

const formatYmd = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfDay = (dateString) => new Date(`${dateString}T00:00:00.000`);
const endOfDay = (dateString) => new Date(`${dateString}T23:59:59.999`);

const calculateShiftType = (date) => (date.getHours() >= 8 && date.getHours() < 20 ? "day" : "night");

const hoursBetween = (start, end) => {
  const s = start?.toDate ? start.toDate() : new Date(start);
  const e = end?.toDate ? end.toDate() : new Date(end);
  const hours = (e.getTime() - s.getTime()) / (1000 * 60 * 60);
  return Number(Math.max(0, hours).toFixed(2));
};

export const markAttendanceLogin = async ({ user, role, shiftType }) => {
  const now = new Date();
  const timestamp = Timestamp.fromDate(now);
  const computedShiftType = shiftType || calculateShiftType(now);
  const shiftDate = getShiftDate(now);
  return addDoc(collection(db, COLLECTIONS.ATTENDANCE), {
    userId: user.uid,
    userName: user.fullName || "Worker",
    role,
    shiftType: computedShiftType,
    shiftDate,
    loginTime: timestamp,
    logoutTime: null,
    totalHours: 0,
    isPresent: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const markAttendanceLogout = async ({ userId, shiftDate }) => {
  const q = query(
    collection(db, COLLECTIONS.ATTENDANCE),
    where("userId", "==", userId),
    where("shiftDate", "==", shiftDate),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.docs.length) return null;
  const docSnap = snap.docs[0];
  const data = docSnap.data();
  const logoutTime = Timestamp.now();
  const totalHours = hoursBetween(data.loginTime, logoutTime);
  await updateDoc(doc(db, COLLECTIONS.ATTENDANCE, docSnap.id), {
    logoutTime,
    totalHours,
    updatedAt: serverTimestamp()
  });
  return { id: docSnap.id, totalHours };
};

export const getAttendanceForUserShift = async ({ userId, shiftDate }) => {
  const q = query(
    collection(db, COLLECTIONS.ATTENDANCE),
    where("userId", "==", userId),
    where("shiftDate", "==", shiftDate),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.docs.length) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

export const getAttendanceRecords = async ({ role, userId, from, to }) => {
  const constraints = [];
  if (role !== "admin") constraints.push(where("userId", "==", userId));
  if (from) constraints.push(where("loginTime", ">=", Timestamp.fromDate(startOfDay(from))));
  if (to) constraints.push(where("loginTime", "<=", Timestamp.fromDate(endOfDay(to))));
  constraints.push(orderBy("loginTime", "desc"), limit(400));
  const snap = await getDocs(query(collection(db, COLLECTIONS.ATTENDANCE), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateAttendanceRecord = async (id, patch = {}) => {
  const payload = { ...patch, updatedAt: serverTimestamp() };
  if (patch.loginTime && !(patch.loginTime instanceof Timestamp)) {
    payload.loginTime = Timestamp.fromDate(new Date(patch.loginTime));
  }
  if (patch.logoutTime && !(patch.logoutTime instanceof Timestamp)) {
    payload.logoutTime = Timestamp.fromDate(new Date(patch.logoutTime));
  }
  if (payload.loginTime && payload.logoutTime) {
    payload.totalHours = hoursBetween(payload.loginTime, payload.logoutTime);
  }
  await updateDoc(doc(db, COLLECTIONS.ATTENDANCE, id), payload);
};

export const getAttendanceDateMap = (records = []) => {
  const map = {};
  records.forEach((entry) => {
    const key = entry.shiftDate || (entry.loginTime?.toDate ? formatYmd(entry.loginTime.toDate()) : null);
    if (!key) return;
    map[key] = entry.isPresent ? "present" : "absent";
  });
  return map;
};
