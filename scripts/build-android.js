/* eslint-env node */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const stopOnly = process.argv.includes("--stop-only");

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, NODE_ENV: "production" },
    ...options
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

const runCmd = (script) => run("cmd.exe", ["/d", "/s", "/c", script]);

const findFreeDrive = () => {
  for (const letter of ["R", "S", "T", "U", "V", "W", "X", "Y", "Z"]) {
    const drive = `${letter}:`;
    if (!fs.existsSync(`${drive}\\`)) return drive;
  }
  return null;
};

if (process.platform !== "win32") {
  run("./gradlew", ["--stop"], { cwd: path.join(root, "android") });
  if (stopOnly) process.exit(0);
  run("./gradlew", ["assembleRelease"], { cwd: path.join(root, "android") });
  process.exit(0);
}

const drive = findFreeDrive();
if (!drive) {
  console.error("No free drive letter is available for a short Android build path.");
  process.exit(1);
}

try {
  runCmd(`subst ${drive} "${root}"`);
  const androidDir = `${drive}\\android`;
  run("cmd.exe", ["/d", "/s", "/c", "gradlew.bat --stop"], { cwd: androidDir });
  if (stopOnly) process.exit(0);
  run("cmd.exe", ["/d", "/s", "/c", "gradlew.bat assembleRelease"], { cwd: androidDir });
} finally {
  spawnSync("cmd.exe", ["/d", "/s", "/c", `subst ${drive} /d`], { stdio: "ignore" });
}
