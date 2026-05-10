export const getShiftDate = (value) => {
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const shifted = new Date(date);
  if (shifted.getHours() < 8) {
    shifted.setDate(shifted.getDate() - 1);
  }
  const year = shifted.getFullYear();
  const month = String(shifted.getMonth() + 1).padStart(2, "0");
  const day = String(shifted.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getShiftType = (value) => {
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "day";
  return date.getHours() >= 8 && date.getHours() < 20 ? "day" : "night";
};
