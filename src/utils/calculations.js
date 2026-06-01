const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const roundMetric = (value, digits = 2) => {
  const parsed = toFiniteNumber(value);
  return Number(parsed.toFixed(digits));
};

export const getMachineCycleTimeMinutes = (machine = {}, fallback = 0) => {
  const cycleTime = toFiniteNumber(machine.cycleTimeMinutes ?? machine.cycleTime, 0);
  if (cycleTime > 0) return cycleTime;

  const expectedPerHour = toFiniteNumber(machine.expectedOutputPerHour, 0);
  if (expectedPerHour > 0) return roundMetric(60 / expectedPerHour, 4);

  return toFiniteNumber(fallback, 0);
};

export const calculateRuntimeMinutes = ({ workingHours = 0, downtime = 0, jobStartTime, jobEndTime } = {}) => {
  const start = jobStartTime?.toDate?.() || (jobStartTime ? new Date(jobStartTime) : null);
  const end = jobEndTime?.toDate?.() || (jobEndTime ? new Date(jobEndTime) : null);
  if (start instanceof Date && end instanceof Date && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    return Math.max(0, roundMetric((end.getTime() - start.getTime()) / 60000));
  }
  return Math.max(0, roundMetric(toFiniteNumber(workingHours) * 60 - toFiniteNumber(downtime) * 60));
};

export const calculateExpectedProduction = ({ runtimeMinutes = 0, cycleTimeMinutes = 0 } = {}) => {
  const runtime = Math.max(0, toFiniteNumber(runtimeMinutes));
  const cycleTime = toFiniteNumber(cycleTimeMinutes);
  if (cycleTime <= 0 || runtime <= 0) return 0;
  return roundMetric(runtime / cycleTime);
};

export const calculateEfficiency = (actualOutput, expectedOutput) => {
  const expected = toFiniteNumber(expectedOutput);
  if (expected <= 0) return 0;
  return roundMetric((toFiniteNumber(actualOutput) / expected) * 100);
};

export const calculateUtilization = ({ runtimeMinutes = 0, availableMinutes = 0 } = {}) => {
  const available = toFiniteNumber(availableMinutes);
  if (available <= 0) return 0;
  return roundMetric((Math.max(0, toFiniteNumber(runtimeMinutes)) / available) * 100);
};

export const calculateReportMetrics = ({
  machine = {},
  workingHours = 0,
  downtime = 0,
  outputProduced = 0,
  actualQty,
  cycleTimeMinutes,
  jobStartTime,
  jobEndTime
} = {}) => {
  const resolvedCycleTime = toFiniteNumber(cycleTimeMinutes, getMachineCycleTimeMinutes(machine));
  const runtimeMinutes = calculateRuntimeMinutes({ workingHours, downtime, jobStartTime, jobEndTime });
  const expectedProduction = calculateExpectedProduction({ runtimeMinutes, cycleTimeMinutes: resolvedCycleTime });
  const actualProduction = toFiniteNumber(actualQty ?? outputProduced);
  return {
    cycleTimeMinutes: resolvedCycleTime,
    runtimeMinutes,
    downtimeMinutes: Math.max(0, roundMetric(toFiniteNumber(downtime) * 60)),
    expectedOutput: expectedProduction,
    expectedProduction,
    actualProduction,
    efficiency: calculateEfficiency(actualProduction, expectedProduction)
  };
};

export const aggregateReports = (reports = []) => {
  const totals = reports.reduce(
    (acc, item) => {
      acc.totalJobs += 1;
      acc.runtimeMinutes += toFiniteNumber(item.runtimeMinutes ?? calculateRuntimeMinutes(item));
      acc.downtimeMinutes += toFiniteNumber(item.downtimeMinutes ?? item.machineDowntimeMinutes ?? toFiniteNumber(item.downtime) * 60);
      acc.production += toFiniteNumber(item.actualProduction ?? item.actualQty ?? item.outputProduced);
      acc.expectedProduction += toFiniteNumber(item.expectedProduction ?? item.expectedOutput);
      return acc;
    },
    { totalJobs: 0, runtimeMinutes: 0, downtimeMinutes: 0, production: 0, expectedProduction: 0 }
  );

  return {
    ...totals,
    utilization: calculateUtilization({
      runtimeMinutes: totals.runtimeMinutes,
      availableMinutes: totals.runtimeMinutes + totals.downtimeMinutes
    }),
    efficiency: calculateEfficiency(totals.production, totals.expectedProduction)
  };
};

export const calculateExpectedOutput = (expectedPerHour, workingHours, downtime = 0) => {
  const cycleTimeMinutes = expectedPerHour > 0 ? 60 / Number(expectedPerHour) : 0;
  return calculateExpectedProduction({
    runtimeMinutes: calculateRuntimeMinutes({ workingHours, downtime }),
    cycleTimeMinutes
  });
};
