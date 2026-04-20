# Efficiency Calculator

Role-based worker-machine efficiency tracking app built with Expo React Native + Firebase.

## Useful Commands
```bash
# install dependencies
npm install

# start Expo dev server
npm run start

# run on Android (native)
npm run android

# run lint checks
npm run lint

# Expo health checks
npm run doctor

# generate native Android project
npm run prebuild:android

# force regenerate native android/ios folders
npm run prebuild:clean

# stop existing Gradle daemons (recommended before release)
npm run android:stop

# clean generated/build folders
npm run clean

# reset full build state (clean + install + prebuild clean)
npm run reset

# build release APK (from project root)
npm run build:android

# build release APK (from android folder / Git Bash)
cd android && ./gradlew.bat assembleRelease
```

## Project Details

### Tech Stack
- React Native (Expo, JavaScript)
- React Navigation (Stack + Tabs)
- Zustand
- React Hook Form + Yup
- React Native Paper
- Firebase Auth + Firestore

### Firebase Setup
1. Create Firebase project.
2. Enable Authentication -> Email/Password.
3. Create Firestore database.
4. Register Android app with package: `com.efficiency.calculator`.
5. Download and place `google-services.json` in project root.
6. Configure `.env` with Firebase values.

### Environment Variables
Create `.env`:
```env
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```
You can use either `FIREBASE_*` or `EXPO_PUBLIC_FIREBASE_*` keys.

### Firestore Collections
- `users`
- `roles`
- `machines`
- `logs`

### Roles
- Signup creates `worker` by default.
- Admin can promote users by updating:
  - `roles/{uid}.role = "admin"`
  - `users/{uid}.role = "admin"`
- Admin can also create worker/admin users from **Manage Workers**.
- Delete is soft delete (`isActive = false`).

### Android Signing
Keystore currently generated at:
- `C:\Users\ratho\Downloads\WORK\keystore.jks`

Release signing is configured to use:
- Env vars: `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

### Windows Build Stability Notes
- Do not run Metro (`npm run start`) while running release build.
- Stop Gradle daemons before release build: `npm run android:stop`.
- If CMake file lock errors appear, rerun after:
  1. `npm run android:stop`
  2. `npm run clean`
  3. `npm install`
  4. `npm run prebuild:clean`
- Exclude your project folder from antivirus real-time scanning if file locks continue.

### GitHub Actions
Workflow path:
- `.github/workflows/android-build.yml`

Required repo secrets:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
