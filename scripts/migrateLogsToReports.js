const { admin, db, calculateMetrics, monthKeyFromDate } = require("./firebaseAdmin");

const pageSize = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || 500);

const run = async () => {
  const snap = await db.collection("logs").orderBy("timestamp", "desc").limit(Math.min(pageSize, 500)).get();
  const batch = db.batch();
  let migrated = 0;
  let skipped = 0;

  snap.docs.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const metrics = calculateMetrics(data);
    const timestamp = data.timestamp || admin.firestore.Timestamp.now();
    const date = timestamp.toDate?.() || new Date();
    if (!data.userId || !data.machineId || metrics.cycleTimeMinutes <= 0) {
      skipped += 1;
      return;
    }
    batch.set(
      db.collection("reports").doc(docSnap.id),
      {
        ...data,
        ...metrics,
        schemaVersion: 2,
        recordType: "productionReport",
        jobId: String(data.jobId || ""),
        jobStartTime: data.jobStartTime || null,
        jobEndTime: data.jobEndTime || null,
        shiftDate: String(data.shiftDate || ""),
        month: data.month || monthKeyFromDate(date),
        year: Number(data.year || date.getFullYear()),
        timestamp,
        migratedFrom: "logs",
        migratedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    migrated += 1;
  });

  if (migrated) await batch.commit();
  const report = {
    scanned: snap.size,
    migrated,
    skipped,
    completedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  await db.collection("settings").doc("lastLogsToReportsMigration").set(report, { merge: true });
  console.log(JSON.stringify({ ok: true, ...report, completedAt: new Date().toISOString() }, null, 2));
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.app().delete();
  });
