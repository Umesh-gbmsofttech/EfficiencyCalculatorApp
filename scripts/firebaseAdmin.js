const path = require("path");

let admin;
try {
  admin = require("firebase-admin");
} catch {
  admin = require(path.join("..", "functions", "node_modules", "firebase-admin"));
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const monthKeyFromDate = (date) => `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, "0")}`;

const calculateMetrics = (data = {}) => {
  const cycleTime = asNumber(data.cycleTimeMinutes ?? data.cycleTime, 0);
  const expectedPerHour = asNumber(data.expectedOutputPerHour, 0);
  const cycleTimeMinutes = cycleTime > 0 ? cycleTime : expectedPerHour > 0 ? Number((60 / expectedPerHour).toFixed(4)) : 0;
  const start = data.jobStartTime?.toDate?.();
  const end = data.jobEndTime?.toDate?.();
  const runtimeFromTime = start && end ? Math.max(0, (end.getTime() - start.getTime()) / 60000) : null;
  const runtimeMinutes = asNumber(data.runtimeMinutes, runtimeFromTime ?? Math.max(0, (asNumber(data.workingHours) - asNumber(data.downtime)) * 60));
  const expectedProduction = cycleTimeMinutes > 0 ? Number((runtimeMinutes / cycleTimeMinutes).toFixed(2)) : asNumber(data.expectedOutput);
  const actualProduction = asNumber(data.actualProduction ?? data.actualQty ?? data.outputProduced);
  const efficiency = expectedProduction > 0 ? Number(((actualProduction / expectedProduction) * 100).toFixed(2)) : 0;
  return {
    runtimeMinutes,
    downtimeMinutes: asNumber(data.downtimeMinutes, asNumber(data.downtime) * 60),
    cycleTimeMinutes,
    expectedOutput: expectedProduction,
    expectedProduction,
    actualProduction,
    efficiency
  };
};

module.exports = {
  admin,
  db,
  asNumber,
  monthKeyFromDate,
  calculateMetrics
};
