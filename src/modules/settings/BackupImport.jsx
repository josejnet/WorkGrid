import { useState, useMemo, useRef } from "react";
import { C } from "../../lib/theme";
import Btn from "../../components/ui/Btn";
import { useApp } from "../../context/AppContext";
import { setDocById } from "../../services/db";

// ── Análisis de conflictos ────────────────────────────────────────────────────

function analyzeBackup(backup, currentProjects, currentTareas, currentUsers) {
  const byProjectFid = new Map(currentProjects.map(p => [p._fid, p]));
  const byTaskFid    = new Map(currentTareas.map(t => [t._fid, t]));
  const byUserFid    = new Map(currentUsers.map(u => [u._fid, u]));

  const projects = (backup.projects || []).map(p => ({
    ...p,
    _conflict:    byProjectFid.has(p._fid),
    _resolution:  byProjectFid.has(p._fid) ? "overwrite" : "create",
  }));

  const tasks = (backup.tasks || []).map(t => ({
    ...t,
    _conflict: byTaskFid.has(t._fid),
  }));

  const users = (backup.users || []).map(u => ({
    ...u,
    _conflict:   byUserFid.has(u._fid),
    _resolution: byUserFid.has(u._fid) ? "overwrite" : "create",
  }));

  return { projects, tasks, users };
}

// ── Subcomponente: fila de resolución ─────────────────────────────────────────

