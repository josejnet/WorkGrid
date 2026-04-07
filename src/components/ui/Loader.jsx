import { C } from "../../lib/theme";

export default function Loader() {
  return (
    <div style={{
      background: C.bg, minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center", color: C.muted }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
        <div style={{ fontSize: 13 }}>Cargando...</div>
      </div>
    </div>
  );
}
