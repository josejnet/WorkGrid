import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../../lib/theme";
import { SUPER_ADMIN } from "../../lib/constants";
import Btn from "../../components/ui/Btn";
import Badge from "../../components/ui/Badge";
import ProjectModal from "../projects/ProjectModal";
import ProjectAccessManager from "./ProjectAccessManager";
import { fmtDate } from "../../lib/utils";
import { useApp } from "../../context/AppContext";
import { generateProjectApiSecret, revokeProjectApiSecret } from "../../services/projectService";

// URL dinámica: funciona en cualquier entorno (producción, preview, local con vercel dev)
const API_BASE = `${window.location.origin}/api/taller`;

export default function MaestroProyectos() {
  const {
    projects, tareas, users, isAdmin,
    handleSaveProject, handleArchiveProject, handleUnarchiveProject, handleSaveProjectNotes,
  } = useApp();
  const navigate = useNavigate();
  const [modal,       setModal]      = useState(false);
  const [editing,     setEditing]    = useState(null);
  const [expanded,    setExpanded]   = useState({}); // access panel per project
  const [apiPanel,    setApiPanel]   = useState({}); // api panel per project
  const [apiTokens,   setApiTokens]  = useState({}); // raw tokens shown once {projectId: token}
  const [apiLoading,  setApiLoading] = useState({}); // loading state per project
  const [apiCopied,   setApiCopied]  = useState({}); // copied state per token field
  const [notesProj,   setNotesProj]  = useState(null);
  const [notesText,   setNotesText]  = useState("");
  const [notesSaving, setNotesSaving]= useState(false);
  const [notesCopied, setNotesCopied]= useState(false);

  function openNotes(p) {
    setNotesProj(p);
    setNotesText(p.notasTecnicas || "");
    setNotesCopied(false);
  }
  function closeNotes() { setNotesProj(null); }
  async function saveNotes() {
    setNotesSaving(true);
    await handleSaveProjectNotes(notesProj._fid, notesText);
    setNotesSaving(false);
    closeNotes();
  }
  function copyNotes() {
    navigator.clipboard.writeText(notesText);
    setNotesCopied(true);
    setTimeout(() => setNotesCopied(false), 1500);
  }

  const active   = projects.filter(p => !p.archived);
  const archived = projects.filter(p =>  p.archived);

  function openEdit(p) { setEditing(p); setModal(true); }
  function openNew()   { setEditing(null); setModal(true); }

  async function handleSave(data) {
    const id = await handleSaveProject(data);
    setModal(false);
    setEditing(null);
    if (id && !data._fid) navigate(`/projects/${id}`);
  }

  function toggleAccess(pid) {
    setExpanded(prev => ({ ...prev, [pid]: !prev[pid] }));
  }

  function toggleApiPanel(pid) {
    setApiPanel(prev => ({ ...prev, [pid]: !prev[pid] }));
  }

  async function handleGenerateSecret(p) {
    setApiLoading(prev => ({ ...prev, [p._fid]: true }));
    try {
      const token = await generateProjectApiSecret(p._fid, p.apiName || "external");
      setApiTokens(prev => ({ ...prev, [p._fid]: token }));
    } finally {
      setApiLoading(prev => ({ ...prev, [p._fid]: false }));
    }
  }

  async function handleRevokeSecret(pid) {
    if (!window.confirm("¿Revocar el secreto? Las integraciones que lo usen dejarán de funcionar.")) return;
    setApiLoading(prev => ({ ...prev, [pid]: true }));
    try {
      await revokeProjectApiSecret(pid);
      setApiTokens(prev => { const n = { ...prev }; delete n[pid]; return n; });
    } finally {
      setApiLoading(prev => ({ ...prev, [pid]: false }));
    }
  }

  function copyApiField(pid, text) {
    navigator.clipboard.writeText(text);
    setApiCopied(prev => ({ ...prev, [pid]: true }));
    setTimeout(() => setApiCopied(prev => ({ ...prev, [pid]: false })), 1500);
  }

  function ProjectRow({ p }) {
    const taskCount = tareas.filter(t => t.projectId === p._fid && t.estado !== "Archivado").length;
    return (
      <div style={{
        background: C.card, borderRadius: 12,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${p.archived ? C.muted : (p.color || C.orange)}`,
        opacity: p.archived ? 0.65 : 1,
        overflow: "hidden",
      }}>
        {/* main row */}
        <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: p.archived ? C.muted : (p.color || C.orange), flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text, display: "flex", gap: 8, alignItems: "center" }}>
              {p.nombre}
              {p.archived && <span style={{ fontSize: 9, background: C.muted + "33", color: C.muted, borderRadius: 3, padding: "1px 6px", fontWeight: 700, textTransform: "uppercase" }}>Archivado</span>}
            </div>
            {p.descripcion && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{p.descripcion}</div>}
            <div style={{ fontSize: 10, color: C.muted, marginTop: 3, display: "flex", gap: 10 }}>
              {!p.archived && <span>{taskCount} tareas activas</span>}
              {p.creadoEn && <span>Creado {fmtDate(p.creadoEn.slice(0, 10))}</span>}
              {p.archivedAt && <span>Archivado {fmtDate(p.archivedAt)}</span>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
            {!p.archived && (
              <Badge color={C.blue}>{taskCount} tareas</Badge>
            )}
            {!p.archived && isAdmin && (
              <Btn size="sm" color={C.border2} onClick={() => openEdit(p)}>✏️ Editar</Btn>
            )}
            {!p.archived && isAdmin && (
              <Btn size="sm" color={C.muted} onClick={() => handleArchiveProject(p._fid)}>📦 Archivar</Btn>
            )}
            {p.archived && isAdmin && (
              <Btn size="sm" color={C.green} onClick={() => handleUnarchiveProject(p._fid)}>♻️ Restaurar</Btn>
            )}
            {!p.archived && (
              <button
                onClick={() => openNotes(p)}
                style={{
                  background: p.notasTecnicas ? C.purple + "22" : C.border2,
                  color: p.notasTecnicas ? C.purple : C.muted,
                  border: `1px solid ${p.notasTecnicas ? C.purple + "44" : C.border}`,
                  borderRadius: 6, fontSize: 11, padding: "4px 10px",
                  cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                }}
              >
                📝 {p.notasTecnicas ? "Notas" : "Añadir notas"}
              </button>
            )}
            {!p.archived && (
              <button
                onClick={() => toggleAccess(p._fid)}
                style={{
                  background: expanded[p._fid] ? C.orange + "22" : C.border2,
                  color: expanded[p._fid] ? C.orange : C.muted,
                  border: `1px solid ${expanded[p._fid] ? C.orange + "44" : C.border}`,
                  borderRadius: 6, fontSize: 11, padding: "4px 10px",
                  cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                }}
              >
                🔐 Acceso {expanded[p._fid] ? "▲" : "▼"}
              </button>
            )}
            {!p.archived && isAdmin && (
              <button
                onClick={() => toggleApiPanel(p._fid)}
                style={{
                  background: apiPanel[p._fid] ? C.blue + "22" : C.border2,
                  color: apiPanel[p._fid] ? C.blue : (p.apiEnabled ? C.green : C.muted),
                  border: `1px solid ${apiPanel[p._fid] ? C.blue + "44" : (p.apiEnabled ? C.green + "44" : C.border)}`,
                  borderRadius: 6, fontSize: 11, padding: "4px 10px",
                  cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                }}
              >
                {p.apiEnabled ? "🔑 API ●" : "🔑 API"} {apiPanel[p._fid] ? "▲" : "▼"}
              </button>
            )}
          </div>
        </div>

        {/* expandable access section */}
        {expanded[p._fid] && !p.archived && (
          <div style={{ borderTop: `1px solid ${C.border}`, background: C.panel }}>
            <ProjectAccessManager project={p} users={users} inline />
          </div>
        )}

        {/* expandable API panel */}
        {apiPanel[p._fid] && !p.archived && isAdmin && (
          <div style={{ borderTop: `1px solid ${C.border}`, background: C.panel, padding: "16px 20px" }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: C.blue, marginBottom: 12 }}>
              🔑 Integración API
            </div>

            {/* Endpoint URL */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Endpoint base</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <code style={{
                  flex: 1, background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: "5px 10px", fontSize: 11,
                  color: C.text, fontFamily: "monospace", wordBreak: "break-all",
                }}>
                  {API_BASE}
                </code>
                <button
                  onClick={() => copyApiField(`url-${p._fid}`, API_BASE)}
                  style={{ background: apiCopied[`url-${p._fid}`] ? C.green + "22" : C.border2, color: apiCopied[`url-${p._fid}`] ? C.green : C.muted, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                >
                  {apiCopied[`url-${p._fid}`] ? "✓" : "📋"}
                </button>
              </div>
            </div>

            {/* Estado actual del secreto */}
            {p.apiEnabled ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Secreto activo</span>
                  {p.apiSecretGeneratedAt && (
                    <span style={{ fontSize: 10, color: C.muted }}>
                      · generado {fmtDate(p.apiSecretGeneratedAt.slice(0, 10))}
                    </span>
                  )}
                  {p.apiName && p.apiName !== "external" && (
                    <span style={{ fontSize: 10, color: C.muted }}>· {p.apiName}</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => handleGenerateSecret(p)}
                    disabled={apiLoading[p._fid]}
                    style={{ background: C.blue + "22", color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 6, fontSize: 11, padding: "5px 12px", cursor: apiLoading[p._fid] ? "default" : "pointer", fontFamily: "inherit", fontWeight: 600, opacity: apiLoading[p._fid] ? 0.6 : 1 }}
                  >
                    {apiLoading[p._fid] ? "Generando…" : "🔄 Regenerar"}
                  </button>
                  <button
                    onClick={() => handleRevokeSecret(p._fid)}
                    disabled={apiLoading[p._fid]}
                    style={{ background: C.muted + "22", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, padding: "5px 12px", cursor: apiLoading[p._fid] ? "default" : "pointer", fontFamily: "inherit", fontWeight: 600 }}
                  >
                    🚫 Revocar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.muted, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.muted }}>Sin secreto activo</span>
                </div>
                <button
                  onClick={() => handleGenerateSecret(p)}
                  disabled={apiLoading[p._fid]}
                  style={{ background: C.green + "22", color: C.green, border: `1px solid ${C.green}44`, borderRadius: 6, fontSize: 11, padding: "5px 14px", cursor: apiLoading[p._fid] ? "default" : "pointer", fontFamily: "inherit", fontWeight: 600, opacity: apiLoading[p._fid] ? 0.6 : 1 }}
                >
                  {apiLoading[p._fid] ? "Generando…" : "✦ Generar secreto"}
                </button>
              </div>
            )}

            {/* Token mostrado UNA vez tras generación */}
            {apiTokens[p._fid] && (
              <div style={{ background: C.orange + "14", border: `1px solid ${C.orange}44`, borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: C.orange, fontWeight: 700, marginBottom: 6 }}>
                  ⚠ Copia este token ahora — no se volverá a mostrar
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <code style={{
                    flex: 1, background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: "6px 10px", fontSize: 11,
                    color: C.text, fontFamily: "monospace", wordBreak: "break-all",
                    userSelect: "all",
                  }}>
                    {apiTokens[p._fid]}
                  </code>
                  <button
                    onClick={() => copyApiField(`token-${p._fid}`, apiTokens[p._fid])}
                    style={{ background: apiCopied[`token-${p._fid}`] ? C.green + "22" : C.orange + "22", color: apiCopied[`token-${p._fid}`] ? C.green : C.orange, border: `1px solid ${apiCopied[`token-${p._fid}`] ? C.green + "44" : C.orange + "44"}`, borderRadius: 6, fontSize: 11, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, flexShrink: 0 }}
                  >
                    {apiCopied[`token-${p._fid}`] ? "✓ Copiado" : "📋 Copiar"}
                  </button>
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>
                  Uso: <code style={{ fontFamily: "monospace" }}>Authorization: Bearer {apiTokens[p._fid].slice(0, 8)}…</code>
                  <br />
                  Llama a <code style={{ fontFamily: "monospace" }}>GET {API_BASE}/schema</code> para ver la documentación completa.
                </div>
              </div>
            )}

            {/* Referencia rápida */}
            <div style={{ fontSize: 10, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 10, lineHeight: 1.8 }}>
              <strong style={{ color: C.text }}>Referencia rápida:</strong><br />
              <code style={{ fontFamily: "monospace" }}>GET /schema</code> → documentación y tipos<br />
              <code style={{ fontFamily: "monospace" }}>GET /tasks</code> → listar tareas<br />
              <code style={{ fontFamily: "monospace" }}>POST /tasks</code> → crear tarea<br />
              <code style={{ fontFamily: "monospace" }}>PATCH /tasks/:id/advance</code> → avanzar estado
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {isAdmin && (
        <div style={{ marginBottom: 20 }}>
          <Btn onClick={openNew}>+ Nuevo proyecto</Btn>
        </div>
      )}

      {active.length === 0 && (
        <div style={{ textAlign: "center", color: C.muted, padding: "32px 0", fontSize: 13 }}>
          No hay proyectos activos. {isAdmin ? "Crea el primero." : ""}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {active.map(p => <ProjectRow key={p._fid} p={p} />)}
      </div>

      {archived.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Archivados</div>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {archived.map(p => <ProjectRow key={p._fid} p={p} />)}
          </div>
        </div>
      )}

      {modal && (
        <ProjectModal
          proyecto={editing}
          onClose={() => { setModal(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {/* ── Notes dumper modal ── */}
      {notesProj && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.panel, borderRadius: 16, border: `1px solid ${C.border2}`, width: "100%", maxWidth: 600, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>📝 Notas del proyecto</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: notesProj.color || C.orange, display: "inline-block" }} />
                  {notesProj.nombre}
                </div>
              </div>
              <button onClick={closeNotes}
                style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", flexShrink: 0 }}>✕</button>
            </div>

            <textarea
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
              placeholder="Pega o escribe aquí las notas del proyecto: contexto técnico, decisiones de diseño, arquitectura, stack…"
              style={{
                width: "100%", minHeight: 220, background: C.card,
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "10px 12px", color: C.text, fontSize: 12,
                fontFamily: "monospace", resize: "vertical",
                boxSizing: "border-box", outline: "none", lineHeight: 1.6,
              }}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end", alignItems: "center" }}>
              {notesText && (
                <button
                  onClick={copyNotes}
                  style={{
                    background: notesCopied ? C.green + "22" : C.blue + "22",
                    color: notesCopied ? C.green : C.blue,
                    border: `1px solid ${notesCopied ? C.green + "44" : C.blue + "44"}`,
                    borderRadius: 7, fontSize: 12, padding: "6px 14px",
                    cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                  }}
                >
                  {notesCopied ? "✓ Copiado" : "📋 Copiar"}
                </button>
              )}
              <button onClick={closeNotes}
                style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, padding: "6px 14px", cursor: "pointer", color: C.muted, fontFamily: "inherit" }}>
                Cancelar
              </button>
              <button
                onClick={saveNotes}
                disabled={notesSaving}
                style={{ background: C.orange, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, padding: "6px 18px", cursor: notesSaving ? "default" : "pointer", fontFamily: "inherit", fontWeight: 700, opacity: notesSaving ? 0.7 : 1 }}
              >
                {notesSaving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
