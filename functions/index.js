/**
 * WorkGrid — Cloud Functions
 *
 * DEPLOY:  cd functions && npm install && firebase deploy --only functions
 * REQUIRES: firebase CLI logged in, project set to your Firebase project
 *
 * Functions included:
 *
 *  1. syncAdminClaim      — Firestore trigger: when a user's `role` field changes in
 *                           Firestore, sync the `admin: true/false` custom claim on
 *                           their Firebase Auth token. This makes isAdmin() tamper-proof
 *                           (claims are signed by Firebase, unreadable from client).
 *
 *  2. onUserLogin         — Auth trigger: logs every successful sign-in to taller_log,
 *                           including timestamp, IP (when available), and user agent.
 *                           Solves the gap where client-side login events could be missed
 *                           or forged.
 *
 *  3. onUserCreated       — Auth trigger: logs every new account creation.
 */

const { initializeApp } = require("firebase-admin/app");
const { getAuth }       = require("firebase-admin/auth");
const { getFirestore }  = require("firebase-admin/firestore");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { beforeUserSignedIn, beforeUserCreated } = require("firebase-functions/v2/identity");

initializeApp();

// ── 1. Sync admin custom claim when Firestore role changes ────────────────────
exports.syncAdminClaim = onDocumentWritten(
  { document: "users/{email}", region: "europe-west1" },
  async (event) => {
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();

    // Skip if document deleted or role didn't change
    if (!after) return;
    if (before?.role === after.role) return;

    const email   = event.params.email;
    const isAdmin = after.role === "admin";

    try {
      const userRecord = await getAuth().getUserByEmail(email);
      await getAuth().setCustomUserClaims(userRecord.uid, { admin: isAdmin });
      console.log(`[syncAdminClaim] ${email} → admin=${isAdmin}`);
    } catch (err) {
      // User may not have completed Google sign-in yet — log and skip
      console.warn(`[syncAdminClaim] could not set claim for ${email}:`, err.message);
    }
  }
);

// ── 2. Audit log: successful sign-in ─────────────────────────────────────────
exports.onUserLogin = beforeUserSignedIn(
  { region: "europe-west1" },
  async (event) => {
    const { email, uid } = event.data;
    if (!email) return; // anonymous or phone auth — not used in this app

    try {
      await getFirestore().collection("taller_log").add({
        projectId:   null,
        projectName: null,
        taskId:      null,
        taskTitle:   null,
        taskShortId: null,
        affectedUser: null,
        action:      "user_login",
        detail:      `Inicio de sesión: ${email}`,
        performedBy: email,
        timestamp:   new Date().toISOString(),
        // Additional forensic context
        uid,
        ipAddress:   event.ipAddress    ?? null,
        userAgent:   event.userAgent    ?? null,
      });
    } catch (err) {
      console.error("[onUserLogin] failed to write audit log:", err);
      // Never throw — a log failure must not block sign-in
    }
  }
);

// ── 3. Audit log: new account created ────────────────────────────────────────
exports.onUserCreated = beforeUserCreated(
  { region: "europe-west1" },
  async (event) => {
    const { email, uid } = event.data;
    if (!email) return;

    try {
      await getFirestore().collection("taller_log").add({
        projectId:   null,
        projectName: null,
        taskId:      null,
        taskTitle:   null,
        taskShortId: null,
        affectedUser: email,
        action:      "user_signup",
        detail:      `Nueva cuenta registrada: ${email} (pendiente activación)`,
        performedBy: email,
        timestamp:   new Date().toISOString(),
        uid,
        ipAddress:   event.ipAddress ?? null,
      });
    } catch (err) {
      console.error("[onUserCreated] failed to write audit log:", err);
    }
  }
);
