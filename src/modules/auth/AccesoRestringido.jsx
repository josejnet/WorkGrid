import { C } from "../../lib/theme";
import Btn from "../../components/ui/Btn";
import { useApp } from "../../context/AppContext";

export default function AccesoRestringido() {
  const { session, logout } = useApp();
  return (
    <div style={{
      background: C.bg, minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter',sans-serif", color: C.muted,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <div style={{ fontSize: 16, color: C.text, marginBottom: 8 }}>Acceso restringido</div>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Necesitas rol de administrador.</div>
        <div style={{ fontSize: 11, marginBottom: 24 }}>{session?.email}</div>
        <Btn onClick={logout}>← Salir</Btn>
      </div>
    </div>
  );
}
