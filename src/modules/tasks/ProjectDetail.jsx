import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { C } from "../../lib/theme";
import { TALLER_ESTADOS, ESTADO_COLORS, PRIO_ORDER, TIPO_ICONS, PRIO_COLORS } from "../../lib/constants";
import { fmtDate } from "../../lib/utils";
import Badge from "../../components/ui/Badge";
import Btn from "../../components/ui/Btn";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import { useApp } from "../../context/AppContext";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const openTaskFid  = location.state?.openTaskFid  ?? null;
  const openNewTask  = location.state?.openNewTask  ?? false;
  const {
    projects, tareas, users, session, isAdmin,
    handleSaveTarea, handleUpdateEstado, handleArchivar, handleMove, handleQuickAssign,
    handleDeleteTarea, handleBulkDeleteTareas, handleSavePrompt, handleImportTareas,
  } = useApp();

  const [modal,         setModal]         = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [verArchivados, setVerArchivados] = useState(false);
  const [search,        setSearch]        = useState("");
  const [filterEstado,  setFilterEstado]  = useState("");
  const [filterResp,    setFilterResp]    = useState("");
  const [filterUsuario, setFilterUsuario] = useState("");
  const [promptTask,       setPromptTask]       = useState(null);
  const [promptText,       setPromptText]       = useState("");
  const [promptSaving,     setPromptSaving]     = useState(false);
  const [promptCopied,     setPromptCopied]     = useState(false);
  const [archivedView,     setArchivedView]     = useState(null); // tarea archivada en modal read-only
  const [importOpen,       setImportOpen]       = useState(false);
  const [importTareas,     setImportTareas]     = useState(null); // parsed JSON array
  const [importFileName,   setImportFileName]   = useState("");
  const [importProgress,   setImportProgress]   = useState(null); // {done, total}
  const [importError,      setImportError]      = useState("");
  const [cleanFromId,      setCleanFromId]      = useState("");   // e.g. "CLUB-038"
  const [cleanProgress,    setCleanProgress]    = useState(null); // {done, total} | "done"
  const fileInputRef = useRef(null);

  // Abre el modal cuando el sidebar navega con state.openNewTask
  useEffect(() => {
    if (location.state?.openNewTask) {
      setEditing(null);
      setModal(true);
      window.history.replaceState({}, "");
    }
  }, [location.key]);

  const proyecto = projects.find(p => p._fid === id);

  if (!proyecto) {
    return (
      <div style={{ padding: 40, color: C.muted, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
        <div>Proyecto no encontrado.</div>
        <Btn style={{ marginTop: 16 }} onClick={() => navigate("/projects")}>← Volver</Btn>
      </div>
    );
  }

  const tareasDelProyecto = tareas.filter(t => t.projectId === id);
  const activas           = tareasDelProyecto.filter(t => t.estado !== "Archivado");
  const archivadas        = tareasDelProyecto.filter(t => t.estado === "Archivado");
  const enProd            = activas.filter(t => t.estado === "Producción");

  // User filter — applied only to the kanban; stats remain project-wide
  const activasFiltradas  = filterUsuario
    ? activas.filter(t => t.responsable === filterUsuario)
    : activas;

  // ── Search logic ──────────────────────────────────────────────────────────
  const searchTerm = search.trim().toLowerCase();
  const searchActive = searchTerm.length > 0;
  let searchResults = searchActive
    ? tareasDelProyecto.filter(t =>
        (t.taskId  || "").toLowerCase().includes(searchTerm) ||
        (t.titulo  || "").toLowerCase().includes(searchTerm)
      )
    : [];
  if (filterEstado) searchResults = searchResults.filter(t => t.estado === filterEstado);
  if (filterResp)   searchResults = searchResults.filter(t => t.responsable === filterResp);

  // Unique assignees for filter dropdown
  const assignees = [...new Set(tareasDelProyecto.map(t => t.responsable).filter(Boolean))];

  function sortByPrio(arr) {
    return [...arr].sort((a, b) => (PRIO_ORDER[a.prioridad] ?? 9) - (PRIO_ORDER[b.prioridad] ?? 9));
  }

  // Producción: oldest produccionAt first (closest to auto-archiving)
  function sortProduccion(arr) {
    return [...arr].sort((a, b) => {
      const ad = a.produccionAt || "9999-12-31";
      const bd = b.produccionAt || "9999-12-31";
      return ad.localeCompare(bd);
    });
  }

  function openNew()   { setEditing(null); setModal(true); }
  function openEdit(t) { setEditing(t);    setModal(true); }
  function closeModal(){ setModal(false);  setEditing(null); }

  function openPrompt(t) { setPromptTask(t); setPromptText(t.taskPrompt || ""); setPromptCopied(false); }
  function closePrompt() { setPromptTask(null); setPromptText(""); setPromptSaving(false); setPromptCopied(false); }

  function parseCSV(text) {
    // Auto-detect delimiter from the first line (comma vs semicolon vs tab).
    const firstLine = text.slice(0, text.indexOf("\n") < 0 ? undefined : text.indexOf("\n"));
    const counts = { ",": 0, ";": 0, "\t": 0 };
    for (const ch of firstLine) if (ch in counts) counts[ch]++;
    const sep = counts[";"] > counts[","] ? ";" : counts["\t"] > counts[","] ? "\t" : ",";

    // Character-by-character parse — handles multiline quoted fields and any delimiter.
    const rows = [];
    let fields = [], cur = "", inQ = false;
    const flush = () => { fields.push(cur); cur = ""; };
    const commitRow = () => {
      flush();
      if (fields.some(f => f.trim() !== "")) rows.push(fields);
      fields = [];
    };
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQ = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') { inQ = true; }
        else if (ch === sep) { flush(); }
        else if (ch === '\r' && text[i + 1] === '\n') { commitRow(); i++; }
        else if (ch === '\n' || ch === '\r') { commitRow(); }
        else { cur += ch; }
      }
    }
    if (cur || fields.length) commitRow();

    if (rows.length < 2) throw new Error("El CSV debe tener encabezado y al menos una fila de datos.");
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(vals => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] ?? "").trim(); });
      return obj;
    });
  }

  function csvCell(value) {
    const s = value == null ? "" : String(value);
    return `"${s.replace(/"/g, '""')}"`;
  }

  function exportProjectTasksCSV() {
    const header = [
      "taskId", "titulo", "problema", "solucion", "tipo", "prioridad",
      "estado", "responsable", "version", "fechaInicio", "plazo", "fechaFin", "taskPrompt",
    ];
    const rows = sortByPrio(tareasDelProyecto).map(t => ([
      t.taskId || "",
      t.titulo || "",
      t.problema || "",
      t.solucion || "",
      t.tipo || "",
      t.prioridad || "",
      t.estado || "",
      t.responsable || "",
      t.version || "",
      t.fechaInicio || "",
      t.plazo || "",
      t.fechaFin || "",
      t.taskPrompt || "",
    ].map(csvCell).join(",")));

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(proyecto.nombre || "proyecto").replace(/\s+/g, "_")}_tareas.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        if (parsed.length === 0) throw new Error("El CSV no contiene filas de datos.");
        setImportTareas(parsed);
      } catch (err) {
        setImportError(err.message);
        setImportTareas(null);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Derived list of tasks in the current project that have taskId >= cleanFromId
  function tareasALimpiar() {
    if (!cleanFromId.trim()) return [];
    const prefix = cleanFromId.trim().toUpperCase();
    // Extract numeric counter from the ID (e.g. "CLUB-038" → 38)
    const dashIdx = prefix.lastIndexOf("-");
    if (dashIdx < 0) return [];
    const fromPrefix = prefix.slice(0, dashIdx + 1); // "CLUB-"
    const fromNum    = parseInt(prefix.slice(dashIdx + 1), 10);
    if (isNaN(fromNum)) return [];
    return tareas.filter(t => {
      const tid = (t.taskId || "").toUpperCase();
      if (!tid.startsWith(fromPrefix)) return false;
      const num = parseInt(tid.slice(fromPrefix.length), 10);
      return !isNaN(num) && num >= fromNum;
    });
  }

  async function ejecutarLimpieza() {
    const lista = tareasALimpiar();
    if (!lista.length) return;
    setCleanProgress({ done: 0, total: lista.length });
    await handleBulkDeleteTareas(lista.map(t => t._fid));
    setCleanProgress("done");
    setCleanFromId("");
  }

  async function confirmarImport() {
    if (!importTareas?.length) return;
    setImportProgress({ done: 0, total: importTareas.length });
    let done = 0;
    for (const t of importTareas) {
      await handleImportTareas(t, id);
      done++;
      setImportProgress({ done, total: importTareas.length });
    }
    setImportOpen(false);
    setImportTareas(null);
    setImportFileName("");
    setImportProgress(null);
  }
  async function savePrompt() {
    setPromptSaving(true);
    await handleSavePrompt(promptTask._fid, promptText);
    setPromptSaving(false);
    closePrompt();
  }

  return (
    <div style={{ padding: 28 }}>
      {proyecto.archived && (
        <div style={{ background: C.muted + "18", border: `1px solid ${C.muted}44`, borderRadius: 10, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.muted }}>
          <span>📦</span>
          <span>Este proyecto está <strong>archivado</strong>. No se pueden crear ni editar tareas hasta que sea restaurado.</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: proyecto.archived ? C.muted : (proyecto.color || C.orange) }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 20, color: proyecto.archived ? C.muted : C.text }}>{proyecto.nombre}</div>
            {proyecto.descripcion && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{proyecto.descripcion}</div>}
          </div>
        </div>
        {!proyecto.archived && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Btn color={C.blue} onClick={exportProjectTasksCSV}>
              ↓ Exportar CSV
            </Btn>
            {enProd.length > 0 && (
              <Btn color={C.green} onClick={() => handleArchivar(id)}>
                📦 Archivar en Changelog ({enProd.length})
              </Btn>
            )}
            {isAdmin && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={handleImportFile}
                />
                <Btn
                  color={C.purple}
                  onClick={() => { setImportOpen(true); setImportTareas(null); setImportFileName(""); setImportError(""); }}
                >
                  ⬆ Importar CSV
                </Btn>
              </>
            )}
            <Btn onClick={openNew}>+ Nueva tarea</Btn>
          </div>
        )}
      </div>

      {/* stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        {TALLER_ESTADOS.map(e => {
          const count = activas.filter(t => t.estado === e).length;
          return (
            <div key={e} style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 100 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: ESTADO_COLORS[e] }}>{count}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{e}</div>
            </div>
          );
        })}
        <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 100 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.muted }}>{archivadas.length}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>Archivadas</div>
        </div>
      </div>

      {/* ── search bar ── */}
      <div style={{ marginBottom: 20, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.muted, pointerEvents: "none" }}>🔍</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setFilterEstado(""); setFilterResp(""); }}
            placeholder="Buscar por ID o título… ej: SA-001"
            style={{ background: C.card, border: `1px solid ${searchActive ? C.orange : C.border}`, borderRadius: 8, padding: "8px 12px 8px 32px", color: C.text, fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>
        {searchActive && (
          <>
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: filterEstado ? C.text : C.muted, fontSize: 12, fontFamily: "inherit", outline: "none" }}>
              <option value="">Estado</option>
              {TALLER_ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              <option value="Archivado">Archivado</option>
            </select>
            <select value={filterResp} onChange={e => setFilterResp(e.target.value)}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: filterResp ? C.text : C.muted, fontSize: 12, fontFamily: "inherit", outline: "none" }}>
              <option value="">Responsable</option>
              {assignees.map(a => {
                const u = users.find(x => x.email === a);
                return <option key={a} value={a}>{u?.name || a}</option>;
              })}
            </select>
            <button onClick={() => { setSearch(""); setFilterEstado(""); setFilterResp(""); }}
              style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
              ✕ Limpiar
            </button>
          </>
        )}
      </div>

      {/* ── search results ── */}
      {searchActive && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""}
          </div>
          {searchResults.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 12, padding: "20px 0" }}>Sin resultados para "{searchTerm}".</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {searchResults.map(t => {
                const estadoColor = ESTADO_COLORS[t.estado] || C.muted;
                const u = users.find(x => x.email === t.responsable);
                return (
                  <div key={t._fid} style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    {t.taskId && (
                      <span style={{ fontSize: 10, color: C.orange, fontFamily: "monospace", fontWeight: 700, flexShrink: 0 }}>{t.taskId}</span>
                    )}
                    <span style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.titulo}</span>
                      {t.taskPrompt && (
                        <span style={{ fontSize: 9, color: "#a855f7", background: "#a855f722", border: "1px solid #a855f744", borderRadius: 3, padding: "1px 5px", fontWeight: 700, flexShrink: 0 }}>💬 prompt</span>
                      )}
                    </span>
                    <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>👤 {u?.name || t.responsable || "—"}</span>
                    <span style={{ background: estadoColor + "22", color: estadoColor, borderRadius: 4, fontSize: 10, padding: "2px 8px", fontWeight: 700, flexShrink: 0 }}>{t.estado}</span>
                    <button onClick={() => openPrompt(t)}
                      title={t.taskPrompt ? "Ver/editar prompt" : "Añadir prompt"}
                      style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: t.taskPrompt ? "#a855f7" : C.muted, fontSize: 11, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                      💬
                    </button>
                    <button onClick={() => { openEdit(t); }}
                      style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, fontSize: 11, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                      ✏️
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ height: 1, background: C.border, marginTop: 24 }} />
        </div>
      )}

      {/* ── user filter bar ── */}
      {!searchActive && (
        <div style={{ marginBottom: 18, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* "Mis tareas" quick toggle */}
          <button
            onClick={() => setFilterUsuario(f => f === session?.email ? "" : (session?.email || ""))}
            style={{
              background: filterUsuario === session?.email ? C.blue + "33" : C.border2,
              color: filterUsuario === session?.email ? C.blue : C.muted,
              border: `1px solid ${filterUsuario === session?.email ? C.blue + "66" : C.border}`,
              borderRadius: 7, fontSize: 11, padding: "5px 12px",
              cursor: "pointer", fontFamily: "inherit",
              fontWeight: filterUsuario === session?.email ? 700 : 400,
            }}
          >
            👤 Mis tareas
          </button>

          {/* user selector */}
          <select
            value={filterUsuario}
            onChange={e => setFilterUsuario(e.target.value)}
            style={{
              background: C.card, border: `1px solid ${filterUsuario ? C.blue + "66" : C.border}`,
              borderRadius: 7, padding: "5px 10px",
              color: filterUsuario ? C.text : C.muted,
              fontSize: 11, fontFamily: "inherit", outline: "none",
            }}
          >
            <option value="">Todos los usuarios</option>
            {assignees.map(email => {
              const u = users.find(x => x.email === email);
              return <option key={email} value={email}>{u?.name || email}</option>;
            })}
          </select>

          {/* active badge + clear */}
          {filterUsuario && (
            <>
              <span style={{
                background: C.blue + "22", color: C.blue,
                border: `1px solid ${C.blue}44`,
                borderRadius: 6, fontSize: 10, padding: "3px 8px", fontWeight: 700,
              }}>
                Filtrado: {users.find(u => u.email === filterUsuario)?.name || filterUsuario}
              </span>
              <button
                onClick={() => setFilterUsuario("")}
                style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}
              >
                ✕ Limpiar
              </button>
            </>
          )}
        </div>
      )}

      {/* kanban */}
      <div style={{ overflowX: "auto", marginRight: -28, paddingRight: 28, paddingBottom: 4 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(220px, 1fr))", gap: 16, alignItems: "start", minWidth: 900 }}>
        {TALLER_ESTADOS.map(estado => {
          const col = estado === "Producción"
            ? sortProduccion(activasFiltradas.filter(t => t.estado === estado))
            : sortByPrio(activasFiltradas.filter(t => t.estado === estado));
          return (
            <div key={estado}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: ESTADO_COLORS[estado], flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: ESTADO_COLORS[estado], textTransform: "uppercase", letterSpacing: 0.5 }}>{estado}</span>
                <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>{col.length}</span>
              </div>
              {col.length === 0
                ? <div style={{
                    fontSize: 12, color: C.muted, textAlign: "center",
                    padding: "28px 0",
                    border: `2px dashed ${C.border2}`,
                    borderRadius: 10,
                    background: C.card,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ fontSize: 18, opacity: 0.4 }}>◯</span>
                    <span style={{ fontSize: 11, opacity: 0.6 }}>{filterUsuario ? "Sin tareas" : "Vacío"}</span>
                  </div>
                : col.map(t => (
                  <TaskCard
                    key={t._fid}
                    tarea={t}
                    projects={projects}
                    users={users}
                    isAdmin={isAdmin}
                    initialOpen={t._fid === openTaskFid}
                    onEdit={openEdit}
                    onUpdateEstado={handleUpdateEstado}
                    onMove={handleMove}
                    onQuickAssign={handleQuickAssign}
                    onDelete={handleDeleteTarea}
                    onSavePrompt={handleSavePrompt}
                  />
                ))
              }
            </div>
          );
        })}
      </div>
      </div>

      {/* archived tasks */}
      {archivadas.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <button onClick={() => setVerArchivados(v => !v)}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            {verArchivados ? "▼" : "▶"} Ver archivados ({archivadas.length})
          </button>
          {verArchivados && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
              {sortByPrio(archivadas).map(t => (
                <div
                  key={t._fid}
                  onClick={() => setArchivedView(t)}
                  style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: "12px 14px", opacity: 0.6, cursor: "pointer", transition: "opacity .15s, border-color .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.borderColor = C.muted; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.borderColor = C.border; }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 14 }}>{TIPO_ICONS[t.tipo] || "📌"}</span>
                    <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{t.titulo}</span>
                    <Badge color={C.muted}>Archivado</Badge>
                  </div>
                  {t.archivedAt && <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>🗓 {fmtDate(t.archivedAt)}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modal && (
        <TaskModal
          tarea={editing}
          session={session}
          users={users}
          project={proyecto}
          projectId={id}
          onClose={closeModal}
          onSave={async (data) => { await handleSaveTarea(data, id); }}
        />
      )}

      {/* ── Modal read-only tarea archivada ── */}
      {archivedView && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: C.panel, borderRadius: 18, border: `1px solid ${C.border2}`, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", padding: 28 }}>
            {/* header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{TIPO_ICONS[archivedView.tipo] || "📌"}</span>
                  {archivedView.taskId && (
                    <span style={{ fontSize: 11, color: C.orange, fontFamily: "monospace", fontWeight: 700 }}>{archivedView.taskId}</span>
                  )}
                  <Badge color={C.muted}>Archivado</Badge>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{archivedView.titulo}</div>
              </div>
              <button onClick={() => setArchivedView(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>✕</button>
            </div>

            {/* badges de tipo / prio */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
              {archivedView.tipo && (
                <span style={{ background: C.border2, color: C.muted, borderRadius: 5, fontSize: 11, padding: "3px 8px", fontWeight: 600 }}>{archivedView.tipo}</span>
              )}
              {archivedView.prioridad && (
                <span style={{ background: (PRIO_COLORS[archivedView.prioridad] || C.muted) + "22", color: PRIO_COLORS[archivedView.prioridad] || C.muted, borderRadius: 5, fontSize: 11, padding: "3px 8px", fontWeight: 600 }}>{archivedView.prioridad}</span>
              )}
              {archivedView.version && (
                <span style={{ background: C.border2, color: C.muted, borderRadius: 5, fontSize: 11, padding: "3px 8px" }}>v{archivedView.version}</span>
              )}
            </div>

            {/* fechas */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20, fontSize: 12, color: C.muted }}>
              {archivedView.fechaInicio && <span>Inicio: <strong style={{ color: C.text }}>{fmtDate(archivedView.fechaInicio)}</strong></span>}
              {archivedView.plazo       && <span>Plazo: <strong style={{ color: C.text }}>{fmtDate(archivedView.plazo)}</strong></span>}
              {archivedView.fechaFin    && <span>Fin real: <strong style={{ color: C.green }}>{fmtDate(archivedView.fechaFin)}</strong></span>}
              {archivedView.archivedAt  && <span>Archivado: <strong style={{ color: C.text }}>{fmtDate(archivedView.archivedAt)}</strong></span>}
            </div>

            {/* responsable */}
            {archivedView.responsable && (
              <div style={{ marginBottom: 16, fontSize: 12, color: C.muted }}>
                Responsable: <strong style={{ color: C.text }}>{users.find(u => u.email === archivedView.responsable)?.name || archivedView.responsable}</strong>
              </div>
            )}

            {/* problema */}
            {archivedView.problema && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Problema / Contexto</div>
                <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: "10px 12px", fontSize: 13, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{archivedView.problema}</div>
              </div>
            )}

            {/* solución */}
            {archivedView.solucion && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Solución aplicada</div>
                <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: "10px 12px", fontSize: 13, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{archivedView.solucion}</div>
              </div>
            )}

            {/* prompt */}
            {archivedView.taskPrompt && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>💬 Prompt</div>
                <div style={{ background: C.card, borderRadius: 8, border: `1px solid #a855f744`, padding: "10px 12px", fontSize: 12, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{archivedView.taskPrompt}</div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <Btn color={C.border2} onClick={() => setArchivedView(null)}>Cerrar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal importar tareas ── */}
      {importOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: C.panel, borderRadius: 18, border: `1px solid ${C.border2}`, width: "100%", maxWidth: 540, padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>⬆ Importar tareas</div>
              <button onClick={() => { setImportOpen(false); setImportTareas(null); setImportProgress(null); }} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
              Selecciona un archivo <code style={{ background: C.card, borderRadius: 4, padding: "1px 5px", color: C.text }}>.csv</code> con encabezado y una tarea por fila. Columnas requeridas:{" "}
              <code style={{ background: C.card, borderRadius: 4, padding: "1px 5px", color: C.text }}>taskId, titulo, problema, solucion, tipo, prioridad, estado, responsable, version, fechaInicio, plazo, fechaFin, taskPrompt</code>.
              <br />
              <span>Reglas: si <code style={{ background: C.card, borderRadius: 4, padding: "1px 5px", color: C.text }}>taskId</code> está vacío se crea una tarea nueva; si coincide con una existente en este proyecto, se actualiza.</span>
            </div>

            <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const deadline = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
                  const header = "taskId,titulo,problema,solucion,tipo,prioridad,estado,responsable,version,fechaInicio,plazo,fechaFin,taskPrompt";
                  const example = `"","Error en pantalla de login","Los usuarios no pueden iniciar sesión con email inválido","Añadir validación de formato de email antes de enviar el formulario","Bug","Alta","Pendiente","dev@ejemplo.com","1.0.0","${today}","${deadline}","",""`;
                  const csv = header + "\n" + example;
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = "tareas_ejemplo.csv"; a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{ background: "none", border: `1px solid ${C.border2}`, borderRadius: 6, fontSize: 11, padding: "4px 10px", color: C.muted, cursor: "pointer", fontFamily: "inherit" }}
              >
                ↓ Descargar CSV de ejemplo
              </button>
            </div>

            {/* ── Limpieza de importación anterior ── */}
            <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, border: `1px solid ${C.border}`, background: C.card }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
                🗑 Borrar tareas desde un ID (limpiar importación mala)
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={cleanFromId}
                  onChange={e => { setCleanFromId(e.target.value); setCleanProgress(null); }}
                  placeholder="Ej: CLUB-038"
                  style={{ flex: 1, fontSize: 12, padding: "6px 10px", borderRadius: 7, border: `1px solid ${C.border2}`, background: C.panel, color: C.text, fontFamily: "monospace" }}
                />
                {(() => {
                  const lista = tareasALimpiar();
                  return (
                    <button
                      type="button"
                      disabled={!lista.length || cleanProgress === "done"}
                      onClick={ejecutarLimpieza}
                      style={{
                        fontSize: 12, padding: "6px 12px", borderRadius: 7, cursor: lista.length ? "pointer" : "default",
                        border: `1px solid ${lista.length ? C.red + "88" : C.border}`,
                        background: lista.length ? C.red + "15" : "transparent",
                        color: lista.length ? C.red : C.muted, fontFamily: "inherit", whiteSpace: "nowrap",
                      }}
                    >
                      {cleanProgress === "done"
                        ? "✓ Borradas"
                        : cleanProgress
                          ? `${cleanProgress.done}/${cleanProgress.total}…`
                          : lista.length
                            ? `Borrar ${lista.length} tarea${lista.length !== 1 ? "s" : ""}`
                            : "Borrar"}
                    </button>
                  );
                })()}
              </div>
              {cleanFromId.trim() && (() => {
                const lista = tareasALimpiar();
                return lista.length > 0 ? (
                  <div style={{ marginTop: 6, fontSize: 11, color: C.muted }}>
                    Se borrarán: {lista.map(t => t.taskId).join(", ")}
                  </div>
                ) : cleanProgress !== "done" ? (
                  <div style={{ marginTop: 6, fontSize: 11, color: C.muted }}>No se encontraron tareas con ese ID en este proyecto.</div>
                ) : null;
              })()}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 10,
                border: `2px dashed ${importTareas ? C.green + "88" : C.border2}`,
                background: importTareas ? C.green + "0a" : C.card,
                color: importTareas ? C.green : C.muted,
                fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {importTareas
                ? `✓ ${importFileName} — ${importTareas.length} tarea${importTareas.length !== 1 ? "s" : ""}`
                : "📂 Seleccionar archivo CSV…"}
            </button>

            {importError && (
              <div style={{ marginTop: 10, color: C.red, fontSize: 12 }}>⚠ {importError}</div>
            )}

            {importTareas && importTareas.length > 0 && (
              <div style={{ marginTop: 14, background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, maxHeight: 180, overflowY: "auto" }}>
                {importTareas.slice(0, 8).map((t, i) => (
                  <div key={i} style={{ padding: "7px 12px", borderBottom: i < Math.min(importTareas.length, 8) - 1 ? `1px solid ${C.border}` : "none", fontSize: 12, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", flexShrink: 0 }}>#{i + 1}</span>
                    <span style={{ fontSize: 10, color: C.orange, fontFamily: "monospace", flexShrink: 0 }}>{t.taskId || "nuevo"}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.titulo || "(sin título)"}</span>
                    <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{t.estado}</span>
                  </div>
                ))}
                {importTareas.length > 8 && (
                  <div style={{ padding: "6px 12px", fontSize: 11, color: C.muted, textAlign: "center" }}>
                    … y {importTareas.length - 8} más
                  </div>
                )}
              </div>
            )}

            {importProgress && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
                  Importando {importProgress.done}/{importProgress.total}…
                </div>
                <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", background: C.green, borderRadius: 3,
                    width: `${(importProgress.done / importProgress.total) * 100}%`,
                    transition: "width 0.2s ease",
                  }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <Btn color={C.border2} onClick={() => { setImportOpen(false); setImportTareas(null); setImportProgress(null); }} type="button">Cancelar</Btn>
              <Btn
                onClick={confirmarImport}
                disabled={!importTareas || importTareas.length === 0 || !!importProgress}
              >
                {importProgress ? `Importando…` : `Importar ${importTareas?.length ?? 0} tarea${importTareas?.length !== 1 ? "s" : ""}`}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {promptTask && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#0e1628", borderRadius: 16, border: "1px solid #243650", width: "100%", maxWidth: 580, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>💬 Prompt de la tarea</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                  {promptTask.taskId && <span style={{ fontFamily: "monospace", color: C.orange, marginRight: 6 }}>{promptTask.taskId}</span>}
                  {promptTask.titulo}
                </div>
              </div>
              <button onClick={closePrompt} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", flexShrink: 0 }}>✕</button>
            </div>
            <textarea
              value={promptText}
              onChange={e => setPromptText(e.target.value)}
              placeholder="Pega aquí el prompt de la tarea…"
              style={{ width: "100%", minHeight: 200, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 12, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", outline: "none", lineHeight: 1.6 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end", alignItems: "center" }}>
              {promptText && (
                <button
                  onClick={() => { navigator.clipboard.writeText(promptText); setPromptCopied(true); setTimeout(() => setPromptCopied(false), 1500); }}
                  style={{ background: promptCopied ? "#22c55e22" : "#3b82f622", color: promptCopied ? "#22c55e" : "#3b82f6", border: `1px solid ${promptCopied ? "#22c55e44" : "#3b82f644"}`, borderRadius: 7, fontSize: 12, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                >
                  {promptCopied ? "✓ Copiado" : "📋 Copiar"}
                </button>
              )}
              <button onClick={closePrompt} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, padding: "6px 14px", cursor: "pointer", color: C.muted, fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={savePrompt} disabled={promptSaving} style={{ background: C.orange, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, padding: "6px 18px", cursor: promptSaving ? "default" : "pointer", fontFamily: "inherit", fontWeight: 700, opacity: promptSaving ? 0.7 : 1 }}>
                {promptSaving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
