import { useState } from "react";
import { C } from "../../lib/theme";
import { SUPER_ADMIN } from "../../lib/constants";
import { useApp } from "../../context/AppContext";

export default function ProjectAccessManager({ project, users, inline = false }) {
  const { handleSetUserAccess, isAdmin } = useApp();
  const [expanded, setExpanded] = useState(inline); // inline = always expanded
  const [addMode, setAddMode]   = useState(null); // "read" | "write" | null

  const readUsers  = project.readUsers  || [];
  const writeUsers = project.writeUsers || [];

  // Active users that don't already have any access to this project
  const withoutAccess = users.filter(u =>
    u.email !== SUPER_ADMIN &&
    u.active !== false &&
    !readUsers.includes(u.email) &&
    !writeUsers.includes(u.email)
  );

  function chipStyle(color) {
    return {
      display: "inline-flex", alignItems: "center", gap: 4,
      background: color + "22", color,
      border: `1px solid ${color}44`,
      borderRadius: 6, fontSize: 11, padding: "3px 8px", fontWeight: 600,
    };
  }

  function iconBtnStyle() {
    return {
      background: "none", border: "none", cursor: "pointer",
      color: C.muted, fontSize: 11, padding: "0 2px", lineHeight: 1,
    };
  }

  return (
    <div style={inline ? {} : {
      background: C.card, borderRadius: 12,
      border: `1px solid ${C.border}`, overflow: "hidden",
    }}>
      {/* ── header (hidden in inline mode) ── */}
      {!inline && <button
        onClick={() => { setExpanded(v => !v); setAddMode(null); }}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px", background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        }}
      >
        <span style={{
          width: 10, height: 10, borderRadius: "50%",
          background: project.color || C.orange,
          display: "inline-block", flexShrink: 0,
        }} />
        <span style={{ fontWeight: 700, fontSize: 13, color: C.text, flex: 1 }}>
          {project.nombre}
        </span>
        <span style={{ fontSize: 11, color: C.muted }}>
          {writeUsers.length} escritura · {readUsers.length} lectura
        </span>
        <span style={{ fontSize: 10, color: C.muted, marginLeft: 8 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>}

      {expanded && (
        <div style={{ borderTop: inline ? "none" : `1px solid ${C.border}`, padding: "14px 18px" }}>

          {/* Write users */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: C.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              ✏️ Escritura
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              {writeUsers.length === 0 && (
                <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>Sin usuarios con escritura</span>
              )}
              {writeUsers.map(email => {
                const u = users.find(x => x.email === email);
                return (
                  <span key={email} style={chipStyle(C.green)}>
                    {u?.name || email}
                    {isAdmin && (
                      <>
                        <button
                          style={iconBtnStyle()}
                          title="Cambiar a lectura"
                          onClick={() => handleSetUserAccess(project._fid, email, "read")}
                        >↓</button>
                        <button
                          style={iconBtnStyle()}
                          title="Quitar acceso"
                          onClick={() => handleSetUserAccess(project._fid, email, "none")}
                        >✕</button>
                      </>
                    )}
                  </span>
                );
              })}
              {isAdmin && addMode !== "write" && (
                <button
                  onClick={() => setAddMode("write")}
                  style={{
                    background: C.green + "22", color: C.green,
                    border: `1px dashed ${C.green}66`,
                    borderRadius: 6, fontSize: 11, padding: "3px 10px",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  + Añadir
                </button>
              )}
            </div>
          </div>

          {/* Read users */}
          <div style={{ marginBottom: addMode ? 14 : 0 }}>
            <div style={{ fontSize: 10, color: C.blue, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              👁 Lectura
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              {readUsers.length === 0 && (
                <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>Sin usuarios de solo lectura</span>
              )}
              {readUsers.map(email => {
                const u = users.find(x => x.email === email);
                return (
                  <span key={email} style={chipStyle(C.blue)}>
                    {u?.name || email}
                    {isAdmin && (
                      <>
                        <button
                          style={iconBtnStyle()}
                          title="Cambiar a escritura"
                          onClick={() => handleSetUserAccess(project._fid, email, "write")}
                        >↑</button>
                        <button
                          style={iconBtnStyle()}
                          title="Quitar acceso"
                          onClick={() => handleSetUserAccess(project._fid, email, "none")}
                        >✕</button>
                      </>
                    )}
                  </span>
                );
              })}
              {isAdmin && addMode !== "read" && (
                <button
                  onClick={() => setAddMode("read")}
                  style={{
                    background: C.blue + "22", color: C.blue,
                    border: `1px dashed ${C.blue}66`,
                    borderRadius: 6, fontSize: 11, padding: "3px 10px",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  + Añadir
                </button>
              )}
            </div>
          </div>

          {/* Add user picker */}
          {addMode && isAdmin && (
            <div style={{
              background: C.panel, borderRadius: 8,
              border: `1px solid ${C.border}`, padding: "12px 14px", marginTop: 12,
            }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                Añadir con acceso de {addMode === "write" ? "escritura" : "lectura"}:
              </div>
              {withoutAccess.length === 0 ? (
                <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>
                  Todos los usuarios activos ya tienen acceso.
                </span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {withoutAccess.map(u => (
                    <button
                      key={u._fid}
                      onClick={() => { handleSetUserAccess(project._fid, u.email, addMode); setAddMode(null); }}
                      style={{
                        background: C.border2, color: C.text,
                        border: `1px solid ${C.border}`,
                        borderRadius: 6, fontSize: 11, padding: "4px 10px",
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {u.name || u.email}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setAddMode(null)}
                style={{
                  background: "none", border: "none", color: C.muted,
                  fontSize: 11, cursor: "pointer", fontFamily: "inherit", marginTop: 8,
                }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
