import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { C } from "../../lib/theme";
import { TALLER_ESTADOS, ESTADO_COLORS } from "../../lib/constants";

const ESTADO_SHORT = {
  "Pendiente":     "Pendiente",
  "En Desarrollo": "En Dev",
  "Pruebas":       "Pruebas",
  "Producción":    "Producción",
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtTs(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })
    + " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

const ACTION_META = {
  task_created:        { icon: "✅", label: "Tarea creada" },
  task_edited:         { icon: "✏️",  label: "Tarea editada" },
  task_deleted:        { icon: "🗑️", label: "Tarea eliminada" },
  task_auto_archived:  { icon: "📦", label: "Auto-archivada" },
  task_status_changed: { icon: "🔄", label: "Estado cambiado" },
  task_assigned:       { icon: "👤", label: "Tarea asignada" },
  task_moved:          { icon: "📁", label: "Tarea movida" },
  project_created:     { icon: "🆕", label: "Proyecto creado" },
  project_edited:      { icon: "📝", label: "Proyecto editado" },
  project_archived:    { icon: "📦", label: "Proyecto archivado" },
  project_unarchived:  { icon: "♻️",  label: "Proyecto restaurado" },
};

// ─── PER (Porcentaje de Evolución Real) ──────────────────────────────────────
const STATE_WEIGHT = { "Pendiente": 0, "En Desarrollo": 0.3, "Pruebas": 0.7, "Producción": 1.0 };
const PRIO_MULT    = { "Baja": 1, "Media": 1.5, "Alta": 2, "Crítica": 3 };

function calcTimeFactor(task, today) {
  const { fechaInicio, plazo, estado } = task;
  if (!fechaInicio || !plazo) return 1.0;
  const start    = new Date(fechaInicio).getTime();
  const end      = new Date(plazo).getTime();
  const now      = new Date(today).getTime();
  const total    = end - start;
  if (total <= 0) return 1.0;
  const timeProgress = Math.min(Math.max((now - start) / total, 0), 1);
  const taskProgress = STATE_WEIGHT[estado] ?? 0;
  if (timeProgress === 0) return 1.0;
  // Behind schedule: penalize proportionally; on time or ahead: no penalty
  return taskProgress >= timeProgress ? 1.0 : taskProgress / timeProgress;
}

function calcPER(tasks, today) {
  if (tasks.length === 0) return null;
  let sumPER = 0, sumMax = 0;
  for (const t of tasks) {
    const pm = PRIO_MULT[t.prioridad] ?? 1;
    if (t.estado === "Archivado") {
      // Completada: cuenta como 100%, sin penalización de tiempo
      sumPER += 1.0 * pm;
    } else {
      const sw = STATE_WEIGHT[t.estado] ?? 0;
      const tf = calcTimeFactor(t, today);
      sumPER += sw * pm * tf;
    }
    sumMax += 1.0 * pm;
  }
  return sumMax > 0 ? Math.round((sumPER / sumMax) * 100) : 0;
}

// Overall time progress of a project (min start → max deadline)
function calcProjectTimeProgress(tasks, today) {
  const withDates = tasks.filter(t => t.fechaInicio && t.plazo && t.estado !== "Archivado");
  if (withDates.length === 0) return null;
  const minStart = withDates.map(t => t.fechaInicio).sort()[0];
  const maxEnd   = withDates.map(t => t.plazo).sort().reverse()[0];
  const start    = new Date(minStart).getTime();
  const end      = new Date(maxEnd).getTime();
  const now      = new Date(today).getTime();
  const total    = end - start;
  if (total <= 0) return null;
  return Math.round(Math.min(Math.max((now - start) / total, 0), 1) * 100);
}

function perColor(per) {
  if (per >= 70) return C.green;
  if (per >= 40) return C.yellow;
  return C.red;
}

