import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// ── Firebase App Check ───────────────────────────────────────────────────────
// Verifies requests come from this legitimate web app (not raw SDK calls).
// Requires:
//   1. VITE_RECAPTCHA_SITE_KEY env var with a reCAPTCHA v3 site key.
//   2. App Check enabled in Firebase Console → App Check → Register app.
// In development without the env var, App Check is disabled (no enforcement).
// To test locally before console activation, set:
//   VITE_APPCHECK_DEBUG_TOKEN=your-debug-token in .env.local
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (recaptchaSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
} else if (import.meta.env.DEV) {
  // Allow debug token in local dev without a real reCAPTCHA key
  const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
  if (debugToken) {
    // eslint-disable-next-line no-underscore-dangle
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider("placeholder"),
      isTokenAutoRefreshEnabled: true,
    });
  }
}

export const db   = getFirestore(app);
export const auth = getAuth(app);
