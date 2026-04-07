import { useState } from "react";
import { C } from "../../lib/theme";
import { TALLER_ESTADOS, ESTADO_COLORS, PRIO_COLORS, TIPO_ICONS } from "../../lib/constants";
import { fmtDate } from "../../lib/utils";
import Badge from "../../components/ui/Badge";
import ActionBtn from "../../components/ui/ActionBtn";

function truncate4Lines(text) {
  if (!text) return "";
  const lines = text.split("\n");
  if (lines.length <= 4) return text;
  return lines.slice(0, 4).join("\n") + "…";
}

export default function TaskCard({ tarea, projects, users, onEdit, onUpdateEstado, onMove, onQuickAssign, onDelete, onSavePrompt, isAdmin, initialOpen = false }) {
  const [open,         setOpen]         = useState(initialOpen);
  const [showMove,     setShowMove]      = useState(false);
  const [assigning,    setAssigning]     = useState(false);
  const [promptOpen,   setPromptOpen]    = useState(false);
  const [promptText,   setPromptText]    = useState("");
  const [promptSaving, setPromptSaving]  = useState(false);
  const [copied,       setCopied]        = useState(false);

  const prioColor    = PRIO_COLORS[tarea.prioridad]  || C.muted;
  const estadoColor  = ESTADO_COLORS[tarea.estado]   || C.muted;
  const otherProjects = projects.filter(p => p._fid !== tarea.projectId && !p.archived);

  const currentIdx  = TALLER_ESTADOS.indexOf(tarea.estado);
  const nextEstado  = currentIdx < TALLER_ESTADOS.length - 1 ? TALLER_ESTADOS[currentIdx + 1] : null;
  const prevEstado  = currentIdx > 0 ? TALLER_ESTADOS[currentIdx - 1] : null;

  const today     = new Date().toISOString().slice(0, 10);
  const isOverdue = tarea.plazo && !["Producción", "Archivado"].includes(tarea.estado) && tarea.plazo < today;

  // Producción countdown: days since entering Producción (0–7)
  const daysInProduccion = tarea.estado === "Producción" && tarea.produccionAt
    ? Math.max(0, Math.floor((new Date(today) - new Date(tarea.produccionAt)) / 86400000))
    : null;
  const daysLeft = daysInProduccion !== null ? Math.max(0, 7 - daysInProduccion) : null;
  // Progressive green tint: ~30% alpha day 1 → ~80% alpha day 7
  const prodPct = daysInProduccion !== null ? Math.min(daysInProduccion / 7, 1) : 0;
  const prodAlphaBg     = Math.round((0.05 + Math.min((daysInProduccion - 1) / 6, 1) * 0.15) * 255).toString(16).padStart(2, "0");
  const prodAlphaBorder = Math.round(prodPct * 0xFF).toString(16).padStart(2, "0");
  const hasGreenTint = daysInProduccion !== null && daysInProduccion > 0;

  const project  = (projects || []).find(p => p._fid === tarea.projectId);
  // Admins are always eligible for assignment regardless of per-project writeUsers
  const eligible = (users || []).filter(u =>
    u.active !== false && (
      (project?.writeUsers || []).includes(u.email) ||
      u.role === "admin"
    )
  );

  const problemaPreview = truncate4Lines(tarea.problema);
  const hasMore = tarea.problema && tarea.problema.split("\n").length > 4;

  function openPrompt() {
    setPromptText(tarea.taskPrompt || "");
    setPromptOpen(true);
    setCopied(false);
  }

  async function savePrompt() {
    setPromptSaving(true);
    await onSavePrompt(tarea._fid, promptText);
    setPromptSaving(false);
    setPromptOpen(false);
  }

  function copyPrompt() {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{
      background: hasGreenTint ? C.green + prodAlphaBg : isOverdue ? C.red + "0a" : C.card,
      borderRadius: 12,
      border: `1px solid ${hasGreenTint ? C.green + prodAlphaBorder : isOverdue ? C.red + "55" : C.border}`,
      marginBottom: 10,
      borderLeft: `3px solid ${prioColor}`,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      boxShadow: `0 1px 4px rgba(0,0,0,0.12)`,
    }}>
      {/* ── top row ── */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* content */}
        <div style={{ flex: 1, padding: "12px 10px 12px 14px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{TIPO_ICONS[tarea.tipo] || "📌"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                {tarea.taskId && (
                  <span style={{ fontSize: 9, color: C.muted, fontFamily: "monospace", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 3, padding: "1px 5px", flexShrink: 0 }}>
                    {tarea.taskId}
                  </span>
                )}
                {tarea.taskPrompt && (
                  <span style={{ fontSize: 9, color: C.purple, background: C.purple + "22", border: `1px solid ${C.purple}44`, borderRadius: 3, padding: "1px 5px", flexShrink: 0, fontWeight: 700 }}>
                    💬 prompt
                  </span>
                )}
                <span style={{ fontWeight: 600, fontSize: 13, color: C.text, lineHeight: 1.3 }}>{tarea.titulo}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                <Badge color={prioColor}>{tarea.prioridad}</Badge>
                <Badge color={estadoColor}>{tarea.estado}</Badge>
                <Badge color={C.purple}>{tarea.tipo}</Badge>
                {tarea.impacto && <Badge color={C.blue}>impacto {tarea.impacto}</Badge>}
                {tarea.listaChangelog && <Badge color={C.green}>✓ changelog</Badge>}
                {isOverdue && <Badge color={C.red}>⚠ vencida</Badge>}
                {daysLeft !== null && (
                  <span
                    title={`Esta tarea lleva ${daysInProduccion} día${daysInProduccion !== 1 ? "s" : ""} en Producción. Se archivará automáticamente en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}.`}
                    style={{
                      fontSize: 9, fontWeight: 700, borderRadius: 3, padding: "1px 5px", flexShrink: 0,
                      cursor: "help",
                      background: daysLeft === 0 ? C.green + "44" : C.green + "22",
                      color: C.green,
                      border: `1px solid ${C.green}44`,
                    }}
                  >
                    📦 {daysLeft === 0 ? "archivando hoy" : `${daysLeft}d para archivar`}
                  </span>
                )}
              </div>
              {!open && tarea.problema && (
                <div style={{
                  marginTop: 5,
                  fontSize: 11, color: C.muted, lineHeight: 1.45,
                  display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {tarea.problema}
                </div>
              )}
            </div>
            <button onClick={() => setOpen(o => !o)}
              style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, padding: "2px 4px", flexShrink: 0 }}>
              {open ? "▲" : "▼"}
            </button>
          </div>

          {open && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              {tarea.problema && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Problema / Contexto</div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {tarea.problema}
                  </div>
                </div>
              )}
              {tarea.solucion && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Solución</div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{tarea.solucion}</div>
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: C.muted }}>
                {tarea.responsable     && <span>👤 {tarea.responsable}</span>}
                {tarea.versionAfectada && <span>📦 v{tarea.versionAfectada}</span>}
                {tarea.fechaInicio     && <span>🗓 {fmtDate(tarea.fechaInicio)}</span>}
                {tarea.plazo && (
                  <span style={{ color: isOverdue ? C.red : C.muted }}>
                    ⏰ {fmtDate(tarea.plazo)}{isOverdue ? " · vencida" : ""}
                  </span>
                )}
                {tarea.fechaFin && <span>✅ {fmtDate(tarea.fechaFin)}</span>}
              </div>

              {isAdmin && otherProjects.length > 0 && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 10 }}>
                  {!showMove ? (
                    <button onClick={() => setShowMove(true)}
                      style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                      📁 Enviar a otro proyecto
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: C.muted }}>Enviar a →</span>
                      {otherProjects.map(p => (
                        <button key={p._fid} onClick={() => { onMove(tarea._fid, p._fid); setShowMove(false); setOpen(false); }}
                          style={{ background: (p.color || C.orange) + "22", color: p.color || C.orange, border: `1px solid ${(p.color || C.orange)}44`, borderRadius: 6, fontSize: 11, padding: "3px 10px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color || C.orange, display: "inline-block" }} />
                          {p.nombre}
                        </button>
                      ))}
                      <button onClick={() => setShowMove(false)}
                        style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* action bar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 4, padding: "10px 6px", borderLeft: `1px solid ${C.border}`, background: C.panel + "88", minWidth: 42 }}>
          <ActionBtn title={nextEstado ? `Avanzar → ${nextEstado}` : "Estado final"} onClick={() => nextEstado && onUpdateEstado(tarea._fid, nextEstado)} disabled={!nextEstado} color={C.green}>↑</ActionBtn>
          <ActionBtn title={prevEstado ? `Retroceder → ${prevEstado}` : "Estado inicial"} onClick={() => prevEstado && onUpdateEstado(tarea._fid, prevEstado)} disabled={!prevEstado} color={C.orange}>↓</ActionBtn>
          <div style={{ width: 18, height: 1, background: C.border, margin: "3px 0" }} />
          <ActionBtn title="Editar tarea" onClick={() => onEdit(tarea)} color={C.muted}>✏️</ActionBtn>
          <ActionBtn
            title={tarea.responsable ? `Asignada: ${tarea.responsable}` : "Asignar responsable"}
            onClick={() => setAssigning(v => !v)}
            color={tarea.responsable ? C.blue : C.muted}>
            👤
          </ActionBtn>
          <ActionBtn
            title={tarea.taskPrompt ? "Ver/editar prompt" : "Añadir prompt"}
            onClick={openPrompt}
            color={tarea.taskPrompt ? C.purple : C.muted}>
            💬
          </ActionBtn>
          {isAdmin && (
            <ActionBtn title="Eliminar tarea" onClick={() => onDelete(tarea._fid)} color={C.red}>🗑</ActionBtn>
          )}
        </div>
      </div>

      {/* assign panel */}
      {assigning && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "8px 14px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", background: C.panel }}>
          <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>👤 Asignar →</span>
          {eligible.length === 0 && (
            <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>No hay usuarios con acceso de escritura</span>
          )}
          {eligible.map(u => (
            <button key={u._fid} onClick={() => { onQuickAssign(tarea._fid, u.email); setAssigning(false); }}
              style={{ background: tarea.responsable === u.email ? C.blue + "33" : C.border2, color: tarea.responsable === u.email ? C.blue : C.text, border: `1px solid ${tarea.responsable === u.email ? C.blue + "55" : C.border2}`, borderRadius: 6, fontSize: 11, padding: "3px 10px", cursor: "pointer", fontWeight: tarea.responsable === u.email ? 700 : 400, fontFamily: "inherit" }}>
              {u.name || u.email}
            </button>
          ))}
          {tarea.responsable && (
            <button onClick={() => { onQuickAssign(tarea._fid, ""); setAssigning(false); }}
              style={{ background: "none", border: `1px solid ${C.muted}44`, borderRadius: 6, fontSize: 11, padding: "3px 8px", cursor: "pointer", color: C.muted, fontFamily: "inherit" }}>
              Quitar asignación
            </button>
          )}
          <button onClick={() => setAssigning(false)}
            style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: "inherit", marginLeft: "auto" }}>
            ✕
          </button>
        </div>
      )}

      {/* ── prompt modal ── */}
      {promptOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.panel, borderRadius: 16, border: `1px solid ${C.border2}`, width: "100%", maxWidth: 580, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>💬 Prompt de la tarea</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                  {tarea.taskId && <span style={{ fontFamily: "monospace", color: C.orange, marginRight: 6 }}>{tarea.taskId}</span>}
                  {tarea.titulo}
                </div>
              </div>
              <button onClick={() => setPromptOpen(false)}
                style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", flexShrink: 0 }}>✕</button>
            </div>

            <textarea
              value={promptText}
              onChange={e => setPromptText(e.target.value)}
              placeholder="Pega aquí el prompt de la tarea…"
              style={{
                width: "100%", minHeight: 200, background: C.card,
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "10px 12px", color: C.text, fontSize: 12,
                fontFamily: "monospace", resize: "vertical",
                boxSizing: "border-box", outline: "none", lineHeight: 1.6,
              }}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end", alignItems: "center" }}>
              {promptText && (
                <button
                  onClick={copyPrompt}
                  style={{
                    background: copied ? C.green + "22" : C.blue + "22",
                    color: copied ? C.green : C.blue,
                    border: `1px solid ${copied ? C.green + "44" : C.blue + "44"}`,
                    borderRadius: 7, fontSize: 12, padding: "6px 14px",
                    cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                  }}
                >
                  {copied ? "✓ Copiado" : "📋 Copiar"}
                </button>
              )}
              <button onClick={() => setPromptOpen(false)}
                style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, padding: "6px 14px", cursor: "pointer", color: C.muted, fontFamily: "inherit" }}>
                Cancelar
              </button>
              <button
                onClick={savePrompt}
                disabled={promptSaving}
                style={{ background: C.orange, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, padding: "6px 18px", cursor: promptSaving ? "default" : "pointer", fontFamily: "inherit", fontWeight: 700, opacity: promptSaving ? 0.7 : 1 }}
              >
                {promptSaving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
