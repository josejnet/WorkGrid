import { useState, useEffect } from "react";
import { C } from "../../lib/theme";
import { getAllLogs } from "../../services/logService";
import { useApp } from "../../context/AppContext";

function fmtTs(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })
    + " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

const ACTION_LABELS = {
  task_created:           "Tarea creada",
  task_edited:            "Tarea editada",
  task_deleted:           "Tarea eliminada",
  task_auto_archived:     "Auto-archivada",
  task_status_changed:    "Estado cambiado",
  task_assigned:          "Tarea asignada",
  task_moved:             "Tarea movida",
  project_created:        "Proyecto creado",
  project_edited:         "Proyecto editado",
  project_archived:       "Proyecto archivado",
  project_unarchived:     "Proyecto restaurado",
  project_access_changed: "Acceso cambiado",
  user_created:           "Usuario creado",
  user_edited:            "Usuario editado",
  user_activated:         "Usuario activado",
  user_deactivated:       "Usuario desactivado",
  user_deleted:           "Usuario eliminado",
};

const ACTION_ICONS = {
  task_created:           "✅",
  task_edited:            "✏️",
  task_deleted:           "🗑️",
  task_auto_archived:     "📦",
  task_status_changed:    "🔄",
  task_assigned:          "👤",
  task_moved:             "📁",
  project_created:        "🆕",
  project_edited:         "📝",
  project_archived:       "📦",
  project_unarchived:     "♻️",
  project_access_changed: "🔐",
  user_created:           "👤",
  user_edited:            "✏️",
  user_activated:         "✅",
  user_deactivated:       "🚫",
  user_deleted:           "🗑️",
};

const PAGE_SIZE = 100;

export default function LogDetallado() {
  const { activeProjects, users } = useApp();
  const [logs,      setLogs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageLimit, setPageLimit] = useState(PAGE_SIZE);
  const [hasMore,   setHasMore]   = useState(true);

  // Filters
  const [filterProject, setFilterProject] = useState("");
  const [filterUser,    setFilterUser]    = useState("");
  const [filterAction,  setFilterAction]  = useState("");
  const [filterFrom,    setFilterFrom]    = useState("");
  const [filterTo,      setFilterTo]      = useState("");

  useEffect(() => {
    setLoading(true);
    getAllLogs(pageLimit).then(data => {
      setLogs(data);
      setHasMore(data.length >= pageLimit);
      setLoading(false);
    });
  }, [pageLimit]);

  async function handleLoadMore() {
    setLoadingMore(true);
    const next = pageLimit + PAGE_SIZE;
    const data = await getAllLogs(next);
    setLogs(data);
    setHasMore(data.length >= next);
    setPageLimit(next);
    setLoadingMore(false);
  }

  // Derived filter options
  const performers = [...new Set(logs.map(l => l.performedBy).filter(Boolean))].sort();
  const actions    = [...new Set(logs.map(l => l.action).filter(Boolean))].sort();

  // Apply filters client-side
  const filtered = logs.filter(l => {
    if (filterProject && l.projectId !== filterProject) return false;
    if (filterUser    && l.performedBy !== filterUser)  return false;
    if (filterAction  && l.action !== filterAction)     return false;
    if (filterFrom    && l.timestamp < filterFrom)      return false;
    if (filterTo      && l.timestamp > filterTo + "T23:59:59") return false;
    return true;
  });

  const inputS = {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 7,
    padding: "6px 10px", color: C.text, fontSize: 12, fontFamily: "inherit",
    outline: "none",
  };

  const hasFilters = filterProject || filterUser || filterAction || filterFrom || filterTo;

  return (
    <div>
      {/* ── filters bar ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={inputS}>
          <option value="">Todos los proyectos</option>
          {activeProjects.map(p => <option key={p._fid} value={p._fid}>{p.nombre}</option>)}
        </select>

        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={inputS}>
          <option value="">Todos los usuarios</option>
          {performers.map(email => {
            const u = users.find(x => x.email === email);
            return <option key={email} value={email}>{u?.name || email}</option>;
          })}
        </select>

        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={inputS}>
          <option value="">Todas las acciones</option>
          {actions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: C.muted }}>Desde</span>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ ...inputS, width: 130 }} />
          <span style={{ fontSize: 11, color: C.muted }}>hasta</span>
          <input type="date" value={filterTo}   onChange={e => setFilterTo(e.target.value)}   style={{ ...inputS, width: 130 }} />
        </div>

        {hasFilters && (
          <button
            onClick={() => { setFilterProject(""); setFilterUser(""); setFilterAction(""); setFilterFrom(""); setFilterTo(""); }}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
          >
            ✕ Limpiar filtros
          </button>
        )}

        <span style={{ marginLeft: "auto", fontSize: 11, color: C.muted, flexShrink: 0 }}>
          {loading ? "Cargando…" : `${filtered.length} de ${logs.length} entradas`}
        </span>
      </div>

      {/* ── log table ── */}
      {loading ? (
        <div style={{ color: C.muted, fontSize: 13, padding: "40px 0", textAlign: "center" }}>Cargando log…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: C.muted, fontSize: 13, padding: "40px 0", textAlign: "center" }}>Sin entradas con los filtros seleccionados.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          {/* header */}
          <div style={{ display: "grid", gridTemplateColumns: "120px 130px 1fr 110px 120px", gap: 0, background: C.panel, padding: "8px 14px", borderBottom: `1px solid ${C.border}` }}>
            {["Fecha", "Acción", "Detalle", "Realizado por", "Afectado"].map(h => (
              <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</div>
            ))}
          </div>

          {filtered.map((l, i) => {
            const icon = ACTION_ICONS[l.action] ?? "•";
            const performer = users.find(u => u.email === l.performedBy);
            const affected  = users.find(u => u.email === l.affectedUser);
            const isEven    = i % 2 === 0;
            return (
              <div
                key={l._fid ?? i}
                style={{
                  display: "grid", gridTemplateColumns: "120px 130px 1fr 110px 120px",
                  gap: 0, padding: "9px 14px",
                  background: isEven ? "transparent" : C.card + "55",
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                  alignItems: "center",
                }}
              >
                {/* fecha */}
                <div style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>{fmtTs(l.timestamp)}</div>

                {/* acción */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 12, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>{ACTION_LABELS[l.action] || l.action}</div>
                    {l.projectName && (
                      <div style={{ fontSize: 9, color: C.orange, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>{l.projectName}</div>
                    )}
                  </div>
                </div>

                {/* detalle */}
                <div style={{ minWidth: 0 }}>
                  {l.taskTitle && (
                    <div style={{ fontSize: 11, color: C.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", gap: 5, marginBottom: 2 }}>
                      {l.taskShortId && <span style={{ color: C.blue, fontFamily: "monospace", fontWeight: 700, flexShrink: 0 }}>{l.taskShortId}</span>}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.taskTitle}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.detail || "—"}
                  </div>
                </div>

                {/* realizado por */}
                <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {performer?.name || l.performedBy || "—"}
                </div>

                {/* afectado */}
                <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {affected?.name || l.affectedUser || "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── load more ── */}
      {!loading && hasMore && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              background: "none", border: `1px solid ${C.border2}`, borderRadius: 8,
              color: C.muted, fontSize: 12, padding: "7px 20px", cursor: "pointer",
              fontFamily: "inherit", opacity: loadingMore ? 0.5 : 1,
            }}
          >
            {loadingMore ? "Cargando…" : "Cargar más entradas"}
          </button>
        </div>
      )}
    </div>
  );
}
