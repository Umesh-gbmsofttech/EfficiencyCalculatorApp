import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  getAuth
} from "firebase/auth";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { deleteApp, initializeApp } from "firebase/app";
import { auth, db, firebaseConfig } from "./config";
import { COLLECTIONS } from "../../constants/collections";

export const subscribeToAuthState = (callback) => onAuthStateChanged(auth, callback);

export const loginUser = async ({ email, password }) => {
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

export const adminCreateWorker = async ({ fullName, email, phoneNumber, password, role = "worker" }) => {
  const workerApp = initializeApp(firebaseConfig, `worker-create-${Date.now()}`);
  const workerAuth = getAuth(workerApp);

  try {
    const result = await createUserWithEmailAndPassword(workerAuth, email.trim(), password);
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
    return result.user;
  } finally {
    await deleteApp(workerApp);
  }
};

export const forgotPassword = async (email) => {
  await sendPasswordResetEmail(auth, email.trim());
};

export const logoutUser = async () => {
  await signOut(auth);
};
