import { useState, useMemo } from "react";
import { C } from "../../lib/theme";
import Btn from "../../components/ui/Btn";
import { useApp } from "../../context/AppContext";

export default function BackupExport() {
  const { projects, tareas, users, session } = useApp();

  const [selectedFids, setSelectedFids]     = useState(() => new Set(projects.map(p => p._fid)));
  const [includeArchived, setIncludeArchived] = useState(false);

  const activeProjects   = projects.filter(p => !p.archived);
  const archivedProjects = projects.filter(p =>  p.archived);

  function toggleProject(fid) {
    setSelectedFids(prev => {
      const next = new Set(prev);
      next.has(fid) ? next.delete(fid) : next.add(fid);
      return next;
    });
  }

  function taskCount(projectId) {
    const base = includeArchived ? tareas : tareas.filter(t => t.estado !== "Archivado");
    return base.filter(t => t.projectId === projectId).length;
  }

  const selectedTasks = useMemo(() => {
    const base = includeArchived ? tareas : tareas.filter(t => t.estado !== "Archivado");
    return base.filter(t => selectedFids.has(t.projectId));
  }, [selectedFids, tareas, includeArchived]);

  function buildBackup() {
    const exportedProjects = projects
      .filter(p => selectedFids.has(p._fid))
      .map(p => ({
        _fid:                  p._fid,
        nombre:                p.nombre                || "",
        descripcion:           p.descripcion           || "",
        color:                 p.color                 || "#6366f1",
        url:                   p.url                   || "",
        readUsers:             p.readUsers             || [],
        writeUsers:            p.writeUsers            || [],
        taskCounter:           p.taskCounter           || 0,
        archived:              p.archived              || false,
        archivedAt:            p.archivedAt            || null,
        notasTecnicas:         p.notasTecnicas         || "",
        apiEnabled:            p.apiEnabled            || false,
        apiSecretHash:         p.apiSecretHash         || null,
        apiName:               p.apiName               || null,
        apiSecretGeneratedAt:  p.apiSecretGeneratedAt  || null,
        creadoEn:              p.creadoEn              || null,
      }));

    const exportedTasks = selectedTasks.map(t => ({
      _fid:           t._fid,
      projectId:      t.projectId,
      taskId:         t.taskId         || null,
      titulo:         t.titulo         || "",
      problema:       t.problema       || "",
      solucion:       t.solucion       || "",
      tipo:           t.tipo           || "Mejora",
      prioridad:      t.prioridad      || "Media",
      estado:         t.estado         || "Pendiente",
      responsable:    t.responsable    || "",
      version:        t.version        || "",
      fechaInicio:    t.fechaInicio    || null,
      plazo:          t.plazo          || null,
      fechaFin:       t.fechaFin       || null,
      produccionAt:   t.produccionAt   || null,
      listaChangelog: t.listaChangelog || false,
      taskPrompt:     t.taskPrompt     || "",
      importHash:     t.importHash     || null,
      creadoEn:       t.creadoEn       || null,
      creadoPor:      t.creadoPor      || null,
    }));

    // Todos los usuarios siempre — ver advertencia en UI
    const exportedUsers = users.map(u => ({
      _fid:      u._fid,
      email:     u.email,
      name:      u.name      || "",
      photoURL:  u.photoURL  || null,
      role:      u.role      || "user",
      active:    u.active !== false,
      themeMode: u.themeMode || "dark",
      creadoEn:  u.creadoEn  || null,
    }));

    return {
      _meta: {
        schema_version:        "1",
        app:                   "El Taller",
        exported_at:           new Date().toISOString(),
        exported_by:           session?.email || "unknown",
        include_archived_tasks: includeArchived,
        selection: {
          projects: exportedProjects.length,
          tasks:    exportedTasks.length,
          users:    exportedUsers.length,
        },
      },
      projects: exportedProjects,
      tasks:    exportedTasks,
      users:    exportedUsers,
    };
  }

  function downloadBackup() {
    const backup = buildBackup();
    const json   = JSON.stringify(backup, null, 2);
    const blob   = new Blob([json], { type: "application/json;charset=utf-8" });
    const url    = URL.createObjectURL(blob);
    const today  = new Date().toISOString().slice(0, 10);
    const a      = document.createElement("a");
    a.href = url;
    a.download = `eltaller_backup_${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rowStyle = (checked) => ({
    display: "flex", alignItems: "center", gap: 12,
    background: checked ? C.orange + "0a" : C.card,
    border: `1px solid ${checked ? C.orange + "55" : C.border}`,
    borderRadius: 10, padding: "10px 14px", cursor: "pointer",
    transition: "border-color .15s, background .15s",
  });

  const checkStyle = { width: 15, height: 15, accentColor: C.orange, cursor: "pointer", flexShrink: 0 };

  return (
    <div style={{ maxWidth: 680 }}>

      {/* ── Advertencia de usuarios ── */}
      <div style={{
        background: C.red + "12", border: `1px solid ${C.red}55`,
        borderRadius: 12, padding: "16px 20px", marginBottom: 28,
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.red, marginBottom: 8 }}>
          ⚠ Riesgo — usuarios del sistema
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.8 }}>
          Este backup exporta <strong style={{ color: C.text }}>todos los usuarios del sistema</strong>, sin posibilidad de excluirlos.
          Al restaurar en el destino, los usuarios existentes pueden generar conflictos de permisos o duplicados.<br />
          <strong style={{ color: C.red }}>
            Borra todos los usuarios del sistema destino antes de importar este backup.
          </strong>
        </div>
      </div>

      {/* ── Selección de proyectos ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Proyectos a incluir</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Todos", "Ninguno"].map(label => (
              <button
                key={label}
                onClick={() => label === "Todos"
                  ? setSelectedFids(new Set(projects.map(p => p._fid)))
                  : setSelectedFids(new Set())}
                style={{
                  background: "none", border: `1px solid ${C.border2}`,
                  borderRadius: 6, fontSize: 11, padding: "3px 10px",
                  color: C.muted, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {activeProjects.map(p => {
            const checked = selectedFids.has(p._fid);
            const count   = taskCount(p._fid);
            return (
              <label key={p._fid} style={rowStyle(checked)}>
                <input type="checkbox" checked={checked} onChange={() => toggleProject(p._fid)} style={checkStyle} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0, display: "inline-block" }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>{p.nombre}</span>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>
                  {count} tarea{count !== 1 ? "s" : ""}
                </span>
              </label>
            );
          })}

          {archivedProjects.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 8, marginBottom: 2, paddingLeft: 2 }}>
                Proyectos archivados
              </div>
              {archivedProjects.map(p => {
                const checked = selectedFids.has(p._fid);
                const count   = taskCount(p._fid);
                return (
                  <label key={p._fid} style={{ ...rowStyle(checked), opacity: 0.7 }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleProject(p._fid)} style={checkStyle} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.muted }}>{p.nombre}</span>
                    <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>
                      {count} tarea{count !== 1 ? "s" : ""}
                    </span>
                  </label>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Opciones ── */}
      <div style={{
        marginBottom: 24, padding: "14px 18px",
        background: C.card, borderRadius: 10, border: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
          Opciones
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox" checked={includeArchived}
              onChange={e => setIncludeArchived(e.target.checked)}
              style={checkStyle}
            />
            <span style={{ fontSize: 13, color: C.text }}>Incluir tareas archivadas</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" checked disabled style={{ ...checkStyle, cursor: "not-allowed", opacity: 0.45 }} />
            <span style={{ fontSize: 13, color: C.muted }}>Incluir todos los usuarios del sistema</span>
            <span style={{ fontSize: 11, color: C.red, fontStyle: "italic" }}>siempre (ver aviso)</span>
          </div>
        </div>
      </div>

      {/* ── Resumen + descarga ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", background: C.card, borderRadius: 10, border: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          <span style={{ color: C.text, fontWeight: 600 }}>{selectedFids.size}</span> proyecto{selectedFids.size !== 1 ? "s" : ""}{" · "}
          <span style={{ color: C.text, fontWeight: 600 }}>{selectedTasks.length}</span> tarea{selectedTasks.length !== 1 ? "s" : ""}{" · "}
          <span style={{ color: C.text, fontWeight: 600 }}>{users.length}</span> usuario{users.length !== 1 ? "s" : ""}
        </div>
        <Btn onClick={downloadBackup} disabled={selectedFids.size === 0}>
          ↓ Descargar backup JSON
        </Btn>
      </div>

    </div>
  );
}
