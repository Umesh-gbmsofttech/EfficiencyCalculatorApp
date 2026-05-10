import { getWorkers, updateWorker, deleteWorker, getUserProfile } from "./firestore";

export const userService = {
  async list({ role, uid }) {
    try {
      return await getWorkers({ role, uid });
    } catch (error) {
      throw error;
    }
  },
  async get(uid) {
    return getUserProfile(uid);
  },
  async update(id, data) {
    return updateWorker(id, data);
  },
  async remove(id, actor) {
    return deleteWorker(id, actor);
  }
};

export default userService;
