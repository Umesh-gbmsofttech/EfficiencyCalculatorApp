import { createEfficiencyLog, deleteEfficiencyLog, getLogsPage, updateEfficiencyLog } from "../services/firebase/firestore";

export const logRepository = {
  create: createEfficiencyLog,
  remove: deleteEfficiencyLog,
  update: updateEfficiencyLog,
  getPage: getLogsPage
};

export default logRepository;