function PerBar({ per }) {
  const color = perColor(per);
  return (
    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 5, background: C.border2, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${per}%`, height: "100%", background: color, borderRadius: 3, transition: "width .3s" }} />
      </div>
      <span
        title={`PER ${per}% — Porcentaje de Evolución Real: progreso ponderado por prioridad de cada tarea y factor tiempo (penaliza retrasos)`}
        style={{ fontSize: 10, fontWeight: 700, color, flexShrink: 0, minWidth: 30, cursor: "help" }}
      >{per}%</span>
    </div>
  );
}

// ─── layout primitives ───────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: C.muted,
      textTransform: "uppercase", letterSpacing: 1, marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function PanelCard({ children, style = {} }) {
  return (
    <div style={{
      background: C.card, borderRadius: 12,
      border: `1px solid ${C.border}`,
      padding: "16px 18px", ...style,
    }}>
      {children}
    </div>
  );
}

// ─── KPI row ─────────────────────────────────────────────────────────────────
function KpiRow({ tareas, accessibleProjects }) {
  const today = new Date().toISOString().slice(0, 10);

  const { scope } = useMemo(() => {
    const pIds = new Set(accessibleProjects.map(p => p._fid));
    return { scope: tareas.filter(t => pIds.has(t.projectId) && t.estado !== "Archivado") };
  }, [tareas, accessibleProjects]);

  const kpis = [
    ...TALLER_ESTADOS.map(e => ({
      label: e, value: scope.filter(t => t.estado === e).length,
      color: ESTADO_COLORS[e],
    })),
    {
      label: "Vencidas", icon: "⚠",
      value: scope.filter(t => t.plazo && t.plazo < today && t.estado !== "Producción").length,
      color: C.red,
    },
    {
      label: "Bugs abiertos",
      value: scope.filter(t => t.tipo === "Bug").length,
      color: C.orange,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12, marginBottom: 28 }}>
      {kpis.map(k => (
        <PanelCard key={k.label} style={{ textAlign: "center", padding: "16px 8px" }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 7, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {k.icon ? `${k.icon} ` : ""}{k.label}
          </div>
        </PanelCard>
      ))}
    </div>
  );
}

// ─── Column 1: Project summary + PER ─────────────────────────────────────────
function ProjectSummary({ tareas, accessibleProjects }) {
  const navigate = useNavigate();
  const today    = new Date().toISOString().slice(0, 10);
  const [sortBy, setSortBy] = useState("per"); // "per" | "name"

  const enriched = useMemo(() => accessibleProjects.map(p => {
    const allPts = tareas.filter(t => t.projectId === p._fid);
    const pts    = allPts.filter(t => t.estado !== "Archivado");
    const late   = pts.filter(t => t.plazo && t.plazo < today).length;
    const per    = calcPER(allPts, today); // incluye archivadas como 100% completadas
    return { p, allPts, pts, late, per };
  }), [accessibleProjects, tareas, today]);

  const sorted = useMemo(() => [...enriched].sort((a, b) => {
    if (sortBy === "per") {
      const ap = a.per ?? -1, bp = b.per ?? -1;
      return ap - bp; // worst PER first (needs attention)
    }
    return a.p.nombre.localeCompare(b.p.nombre);
  }), [enriched, sortBy]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <SectionTitle>Resumen por proyecto</SectionTitle>
        <button
          onClick={() => setSortBy(s => s === "per" ? "name" : "per")}
          style={{ background: "none", border: "none", color: C.muted, fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, padding: 0 }}
        >
          {sortBy === "per" ? "A–Z" : "↑ PER"}
        </button>
      </div>
      {sorted.length === 0 && (
        <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "24px 0" }}>
          Sin proyectos accesibles.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map(({ p, allPts, pts, late, per }) => (
          <div
            key={p._fid}
            onClick={() => navigate(`/projects/${p._fid}`)}
            style={{
              background: C.panel, borderRadius: 10,
              border: `1px solid ${C.border}`, padding: "11px 13px",
              cursor: "pointer",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = p.color || C.orange}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || C.orange, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: 12, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.nombre}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, flexShrink: 0 }}>{allPts.length}</span>
            </div>

            {/* estado pills */}
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              {TALLER_ESTADOS.map(e => {
                const n = pts.filter(t => t.estado === e).length;
                if (!n) return null;
                return (
                  <span key={e} style={{
                    background: ESTADO_COLORS[e] + "22", color: ESTADO_COLORS[e],
                    borderRadius: 4, fontSize: 9, padding: "1px 6px", fontWeight: 700,
                  }}>
                    {n} {ESTADO_SHORT[e] || e}
                  </span>
                );
              })}
              {late > 0 && (
                <span style={{ background: C.red + "22", color: C.red, borderRadius: 4, fontSize: 9, padding: "1px 6px", fontWeight: 700 }}>
                  ⚠ {late} Venc.
                </span>
              )}
              {pts.length === 0 && allPts.length > 0 && (
                <span style={{ background: C.muted + "22", color: C.muted, borderRadius: 4, fontSize: 9, padding: "1px 6px", fontWeight: 700 }}>
                  📦 {allPts.length} archivada{allPts.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* PER bar */}
            {per !== null && <PerBar per={per} />}
            {per === null && (
              <div style={{ fontSize: 10, color: C.muted, marginTop: 6, fontStyle: "italic" }}>Sin tareas</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Column 2: Activity log ───────────────────────────────────────────────────
function ActivityLog({ logs, users, accessibleProjects }) {
  const navigate = useNavigate();
  const pIds    = new Set(accessibleProjects.map(p => p._fid));
  const visible = logs
    .filter(l => !l.projectId || pIds.has(l.projectId))
    .slice(0, 10);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <SectionTitle>Actividad reciente</SectionTitle>
        <button
          onClick={() => navigate("/settings", { state: { tab: "log" } })}
          style={{ background: "none", border: "none", color: C.orange, fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, padding: 0, whiteSpace: "nowrap" }}
        >
          Ver todo →
        </button>
      </div>
      {visible.length === 0 && (
        <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "24px 0" }}>
          Sin actividad registrada.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {visible.map((entry, i) => {
          const meta = ACTION_META[entry.action] ?? { icon: "•", label: entry.action };
          return (
            <div key={entry._fid ?? i} style={{
              display: "flex", gap: 9, padding: "8px 0",
              borderBottom: i < visible.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 2, lineHeight: 1 }}>{meta.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {(entry.taskShortId || entry.taskTitle) && (
                  <div style={{ fontSize: 11, color: C.text, fontWeight: 500, marginBottom: 2, display: "flex", gap: 5, alignItems: "center", minWidth: 0 }}>
                    {entry.taskShortId && (
                      <span style={{ color: C.blue, fontFamily: "monospace", fontWeight: 700, flexShrink: 0 }}>
                        {entry.taskShortId}
                      </span>
                    )}
                    {entry.taskTitle && (
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.taskTitle}
                      </span>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.4, marginBottom: 3 }}>
                  {entry.detail || meta.label}
                </div>
                <div style={{ fontSize: 10, color: C.muted, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {entry.projectName && (
                    <span style={{
                      color: C.orange, fontWeight: 600,
                      maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {entry.projectName}
                    </span>
                  )}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                    {users.find(u => u.email === entry.performedBy)?.name || entry.performedBy}
                  </span>
                  <span style={{ marginLeft: "auto", flexShrink: 0, whiteSpace: "nowrap" }}>
                    {fmtTs(entry.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Column 3: User task stats ────────────────────────────────────────────────
function UserStats({ tareas, users, accessibleProjects }) {
  const today = new Date().toISOString().slice(0, 10);
  const week  = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const rows = useMemo(() => {
    const pIds  = new Set(accessibleProjects.map(p => p._fid));
    const scope = tareas.filter(t => pIds.has(t.projectId) && t.estado !== "Archivado");
    const statsMap = {};
    scope.forEach(t => {
      if (!t.responsable) return;
      if (!statsMap[t.responsable]) statsMap[t.responsable] = { email: t.responsable, total: 0, byState: {}, overdue: 0 };
      const s = statsMap[t.responsable];
      s.total++;
      s.byState[t.estado] = (s.byState[t.estado] || 0) + 1;
      if (t.plazo && t.plazo < today) s.overdue++;
    });
    tareas
      .filter(t => pIds.has(t.projectId) && t.estado === "Archivado" && t.archivedAt >= week)
      .forEach(t => {
        if (!t.responsable) return;
        if (!statsMap[t.responsable]) statsMap[t.responsable] = { email: t.responsable, total: 0, byState: {}, overdue: 0 };
        statsMap[t.responsable].doneThisWeek = (statsMap[t.responsable].doneThisWeek || 0) + 1;
      });
    return Object.values(statsMap).sort((a, b) => b.total - a.total);
  }, [tareas, accessibleProjects, today, week]);

  const nameOf = (email) => users.find(u => u.email === email)?.name || email;

  return (
    <>
      <SectionTitle>Carga por usuario</SectionTitle>
      {rows.length === 0 && (
        <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "24px 0" }}>
          Sin tareas asignadas.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(s => (
          <div key={s.email} style={{
            background: C.panel, borderRadius: 10,
            border: `1px solid ${C.border}`, padding: "11px 13px",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {nameOf(s.email)}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.email}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: C.blue, lineHeight: 1 }}>{s.total}</span>
                {s.overdue > 0 && (
                  <span style={{ background: C.red + "22", color: C.red, borderRadius: 4, fontSize: 9, padding: "1px 6px", fontWeight: 700 }}>
                    ⚠ {s.overdue} Vencida{s.overdue !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              {TALLER_ESTADOS.map(e => {
                const n = s.byState[e] || 0;
                if (!n) return null;
                return (
                  <span key={e} style={{
                    background: ESTADO_COLORS[e] + "22", color: ESTADO_COLORS[e],
                    borderRadius: 4, fontSize: 9, padding: "1px 6px", fontWeight: 700,
                  }}>
                    {n} {ESTADO_SHORT[e] || e}
                  </span>
                );
              })}
              {(s.doneThisWeek ?? 0) > 0 && (
                <span style={{ background: C.green + "22", color: C.green, borderRadius: 4, fontSize: 9, padding: "1px 6px", fontWeight: 700 }}>
                  ✓ {s.doneThisWeek} esta semana
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { tareas, users, logs, accessibleProjects } = useApp();


  return (
    <div style={{ padding: 28, maxWidth: 1400 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: C.text, marginBottom: 4 }}>📊 Dashboard</div>
        <div style={{ fontSize: 12, color: C.muted }}>
          Vista general · {accessibleProjects.length} proyecto{accessibleProjects.length !== 1 ? "s" : ""} accesible{accessibleProjects.length !== 1 ? "s" : ""}
        </div>
      </div>

      <KpiRow tareas={tareas} accessibleProjects={accessibleProjects} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, alignItems: "start" }}>
        <PanelCard style={{ padding: "18px 16px" }}>
          <ProjectSummary tareas={tareas} accessibleProjects={accessibleProjects} />
        </PanelCard>
        <PanelCard style={{ padding: "18px 16px" }}>
          <ActivityLog logs={logs} users={users} accessibleProjects={accessibleProjects} />
        </PanelCard>
        <PanelCard style={{ padding: "18px 16px" }}>
          <UserStats tareas={tareas} users={users} accessibleProjects={accessibleProjects} />
        </PanelCard>
      </div>
    </div>
  );
}
