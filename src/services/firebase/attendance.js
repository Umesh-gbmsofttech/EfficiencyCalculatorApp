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
import { getShiftType } from "../../utils/shift";
import { hasAccess } from "../../utils/access";

const formatYmd = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const hoursBetween = (start, end) => {
  const s = start?.toDate ? start.toDate() : new Date(start);
  const e = end?.toDate ? end.toDate() : new Date(end);
  const hours = (e.getTime() - s.getTime()) / (1000 * 60 * 60);
  return Number(Math.max(0, hours).toFixed(2));
};

export const markAttendanceLogin = async ({ user, role, shiftType, loginTime, startTimeText = "", endTimeText = "", location, withinRadius = true, approvedBy = "" }) => {
  const now = loginTime ? new Date(loginTime) : new Date();
  const timestamp = Timestamp.fromDate(now);
  const computedShiftType = shiftType || getShiftType(now);
  const shiftDate = getShiftDate(now);
  const existing = await getAttendanceForUserShift({ userId: user.uid, shiftDate });
  if (existing) {
    await updateDoc(doc(db, COLLECTIONS.ATTENDANCE, existing.id), {
      userName: user.fullName || "Worker",
      role,
      shift: computedShiftType,
      shiftType: computedShiftType,
      shiftStart: startTimeText,
      shiftEnd: endTimeText,
      shiftDate,
      startTimeText,
      endTimeText,
      date: shiftDate,
      startTime: timestamp,
      checkInTime: timestamp,
      loginTime: timestamp,
      endTime: null,
      checkOutTime: null,
      logoutTime: null,
      totalHours: 0,
      location: location || null,
      withinRadius: Boolean(withinRadius),
      approvedBy: approvedBy || "",
      status: "present",
      isPresent: true,
      updatedAt: serverTimestamp()
    });
    return { id: existing.id, updated: true };
  }
  return addDoc(collection(db, COLLECTIONS.ATTENDANCE), {
    userId: user.uid,
    userName: user.fullName || "Worker",
    role,
    shift: computedShiftType,
    shiftType: computedShiftType,
    shiftStart: startTimeText,
    shiftEnd: endTimeText,
    shiftDate,
    startTimeText,
    endTimeText,
    date: shiftDate,
    startTime: timestamp,
    checkInTime: timestamp,
    loginTime: timestamp,
    endTime: null,
    checkOutTime: null,
    logoutTime: null,
    totalHours: 0,
    location: location || null,
    withinRadius: Boolean(withinRadius),
    approvedBy: approvedBy || "",
    status: "present",
    isPresent: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const markAttendanceLogout = async ({ userId, shiftDate }) => {
  let snap;
  try {
    const q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where("userId", "==", userId),
      where("shiftDate", "==", shiftDate),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    snap = await getDocs(q);
  } catch (error) {
    const canFallback = error?.code === "failed-precondition" || String(error?.message || "").toLowerCase().includes("index");
    if (!canFallback) throw error;
    const fallbackQ = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where("userId", "==", userId),
      where("shiftDate", "==", shiftDate),
      limit(10)
    );
    const fallbackSnap = await getDocs(fallbackQ);
    const sorted = fallbackSnap.docs.sort((a, b) => {
      const aTime = a.data()?.createdAt?.toDate?.()?.getTime?.() || a.data()?.loginTime?.toDate?.()?.getTime?.() || 0;
      const bTime = b.data()?.createdAt?.toDate?.()?.getTime?.() || b.data()?.loginTime?.toDate?.()?.getTime?.() || 0;
      return bTime - aTime;
    });
    snap = { docs: sorted };
  }
  if (!snap.docs.length) return null;
  const docSnap = snap.docs[0];
  const data = docSnap.data();
  if (data.logoutTime) {
    return { id: docSnap.id, totalHours: Number(data.totalHours || 0), alreadyLoggedOut: true };
  }
  const logoutTime = Timestamp.now();
  const totalHours = hoursBetween(data.loginTime, logoutTime);
  await updateDoc(doc(db, COLLECTIONS.ATTENDANCE, docSnap.id), {
    endTime: logoutTime,
    checkOutTime: logoutTime,
    logoutTime,
    totalHours,
    status: "completed",
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
  if (!hasAccess(role, ["admin"])) constraints.push(where("userId", "==", userId));
  if (from) constraints.push(where("shiftDate", ">=", from));
  if (to) constraints.push(where("shiftDate", "<=", to));
  constraints.push(orderBy("shiftDate", "desc"), limit(400));
  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.ATTENDANCE), ...constraints));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aTime = a.loginTime?.toDate?.()?.getTime?.() || 0;
        const bTime = b.loginTime?.toDate?.()?.getTime?.() || 0;
        return bTime - aTime;
      });
  } catch (error) {
    const canFallback = error?.code === "failed-precondition" || String(error?.message || "").toLowerCase().includes("index");
    if (!canFallback) throw error;
    const fallback = [];
    if (!hasAccess(role, ["admin"])) fallback.push(where("userId", "==", userId));
    if (from) fallback.push(where("shiftDate", ">=", from));
    if (to) fallback.push(where("shiftDate", "<=", to));
    fallback.push(limit(400));
    const snap = await getDocs(query(collection(db, COLLECTIONS.ATTENDANCE), ...fallback));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aTime = a.loginTime?.toDate?.()?.getTime?.() || 0;
        const bTime = b.loginTime?.toDate?.()?.getTime?.() || 0;
        return bTime - aTime;
      });
  }
};

export const getRecentAttendance = async ({ userId, max = 5 }) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where("userId", "==", userId),
      orderBy("loginTime", "desc"),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    const canFallback = error?.code === "failed-precondition" || String(error?.message || "").toLowerCase().includes("index");
    if (!canFallback) throw error;
    const q = query(collection(db, COLLECTIONS.ATTENDANCE), where("userId", "==", userId), limit(Math.max(max * 4, 20)));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aTime = a.loginTime?.toDate?.()?.getTime?.() || 0;
        const bTime = b.loginTime?.toDate?.()?.getTime?.() || 0;
        return bTime - aTime;
      })
      .slice(0, max);
  }
};

export const getTodayAttendanceRecords = async ({ role } = {}) => {
  const shiftDate = getShiftDate(new Date());
  const constraints = [where("shiftDate", "==", shiftDate), orderBy("loginTime", "desc"), limit(200)];
  if (role) constraints.unshift(where("role", "==", role));
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
