import { useState } from "react";
import { useLocation } from "react-router-dom";
import { C } from "../../lib/theme";
import { SUPER_ADMIN } from "../../lib/constants";
import Badge from "../../components/ui/Badge";
import Btn from "../../components/ui/Btn";
import UserModal from "./UserModal";
import MaestroProyectos from "./MaestroProyectos";
import LogDetallado from "./LogDetallado";
import { useApp } from "../../context/AppContext";

export default function Settings() {
  const { users, activeProjects, isAdmin, handleSaveUser, handleDeleteUser, themeMode, handleToggleTheme } = useApp();
  const location = useLocation();
  const [tab, setTab]               = useState(location.state?.tab || "users");
  const [userModal, setUserModal]   = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const pending = users.filter(u => u.active === false && u.email !== SUPER_ADMIN);

  function openEditUser(u) { setEditingUser(u); setUserModal(true); }
  function closeUserModal() { setUserModal(false); setEditingUser(null); }

  const tabStyle = (t) => ({
    padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
    background: tab === t ? C.orange + "22" : "transparent",
    color: tab === t ? C.orange : C.muted,
    fontWeight: tab === t ? 700 : 400,
    fontSize: 13, fontFamily: "inherit",
    borderBottom: tab === t ? `2px solid ${C.orange}` : "2px solid transparent",
  });

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: C.text }}>⚙️ Configuración</div>
        <button
          onClick={handleToggleTheme}
          title={themeMode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: themeMode === "light" ? C.orange + "18" : C.border2,
            border: `1px solid ${themeMode === "light" ? C.orange + "55" : C.border}`,
            borderRadius: 20, padding: "5px 14px",
            color: themeMode === "light" ? C.orange : C.muted,
            fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
            transition: "all .2s",
          }}
        >
          {themeMode === "light" ? "☀️ Claro" : "🌙 Oscuro"}
        </button>
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 24 }}>
        Maestro de usuarios · Maestro de proyectos · Log detallado
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
        <button style={tabStyle("users")} onClick={() => setTab("users")}>
          👥 Maestro de usuarios
          {pending.length > 0 && (
            <span style={{ background: C.orange, color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 7px", marginLeft: 7, fontWeight: 700 }}>
              {pending.length}
            </span>
          )}
        </button>
        <button style={tabStyle("projects")} onClick={() => setTab("projects")}>📋 Maestro de proyectos</button>
        <button style={tabStyle("log")}      onClick={() => setTab("log")}>📜 Log detallado</button>
      </div>

      {/* ── Maestro de usuarios ── */}
      {tab === "users" && (
        <div>
          {/* Pending activation banner */}
          {pending.length > 0 && (
            <div style={{
              background: C.orange + "18", border: `1px solid ${C.orange}44`,
              borderRadius: 10, padding: "14px 16px", marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.orange, marginBottom: 10 }}>
                ⏳ {pending.length} usuario{pending.length !== 1 ? "s" : ""} pendiente{pending.length !== 1 ? "s" : ""} de activación
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pending.map(u => (
                  <div key={u._fid} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: C.card, borderRadius: 8, padding: "8px 12px",
                  }}>
                    {u.photoURL
                      ? <img src={u.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.border2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>👤</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{u.name || u.email}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{u.email}</div>
                    </div>
                    <Btn size="sm" color={C.green} onClick={() => handleSaveUser({ ...u, active: true })}>✓ Activar</Btn>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <div style={{ marginBottom: 16 }}>
              <Btn onClick={() => { setEditingUser(null); setUserModal(true); }}>+ Nuevo usuario</Btn>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {users.map(u => {
              const isLocked = u.email === SUPER_ADMIN;
              return (
                <div key={u._fid} style={{
                  background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
                  padding: "13px 16px", display: "flex", alignItems: "center", gap: 12,
                  opacity: u.active === false ? 0.6 : 1,
                }}>
                  {u.photoURL
                    ? <img src={u.photoURL} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.border2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>👤</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{u.name || u.email}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{u.email}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    {isLocked && <Badge color={C.orange}>Super Admin 🔒</Badge>}
                    {!isLocked && <Badge color={u.active === false ? C.muted : C.green}>{u.active === false ? "Pendiente" : "Activo"}</Badge>}
                    {!isLocked && <Badge color={u.role === "admin" ? C.blue : C.muted}>{u.role || "user"}</Badge>}
                    {isAdmin && (
                      <Btn size="sm" color={C.border2} onClick={() => openEditUser(u)}>✏️</Btn>
                    )}
                    {isAdmin && !isLocked && (
                      <Btn size="sm" color={C.muted} onClick={() => handleDeleteUser(u._fid)}>🗑</Btn>
                    )}
                  </div>
                </div>
              );
            })}
            {users.length === 0 && (
              <div style={{ textAlign: "center", color: C.muted, padding: "40px 0", fontSize: 13 }}>
                No hay usuarios registrados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Maestro de proyectos ── */}
      {tab === "projects" && <MaestroProyectos />}

      {/* ── Log detallado ── */}
      {tab === "log" && <LogDetallado />}

      {userModal && (
        <UserModal
          user={editingUser}
          projects={activeProjects}
          onClose={closeUserModal}
          onSave={async (data) => { await handleSaveUser(data); closeUserModal(); }}
        />
      )}
    </div>
  );
}
