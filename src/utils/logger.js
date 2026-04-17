const time = () => new Date().toISOString();

export const logger = {
  info: (message, payload) => console.log(`[INFO][${time()}] ${message}`, payload || ""),
  warn: (message, payload) => console.warn(`[WARN][${time()}] ${message}`, payload || ""),
  error: (message, payload) => console.error(`[ERROR][${time()}] ${message}`, payload || "")
};
