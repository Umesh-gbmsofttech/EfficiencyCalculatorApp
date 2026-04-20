import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  getAuth,
  initializeAuth
} from "firebase/auth";
import * as FirebaseAuth from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { deleteApp, initializeApp } from "firebase/app";
import { auth, db, firebaseConfig } from "./config";
import { COLLECTIONS } from "../../constants/collections";

export const subscribeToAuthState = (callback) => onAuthStateChanged(auth, callback);

export const loginUser = async ({ email, password }) => {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
};

export const login = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
};

export const signupUser = async ({ fullName, email, password, phoneNumber }) => {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(result.user, { displayName: fullName });

  const userRef = doc(db, COLLECTIONS.USERS, result.user.uid);
  const roleRef = doc(db, COLLECTIONS.ROLES, result.user.uid);

  const batch = writeBatch(db);
  batch.set(userRef, {
    uid: result.user.uid,
    fullName,
    email: email.trim(),
    phoneNumber,
    role: "worker",
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(roleRef, {
    uid: result.user.uid,
    role: "worker",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await batch.commit();
  return result.user;
};

export const signup = async (email, password) => {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
};

export const recoverUserProfile = async (uid, email, profileData = {}) => {
  const fallbackName = String(email || "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();
  const fullName = profileData.fullName || fallbackName || "Worker";

  await setDoc(
    doc(db, COLLECTIONS.USERS, uid),
    {
      uid,
      email: email.trim(),
      fullName,
      phoneNumber: profileData.phoneNumber || "",
      role: "worker",
      isActive: true,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  await setDoc(
    doc(db, COLLECTIONS.ROLES, uid),
    {
      uid,
      role: "worker",
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const adminCreateWorker = async ({ fullName, email, phoneNumber, password, role = "worker" }) => {
  const workerApp = initializeApp(firebaseConfig, `worker-create-${Date.now()}`);
  let workerAuth;
  try {
    workerAuth = initializeAuth(workerApp, {
      // eslint-disable-next-line import/namespace
      persistence: FirebaseAuth.getReactNativePersistence(AsyncStorage)
    });
  } catch (error) {
    const alreadyInitialized =
      error?.code === "auth/already-initialized" ||
      String(error?.message || "").toLowerCase().includes("already-initialized");
    if (!alreadyInitialized) throw error;
    workerAuth = getAuth(workerApp);
  }

  try {
    let result;
    let recovered = false;
    try {
      result = await createUserWithEmailAndPassword(workerAuth, email.trim(), password);
    } catch (error) {
      const isExistingEmail = error?.code === "auth/email-already-in-use";
      if (!isExistingEmail) throw error;

      try {
        result = await signInWithEmailAndPassword(workerAuth, email.trim(), password);
      } catch (signInError) {
        if (signInError?.code === "auth/user-disabled") {
          const err = new Error("This account is disabled.");
          err.code = "auth/user-disabled";
          throw err;
        }
        if (signInError?.code === "auth/wrong-password" || signInError?.code === "auth/invalid-credential") {
          const err = new Error("The existing account uses a different password.");
          err.code = "auth/wrong-password";
          throw err;
        }
        throw signInError;
      }

      const uid = result.user.uid;
      const [userSnap, roleSnap] = await Promise.all([
        getDoc(doc(db, COLLECTIONS.USERS, uid)),
        getDoc(doc(db, COLLECTIONS.ROLES, uid))
      ]);

      if (!userSnap.exists() || !roleSnap.exists()) {
        await recoverUserProfile(uid, email, { fullName, phoneNumber });
      }
      recovered = true;
    }

    await updateProfile(result.user, { displayName: fullName });

    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTIONS.USERS, result.user.uid), {
      uid: result.user.uid,
      fullName,
      email: email.trim(),
      phoneNumber,
      role,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    batch.set(doc(db, COLLECTIONS.ROLES, result.user.uid), {
      uid: result.user.uid,
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await batch.commit();
    return { user: result.user, recovered };
  } finally {
    await deleteApp(workerApp);
  }
};

export const addWorker = async ({ fullName, email, phoneNumber, password }) => {
  return adminCreateWorker({
    fullName,
    email,
    phoneNumber,
    password,
    role: "worker"
  });
};

export const forgotPassword = async (email) => {
  await sendPasswordResetEmail(auth, email.trim());
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const logout = async () => {
  await signOut(auth);
};
