import { db } from "../firebase";
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, writeBatch,
} from "firebase/firestore";
import { updDoc, delDocCol } from "./db";

const col = (n) => collection(db, n);

// ── Fetch all tasks (admin only) ───────────────────────────────────────────────
export async function getTasks() {
  try {
    const s = await getDocs(col("taller_tareas"));
    return s.docs.map(d => ({ _fid: d.id, ...d.data() }));
  } catch { return []; }
}

// ── Fetch tasks filtered by project IDs (non-admin users) ─────────────────────
// Firestore `in` supports up to 30 values; chunk if needed.
export async function getTasksForProjects(projectIds) {
  if (!projectIds || projectIds.length === 0) return [];
  try {
    const chunks = [];
    for (let i = 0; i < projectIds.length; i += 30) {
      chunks.push(projectIds.slice(i, i + 30));
    }
    const results = await Promise.all(
      chunks.map(chunk => {
        const q = query(col("taller_tareas"), where("projectId", "in", chunk));
        return getDocs(q).then(s => s.docs.map(d => ({ _fid: d.id, ...d.data() })));
      })
    );
    return results.flat();
  } catch { return []; }
}

// ── Fetch changelog for a single project ──────────────────────────────────────
export async function getProjectChangelog(projectId) {
  try {
    const q = query(col("taller_changelog"), where("projectId", "==", projectId));
    const s = await getDocs(q);
    return s.docs
      .map(d => ({ _fid: d.id, ...d.data() }))
      .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  } catch { return []; }
}

export async function createTask(data, projectId, createdBy) {
  const payload = {
    ...data,
    projectId,
    creadoEn:  new Date().toISOString(),
    creadoPor: createdBy,
  };
  try {
    const r = await addDoc(col("taller_tareas"), payload);
    return { ...payload, _fid: r.id };
  } catch { return null; }
}

export async function updateTask(id, data) {
  await updDoc("taller_tareas", id, data);
}

// ── Atomic archive: changelog entry + task updates in a single batch ───────────
export async function archiveToChangelog(tasks, projectId, createdBy) {
  const ts    = new Date().toISOString().slice(0, 10);
  const batch = writeBatch(db);

  // Single changelog entry for all tasks in this project
  const changelogRef = doc(col("taller_changelog"));
  batch.set(changelogRef, {
    version:     ts,
    fecha:       ts,
    generadoEn:  new Date().toISOString(),
    generadoPor: createdBy,
    projectId,
    cambios: tasks.map(t => ({
      titulo:      t.titulo,
      tipo:        t.tipo,
      prioridad:   t.prioridad,
      impacto:     t.impacto     || null,
      solucion:    t.solucion    || null,
      fechaFin:    t.fechaFin    || ts,
      responsable: t.responsable || null,
      taskId:      t.taskId      || null,
    })),
  });

  // Archive each task atomically in the same batch
  for (const t of tasks) {
    batch.update(doc(db, "taller_tareas", t._fid), {
      estado: "Archivado", archivedAt: ts, listaChangelog: false,
    });
  }

  await batch.commit();
  return ts;
}

export async function moveTask(taskId, targetProjectId) {
  await updDoc("taller_tareas", taskId, { projectId: targetProjectId });
}

export async function assignTask(taskId, responsable) {
  await updDoc("taller_tareas", taskId, { responsable });
}

export async function updateTaskEstado(taskId, estado) {
  const today = new Date().toISOString().slice(0, 10);
  const extra = estado === "Producción"
    ? { listaChangelog: true, produccionAt: today }
    : { produccionAt: null };
  await updDoc("taller_tareas", taskId, { estado, ...extra });
  return extra;
}

export async function deleteTask(id) {
  return delDocCol("taller_tareas", id);
}
