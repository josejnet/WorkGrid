import { auth, db } from "../firebase";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, setDoc } from "firebase/firestore";
import { SUPER_ADMIN } from "../lib/constants";

const provider = new GoogleAuthProvider();

// Optional: restrict login to a specific Google Workspace domain.
// Set VITE_ALLOWED_DOMAIN=miempresa.com to enforce it.
// Leave unset to allow any Google account (non-workspace teams).
const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN ?? null;

// Optional: comma-separated allowlist of emails (beyond domain restriction).
// e.g. VITE_ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com
const ALLOWED_EMAILS = import.meta.env.VITE_ALLOWED_EMAILS
  ? import.meta.env.VITE_ALLOWED_EMAILS.split(",").map(e => e.trim().toLowerCase())
  : null;

export function loginWithGoogle() {
  if (ALLOWED_DOMAIN) {
    provider.setCustomParameters({ hd: ALLOWED_DOMAIN });
  }
  return signInWithPopup(auth, provider);
}

export function loginWithEmailPassword(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Validate that the authenticated Google account is allowed to use this app.
 * Returns null and signs the user out if the account doesn't pass domain/email checks.
 */
function isEmailAllowed(email) {
  if (!ALLOWED_DOMAIN && !ALLOWED_EMAILS) return true; // no restriction configured
  const lower = email.toLowerCase();
  if (ALLOWED_DOMAIN && lower.endsWith(`@${ALLOWED_DOMAIN}`)) return true;
  if (ALLOWED_EMAILS && ALLOWED_EMAILS.includes(lower)) return true;
  return false;
}

/**
 * Accepts a full Firebase user object.
 * - Enforces domain/email allowlist (signs out + throws if not allowed).
 * - If user exists in Firestore → return their data.
 * - If first login → auto-create { active: false, role: "user" } (or admin if SUPER_ADMIN).
 */
export async function fetchSession(firebaseUser) {
  const { email, displayName, photoURL } = firebaseUser;

  // ── Domain / email allowlist enforcement ──────────────────────────────────
  if (!isEmailAllowed(email)) {
    await signOut(auth);
    throw new Error(`Acceso denegado: la cuenta ${email} no está autorizada.`);
  }

  try {
    const ref  = doc(db, "users", email);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      return { email, ...snap.data() };
    }

    // First login — if this is the first user in the whole app, bootstrap as admin.
    // Fallback: SUPER_ADMIN env var keeps explicit admin assignment support.
    const usersCol = collection(db, "users");
    const firstUserSnap = await getDocs(query(usersCol, limit(1)));
    const isFirstUser = firstUserSnap.empty;
    const isSA = email === SUPER_ADMIN || isFirstUser;
    const newUser = {
      name:     displayName || email,
      email,
      photoURL: photoURL || null,
      role:     isSA ? "admin" : "user",
      active:   isSA,
      creadoEn: new Date().toISOString(),
    };
    await setDoc(ref, newUser);
    return { ...newUser };
  } catch (err) {
    console.error("[fetchSession]", err);
    throw err;
  }
}
