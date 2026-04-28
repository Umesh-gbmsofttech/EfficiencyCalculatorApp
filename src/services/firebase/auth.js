import {
  createUserWithEmailAndPassword,
  deleteUser,
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

const normalizeRole = (value) => (value === "worker" ? "operator" : value);

const ensureUserAndRoleDocuments = async ({ uid, email, fullName = "Worker", phoneNumber = "", role = "operator" }) => {
  const safeRole = normalizeRole(role || "operator");
  const trimmedEmail = email.trim();
  const [userSnap, roleSnap] = await Promise.all([
    getDoc(doc(db, COLLECTIONS.USERS, uid)),
    getDoc(doc(db, COLLECTIONS.ROLES, uid))
  ]);
  if (userSnap.exists() && roleSnap.exists()) return { recovered: false };

  console.warn("[Auth] Recovering missing Firestore profile", {
    uid,
    missingUserDoc: !userSnap.exists(),
    missingRoleDoc: !roleSnap.exists(),
    role: safeRole
  });

  await recoverUserProfile(uid, trimmedEmail, { fullName, phoneNumber, role: safeRole });
  return { recovered: true };
};

export const subscribeToAuthState = (callback) => onAuthStateChanged(auth, callback);

export const loginUser = async ({ email, password }) => {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserAndRoleDocuments({
    uid: result.user.uid,
    email: result.user.email || email,
    fullName: result.user.displayName || "Worker",
    role: "operator"
  });
  return result.user;
};

export const login = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserAndRoleDocuments({
    uid: result.user.uid,
    email: result.user.email || email,
    fullName: result.user.displayName || "Worker",
    role: "operator"
  });
  return result.user;
};

export const signupUser = async ({ fullName, email, password, phoneNumber }) => {
  const trimmedEmail = email.trim();
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  try {
    await updateProfile(result.user, { displayName: fullName });

    const userRef = doc(db, COLLECTIONS.USERS, result.user.uid);
    const roleRef = doc(db, COLLECTIONS.ROLES, result.user.uid);

    const batch = writeBatch(db);
    batch.set(userRef, {
      uid: result.user.uid,
      fullName,
      email: trimmedEmail,
      phoneNumber,
      role: "operator",
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    batch.set(roleRef, {
      uid: result.user.uid,
      role: "operator",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await batch.commit();
    return result.user;
  } catch (error) {
    console.error("[Auth] Signup Firestore write failed, rolling back Auth user", {
      uid: result.user.uid,
      code: error?.code || "unknown",
      message: error?.message || ""
    });
    try {
      await deleteUser(result.user);
    } catch (rollbackError) {
      console.error("[Auth] Rollback deleteUser failed", {
        uid: result.user.uid,
        code: rollbackError?.code || "unknown"
      });
    }
    throw error;
  }
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
      role: normalizeRole(profileData.role || "operator"),
      isActive: true,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  await setDoc(
    doc(db, COLLECTIONS.ROLES, uid),
    {
      uid,
      role: normalizeRole(profileData.role || "operator"),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const adminCreateWorker = async ({ fullName, email, phoneNumber, password, role = "operator" }) => {
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
      await ensureUserAndRoleDocuments({
        uid,
        email,
        fullName,
        phoneNumber,
        role
      });
      recovered = true;
    }

    await updateProfile(result.user, { displayName: fullName });

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, COLLECTIONS.USERS, result.user.uid), {
        uid: result.user.uid,
        fullName,
        email: email.trim(),
        phoneNumber,
        role: normalizeRole(role),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      batch.set(doc(db, COLLECTIONS.ROLES, result.user.uid), {
        uid: result.user.uid,
        role: normalizeRole(role),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await batch.commit();
      return { user: result.user, recovered };
    } catch (error) {
      console.error("[Auth] Admin worker Firestore write failed", {
        uid: result.user.uid,
        code: error?.code || "unknown",
        message: error?.message || ""
      });
      throw error;
    }
  } finally {
    await deleteApp(workerApp);
  }
};

export const addWorker = async ({ fullName, email, phoneNumber, password, role = "operator" }) => {
  return adminCreateWorker({
    fullName,
    email,
    phoneNumber,
    password,
    role
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
