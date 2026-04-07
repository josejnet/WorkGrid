import { C } from "../../lib/theme";
import Btn from "../../components/ui/Btn";
import { useApp } from "../../context/AppContext";

export default function AccesoPendiente() {
  const { session, logout } = useApp();

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter',sans-serif",
    }}>
      <div style={{
        background: C.panel, borderRadius: 18,
        border: `1px solid ${C.border2}`,
        padding: "44px 48px", maxWidth: 480, textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontWeight: 700, fontSize: 22, color: C.text, marginBottom: 10 }}>
          Cuenta pendiente de activación
        </div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 28 }}>
          Tu cuenta (<span style={{ color: C.orange }}>{session?.email}</span>) ha sido registrada correctamente.<br />
          Un administrador debe activarla antes de que puedas acceder a la aplicación.
        </div>
        <Btn color={C.border2} onClick={logout}>← Cerrar sesión</Btn>
      </div>
    </div>
  );
}
