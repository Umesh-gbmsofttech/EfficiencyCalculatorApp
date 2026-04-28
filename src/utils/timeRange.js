const formatDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const applyDatePreset = (preset) => {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (preset === "week") start.setDate(now.getDate() - 6);
  else if (preset === "month") start.setMonth(now.getMonth() - 1);
  else if (preset === "year") start.setFullYear(now.getFullYear() - 1);

  return { dateFrom: formatDate(start), dateTo: formatDate(end) };
};
