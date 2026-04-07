import { createContext, useContext, useState, useEffect } from "react";
import { onAuthChange, loginWithGoogle, logout, fetchSession } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(undefined); // undefined = checking
  const [session,  setSession]  = useState(null);

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      if (!u) { setAuthUser(null); setSession(null); return; }
      setAuthUser(u);
      try {
        const s = await fetchSession(u);
        setSession(s);
      } catch {
        // Firestore unavailable — reset to login screen
        setAuthUser(null);
        setSession(null);
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ authUser, session, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
