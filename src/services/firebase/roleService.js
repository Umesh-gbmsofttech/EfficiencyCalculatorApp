import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./config";
import { COLLECTIONS } from "../../constants/collections";
import { DEFAULT_ROLE, normalizeRole } from "../../constants/roles";

export const roleService = {
  async get(uid) {
    const snap = await getDoc(doc(db, COLLECTIONS.ROLES, uid));
    return snap.exists() ? { uid, ...snap.data(), role: normalizeRole(snap.data()?.role) } : null;
  },
  async upsert(uid, role = DEFAULT_ROLE) {
    const safeRole = normalizeRole(role);
    await setDoc(
      doc(db, COLLECTIONS.ROLES, uid),
      { uid, role: safeRole, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
      { merge: true }
    );
    return { uid, role: safeRole };
  }
};

export default roleService;
