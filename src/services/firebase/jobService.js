import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "./config";
import { COLLECTIONS } from "../../constants/collections";
import { createAuditLog } from "./auditService";

const jobCache = new Map();

export const jobService = {
  async list({ machineId, linkedPartId, activeOnly = true } = {}) {
    const constraints = [orderBy("jobName", "asc")];
    if (linkedPartId) constraints.unshift(where("linkedPartId", "==", linkedPartId));
    if (activeOnly) constraints.unshift(where("active", "==", true));
    const snap = await getDocs(query(collection(db, COLLECTIONS.JOBS), ...constraints));
    const jobs = snap.docs.map((d) => {
      const raw = d.data();
      return {
        id: d.id,
        ...raw,
        linkedPartId: raw.linkedPartId || raw.partId || "",
        compatibleMachineIds: Array.isArray(raw.compatibleMachineIds)
          ? raw.compatibleMachineIds
          : raw.machineId
            ? [raw.machineId]
            : [],
        active: raw.active !== false
      };
    });
    const filtered = !machineId ? jobs : jobs.filter((job) => !job.compatibleMachineIds.length || job.compatibleMachineIds.includes(machineId));
    filtered.forEach((job) => jobCache.set(job.id, job));
    return filtered;
  },
  async getByIds(ids = []) {
    if (!Array.isArray(ids) || !ids.length) return [];
    const missing = ids.filter((id) => !jobCache.has(id));
    if (missing.length) {
      const all = await this.list({ activeOnly: false });
      all.forEach((job) => jobCache.set(job.id, job));
    }
    return ids.map((id) => jobCache.get(id)).filter(Boolean);
  },
  async create(payload = {}) {
    const normalized = {
      jobName: String(payload.jobName || "").trim(),
      jobCode: String(payload.jobCode || "").trim(),
      linkedPartId: String(payload.linkedPartId || payload.partId || "").trim(),
      compatibleMachineIds: Array.isArray(payload.compatibleMachineIds)
        ? payload.compatibleMachineIds
        : payload.machineId
          ? [payload.machineId]
          : [],
      estimatedCycleTime: Number(payload.estimatedCycleTime || payload.standardCycleTime || 0),
      instructions: String(payload.instructions || "").trim(),
      active: payload.active !== false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, COLLECTIONS.JOBS), normalized);
    if (payload.actorUid) {
      await createAuditLog({ action: "create", entityType: "job", entityId: ref.id, changedBy: payload.actorUid, after: normalized });
    }
  },
  async update(id, payload = {}) {
    const ref = doc(db, COLLECTIONS.JOBS, id);
    const beforeSnap = await getDoc(ref);
    const normalized = {
      jobName: String(payload.jobName || "").trim(),
      jobCode: String(payload.jobCode || "").trim(),
      linkedPartId: String(payload.linkedPartId || payload.partId || "").trim(),
      compatibleMachineIds: Array.isArray(payload.compatibleMachineIds)
        ? payload.compatibleMachineIds
        : payload.machineId
          ? [payload.machineId]
          : [],
      estimatedCycleTime: Number(payload.estimatedCycleTime || payload.standardCycleTime || 0),
      instructions: String(payload.instructions || "").trim(),
      active: payload.active !== false,
      updatedAt: serverTimestamp()
    };
    await updateDoc(ref, normalized);
    if (payload.actorUid) {
      await createAuditLog({ action: "update", entityType: "job", entityId: id, changedBy: payload.actorUid, before: beforeSnap.data() || null, after: normalized });
    }
  },
  async remove(id, { actorUid = "" } = {}) {
    const ref = doc(db, COLLECTIONS.JOBS, id);
    const beforeSnap = await getDoc(ref);
    await deleteDoc(doc(db, COLLECTIONS.JOBS, id));
    if (actorUid) {
      await createAuditLog({ action: "delete", entityType: "job", entityId: id, changedBy: actorUid, before: beforeSnap.data() || null, after: null });
    }
  }
};

export default jobService;
