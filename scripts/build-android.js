/* eslint-env node */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const stopOnly = process.argv.includes("--stop-only");
const requiredNdkVersion = "26.1.10909125";
const substDriveLetters = ["R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

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

const normalizePath = (value) => path.resolve(value).toLowerCase().replace(/[\\\/]+$/, "");

const getSubstMappings = () => {
  const result = spawnSync("subst.exe", [], {
    encoding: "utf8",
    shell: false
  });

  if (result.status !== 0) return [];

  return String(result.stdout || "")
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^([A-Z]:)\\?:\s*=>\s*(.+)$/i);
      if (!match) return null;
      return {
        drive: match[1].toUpperCase(),
        target: normalizePath(match[2])
      };
    })
    .filter(Boolean);
};

const cleanupProjectSubstDrives = () => {
  const normalizedRoot = normalizePath(root);
  getSubstMappings()
    .filter((mapping) => substDriveLetters.includes(mapping.drive[0]) && mapping.target === normalizedRoot)
    .forEach((mapping) => {
      spawnSync("subst.exe", [mapping.drive, "/d"], { stdio: "ignore", shell: false });
    });
};

const findFreeDrive = () => {
  for (const letter of substDriveLetters) {
    const drive = `${letter}:`;
    if (!fs.existsSync(`${drive}\\`)) return drive;
  }
  return null;
};

const getAndroidSdkRoot = () => {
  if (process.env.ANDROID_HOME) return process.env.ANDROID_HOME;
  if (process.env.ANDROID_SDK_ROOT) return process.env.ANDROID_SDK_ROOT;
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, "Android", "Sdk");
  }
  return null;
};

const assertRequiredNdk = () => {
  const sdkRoot = getAndroidSdkRoot();
  if (!sdkRoot) {
    console.error("ANDROID_HOME or ANDROID_SDK_ROOT is not set, and the Android SDK path could not be inferred.");
    process.exit(1);
  }

  const ndkRoot = path.join(sdkRoot, "ndk", requiredNdkVersion);
  const requiredHeader = path.join(
    ndkRoot,
    "toolchains",
    "llvm",
    "prebuilt",
    process.platform === "win32" ? "windows-x86_64" : process.platform === "darwin" ? "darwin-x86_64" : "linux-x86_64",
    "sysroot",
    "usr",
    "include",
    "c++",
    "v1",
    "__memory",
    "temporary_buffer.h"
  );

  if (!fs.existsSync(requiredHeader)) {
    const sdkManager = path.join(sdkRoot, "cmdline-tools", "latest", "bin", process.platform === "win32" ? "sdkmanager.bat" : "sdkmanager");
    console.error(`Android NDK ${requiredNdkVersion} is missing or incomplete.`);
    console.error(`Expected header not found: ${requiredHeader}`);
    console.error("Install Android SDK Command-line Tools from Android Studio if sdkmanager is missing.");
    console.error(`Then reinstall it with: "${sdkManager}" --uninstall "ndk;${requiredNdkVersion}" && "${sdkManager}" --install "ndk;${requiredNdkVersion}"`);
    process.exit(1);
  }
};

const cleanNativeCxxCache = () => {
  fs.rmSync(path.join(root, "node_modules", "react-native-reanimated", "android", ".cxx"), {
    force: true,
    recursive: true
  });
};

assertRequiredNdk();
cleanNativeCxxCache();
cleanupProjectSubstDrives();

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
  run("subst.exe", [drive, root]);
  const androidDir = `${drive}\\android`;
  run("cmd.exe", ["/d", "/c", "gradlew.bat --stop"], { cwd: androidDir });
  if (!stopOnly) {
    run("cmd.exe", ["/d", "/c", "gradlew.bat assembleRelease"], { cwd: androidDir });
  }
} finally {
  spawnSync("subst.exe", [drive, "/d"], { stdio: "ignore" });
  cleanupProjectSubstDrives();
}
