import AsyncStorage from "@react-native-async-storage/async-storage";

const LOG_KEY = "app_logs_v1";
let initialized = false;
const isProd = process.env.NODE_ENV === "production";

const appendLog = async (level, args = []) => {
  try {
    const previous = await AsyncStorage.getItem(LOG_KEY);
    const logs = previous ? JSON.parse(previous) : [];
    logs.push({
      level,
      message: args.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join(" "),
      ts: new Date().toISOString()
    });
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(-500)));
  } catch {
    // no-op
  }
};

export const initLogger = () => {
  if (initialized) return;
  initialized = true;
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...args) => {
    appendLog("error", args);
    originalError(...args);
  };
  console.warn = (...args) => {
    appendLog("warn", args);
    originalWarn(...args);
  };
};

export const logInfo = (scope, message, payload = null) => {
  const line = `[${scope}] ${message}`;
  if (!isProd) {
    if (payload == null) console.info(line);
    else console.info(line, payload);
  }
};

export const logWarn = (scope, message, payload = null) => {
  const line = `[${scope}] ${message}`;
  if (payload == null) console.warn(line);
  else console.warn(line, payload);
};

export const logError = (scope, message, payload = null) => {
  const line = `[${scope}] ${message}`;
  if (payload == null) console.error(line);
  else console.error(line, payload);
};
