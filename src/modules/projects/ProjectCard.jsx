import { C } from "../../lib/theme";
import Badge from "../../components/ui/Badge";
import Btn from "../../components/ui/Btn";
import { fmtDate } from "../../lib/utils";
import { useApp } from "../../context/AppContext";

export default function ProjectCard({ p, tareas, onEdit }) {
  const { isAdmin, handleArchiveProject, handleUnarchiveProject } = useApp();
  const taskCount = tareas.filter(t => t.projectId === p._fid && t.estado !== "Archivado").length;

  return (
    <div style={{
      background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10,
      opacity: p.archived ? 0.55 : 1,
      borderLeft: `4px solid ${p.archived ? C.muted : (p.color || C.orange)}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: p.archived ? C.muted : (p.color || C.orange), flexShrink: 0 }} />
        <div style={{ fontWeight: 700, fontSize: 15, color: C.text, flex: 1 }}>{p.nombre}</div>
        {p.archived
          ? <span style={{ background: C.muted + "33", color: C.muted, borderRadius: 5, fontSize: 10, padding: "2px 8px", fontWeight: 700 }}>ARCHIVADO</span>
          : <Badge color={C.blue}>{taskCount} tareas activas</Badge>
        }
      </div>

      {p.url && (
        <div style={{ fontSize: 12, color: C.blue, display: "flex", alignItems: "center", gap: 5 }}>
          <span>🔗</span>
          <a href={p.url} target="_blank" rel="noreferrer" style={{ color: C.blue, textDecoration: "none" }}>{p.url}</a>
        </div>
      )}
      {p.descripcion && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{p.descripcion}</div>}

      {(p.techStack || p.architecture) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {p.techStack && (
            <div style={{ background: C.purple + "11", borderRadius: 8, padding: "8px 12px", border: `1px solid ${C.purple}33` }}>
              <div style={{ fontSize: 10, color: C.purple, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>⚙️ Tech Stack</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.techStack}</div>
            </div>
          )}
          {p.architecture && (
            <div style={{ background: C.blue + "11", borderRadius: 8, padding: "8px 12px", border: `1px solid ${C.blue}33` }}>
              <div style={{ fontSize: 10, color: C.blue, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>🏗 Arquitectura</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.architecture}</div>
            </div>
          )}
        </div>
      )}

      {p.notasTecnicas && (
        <div style={{ background: C.panel, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>Notas técnicas</div>
          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.notasTecnicas}</div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
        <div style={{ fontSize: 10, color: C.muted }}>
          {p.creadoEn ? `Creado ${fmtDate(p.creadoEn.slice(0, 10))}` : ""}
          {p.archivedAt ? ` · Archivado ${fmtDate(p.archivedAt)}` : ""}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!p.archived && (
            <Btn size="sm" color={C.border2} onClick={() => onEdit(p)}>✏️ Editar</Btn>
          )}
          {isAdmin && !p.archived && (
            <Btn size="sm" color={C.muted} onClick={() => handleArchiveProject(p._fid)}>📦 Archivar</Btn>
          )}
          {isAdmin && p.archived && (
            <Btn size="sm" color={C.green} onClick={() => handleUnarchiveProject(p._fid)}>♻️ Restaurar</Btn>
          )}
        </div>
      </div>
    </div>
  );
}
