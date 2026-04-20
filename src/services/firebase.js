import { initializeApp, getApp, getApps } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  getAuth
} from "firebase/auth";
import { addDoc, collection, doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { COLLECTIONS } from "../constants/collections";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const requiredEnvMap = {
  EXPO_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  EXPO_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId
};

const missingFirebaseEnv = Object.entries(requiredEnvMap)
  .filter(([, value]) => !value)
  .map(([key]) => key);

const isCiBuild = process.env.CI === "1" || process.env.CI === "true";

if (missingFirebaseEnv.length && !isCiBuild) {
  throw new Error(
    `Firebase is not configured. Missing environment variables: ${missingFirebaseEnv.join(", ")}. ` +
      "Create a local .env file with EXPO_PUBLIC_FIREBASE_* values."
  );
}

const runtimeFirebaseConfig =
  missingFirebaseEnv.length && isCiBuild
    ? {
        apiKey: firebaseConfig.apiKey || "ci-placeholder",
        authDomain: firebaseConfig.authDomain || "ci-placeholder.firebaseapp.com",
        projectId: firebaseConfig.projectId || "ci-placeholder",
        storageBucket: firebaseConfig.storageBucket || "ci-placeholder.appspot.com",
        messagingSenderId: firebaseConfig.messagingSenderId || "000000000000",
        appId: firebaseConfig.appId || "1:000000000000:web:ci-placeholder"
      }
    : firebaseConfig;

const app = getApps().length ? getApp() : initializeApp(runtimeFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const normalizeEmail = (email) => email.trim().toLowerCase();

export const signup = async (email, password) => {
  const result = await createUserWithEmailAndPassword(auth, normalizeEmail(email), password);
  return result.user;
};

export const login = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  return result.user;
};

export const logout = async () => {
  await signOut(auth);
};

export const createUserProfile = async (uid, profileData = {}) => {
  await setDoc(
    doc(db, COLLECTIONS.USERS, uid),
    {
      uid,
      ...profileData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const addMachine = async (machineData = {}) => {
  const ref = await addDoc(collection(db, COLLECTIONS.MACHINES), {
    ...machineData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
};

export const logEfficiency = async (logData = {}) => {
  const ref = await addDoc(collection(db, COLLECTIONS.LOGS), {
    ...logData,
    timestamp: serverTimestamp()
  });
  return ref.id;
};

export { app, auth, db, runtimeFirebaseConfig as firebaseConfig };
