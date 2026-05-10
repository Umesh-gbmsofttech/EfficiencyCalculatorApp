import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./config";
import { COLLECTIONS } from "../../constants/collections";

export const createAuditLog = async ({
  action,
  entityType,
  entityId,
  changedBy,
  before = null,
  after = null
}) => {
  try {
    await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), {
      action: String(action || "").trim(),
      entityType: String(entityType || "").trim(),
      entityId: String(entityId || "").trim(),
      changedBy: String(changedBy || "").trim(),
      before,
      after,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    const code = String(error?.code || "");
    if (code.includes("permission-denied") || code.includes("unauthenticated")) return;
    throw error;
  }
};

export default createAuditLog;
