import { initializeApp, getApps, getApp } from "firebase/app";
import Constants from "expo-constants";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { logger } from "../../utils/logger";

const extra = Constants.expoConfig?.extra || Constants.manifest2?.extra || {};

const firebaseConfig = {
  apiKey: extra.firebaseApiKey,
  authDomain: extra.firebaseAuthDomain,
  projectId: extra.firebaseProjectId,
  storageBucket: extra.firebaseStorageBucket,
  messagingSenderId: extra.firebaseMessagingSenderId,
  appId: extra.firebaseAppId
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const db = getFirestore(app);

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  logger.warn("Firebase env variables are missing. Update .env before running in production.");
}

export { app, auth, db, firebaseConfig };
