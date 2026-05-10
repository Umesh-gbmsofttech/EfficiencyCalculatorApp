import {
  getAttendanceDateMap,
  getAttendanceForUserShift,
  getAttendanceRecords,
  getTodayAttendanceRecords,
  markAttendanceLogin,
  markAttendanceLogout,
  updateAttendanceRecord
} from "./attendance";

export const attendanceService = {
  list: getAttendanceRecords,
  markLogin: markAttendanceLogin,
  markLogout: markAttendanceLogout,
  update: updateAttendanceRecord,
  mapDates: getAttendanceDateMap,
  getForShift: getAttendanceForUserShift,
  listToday: getTodayAttendanceRecords
};

export default attendanceService;
