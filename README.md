🚀 Efficiency Calculator

Role-based worker–machine efficiency tracking app built with Expo React Native + Firebase.

🛠 Useful Commands
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

# reset full build state
npm run reset

# build release APK
npm run build:android

# alternative build
cd android && ./gradlew.bat assembleRelease
⚙️ Tech Stack
React Native (Expo)
React Navigation
Zustand
React Hook Form + Yup
React Native Paper
Firebase Auth + Firestore
🔥 Firebase Complete Setup (Production)
1. Create Firebase Project
Go to Firebase Console
Create project
2. Enable Authentication
Go to Authentication → Sign-in Method
Enable:
✅ Email/Password
3. Add Apps
Android App
Package: com.efficiency.calculator
Download google-services.json
Place in:
android/app/google-services.json
Web App
Create Web App
Copy Firebase config → use in .env
4. Environment Variables

Create .env:

EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Company Location (IMPORTANT)
EXPO_PUBLIC_COMPANY_LATITUDE=12.9716
EXPO_PUBLIC_COMPANY_LONGITUDE=77.5946
EXPO_PUBLIC_COMPANY_RADIUS_METERS=200
5. Create Admin User
Go to Authentication → Users
Add user manually
Copy UID
6. Setup Firestore Data

Create these documents manually:

roles/{uid}
{
  "role": "admin"
}
users/{uid}
{
  "uid": "...",
  "fullName": "Admin Name",
  "email": "admin@email.com",
  "role": "admin",
  "isActive": true
}
7. Firestore Security Rules (FINAL)
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function getRole() {
      return get(/databases/$(database)/documents/roles/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return isSignedIn() && getRole() == "admin";
    }

    function isOperator() {
      return isSignedIn() && getRole() == "operator";
    }

    function isStaff() {
      return isSignedIn() && getRole() == "staff";
    }

    // ✅ USERS
    match /users/{userId} {
      allow read: if isAdmin(); 
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update, delete: if isAdmin() || request.auth.uid == userId;
    }

    // ✅ ROLES (🔥 CRITICAL FIX)
    match /roles/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.auth.uid == userId; // 🔥 THIS FIXES YOUR ISSUE
      allow update, delete: if isAdmin();
    }

    // ✅ MACHINES
    match /machines/{machineId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    // ✅ LOGS
    match /logs/{logId} {
      allow create: if isOperator(); 
      allow read: if isAdmin() || request.auth.uid == resource.data.userId;
      allow update, delete: if isAdmin() || request.auth.uid == resource.data.userId;
    }
  }
}
8. 🔴 REQUIRED: Firestore Indexes (VERY IMPORTANT)

Without this → ❌ failed-precondition errors

Go to:
Firestore → Indexes → Composite → Create

Add:

Index 1 (Logs Query)
Collection: logs
Fields:
- userId (Ascending)
- timestamp (Descending)
Index 2 (Admin Reports)
Collection: logs
Fields:
- machineId (Ascending)
- timestamp (Descending)
Index 3 (Filtering)
Collection: logs
Fields:
- workerId (Ascending)
- machineId (Ascending)
- timestamp (Descending)

👉 OR run app once → click generated index link in error log (recommended)

9. ☁️ Cloud Function (Delete Worker Completely)

Required to fully delete users (Auth + Firestore)

functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteWorkerCompletely = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required");
  }

  const uid = context.auth.uid;

  const roleDoc = await admin.firestore().doc(`roles/${uid}`).get();
  if (roleDoc.data()?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin only");
  }

  const targetUid = data.uid;

  await admin.auth().deleteUser(targetUid);
  await admin.firestore().doc(`users/${targetUid}`).delete();
  await admin.firestore().doc(`roles/${targetUid}`).delete();

  return { success: true };
});
Deploy:
cd functions
npm install
firebase deploy --only functions
👥 Roles System
Role	Permissions
admin	Full control
operator	Machine + logs
staff	Attendance only
📊 Core Features
Worker efficiency tracking
Machine performance
Admin dashboard (yearly analytics)
Reports filtering (day/week/month/year)
Salary logic (planned)
Shift-based tracking (8AM–8PM / 8PM–8AM)
Geo-fencing (200m restriction)
⚠️ Common Production Issues & Fixes
❌ Admin showing as operator

✔ Fix:

Ensure roles/{uid} exists
Firestore rules deployed
Internet connection stable
❌ White screen in APK

✔ Fix:

Missing .env in build
Add env in GitHub Secrets
❌ Email already exists

✔ Fix:

Delete from Authentication → Users
Not just Firestore
❌ Worker reports empty

✔ Fix:

Create indexes (Step 8)
❌ Firestore offline errors

✔ Fix:

Check internet
Firebase config correct
🔐 GitHub Actions Secrets

Required:

ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD

EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
📦 Android Signing

Keystore path:

C:\Users\ratho\Downloads\WORK\keystore.jks
🚀 Run App
npx expo start
npx expo start -c
🔥 Final Notes
No Firebase Storage needed ✅ (using image URLs)
Rules + Indexes = critical for production
Always deploy rules after change:
firebase deploy --only firestore:rules

## GitHub APK Build: Company Location Setup

For production APKs built from GitHub Actions, add these repository secrets:

- `EXPO_PUBLIC_COMPANY_LATITUDE`
- `EXPO_PUBLIC_COMPANY_LONGITUDE`
- `EXPO_PUBLIC_COMPANY_RADIUS_METERS`

Example values:

- `EXPO_PUBLIC_COMPANY_LATITUDE=12.971600`
- `EXPO_PUBLIC_COMPANY_LONGITUDE=77.594600`
- `EXPO_PUBLIC_COMPANY_RADIUS_METERS=200`

Path:

`GitHub Repo -> Settings -> Secrets and variables -> Actions -> New repository secret`

These are injected in [android-build.yml](/c:/Users/ratho/Downloads/WORK/EfficiencyCalculator/.github/workflows/android-build.yml) and baked into release APK at build time.
