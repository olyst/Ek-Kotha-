const admin = require("firebase-admin");

function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env var");
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://my-to-up-default-rtdb.firebaseio.com"
    });
  }
  return admin;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const fbAdmin = getAdmin();
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!idToken) return res.status(401).json({ error: "Missing auth token" });

    const decoded = await fbAdmin.auth().verifyIdToken(idToken);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const targetUids = Array.isArray(body.targetUids)
      ? body.targetUids
      : (body.targetUid ? [body.targetUid] : []);

    const cleanUids = [...new Set(targetUids)].filter((u) => u && u !== decoded.uid).slice(0, 25);
    if (!cleanUids.length) return res.status(200).json({ ok: true, sent: 0 });

    const tokenRecords = [];
    await Promise.all(
      cleanUids.map(async (uid) => {
        const snap = await fbAdmin.database().ref(`/userTokens/${uid}`).once("value");
        snap.forEach((c) => {
          const t = c.val()?.token;
          if (t) tokenRecords.push({ uid, key: c.key, token: t });
        });
      })
    );

    if (!tokenRecords.length) return res.status(200).json({ ok: true, sent: 0 });

    const isCall = body.type === "incoming_call";
    const dataPayload = {
      title: String(body.title || "Ek Kotha"),
      body: String(body.body || "New notification"),
      type: String(body.type || "message"),
      convId: String(body.convId || ""),
      callId: String(body.callId || ""),
      notifId: String(body.notifId || "")
    };

    const result = await fbAdmin.messaging().sendEachForMulticast({
      tokens: tokenRecords.map((r) => r.token),
      data: dataPayload,
      android: { priority: "high", ttl: isCall ? 30000 : 3600000 },
      webpush: {
        headers: {
          Urgency: "high",
          TTL: isCall ? "30" : "3600"
        }
      }
    });

    const removals = [];
    result.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code || "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          const rec = tokenRecords[idx];
          removals.push(fbAdmin.database().ref(`/userTokens/${rec.uid}/${rec.key}`).remove());
        }
      }
    });
    if (removals.length) await Promise.all(removals);

    return res.status(200).json({ ok: true, sent: result.successCount });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Push failed" });
  }
};
