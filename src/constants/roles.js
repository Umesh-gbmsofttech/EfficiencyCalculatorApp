export const ROLES = {
  ADMIN: "admin",
  OPERATOR: "operator",
  STAFF: "staff"
};

export const DEFAULT_ROLE = ROLES.OPERATOR;

export const normalizeRole = (role) => {
  const value = String(role || "").toLowerCase().trim();
  if (value === "worker") return ROLES.OPERATOR;
  if (value === ROLES.ADMIN || value === ROLES.OPERATOR || value === ROLES.STAFF) return value;
  return DEFAULT_ROLE;
};

export const isAdmin = (role) => normalizeRole(role) === ROLES.ADMIN;
