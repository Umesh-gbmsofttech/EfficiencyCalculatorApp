const fs = require("fs");
const path = require("path");

const appBuildGradlePath = path.join(process.cwd(), "android", "app", "build.gradle");
const gradlePropertiesPath = path.join(process.cwd(), "android", "gradle.properties");

if (!fs.existsSync(appBuildGradlePath)) {
  throw new Error("android/app/build.gradle not found. Run expo prebuild first.");
}

if (!fs.existsSync(gradlePropertiesPath)) {
  throw new Error("android/gradle.properties not found. Run expo prebuild first.");
}

const signingLines = [
  "MYAPP_UPLOAD_STORE_FILE=keystore.jks",
  "MYAPP_UPLOAD_KEY_ALIAS=${ANDROID_KEY_ALIAS}",
  "MYAPP_UPLOAD_STORE_PASSWORD=${ANDROID_KEYSTORE_PASSWORD}",
  "MYAPP_UPLOAD_KEY_PASSWORD=${ANDROID_KEY_PASSWORD}"
];

let gradleProperties = fs.readFileSync(gradlePropertiesPath, "utf8");
for (const line of signingLines) {
  if (!gradleProperties.includes(line.split("=")[0])) {
    gradleProperties += `\n${line}`;
  }
}
fs.writeFileSync(gradlePropertiesPath, gradleProperties.trim() + "\n", "utf8");

let buildGradle = fs.readFileSync(appBuildGradlePath, "utf8");
if (!buildGradle.includes("release {") || !buildGradle.includes("signingConfig signingConfigs.release")) {
  buildGradle = buildGradle.replace(
    /android \{/,
    `android {\n    signingConfigs {\n        release {\n            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {\n                storeFile file(MYAPP_UPLOAD_STORE_FILE)\n                storePassword MYAPP_UPLOAD_STORE_PASSWORD\n                keyAlias MYAPP_UPLOAD_KEY_ALIAS\n                keyPassword MYAPP_UPLOAD_KEY_PASSWORD\n            }\n        }\n    }`
  );

  buildGradle = buildGradle.replace(
    /buildTypes \{\s*release \{/m,
    `buildTypes {\n        release {\n            signingConfig signingConfigs.release`
  );
}

fs.writeFileSync(appBuildGradlePath, buildGradle, "utf8");
console.log("Android signing configuration applied.");