function ResolutionRow({ label, sub, color, conflict, resolution, onChange, dimmed }) {
  const rowBg = conflict
    ? (resolution === "skip" ? C.card : C.orange + "0a")
    : C.card;
  const rowBorder = conflict
    ? (resolution === "skip" ? C.border : C.orange + "44")
    : C.border;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: rowBg, border: `1px solid ${rowBorder}`,
      borderRadius: 8, padding: "9px 12px",
      opacity: dimmed ? 0.55 : 1,
      transition: "all .15s",
    }}>
      {color && (
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      {!conflict ? (
        <span style={{ fontSize: 11, color: C.green, fontWeight: 600, flexShrink: 0 }}>+ Nuevo</span>
      ) : (
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: C.orange, marginRight: 4, alignSelf: "center" }}>⚠ conflicto</span>
          {["overwrite", "skip"].map(opt => (
            <label key={opt} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11, color: resolution === opt ? C.text : C.muted }}>
              <input
                type="radio" name={`res-${label}`} value={opt}
                checked={resolution === opt}
                onChange={() => onChange(opt)}
                style={{ accentColor: C.orange, cursor: "pointer" }}
              />
              {opt === "overwrite" ? "Sobreescribir" : "Omitir"}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function BackupImport() {
  const { projects, tareas, users } = useApp();
  const fileRef = useRef(null);

  const [phase,    setPhase]    = useState("idle");    // idle | staged | importing | done
  const [staged,   setStaged]   = useState(null);
  const [progress, setProgress] = useState(null);      // { done, total, currentPhase }
  const [result,   setResult]   = useState(null);
  const [fileName, setFileName] = useState("");

  // ── Carga del archivo ──────────────────────────────────────────────────────

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const backup = JSON.parse(ev.target.result);
        if (!backup._meta || !Array.isArray(backup.projects) || !Array.isArray(backup.tasks) || !Array.isArray(backup.users)) {
          alert("El archivo no es un backup válido de El Taller (faltan secciones _meta, projects, tasks o users).");
          return;
        }
        setFileName(file.name);
        setStaged(analyzeBackup(backup, projects, tareas, users));
        setPhase("staged");
      } catch {
        alert("Error al leer el archivo. Asegúrate de que es un JSON válido.");
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  // ── Resolución por ítem ────────────────────────────────────────────────────

  function setProjectRes(fid, res) {
    setStaged(prev => ({ ...prev, projects: prev.projects.map(p => p._fid === fid ? { ...p, _resolution: res } : p) }));
  }
  function setUserRes(fid, res) {
    setStaged(prev => ({ ...prev, users: prev.users.map(u => u._fid === fid ? { ...u, _resolution: res } : u) }));
  }
  function setAllProjectConflicts(res) {
    setStaged(prev => ({ ...prev, projects: prev.projects.map(p => p._conflict ? { ...p, _resolution: res } : p) }));
  }
  function setAllUserConflicts(res) {
    setStaged(prev => ({ ...prev, users: prev.users.map(u => u._conflict ? { ...u, _resolution: res } : u) }));
  }

  // ── Plan de importación (derivado) ────────────────────────────────────────

  const plan = useMemo(() => {
    if (!staged) return null;
    const includedFids = new Set(staged.projects.filter(p => p._resolution !== "skip").map(p => p._fid));
    const tasksToImport = staged.tasks.filter(t => includedFids.has(t.projectId));
    return {
      projects: staged.projects.filter(p => p._resolution !== "skip"),
      tasks:    tasksToImport,
      users:    staged.users.filter(u => u._resolution !== "skip"),
      skipped: {
        projects: staged.projects.filter(p => p._resolution === "skip").length,
        tasks:    staged.tasks.length - tasksToImport.length,
        users:    staged.users.filter(u => u._resolution === "skip").length,
      },
    };
  }, [staged]);

  // ── Ejecución ──────────────────────────────────────────────────────────────

  async function runImport() {
    if (!plan) return;
    setPhase("importing");
    const total  = plan.users.length + plan.projects.length + plan.tasks.length;
    let done     = 0;
    const errors = [];

    async function upsert(col, fid, raw) {
      // Strip staging fields before writing to Firestore
      const { _fid, _conflict, _resolution, ...data } = raw;
      try {
        await setDocById(col, fid, data);
      } catch (err) {
        errors.push({ col, fid, message: err.message });
      }
      done++;
      setProgress(prev => ({ ...prev, done }));
    }

    setProgress({ done: 0, total, currentPhase: "usuarios" });
    for (const u of plan.users)    await upsert("users",          u._fid, u);

    setProgress(prev => ({ ...prev, currentPhase: "proyectos" }));
    for (const p of plan.projects) await upsert("projects",       p._fid, p);

    setProgress(prev => ({ ...prev, currentPhase: "tareas" }));
    for (const t of plan.tasks)    await upsert("taller_tareas",  t._fid, t);

    setResult({ imported: { users: plan.users.length, projects: plan.projects.length, tasks: plan.tasks.length }, skipped: plan.skipped, errors });
    setPhase("done");
  }

  // ── Renders por fase ──────────────────────────────────────────────────────

  if (phase === "idle") {
    return (
      <div style={{ maxWidth: 680 }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.7 }}>
          Selecciona un backup <code style={{ background: C.card, padding: "1px 6px", borderRadius: 4, color: C.text }}>.json</code> generado por esta misma aplicación para iniciar la revisión de conflictos antes de importar.
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: "100%", padding: "20px 24px", borderRadius: 12,
            border: `2px dashed ${C.border2}`, background: C.card,
            color: C.muted, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          📂 Seleccionar archivo backup JSON…
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleFile} style={{ display: "none" }} />
      </div>
    );
  }

  if (phase === "staged" && staged && plan) {
    const conflictProjects = staged.projects.filter(p => p._conflict);
    const conflictUsers    = staged.users.filter(u => u._conflict);

    return (
      <div style={{ maxWidth: 720 }}>

        {/* ── Banner archivo ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>📄 {fileName}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {staged.projects.length} proyecto{staged.projects.length !== 1 ? "s" : ""} · {staged.tasks.length} tarea{staged.tasks.length !== 1 ? "s" : ""} · {staged.users.length} usuario{staged.users.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button onClick={() => { setPhase("idle"); setStaged(null); setFileName(""); }}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* ── Advertencia de riesgo ── */}
        <div style={{ background: C.red + "12", border: `1px solid ${C.red}55`, borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
          <span style={{ color: C.red, fontWeight: 700 }}>⚠ Riesgo: </span>
          Esta operación escribe directamente en la base de datos. Los elementos en conflicto marcados como <strong style={{ color: C.text }}>"Sobreescribir"</strong> reemplazarán los datos existentes sin posibilidad de deshacer. Los cambios son permanentes.
        </div>

        {/* ── PROYECTOS ── */}
        <Section
          title="Proyectos"
          newCount={staged.projects.filter(p => !p._conflict).length}
          conflictCount={conflictProjects.length}
          skippedCount={staged.projects.filter(p => p._resolution === "skip").length}
        >
          {conflictProjects.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: C.muted, alignSelf: "center" }}>Aplicar a todos los conflictos:</span>
              {["overwrite", "skip"].map(opt => (
                <button key={opt} onClick={() => setAllProjectConflicts(opt)}
                  style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "none", color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>
                  {opt === "overwrite" ? "Sobreescribir todos" : "Omitir todos"}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {staged.projects.map(p => (
              <ResolutionRow
                key={p._fid} label={p.nombre} sub={p.descripcion || null}
                color={p.color} conflict={p._conflict}
                resolution={p._resolution}
                onChange={res => setProjectRes(p._fid, res)}
                dimmed={p._resolution === "skip"}
              />
            ))}
          </div>
        </Section>

        {/* ── USUARIOS ── */}
        <Section
          title="Usuarios"
          newCount={staged.users.filter(u => !u._conflict).length}
          conflictCount={conflictUsers.length}
          skippedCount={staged.users.filter(u => u._resolution === "skip").length}
        >
          {conflictUsers.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: C.muted, alignSelf: "center" }}>Aplicar a todos los conflictos:</span>
              {["overwrite", "skip"].map(opt => (
                <button key={opt} onClick={() => setAllUserConflicts(opt)}
                  style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "none", color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>
                  {opt === "overwrite" ? "Sobreescribir todos" : "Omitir todos"}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {staged.users.map(u => (
              <ResolutionRow
                key={u._fid} label={u.name || u.email} sub={u.email}
                color={null} conflict={u._conflict}
                resolution={u._resolution}
                onChange={res => setUserRes(u._fid, res)}
                dimmed={u._resolution === "skip"}
              />
            ))}
          </div>
        </Section>

        {/* ── TAREAS (solo resumen) ── */}
        <Section title="Tareas" auto>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
            Las tareas siguen la resolución de su proyecto. Los conflictos de tarea (mismo ID) se sobreescriben automáticamente cuando el proyecto se importa.
            <div style={{ marginTop: 8, display: "flex", gap: 16 }}>
              <span><span style={{ color: C.green, fontWeight: 600 }}>{plan.tasks.length}</span> a importar</span>
              {plan.skipped.tasks > 0 && <span><span style={{ color: C.muted, fontWeight: 600 }}>{plan.skipped.tasks}</span> omitidas (proyectos omitidos)</span>}
            </div>
          </div>
        </Section>

        {/* ── Resumen + botón ── */}
        <div style={{
          marginTop: 24, padding: "14px 18px", background: C.card,
          borderRadius: 10, border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 13, color: C.muted }}>
            Importar:{" "}
            <strong style={{ color: C.text }}>{plan.projects.length}</strong> proyecto{plan.projects.length !== 1 ? "s" : ""},{" "}
            <strong style={{ color: C.text }}>{plan.tasks.length}</strong> tarea{plan.tasks.length !== 1 ? "s" : ""},{" "}
            <strong style={{ color: C.text }}>{plan.users.length}</strong> usuario{plan.users.length !== 1 ? "s" : ""}
            {(plan.skipped.projects + plan.skipped.users) > 0 && (
              <span style={{ color: C.muted }}> · {plan.skipped.projects + plan.skipped.users} omitidos</span>
            )}
          </div>
          <Btn
            onClick={runImport}
            disabled={plan.projects.length === 0 && plan.users.length === 0}
          >
            Confirmar importación
          </Btn>
        </div>
      </div>
    );
  }

  if (phase === "importing" && progress) {
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div style={{ maxWidth: 480 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 16 }}>Importando…</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
          {progress.currentPhase.charAt(0).toUpperCase() + progress.currentPhase.slice(1)} — {progress.done}/{progress.total}
        </div>
        <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", background: C.green, borderRadius: 3, width: `${pct}%`, transition: "width .2s" }} />
        </div>
      </div>
    );
  }

  if (phase === "done" && result) {
    const hasErrors = result.errors.length > 0;
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: hasErrors ? C.orange : C.green, marginBottom: 16 }}>
          {hasErrors ? "⚠ Importación completada con errores" : "✓ Importación completada"}
        </div>

        <div style={{ display: "flex", gap: 24, marginBottom: 20, fontSize: 13 }}>
          <span><strong style={{ color: C.text }}>{result.imported.projects}</strong> <span style={{ color: C.muted }}>proyectos</span></span>
          <span><strong style={{ color: C.text }}>{result.imported.tasks}</strong> <span style={{ color: C.muted }}>tareas</span></span>
          <span><strong style={{ color: C.text }}>{result.imported.users}</strong> <span style={{ color: C.muted }}>usuarios</span></span>
          {(result.skipped.projects + result.skipped.tasks + result.skipped.users) > 0 && (
            <span><strong style={{ color: C.muted }}>{result.skipped.projects + result.skipped.tasks + result.skipped.users}</strong> <span style={{ color: C.muted }}>omitidos</span></span>
          )}
        </div>

        {hasErrors && (
          <div style={{ marginBottom: 20, padding: "12px 14px", background: C.orange + "12", border: `1px solid ${C.orange}44`, borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.orange, marginBottom: 8 }}>
              {result.errors.length} error{result.errors.length !== 1 ? "es" : ""}:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {result.errors.map((err, i) => (
                <div key={i} style={{ fontSize: 11, color: C.muted }}>
                  <span style={{ color: C.text, fontFamily: "monospace" }}>{err.col}/{err.fid.slice(0, 12)}…</span> — {err.message}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: "12px 14px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.muted, marginBottom: 20 }}>
          Los datos se han escrito en la base de datos. <strong style={{ color: C.text }}>Recarga la página</strong> para que la aplicación refleje los cambios.
        </div>

        <Btn onClick={() => window.location.reload()}>↺ Recargar página</Btn>
      </div>
    );
  }

  return null;
}

// ── Subcomponente: sección con header y contador ──────────────────────────────

function Section({ title, newCount, conflictCount, skippedCount, auto, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{title}</div>
        {auto
          ? <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>automático</span>
          : (
            <div style={{ display: "flex", gap: 6 }}>
              {newCount      > 0 && <span style={{ fontSize: 11, background: C.green + "22",  color: C.green,  borderRadius: 10, padding: "1px 8px" }}>+{newCount} nuevos</span>}
              {conflictCount > 0 && <span style={{ fontSize: 11, background: C.orange + "22", color: C.orange, borderRadius: 10, padding: "1px 8px" }}>⚠ {conflictCount} conflicto{conflictCount !== 1 ? "s" : ""}</span>}
              {skippedCount  > 0 && <span style={{ fontSize: 11, background: C.muted + "22",  color: C.muted,  borderRadius: 10, padding: "1px 8px" }}>{skippedCount} omitido{skippedCount !== 1 ? "s" : ""}</span>}
            </div>
          )
        }
      </div>
      <div style={{ padding: "14px 16px", background: C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>
        {children}
      </div>
    </div>
  );
}
