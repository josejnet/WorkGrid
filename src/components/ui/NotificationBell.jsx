import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../../lib/theme";
import { useApp } from "../../context/AppContext";

function fmtTs(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })
    + " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function NotificationBell() {
  const { notifications, handleMarkRead, handleMarkAllRead } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const unread = notifications.filter(n => !n.read);
  const unreadCount = unread.length;

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleClickNotif(n) {
    if (!n.read) await handleMarkRead(n._fid);
    setOpen(false);
    if (n.projectId) navigate(`/projects/${n.projectId}`, { state: { openTaskFid: n.taskFid } });
  }

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Notificaciones"
        style={{
          position: "relative", background: "none", border: "none",
          cursor: "pointer", padding: "6px 8px", borderRadius: 8,
          color: unreadCount > 0 ? C.orange : C.muted,
          fontSize: 18, lineHeight: 1, display: "flex", alignItems: "center",
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            background: C.red, color: "#fff",
            borderRadius: "50%", fontSize: 9, fontWeight: 700,
            minWidth: 16, height: 16, display: "flex", alignItems: "center",
            justifyContent: "center", lineHeight: 1, padding: "0 3px",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: "fixed", left: 228, top: 10,
          width: 340, maxHeight: 480,
          background: C.panel, border: `1px solid ${C.border2}`,
          borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          zIndex: 200, display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px 10px",
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
              🔔 Notificaciones
              {unreadCount > 0 && (
                <span style={{ background: C.red + "33", color: C.red, borderRadius: 10, fontSize: 10, padding: "1px 7px", fontWeight: 700 }}>
                  {unreadCount} nueva{unreadCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{ background: "none", border: "none", color: C.blue, fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
              >
                Marcar todo leído
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: C.muted, fontSize: 12 }}>
                Sin notificaciones
              </div>
            ) : (
              notifications.slice(0, 10).map((n, i) => (
                <div
                  key={n._fid}
                  onClick={() => handleClickNotif(n)}
                  style={{
                    padding: "11px 16px",
                    borderBottom: i < Math.min(notifications.length, 10) - 1 ? `1px solid ${C.border}` : "none",
                    background: n.read ? "transparent" : C.orange + "0a",
                    cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.border + "55"}
                  onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : C.orange + "0a"}
                >
                  {/* unread dot */}
                  <div style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 4,
                    background: n.read ? "transparent" : C.orange,
                    border: n.read ? `1px solid ${C.border2}` : "none",
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* task id + title */}
                    <div style={{ fontSize: 12, color: C.text, fontWeight: n.read ? 400 : 600, lineHeight: 1.4, marginBottom: 3 }}>
                      {n.taskShortId && (
                        <span style={{ color: C.blue, fontFamily: "monospace", fontWeight: 700, marginRight: 5 }}>
                          {n.taskShortId}
                        </span>
                      )}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {n.taskTitle || "Tarea sin título"}
                      </span>
                    </div>

                    {/* project */}
                    {n.projectName && (
                      <div style={{ fontSize: 10, color: C.orange, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.projectName}
                      </div>
                    )}

                    {/* assigned by + time */}
                    <div style={{ fontSize: 10, color: C.muted, display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Asignada por {n.assignedByName || n.assignedBy || "—"}
                      </span>
                      <span style={{ flexShrink: 0, whiteSpace: "nowrap" }}>{fmtTs(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
