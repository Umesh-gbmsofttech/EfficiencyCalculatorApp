import { collection, doc, getCountFromServer, query, serverTimestamp, setDoc } from "firebase/firestore";
import { COLLECTIONS } from "../../constants/collections";
import { db } from "./config";

const REQUIRED_COLLECTIONS = [
  COLLECTIONS.USERS,
  COLLECTIONS.ROLES,
  COLLECTIONS.MACHINES,
  COLLECTIONS.PARTS,
  COLLECTIONS.JOBS,
  COLLECTIONS.ATTENDANCE,
  COLLECTIONS.REPORTS,
  COLLECTIONS.SALARY_CONFIGS,
  COLLECTIONS.SALARY_SETTLEMENTS,
  COLLECTIONS.SALARY_RECORDS,
  COLLECTIONS.OPERATOR_MONTHLY_STATS,
  COLLECTIONS.OPERATOR_YEARLY_STATS,
  COLLECTIONS.MACHINE_MONTHLY_STATS,
  COLLECTIONS.MACHINE_YEARLY_STATS,
  COLLECTIONS.SETTINGS,
  COLLECTIONS.AUDIT_LOGS
];

export const ensureFirestoreBootstrap = async ({ actorUid } = {}) => {
  const checks = await Promise.allSettled(
    REQUIRED_COLLECTIONS.map(async (name) => {
      const snapshot = await getCountFromServer(query(collection(db, name)));
      return {
        name,
        count: snapshot.data().count || 0
      };
    })
  );

  const collections = checks.map((result, index) => {
    const name = REQUIRED_COLLECTIONS[index];
    if (result.status === "fulfilled") return result.value;
    return {
      name,
      count: null,
      errorCode: result.reason?.code || "unknown"
    };
  });

  await setDoc(
    doc(db, COLLECTIONS.SETTINGS, "firestoreBootstrap"),
    {
      actorUid: actorUid || "",
      requiredCollections: REQUIRED_COLLECTIONS,
      collections,
      emptyCollections: collections.filter((item) => item.count === 0).map((item) => item.name),
      checkedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return collections;
};

export default ensureFirestoreBootstrap;
