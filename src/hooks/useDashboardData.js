import { useCallback, useRef, useState } from "react";
import dashboardRepository from "../repositories/dashboardRepository";

const useDashboardData = ({ uid, includeAttendance = false }) => {
  const [stats, setStats] = useState({ workers: 0, machines: 0, logs: 0 });
  const [trend, setTrend] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);
  const inFlightRef = useRef(false);
  const lastLoadAtRef = useRef(0);

  const load = useCallback(async () => {
    const now = Date.now();
    if (inFlightRef.current) return;
    if (now - lastLoadAtRef.current < 1000) return;
    inFlightRef.current = true;
    lastLoadAtRef.current = now;
    requestRef.current += 1;
    const reqId = requestRef.current;
    setLoading(true);
    try {
      const tasks = [dashboardRepository.getStats(uid), dashboardRepository.getTrend(uid ? { uid } : {})];
      if (includeAttendance) tasks.push(dashboardRepository.getTodayAttendance({ role: "operator" }));
      const settled = await Promise.allSettled(tasks);
      if (reqId !== requestRef.current) return;
      const statsResult = settled[0]?.status === "fulfilled" ? settled[0].value : { workers: 0, machines: 0, logs: 0 };
      const trendResult = settled[1]?.status === "fulfilled" ? settled[1].value : [];
      const attendanceResult = includeAttendance && settled[2]?.status === "fulfilled" ? settled[2].value : [];
      setStats(statsResult);
      setTrend(Array.isArray(trendResult) ? trendResult.slice(-7) : []);
      if (includeAttendance) setAttendance(attendanceResult);
    } finally {
      if (reqId === requestRef.current) setLoading(false);
      inFlightRef.current = false;
    }
  }, [includeAttendance, uid]);

  return { stats, trend, attendance, loading, load };
};

export default useDashboardData;
