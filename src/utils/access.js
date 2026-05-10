import { isAdmin as isAdminRole, normalizeRole } from "../constants/roles";

export const isAdmin = (role) => isAdminRole(role);

export const hasAccess = (role, allowedRoles = []) => {
  const normalizedRole = normalizeRole(role);
  if (isAdminRole(normalizedRole)) return true;
  return allowedRoles.map(normalizeRole).includes(normalizedRole);
};
