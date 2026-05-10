import { getDashboardStats, getEfficiencyTrend } from "../services/firebase/firestore";
import { getTodayAttendanceRecords } from "../services/firebase/attendance";

export const dashboardRepository = {
  getStats: getDashboardStats,
  getTrend: getEfficiencyTrend,
  getTodayAttendance: getTodayAttendanceRecords
};

export default dashboardRepository;
