import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { C } from "../../lib/theme";
import NavBtn from "../ui/NavBtn";
import Btn from "../ui/Btn";
import NotificationBell from "../ui/NotificationBell";
import { useApp } from "../../context/AppContext";

export default function Sidebar({ onNewProject, isMobile = false, isOpen = false, onClose }) {
  const { accessibleProjects, archivedProjects, projects, session, isAdmin, logout, themeMode, handleToggleTheme } = useApp();
  const [showArchived, setShowArchived] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  const path = location.pathname;
  const isDark = themeMode === "dark";

  const activeProjectId = path.startsWith("/projects/") ? path.split("/")[2] : null;
  const activeProject   = activeProjectId ? projects.find(p => p._fid === activeProjectId) : null;
  const canCreateTask   = activeProject && !activeProject.archived;

  return (
    <>
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9 }}
        />
      )}

      <div style={{
        width: 220, background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0,
        zIndex: 10, overflowY: "auto",
        transform: isMobile ? (isOpen ? "translateX(0)" : "translateX(-100%)") : undefined,
        transition: isMobile ? "transform 0.25s ease" : undefined,
      }}>

        {/* ── Logo ── */}
        <div style={{ padding: "16px 14px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: C.orange + "22",
              border: `1px solid ${C.orange}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
            }}>
              <img
                src="/workgrid-mark.svg"
                alt="WorkGrid"
                style={{ width: 20, height: 20, objectFit: "contain", borderRadius: 4 }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.text, lineHeight: 1.1 }}>WorkGrid</div>
              <div style={{ fontSize: 9.5, color: C.muted, fontWeight: 600, letterSpacing: 0.5, marginTop: 1 }}>MULTIPROYECTO</div>
            </div>
            {isMobile
              ? <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: 0 }}>✕</button>
              : <NotificationBell />
            }
          </div>

          {/* ── Theme toggle ── */}
          <button
            onClick={handleToggleTheme}
            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            style={{
              marginTop: 12,
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "8px 12px", borderRadius: 9,
              border: `1px solid ${isDark ? C.border2 : C.border2 + "cc"}`,
              background: isDark ? C.card : C.panel,
              color: isDark ? C.text : C.text,
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? C.border : "#f6f9fc"; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? C.card : C.panel; }}
          >
            <span style={{ fontSize: 18, lineHeight: 1, color: C.orange }}>{isDark ? "☀️" : "🌙"}</span>
            {isDark ? "Modo claro" : "Modo oscuro"}
          </button>
        </div>

        {/* ── Nav ── */}
        <nav style={{ padding: "8px 8px 0", flex: 1 }}>

          {/* Main nav items */}
          <NavBtn active={path === "/dashboard"} onClick={() => navigate("/dashboard")} icon="📊" label="Dashboard" />
          {isAdmin && (
            <NavBtn active={path.startsWith("/settings")} onClick={() => navigate("/settings")} icon="⚙️" label="Configuración" />
          )}

          {/* Divider + section label */}
          <div style={{ margin: "10px 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ height: 1, background: C.border, flex: 1 }} />
            <span style={{
              fontSize: 9.5, color: C.muted, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: 1, flexShrink: 0,
            }}>
              Proyectos
            </span>
            <div style={{ height: 1, background: C.border, flex: 1 }} />
          </div>

          {accessibleProjects.map(p => (
            <NavBtn
              key={p._fid}
              active={path === `/projects/${p._fid}`}
              onClick={() => navigate(`/projects/${p._fid}`)}
              icon={
                <span style={{
                  width: 9, height: 9, borderRadius: "50%",
                  background: p.color || C.orange,
                  display: "inline-block", flexShrink: 0,
                }} />
              }
              label={p.nombre}
            />
          ))}

          {/* Nueva tarea contextual */}
          {canCreateTask && (
            <button
              onClick={() => navigate(`/projects/${activeProjectId}`, { state: { openNewTask: true } })}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "6px 12px", borderRadius: 8, marginTop: 6,
                border: `1px solid ${isDark ? C.blue + "66" : C.blue + "40"}`,
                cursor: "pointer",
                background: isDark ? C.blue + "1c" : "#edf4ff",
                color: isDark ? "#b8d4ff" : "#1d4ed8",
                fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? C.blue + "30" : "#dbeafe"}
              onMouseLeave={e => e.currentTarget.style.background = isDark ? C.blue + "1c" : "#edf4ff"}
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
              Nueva tarea
            </button>
          )}

          {/* Nuevo proyecto */}
          {isAdmin && (
            <button
              onClick={onNewProject}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "6px 12px", borderRadius: 8,
                border: "none",
                cursor: "pointer", background: "transparent",
                color: C.muted, fontSize: 12, fontFamily: "inherit",
                marginTop: 4, marginBottom: 2,
                transition: "color 0.12s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.text}
              onMouseLeave={e => e.currentTarget.style.color = C.muted}
            >
              <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.7 }}>＋</span>
              Nuevo proyecto
            </button>
          )}

          {/* Archivados */}
          {archivedProjects.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <button
                onClick={() => setShowArchived(v => !v)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", background: "none", border: "none",
                  color: C.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                  opacity: 0.7,
                }}
              >
                <span style={{ fontSize: 9 }}>{showArchived ? "▼" : "▶"}</span>
                Archivados ({archivedProjects.length})
              </button>
              {showArchived && archivedProjects.map(p => (
                <NavBtn
                  key={p._fid}
                  active={path === `/projects/${p._fid}`}
                  onClick={() => navigate(`/projects/${p._fid}`)}
                  icon={<span style={{ width: 8, height: 8, borderRadius: "50%", background: C.muted, display: "inline-block", flexShrink: 0, opacity: 0.5 }} />}
                  label={p.nombre}
                  muted
                />
              ))}
            </div>
          )}
        </nav>

        {/* ── Footer ── */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 14px" }}>
          {/* User */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: C.orange + "22", border: `1px solid ${C.orange}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: C.orange, flexShrink: 0,
            }}>
              {(session?.name || session?.email || "?")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session?.name || session?.email}
              </div>
              {session?.name && (
                <div style={{ fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session.email}
                </div>
              )}
            </div>
          </div>

          <Btn onClick={logout} color={C.border2} size="sm" style={{ width: "100%" }}>
            Salir →
          </Btn>
        </div>

      </div>
    </>
  );
}
