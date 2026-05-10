import { createEfficiencyLog, deleteEfficiencyLog, getEfficiencyTrend, getLogsPage, updateEfficiencyLog } from "./firestore";

export const logService = {
  create: createEfficiencyLog,
  update: updateEfficiencyLog,
  remove: deleteEfficiencyLog,
  trend: getEfficiencyTrend,
  listPage: getLogsPage
};

export default logService;
