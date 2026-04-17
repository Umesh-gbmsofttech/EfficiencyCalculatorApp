import dayjs from "dayjs";

export const formatDateTime = (value) => {
  if (!value) return "-";
  if (value?.toDate) {
    return dayjs(value.toDate()).format("DD MMM YYYY, hh:mm A");
  }
  return dayjs(value).format("DD MMM YYYY, hh:mm A");
};

export const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

export const toDateRange = (dateString, end = false) => {
  if (!dateString) return null;
  const suffix = end ? "T23:59:59.999" : "T00:00:00.000";
  return new Date(`${dateString}${suffix}`);
};
