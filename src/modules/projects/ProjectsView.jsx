import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../../lib/theme";
import Btn from "../../components/ui/Btn";
import ProjectCard from "./ProjectCard";
import ProjectModal from "./ProjectModal";
import { useApp } from "../../context/AppContext";

export default function ProjectsView() {
  const { projects, tareas, handleSaveProject } = useApp();
  const navigate = useNavigate();
  const [modal, setModal]         = useState(false);
  const [editingP, setEditingP]   = useState(null);

  const active   = projects.filter(p => !p.archived);
  const archived = projects.filter(p =>  p.archived);

  function openEdit(p) { setEditingP(p); setModal(true); }
  function openNew()   { setEditingP(null); setModal(true); }

  async function handleSave(data) {
    const id = await handleSaveProject(data);
    if (id && !data._fid) navigate(`/projects/${id}`);
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: C.text }}>📋 Maestro de Proyectos</div>
        <Btn onClick={openNew}>+ Nuevo proyecto</Btn>
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 28 }}>
        Gestión centralizada de todos los proyectos · {active.length} activos
        {archived.length > 0 ? `, ${archived.length} archivados` : ""}
      </div>

      {active.length === 0 && (
        <div style={{ textAlign: "center", color: C.muted, padding: "40px 0", fontSize: 13 }}>
          No hay proyectos activos. Crea el primero.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 16, marginBottom: archived.length > 0 ? 40 : 0 }}>
        {active.map(p => <ProjectCard key={p._fid} p={p} tareas={tareas} onEdit={openEdit} />)}
      </div>

      {archived.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Archivados</div>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 16 }}>
            {archived.map(p => <ProjectCard key={p._fid} p={p} tareas={tareas} onEdit={openEdit} />)}
          </div>
        </>
      )}

      {modal && (
        <ProjectModal
          proyecto={editingP}
          onClose={() => { setModal(false); setEditingP(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
