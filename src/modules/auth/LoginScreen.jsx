import { useState } from "react";
import { C, applyTheme } from "../../lib/theme";

const FEATURES = [
  { icon: "📊", title: "Dashboard KPIs",      desc: "Contadores en tiempo real por estado, vencidas y bugs abiertos." },
  { icon: "🗂",  title: "Kanban",              desc: "Columnas por estado con cards priorizadas y filtros por responsable." },
  { icon: "📈", title: "Métrica PER",          desc: "Porcentaje de Evolución Real ponderado por prioridad y tiempo." },
  { icon: "👥", title: "Equipos",              desc: "Asignación rápida y control de acceso por proyecto y rol." },
  { icon: "📦", title: "Auto-changelog",       desc: "Producción → Changelog automáticamente tras 7 días." },
  { icon: "📥", title: "Importación CSV",      desc: "Carga masiva de tareas con validación y previsualización previa." },
  { icon: "🔔", title: "Actividad y alertas",  desc: "Log completo de cambios y notificaciones por tarea vencida o asignada.", wide: true },
];

export default function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") !== "light");

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  // Sign-in button: high contrast in both themes
  const btnBg    = loading ? C.border2 : (isDark ? "#ffffff" : "#0f172a");
  const btnColor = isDark ? "#0f172a" : "#ffffff";

  return (
    <div style={{
      background: C.bg, minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter',sans-serif", padding: "24px 16px",
    }}>
      <div style={{
        width: "100%", maxWidth: 660,
        background: C.panel, borderRadius: 22,
        padding: "30px 32px 26px",
        border: `1px solid ${C.border}`,
        boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.1)",
      }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <img
              src="/workgrid-mark.svg"
              alt="WorkGrid"
              style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 8 }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: 22, color: C.text, letterSpacing: -0.5, lineHeight: 1.1 }}>WorkGrid</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Gestión multiproyecto de tareas y desarrollo</div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            title={isDark ? "Modo claro" : "Modo oscuro"}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 9, padding: "7px 11px",
              color: C.text, fontSize: 16, cursor: "pointer",
              lineHeight: 1, flexShrink: 0,
              transition: "background 0.2s, border-color 0.2s",
            }}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>

        <div style={{ height: 1, background: C.border, marginBottom: 18 }} />

        {/* ── Features grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 22 }}>
          {FEATURES.map(f => (
            <div
              key={f.title}
              style={{
                gridColumn: f.wide ? "1 / -1" : undefined,
                background: C.card,
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                padding: "10px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{f.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 11, color: C.text }}>{f.title}</span>
              </div>
              <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.55 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Sign-in button ── */}
        <button
          onClick={async () => { setLoading(true); await onLogin(); setLoading(false); }}
          disabled={loading}
          style={{
            width: "100%",
            background: btnBg,
            color: btnColor,
            border: "none", borderRadius: 12,
            padding: "13px 0", fontWeight: 700, fontSize: 15,
            cursor: loading ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            transition: "background 0.2s",
          }}
        >
          {loading
            ? "⏳ Conectando..."
            : <>
                <img src="/workgrid-mark.svg" alt="" style={{ width: 20, height: 20, objectFit: "contain", borderRadius: 4 }} />
                Entrar con Google
              </>}
        </button>

      </div>
    </div>
  );
}
