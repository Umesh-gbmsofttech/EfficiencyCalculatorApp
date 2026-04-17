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
npx expo-doctor

# generate native Android project
npx expo prebuild --platform android

# build release APK (from project root)
npm run android:release

# build release APK (from android folder)
cd android && .\gradlew.bat assembleRelease
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
```

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
- Alias: `upload`
- Passwords: `workerEfficiency@#123`

### GitHub Actions
Workflow path:
- `.github/workflows/android-build.yml`

Required repo secrets:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
