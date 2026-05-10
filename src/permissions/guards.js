import { hasAccess, isAdmin } from "./access";

export const canAccessAdmin = (role) => isAdmin(role);
export const canManageWorkers = (role) => hasAccess(role, ["admin"]);
export const canSubmitLogs = (role) => hasAccess(role, ["operator", "admin"]);
export const canReadOwnRecords = (role) => hasAccess(role, ["operator", "staff", "admin"]);
