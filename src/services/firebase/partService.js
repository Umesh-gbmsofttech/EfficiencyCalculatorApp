import { createPartMaster, getPartsMaster, removePartMaster, updatePartMaster } from "./firestore";

const partCache = new Map();

export const partService = {
  async list() {
    const parts = await getPartsMaster();
    parts.forEach((part) => partCache.set(part.id, part));
    return parts;
  },
  async getByIds(ids = []) {
    if (!Array.isArray(ids) || !ids.length) return [];
    const missing = ids.filter((id) => !partCache.has(id));
    if (missing.length) {
      const all = await getPartsMaster();
      all.forEach((part) => partCache.set(part.id, part));
    }
    return ids.map((id) => partCache.get(id)).filter(Boolean);
  },
  create: createPartMaster,
  update: updatePartMaster,
  remove: removePartMaster
};

export default partService;
