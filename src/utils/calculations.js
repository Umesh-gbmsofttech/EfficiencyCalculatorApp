export const calculateExpectedOutput = (expectedPerHour, workingHours, downtime = 0) => {
  const productiveHours = Math.max(0, Number(workingHours) - Number(downtime));
  return Number(expectedPerHour) * productiveHours;
};

export const calculateEfficiency = (actualOutput, expectedOutput) => {
  if (!expectedOutput || expectedOutput <= 0) {
    return 0;
  }
  return Number(((Number(actualOutput) / Number(expectedOutput)) * 100).toFixed(2));
};
