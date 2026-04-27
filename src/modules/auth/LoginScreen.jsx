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

const DEMO_EMAIL    = import.meta.env.VITE_DEMO_EMAIL    ?? "";
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? "";
const IS_DEMO       = !!(DEMO_EMAIL && DEMO_PASSWORD);

export default function LoginScreen({ onLogin, onEmailLogin }) {
  const [loading,  setLoading]  = useState(false);
  const [email,    setEmail]    = useState(IS_DEMO ? DEMO_EMAIL    : "");
  const [password, setPassword] = useState(IS_DEMO ? DEMO_PASSWORD : "");
  const [error,    setError]    = useState("");
  const [isDark,   setIsDark]   = useState(() => localStorage.getItem("theme") !== "light");

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    setLoading(true);
    try {
      await onEmailLogin(email.trim(), password);
    } catch (err) {
      setError("Credenciales incorrectas. Comprueba el email y la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await onLogin();
    } finally {
      setLoading(false);
    }
  }

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

        {/* ── Demo notice ── */}
        {IS_DEMO && (
          <div style={{
            background: isDark ? "rgba(251,191,36,0.08)" : "rgba(251,191,36,0.1)",
            border: `1px solid ${isDark ? "rgba(251,191,36,0.3)" : "rgba(251,191,36,0.4)"}`,
            borderRadius: 10, padding: "10px 14px", marginBottom: 14,
          }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: isDark ? "#fbbf24" : "#92400e", marginBottom: 3 }}>
              Entorno de demostración
            </div>
            <div style={{ fontSize: 11, color: isDark ? "#fde68a" : "#78350f", lineHeight: 1.6 }}>
              Esta instancia es solo para exploración con fines educativos. Los datos son de ejemplo y pueden
              reiniciarse en cualquier momento. Para uso real, instala tu propia instancia.
            </div>
          </div>
        )}

        {/* ── Email / password form ── */}
        {onEmailLogin && (
          <form onSubmit={handleEmailSubmit} style={{ marginBottom: 10 }}>
            {IS_DEMO && (
              <div style={{
                background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
                border: `1px solid ${isDark ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.25)"}`,
                borderRadius: 10, padding: "8px 12px", marginBottom: 10,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 13 }}>🧪</span>
                <span style={{ fontSize: 11, color: isDark ? "#a5b4fc" : "#4338ca" }}>
                  Credenciales de demo precargadas — pulsa <strong>Entrar</strong> para explorar WorkGrid
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                required
                style={{
                  flex: 1, background: C.card, color: C.text,
                  border: `1px solid ${C.border2}`, borderRadius: 10,
                  padding: "10px 12px", fontSize: 13, outline: "none",
                  fontFamily: "'Inter',sans-serif",
                }}
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                required
                style={{
                  flex: 1, background: C.card, color: C.text,
                  border: `1px solid ${C.border2}`, borderRadius: 10,
                  padding: "10px 12px", fontSize: 13, outline: "none",
                  fontFamily: "'Inter',sans-serif",
                }}
              />
            </div>

            {error && (
              <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8, paddingLeft: 2 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                width: "100%",
                background: btnBg,
                color: btnColor,
                border: "none", borderRadius: 12,
                padding: "13px 0", fontWeight: 700, fontSize: 15,
                cursor: loading ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "background 0.2s",
                opacity: (!email || !password) ? 0.6 : 1,
              }}
            >
              {loading ? "⏳ Conectando..." : "Entrar"}
            </button>
          </form>
        )}

        {/* ── Separator ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 11, color: C.muted }}>o</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* ── Google Sign-in ── */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: "100%",
            background: "transparent",
            color: C.text,
            border: `1px solid ${C.border2}`, borderRadius: 12,
            padding: "11px 0", fontWeight: 600, fontSize: 14,
            cursor: loading ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            transition: "background 0.2s",
          }}
        >
          <img src="/workgrid-mark.svg" alt="" style={{ width: 18, height: 18, objectFit: "contain", borderRadius: 3 }} />
          Entrar con Google
        </button>

      </div>
    </div>
  );
}
