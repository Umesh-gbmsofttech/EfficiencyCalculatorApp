const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

admin.initializeApp();

exports.deleteWorkerCompletely = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const roleDoc = await admin.firestore().collection("roles").doc(callerUid).get();
  const callerRole = roleDoc.exists ? roleDoc.data()?.role : null;
  if (callerRole !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can delete users.");
  }

  const targetUid = String(request.data?.uid || "").trim();
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "Target uid is required.");
  }
  if (targetUid === callerUid) {
    throw new HttpsError("failed-precondition", "Admin cannot delete own account.");
  }

  const db = admin.firestore();
  const batch = db.batch();
  const [logsSnap, attendanceSnap] = await Promise.all([
    db.collection("logs").where("userId", "==", targetUid).get(),
    db.collection("attendance").where("userId", "==", targetUid).get()
  ]);
  logsSnap.docs.forEach((d) => batch.delete(d.ref));
  attendanceSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(db.collection("users").doc(targetUid));
  batch.delete(db.collection("roles").doc(targetUid));
  batch.delete(db.collection("salaryConfigs").doc(targetUid));
  await batch.commit();

  try {
    await admin.auth().deleteUser(targetUid);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }

  return { ok: true };
});

exports.repairMissingUsers = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Authentication required.");
  const roleDoc = await admin.firestore().collection("roles").doc(callerUid).get();
  const callerRole = roleDoc.exists ? roleDoc.data()?.role : null;
  if (callerRole !== "admin") throw new HttpsError("permission-denied", "Only admins can repair users.");

  const repaired = [];
  let nextPageToken;
  do {
    const batchUsers = await admin.auth().listUsers(1000, nextPageToken);
    nextPageToken = batchUsers.pageToken;
    for (const authUser of batchUsers.users) {
      const uid = authUser.uid;
      const email = authUser.email || "";
      const [userRef, roleRef] = [
        admin.firestore().collection("users").doc(uid),
        admin.firestore().collection("roles").doc(uid)
      ];
      const [userSnap, roleSnap] = await Promise.all([userRef.get(), roleRef.get()]);
      const role = (roleSnap.exists ? roleSnap.data()?.role : null) || "operator";
      if (!userSnap.exists) {
        await userRef.set({
          uid,
          email,
          fullName: authUser.displayName || "Worker",
          phoneNumber: authUser.phoneNumber || "",
          role: role === "worker" ? "operator" : role,
          isActive: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      if (!roleSnap.exists) {
        await roleRef.set({
          uid,
          role: role === "worker" ? "operator" : role,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      if (!userSnap.exists || !roleSnap.exists) repaired.push(uid);
    }
  } while (nextPageToken);
  return { repaired };
});
