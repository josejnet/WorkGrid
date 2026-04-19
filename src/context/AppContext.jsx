import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { auth } from "../firebase";
import {
  getProjects, createProject, updateProject,
  archiveProject, unarchiveProject, updateProjectAccess,
  getAndIncrementTaskCounter,
} from "../services/projectService";
import {
  getTasks, getTasksForProjects, createTask, updateTask, deleteTask,
  archiveToChangelog, moveTask, assignTask, updateTaskEstado,
} from "../services/taskService";
import {
  getUsers, saveUser, deleteUser, deactivateUser,
} from "../services/userService";
import { writeLog, getRecentLogs } from "../services/logService";
import {
  createNotification, markNotificationRead,
  markAllNotificationsRead, subscribeToNotifications,
} from "../services/notificationService";
import { SUPER_ADMIN } from "../lib/constants";
import { projectPrefix, contentHash } from "../lib/utils";
import { addDocCol, updDoc } from "../services/db";
import { applyTheme } from "../lib/theme";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { authUser, session, loginWithGoogle, logout } = useAuth();
  const [projects,       setProjects]       = useState([]);
  const [tareas,         setTareas]         = useState([]);
  const [users,          setUsers]          = useState([]);
  const [logs,           setLogs]           = useState([]);
  const [notifications,  setNotifications]  = useState([]);
  const [loaded,         setLoaded]         = useState(false);
  const [themeMode,      setThemeMode]      = useState("dark");
  const [adminClaim,     setAdminClaim]     = useState(false);

  // isAdmin: checks ID token custom claim (set by Cloud Functions, tamper-proof)
  // Falls back to Firestore role for teams not using Cloud Functions yet.
  const isAdmin = adminClaim || session?.email === SUPER_ADMIN || session?.role === "admin";

  // Refresh ID token claims when authUser changes (e.g. after Cloud Function sets admin claim)
  useEffect(() => {
    if (!authUser) { setAdminClaim(false); return; }
    authUser.getIdTokenResult(/* forceRefresh */ false).then(result => {
      setAdminClaim(result.claims?.admin === true);
    }).catch(() => setAdminClaim(false));
  }, [authUser]);

  // ── Accessible project IDs (project-centric model) ──────────────────────────
  function getAccessibleProjectIds(allProjects, sess, admin) {
    if (admin) return allProjects.map(p => p._fid);
    const email = sess?.email;
    return allProjects
      .filter(p =>
        (p.readUsers  || []).includes(email) ||
        (p.writeUsers || []).includes(email)
      )
      .map(p => p._fid);
  }

  // ── Notification subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.email || session.active === false) return;
    const unsub = subscribeToNotifications(session.email, setNotifications);
    return unsub;
  }, [session?.email]);

  // ── Data load ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session || session.active === false) return;

    async function loadAll() {
      const admin = session.email === SUPER_ADMIN || session.role === "admin";

      // ── 1. Load projects and users in parallel ─────────────────────────────
      const [projectsRaw, usersRaw] = await Promise.all([
        getProjects(),
        getUsers(),
      ]);

      // ── 2. Data integrity: only admins run cleanup to avoid permission issues
      let cleanUsers = [...usersRaw];
      if (admin) {
        // Remove ghost docs (no email)
        const ghosts = cleanUsers.filter(u => !u.email);
        await Promise.all(ghosts.map(u => deleteUser(u._fid)));
        cleanUsers = cleanUsers.filter(u => !!u.email);

        // Backfill missing name
        await Promise.all(
          cleanUsers
            .filter(u => !u.name?.trim())
            .map(async u => {
              const name = u.email.split("@")[0];
              await updDoc("users", u._fid, { name });
              const idx = cleanUsers.findIndex(x => x._fid === u._fid);
              if (idx >= 0) cleanUsers[idx] = { ...cleanUsers[idx], name };
            })
        );

        // Deduplicate (same email → multiple docs)
        const emailMap = {};
        const dupIds   = [];
        for (const u of cleanUsers) {
          if (!emailMap[u.email]) {
            emailMap[u.email] = u;
          } else {
            const existing    = emailMap[u.email];
            const uCanon      = u._fid === u.email;
            const exCanon     = existing._fid === existing.email;
            if (uCanon && !exCanon) { dupIds.push(existing._fid); emailMap[u.email] = u; }
            else                    { dupIds.push(u._fid); }
          }
        }
        await Promise.all(dupIds.map(fid => deleteUser(fid)));
        cleanUsers = Object.values(emailMap);
      } else {
        cleanUsers = cleanUsers.filter(u => !!u.email);
      }
      setUsers(cleanUsers);

      // Aplica la preferencia de tema guardada del usuario actual
      const currentUser = cleanUsers.find(u => u.email === session.email);
      if (currentUser?.themeMode && currentUser.themeMode !== "dark") {
        applyTheme(currentUser.themeMode === "dark");
        setThemeMode(currentUser.themeMode);
        localStorage.setItem("theme", currentUser.themeMode);
      }

      let finalProjects = projectsRaw;

      // ── 3. Bootstrap: default project if none exist (admin only) ───────────
      if (admin && projectsRaw.length === 0) {
        const id = await addDocCol("projects", {
          nombre: "SBA", descripcion: "Club Ciclista SBA Albacete",
          color: "#f97316", creadoEn: new Date().toISOString(),
          readUsers: [], writeUsers: [],
        });
        finalProjects = [{ _fid: id, nombre: "SBA", color: "#f97316", readUsers: [], writeUsers: [] }];
      }

      // ── 4. Load tasks — filtered by accessible projects for non-admins ─────
      const accessibleIds = admin
        ? finalProjects.map(p => p._fid)
        : finalProjects
            .filter(p =>
              (p.readUsers  || []).includes(session.email) ||
              (p.writeUsers || []).includes(session.email)
            )
            .map(p => p._fid);

      const tareasRaw = admin
        ? await getTasks()
        : await getTasksForProjects(accessibleIds);

      let finalTareas = tareasRaw;

      // ── 5. Admin-only migrations ───────────────────────────────────────────
      if (admin) {
        // Assign missing projectId to tasks
        const noProject = finalTareas.filter(t => !t.projectId);
        if (noProject.length > 0 && finalProjects.length > 0) {
          const firstId = finalProjects[0]._fid;
          await Promise.all(noProject.map(t => updDoc("taller_tareas", t._fid, { projectId: firstId })));
          finalTareas = finalTareas.map(t => t.projectId ? t : { ...t, projectId: firstId });
        }

        // Migrate project readUsers/writeUsers from legacy user.permissions
        const needsMigration = finalProjects.some(
          p => p.readUsers === undefined && p.writeUsers === undefined
        );
        if (needsMigration) {
          for (const p of finalProjects) {
            if (p.readUsers !== undefined || p.writeUsers !== undefined) continue;
            const readUsers = [], writeUsers = [];
            for (const u of cleanUsers) {
              const perm = u.permissions?.[p._fid];
              if (perm === "read")       readUsers.push(u.email);
              if (perm === "read_write") writeUsers.push(u.email);
            }
            await updateProjectAccess(p._fid, readUsers, writeUsers);
            p.readUsers = readUsers; p.writeUsers = writeUsers;
          }
        }

        // Assign sequential taskIds to tasks that don't have one
        const tasksWithoutId = finalTareas.filter(t => !t.taskId);
        if (tasksWithoutId.length > 0) {
          const counters = {};
          for (const p of finalProjects) counters[p._fid] = p.taskCounter || 0;
          const grouped = {};
          for (const t of tasksWithoutId) {
            if (!grouped[t.projectId]) grouped[t.projectId] = [];
            grouped[t.projectId].push(t);
          }
          for (const tasks of Object.values(grouped)) {
            tasks.sort((a, b) => (a.creadoEn || a._fid) < (b.creadoEn || b._fid) ? -1 : 1);
          }
          for (const [projectId, tasks] of Object.entries(grouped)) {
            const project = finalProjects.find(p => p._fid === projectId);
            const prefix  = projectPrefix(project?.nombre);
            for (const t of tasks) {
              counters[projectId] = (counters[projectId] || 0) + 1;
              const tid = `${prefix}-${String(counters[projectId]).padStart(3, "0")}`;
              await updDoc("taller_tareas", t._fid, { taskId: tid });
              const idx = finalTareas.findIndex(x => x._fid === t._fid);
              if (idx >= 0) finalTareas[idx] = { ...finalTareas[idx], taskId: tid };
            }
            await updDoc("projects", projectId, { taskCounter: counters[projectId] });
            const pIdx = finalProjects.findIndex(p => p._fid === projectId);
            if (pIdx >= 0) finalProjects[pIdx] = { ...finalProjects[pIdx], taskCounter: counters[projectId] };
          }
        }

        // Fix responsable stored as display name instead of email
        const tasksWithNameResp = finalTareas.filter(t => t.responsable && !t.responsable.includes("@"));
        await Promise.all(
          tasksWithNameResp.map(async t => {
            const match = cleanUsers.find(u =>
              (u.name || "").toLowerCase().trim() === t.responsable.toLowerCase().trim()
            );
            if (match) {
              await updDoc("taller_tareas", t._fid, { responsable: match.email });
              const idx = finalTareas.findIndex(x => x._fid === t._fid);
              if (idx >= 0) finalTareas[idx] = { ...finalTareas[idx], responsable: match.email };
            }
          })
        );

        // Rename legacy tipos → Bug
        const legacyTipos = ["Nueva Ruta", "Refactorización"];
        const withLegacy  = finalTareas.filter(t => legacyTipos.includes(t.tipo));
        if (withLegacy.length > 0) {
          await Promise.all(withLegacy.map(t => updDoc("taller_tareas", t._fid, { tipo: "Bug" })));
          finalTareas = finalTareas.map(t => legacyTipos.includes(t.tipo) ? { ...t, tipo: "Bug" } : t);
        }
      }

      // ── 6. Backfill produccionAt (any user, only their visible tasks) ──────
      const todayDate = new Date().toISOString().slice(0, 10);
      const prodWithoutDate = finalTareas.filter(t => t.estado === "Producción" && !t.produccionAt);
      await Promise.all(
        prodWithoutDate.map(async t => {
          await updDoc("taller_tareas", t._fid, { produccionAt: todayDate });
          const idx = finalTareas.findIndex(x => x._fid === t._fid);
          if (idx >= 0) finalTareas[idx] = { ...finalTareas[idx], produccionAt: todayDate };
        })
      );

      // ── 7. Auto-archive: Producción tasks ≥ 7 days ────────────────────────
      // Groups by project → atomic writeBatch per project via archiveToChangelog
      const autoArchiveList = finalTareas.filter(t => {
        if (t.estado !== "Producción" || !t.produccionAt) return false;
        const days = Math.floor((new Date(todayDate) - new Date(t.produccionAt)) / 86400000);
        return days >= 7;
      });

      if (autoArchiveList.length > 0) {
        // Group by project
        const byProject = {};
        for (const t of autoArchiveList) {
          if (!byProject[t.projectId]) byProject[t.projectId] = [];
          byProject[t.projectId].push(t);
        }
        // Atomic archive per project (creates changelog entry + updates tasks)
        await Promise.all(
          Object.entries(byProject).map(([projectId, tasks]) =>
            archiveToChangelog(tasks, projectId, "system")
          )
        );
        finalTareas = finalTareas.map(t =>
          autoArchiveList.find(a => a._fid === t._fid)
            ? { ...t, estado: "Archivado", archivedAt: todayDate, listaChangelog: false }
            : t
        );
      }

      setProjects(finalProjects);
      setTareas(finalTareas);

      // ── 8. Load activity log ───────────────────────────────────────────────
      const recentLogs = await getRecentLogs(50, admin ? null : accessibleIds);
      setLogs(recentLogs);

      setLoaded(true);

      // Fire-and-forget: log auto-archived tasks
      for (const t of autoArchiveList) {
        const pName = finalProjects.find(p => p._fid === t.projectId)?.nombre ?? t.projectId;
        _log({
          projectId: t.projectId, projectName: pName,
          taskId: t._fid, taskTitle: t.titulo,
          taskShortId: t.taskId ?? null,
          action: "task_auto_archived",
          detail: `Auto-archivada: [${t.taskId || t._fid}] "${t.titulo}" (7 días en Producción)`,
        });
      }
    }

    loadAll();
  }, [session]);

  // ── Log helper ──────────────────────────────────────────────────────────────
  function _log(entry) {
    writeLog({ ...entry, performedBy: session?.email }).then(id => {
      if (id) {
        const newEntry = {
          _fid: id, ...entry,
          performedBy: session?.email,
          timestamp: new Date().toISOString(),
        };
        setLogs(prev => [newEntry, ...prev].slice(0, 50));
      }
    });
  }

  function _projectName(projectId) {
    return projects.find(p => p._fid === projectId)?.nombre ?? projectId;
  }

  // ── Project handlers ────────────────────────────────────────────────────────
  async function handleSaveProject(data) {
    const { _fid, ...toSave } = data;
    if (_fid) {
      await updateProject(_fid, toSave);
      setProjects(prev => prev.map(p => p._fid === _fid ? { ...p, ...toSave } : p));
      _log({
        projectId: _fid, projectName: toSave.nombre,
        taskId: null, taskTitle: null,
        action: "project_edited", detail: `Proyecto editado: ${toSave.nombre}`,
      });
      return _fid;
    } else {
      if (!isAdmin) { alert("Solo los administradores pueden crear proyectos."); return null; }
      const newProject = await createProject(toSave);
      if (newProject) {
        setProjects(prev => [...prev, newProject]);
        _log({
          projectId: newProject._fid, projectName: newProject.nombre,
          taskId: null, taskTitle: null,
          action: "project_created", detail: `Proyecto creado: ${newProject.nombre}`,
        });
      }
      return newProject?._fid ?? null;
    }
  }

  async function handleArchiveProject(projectId) {
    if (!isAdmin) { alert("Solo los administradores pueden archivar proyectos."); return; }
    if (!window.confirm("¿Archivar este proyecto?")) return;
    const nombre = _projectName(projectId);
    const ts = await archiveProject(projectId);
    setProjects(prev => prev.map(p => p._fid === projectId ? { ...p, archived: true, archivedAt: ts } : p));
    _log({
      projectId, projectName: nombre,
      taskId: null, taskTitle: null,
      action: "project_archived", detail: `Proyecto archivado: ${nombre}`,
    });
  }

  async function handleSaveProjectNotes(projectId, notas) {
    await updateProject(projectId, { notasTecnicas: notas });
    setProjects(prev => prev.map(p => p._fid === projectId ? { ...p, notasTecnicas: notas } : p));
  }

  async function handleUnarchiveProject(projectId) {
    const nombre = _projectName(projectId);
    await unarchiveProject(projectId);
    setProjects(prev => prev.map(p => p._fid === projectId ? { ...p, archived: false, archivedAt: null } : p));
    _log({
      projectId, projectName: nombre,
      taskId: null, taskTitle: null,
      action: "project_unarchived", detail: `Proyecto restaurado: ${nombre}`,
    });
  }

  // ── Access handler ──────────────────────────────────────────────────────────
  async function handleSetUserAccess(projectId, userEmail, level) {
    const project = projects.find(p => p._fid === projectId);
    if (!project) return;

    let readUsers  = [...(project.readUsers  || [])];
    let writeUsers = [...(project.writeUsers || [])];

    // Remove from both lists first
    readUsers  = readUsers.filter(e  => e !== userEmail);
    writeUsers = writeUsers.filter(e => e !== userEmail);

    if (level === "read")  readUsers.push(userEmail);
    if (level === "write") writeUsers.push(userEmail);

    await updateProjectAccess(projectId, readUsers, writeUsers);
    setProjects(prev => prev.map(p =>
      p._fid === projectId ? { ...p, readUsers, writeUsers } : p
    ));

    const levelLabel   = level === "write" ? "Escritura" : level === "read" ? "Lectura" : "Sin acceso";
    const targetUser   = users.find(u => u.email === userEmail);
    const pName        = _projectName(projectId);
    _log({
      projectId, projectName: pName,
      taskId: null, taskTitle: null,
      affectedUser: userEmail,
      action: "project_access_changed",
      detail: `Acceso de ${targetUser?.name || userEmail} → ${levelLabel} en ${pName}`,
    });
  }

  // ── Task handlers ───────────────────────────────────────────────────────────
  function _validateAssignment(responsable, projectId) {
    if (!responsable) return true;
    const u = users.find(x => x.email === responsable);
    if (!u) return true;
    if (u.active === false) { alert(`El usuario ${responsable} está inactivo.`); return false; }
    // Admins (any role=admin or SUPER_ADMIN) bypass project-permission check
    const isUserAdmin = u.email === SUPER_ADMIN || u.role === "admin";
    if (!isUserAdmin) {
      const project = projects.find(p => p._fid === projectId);
      if (project && !(project.writeUsers || []).includes(responsable)) {
        alert(`${responsable} no tiene permiso de escritura en este proyecto.`);
        return false;
      }
    }
    return true;
  }

  async function handleSaveTarea(data, currentProjectId) {
    const { _fid, ...toSave } = data;
    const targetProjectId = _fid
      ? (tareas.find(t => t._fid === _fid)?.projectId ?? currentProjectId)
      : currentProjectId;

    if (!_validateAssignment(toSave.responsable, targetProjectId)) return;

    const pName = _projectName(targetProjectId);

    if (_fid) {
      const existingTarea = tareas.find(t => t._fid === _fid);
      await updateTask(_fid, toSave);
      setTareas(prev => prev.map(t => t._fid === _fid ? { ...t, ...toSave, _fid } : t));

      // Build change summary
      const changes = [];
      if (existingTarea?.titulo     !== toSave.titulo)     changes.push(`Título cambiado`);
      if (existingTarea?.tipo       !== toSave.tipo)       changes.push(`Tipo: ${existingTarea?.tipo} → ${toSave.tipo}`);
      if (existingTarea?.prioridad  !== toSave.prioridad)  changes.push(`Prioridad: ${existingTarea?.prioridad} → ${toSave.prioridad}`);
      if (existingTarea?.estado     !== toSave.estado)     changes.push(`Estado: ${existingTarea?.estado} → ${toSave.estado}`);
      if (existingTarea?.plazo      !== toSave.plazo)      changes.push(`Plazo: ${existingTarea?.plazo} → ${toSave.plazo}`);
      if (existingTarea?.fechaInicio !== toSave.fechaInicio) changes.push(`Inicio: ${existingTarea?.fechaInicio} → ${toSave.fechaInicio}`);
      if (existingTarea?.fechaFin   !== toSave.fechaFin)   changes.push(`Fin real: ${existingTarea?.fechaFin || "—"} → ${toSave.fechaFin || "—"}`);
      if (existingTarea?.responsable !== toSave.responsable) {
        const prevName = users.find(u => u.email === existingTarea?.responsable)?.name || existingTarea?.responsable || "—";
        const newName  = users.find(u => u.email === toSave.responsable)?.name || toSave.responsable || "—";
        changes.push(`Responsable: ${prevName} → ${newName}`);
      }
      const editDetail = changes.length > 0
        ? `[${existingTarea?.taskId || _fid}] "${toSave.titulo}" · ${changes.join(" · ")}`
        : `[${existingTarea?.taskId || _fid}] "${toSave.titulo}"`;

      _log({
        projectId: targetProjectId, projectName: pName,
        taskId: _fid, taskTitle: toSave.titulo,
        taskShortId: existingTarea?.taskId ?? null,
        affectedUser: toSave.responsable || null,
        action: "task_edited", detail: editDetail,
      });
      // Notify if responsable changed to someone else
      if (toSave.responsable && toSave.responsable !== existingTarea?.responsable) {
        await _notifyAssignment(
          { _fid, titulo: toSave.titulo, taskId: existingTarea?.taskId, projectId: targetProjectId },
          toSave.responsable, pName
        );
      }
    } else {
      // Generate sequential task ID
      const project = projects.find(p => p._fid === currentProjectId);
      const prefix  = projectPrefix(project?.nombre);
      const counter = await getAndIncrementTaskCounter(currentProjectId);
      const taskShortId = `${prefix}-${String(counter).padStart(3, "0")}`;
      // Keep local project counter in sync
      setProjects(prev => prev.map(p =>
        p._fid === currentProjectId ? { ...p, taskCounter: counter } : p
      ));

      const newTask = await createTask({ ...toSave, taskId: taskShortId }, currentProjectId, session.email);
      if (newTask) {
        setTareas(prev => [...prev, newTask]);
        _log({
          projectId: currentProjectId, projectName: pName,
          taskId: newTask._fid, taskTitle: newTask.titulo,
          taskShortId, affectedUser: toSave.responsable || null,
          action: "task_created", detail: `Tarea creada: [${taskShortId}] "${newTask.titulo}"`,
        });
        // Notify if assigned to someone else on creation
        if (toSave.responsable) {
          await _notifyAssignment(
            { _fid: newTask._fid, titulo: newTask.titulo, taskId: taskShortId, projectId: currentProjectId },
            toSave.responsable, pName
          );
        }
      }
    }
  }

  async function handleUpdateEstado(fid, nuevoEstado) {
    const tarea  = tareas.find(t => t._fid === fid);
    const prevE  = tarea?.estado ?? "—";
    const pName  = _projectName(tarea?.projectId);
    const extra  = await updateTaskEstado(fid, nuevoEstado);
    setTareas(prev => prev.map(t => t._fid === fid ? { ...t, estado: nuevoEstado, ...extra } : t));
    _log({
      projectId: tarea?.projectId, projectName: pName,
      taskId: fid, taskTitle: tarea?.titulo,
      taskShortId: tarea?.taskId ?? null,
      action: "task_status_changed", detail: `${prevE} → ${nuevoEstado}`,
    });
  }

  async function handleArchivar(projectId) {
    const enProduccion = tareas.filter(t => t.projectId === projectId && t.estado === "Producción");
    if (enProduccion.length === 0) { alert("No hay tareas en Producción para archivar."); return; }
    if (!window.confirm(`¿Archivar ${enProduccion.length} tarea(s) en Producción al Changelog?`)) return;
    const pName = _projectName(projectId);
    const ts = await archiveToChangelog(enProduccion, projectId, session.email);
    setTareas(prev => prev.map(t =>
      t.estado === "Producción" && t.projectId === projectId
        ? { ...t, estado: "Archivado", archivedAt: ts, listaChangelog: false }
        : t
    ));
    _log({
      projectId, projectName: pName,
      taskId: null, taskTitle: null,
      action: "task_status_changed",
      detail: `${enProduccion.length} tarea(s) archivadas al Changelog`,
    });
    alert(`✓ ${enProduccion.length} tarea(s) archivadas.`);
  }

  async function handleMove(tareaFid, targetProjectId) {
    if (!isAdmin) { alert("Solo los administradores pueden mover tareas entre proyectos."); return; }
    const tarea = tareas.find(t => t._fid === tareaFid);
    if (tarea?.responsable) {
      const targetProject = projects.find(p => p._fid === targetProjectId);
      if (targetProject && !(targetProject.writeUsers || []).includes(tarea.responsable)) {
        alert(`El usuario asignado (${tarea.responsable}) no tiene permiso de escritura en el proyecto destino.`);
        return;
      }
    }
    const fromName = _projectName(tarea?.projectId);
    const toName   = _projectName(targetProjectId);
    await moveTask(tareaFid, targetProjectId);
    setTareas(prev => prev.map(t => t._fid === tareaFid ? { ...t, projectId: targetProjectId } : t));
    _log({
      projectId: targetProjectId, projectName: toName,
      taskId: tareaFid, taskTitle: tarea?.titulo,
      taskShortId: tarea?.taskId ?? null,
      action: "task_moved", detail: `Movida de "${fromName}" → "${toName}"`,
    });
  }

  async function handleQuickAssign(tareaFid, responsable) {
    const tarea = tareas.find(t => t._fid === tareaFid);
    if (responsable && !_validateAssignment(responsable, tarea?.projectId)) return;
    const pName = _projectName(tarea?.projectId);
    await assignTask(tareaFid, responsable);
    setTareas(prev => prev.map(t => t._fid === tareaFid ? { ...t, responsable } : t));
    const responsableName = responsable
      ? (users.find(u => u.email === responsable)?.name || responsable)
      : null;
    _log({
      projectId: tarea?.projectId, projectName: pName,
      taskId: tareaFid, taskTitle: tarea?.titulo,
      taskShortId: tarea?.taskId ?? null,
      affectedUser: responsable || null,
      action: "task_assigned",
      detail: responsableName ? `Asignada a ${responsableName}` : "Asignación eliminada",
    });
    if (responsable && responsable !== tarea?.responsable) {
      await _notifyAssignment({ ...tarea, _fid: tareaFid }, responsable, pName);
    }
  }

  async function handleBulkDeleteTareas(fids) {
    if (!isAdmin) { alert("Solo los administradores pueden borrar tareas."); return; }
    for (const fid of fids) {
      await deleteTask(fid);
    }
    setTareas(prev => prev.filter(t => !fids.includes(t._fid)));
  }

  async function handleDeleteTarea(fid) {
    if (!isAdmin) { alert("Solo los administradores pueden borrar tareas."); return; }
    const tarea = tareas.find(t => t._fid === fid);
    if (!tarea) return;
    if (!window.confirm(`¿Eliminar la tarea "${tarea.titulo}"?\nEsta acción no se puede deshacer.`)) return;
    const pName = _projectName(tarea.projectId);
    await deleteTask(fid);
    setTareas(prev => prev.filter(t => t._fid !== fid));
    _log({
      projectId: tarea.projectId, projectName: pName,
      taskId: fid, taskTitle: tarea.titulo,
      taskShortId: tarea.taskId ?? null,
      action: "task_deleted", detail: `Tarea eliminada: [${tarea.taskId || fid}] "${tarea.titulo}"`,
    });
  }

  async function handleSavePrompt(fid, prompt) {
    await updateTask(fid, { taskPrompt: prompt });
    setTareas(prev => prev.map(t => t._fid === fid ? { ...t, taskPrompt: prompt } : t));
  }

  // ── Import handler — creates a single task from raw import data ─────────────
  // Called per-task from ProjectDetail's confirmarImport loop.
  async function handleImportTareas(rawTask, currentProjectId) {
    const VALID_TIPOS  = ["Bug", "Mejora"];
    const VALID_PRIOS  = ["Crítica", "Alta", "Media", "Baja"];
    const VALID_ESTADOS = ["Pendiente", "En Desarrollo", "Pruebas", "Producción"];

    const tipo      = VALID_TIPOS.includes(rawTask.tipo)    ? rawTask.tipo    : "Mejora";
    const prioridad = VALID_PRIOS.includes(rawTask.prioridad) ? rawTask.prioridad : "Media";
    const estado    = VALID_ESTADOS.includes(rawTask.estado)  ? rawTask.estado  : "Pendiente";

    // Resolve responsable: accept email directly or match by name
    let responsable = rawTask.responsable || "";
    if (responsable && !responsable.includes("@")) {
      const match = users.find(u =>
        (u.name || "").toLowerCase().trim() === responsable.toLowerCase().trim()
      );
      responsable = match?.email || "";
    }

    const importedTaskId = (rawTask.taskId || "").trim();
    const existingTask = importedTaskId
      ? tareas.find(t =>
          t.projectId === currentProjectId &&
          (t.taskId || "").toUpperCase() === importedTaskId.toUpperCase()
        )
      : null;

    // Detect duplicate by content hash (guards against re-import after partial failure)
    const hash = contentHash(rawTask);
    if (!existingTask) {
      const hashMatch = tareas.find(t =>
        t.projectId === currentProjectId && t.importHash === hash
      );
      if (hashMatch) {
        return { status: "skipped", taskId: hashMatch.taskId || hashMatch._fid };
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const toSave = {
      titulo:      rawTask.titulo     || "(sin título)",
      problema:    rawTask.problema   || "",
      solucion:    rawTask.solucion   || "",
      tipo, prioridad, estado,
      responsable,
      version:     rawTask.version    || "",
      fechaInicio: rawTask.fechaInicio || today,
      plazo:       rawTask.plazo       || today,
      fechaFin:    rawTask.fechaFin    || "",
      taskPrompt:  rawTask.taskPrompt  || "",
      listaChangelog: false,
      // produccionAt prevents immediate auto-archive for Producción tasks
      ...(estado === "Producción" ? { produccionAt: rawTask.fechaFin || today } : {}),
    };

    const pName   = _projectName(currentProjectId);
    if (existingTask) {
      await updateTask(existingTask._fid, { ...toSave, importHash: hash });
      setTareas(prev => prev.map(t =>
        t._fid === existingTask._fid ? { ...t, ...toSave, importHash: hash } : t
      ));
      _log({
        projectId: currentProjectId, projectName: pName,
        taskId: existingTask._fid, taskTitle: toSave.titulo,
        taskShortId: existingTask.taskId ?? importedTaskId ?? null,
        affectedUser: responsable || null,
        action: "task_edited",
        detail: `[Importada actualización] [${existingTask.taskId || importedTaskId || existingTask._fid}] "${toSave.titulo}"`,
      });
      return { status: "updated", taskId: existingTask.taskId };
    }

    const project  = projects.find(p => p._fid === currentProjectId);
    const prefix   = projectPrefix(project?.nombre);
    let taskShortId = importedTaskId;

    if (!taskShortId) {
      const counter  = await getAndIncrementTaskCounter(currentProjectId);
      taskShortId = `${prefix}-${String(counter).padStart(3, "0")}`;
      setProjects(prev => prev.map(p =>
        p._fid === currentProjectId ? { ...p, taskCounter: counter } : p
      ));
    }

    const newTask = await createTask({ ...toSave, taskId: taskShortId, importHash: hash }, currentProjectId, session.email);
    if (newTask) {
      setTareas(prev => [...prev, newTask]);
      _log({
        projectId: currentProjectId, projectName: pName,
        taskId: newTask._fid, taskTitle: newTask.titulo,
        taskShortId, affectedUser: responsable || null,
        action: "task_created",
        detail: `[Importada nueva] [${taskShortId}] "${newTask.titulo}"`,
      });
    }
    return { status: "created", taskId: taskShortId };
  }

  // ── Notification handlers ────────────────────────────────────────────────────
  async function _notifyAssignment(tarea, newResponsable, pName) {
    if (!newResponsable || newResponsable === session?.email) return;
    const assignedByUser = users.find(u => u.email === session?.email);
    await createNotification({
      userId:         newResponsable,
      taskFid:        tarea._fid,
      taskShortId:    tarea.taskId  ?? null,
      taskTitle:      tarea.titulo  ?? null,
      projectId:      tarea.projectId ?? null,
      projectName:    pName,
      assignedBy:     session?.email,
      assignedByName: assignedByUser?.name || session?.email,
    });
  }

  async function handleMarkRead(notifId) {
    await markNotificationRead(notifId);
    setNotifications(prev => prev.map(n => n._fid === notifId ? { ...n, read: true } : n));
  }

  async function handleMarkAllRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n._fid);
    await markAllNotificationsRead(unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  // ── User handlers ───────────────────────────────────────────────────────────
  async function handleSaveUser(data) {
    const result = await saveUser(data);
    if (!result) return;
    if (data._fid) {
      const existing = users.find(u => u._fid === data._fid);
      setUsers(prev => prev.map(u => u._fid === data._fid ? { ...u, ...result } : u));
      const roleChanged = existing?.role !== data.role && data.role !== undefined;
      const action = (!existing?.active && data.active === true) ? "user_activated"
                   : roleChanged ? "user_role_changed"
                   : "user_edited";
      _log({
        projectId: null, projectName: null,
        taskId: null, taskTitle: null,
        affectedUser: data.email || existing?.email || null,
        action,
        detail: action === "user_activated"
          ? `Usuario activado: ${data.name || data.email}`
          : action === "user_role_changed"
          ? `Rol cambiado: ${data.name || data.email} · ${existing?.role ?? "user"} → ${data.role}`
          : `Usuario editado: ${data.name || data.email}`,
      });
    } else {
      setUsers(prev => [...prev, result]);
      _log({
        projectId: null, projectName: null,
        taskId: null, taskTitle: null,
        affectedUser: data.email || null,
        action: "user_created",
        detail: `Usuario creado: ${data.name || data.email}`,
      });
    }
  }

  async function handleToggleTheme() {
    const next = themeMode === "dark" ? "light" : "dark";
    applyTheme(next === "dark");                               // inmediato — muta C
    setThemeMode(next);                                        // dispara re-render
    localStorage.setItem("theme", next);                       // sincroniza preferencia local
    document.documentElement.style.setProperty("--bg", next === "dark" ? "#0a0f1e" : "#c8d4de");
    await updDoc("users", session.email, { themeMode: next }); // persiste en Firestore
  }

  async function handleDeleteUser(userFid) {
    const u = users.find(x => x._fid === userFid);
    if (!u) return;
    if (tareas.some(t => t.responsable === u.email)) {
      if (!window.confirm(`Este usuario tiene tareas asignadas. ¿Desactivarlo?`)) return;
      await deactivateUser(userFid);
      setUsers(prev => prev.map(x => x._fid === userFid ? { ...x, active: false } : x));
      _log({
        projectId: null, projectName: null,
        taskId: null, taskTitle: null,
        affectedUser: u.email,
        action: "user_deactivated",
        detail: `Usuario desactivado: ${u.name || u.email}`,
      });
      return;
    }
    if (!window.confirm(`¿Eliminar permanentemente a ${u.email}?`)) return;
    await deleteUser(userFid);
    setUsers(prev => prev.filter(x => x._fid !== userFid));
    _log({
      projectId: null, projectName: null,
      taskId: null, taskTitle: null,
      affectedUser: u.email,
      action: "user_deleted",
      detail: `Usuario eliminado: ${u.name || u.email}`,
    });
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const activeProjects   = projects.filter(p => !p.archived);
  const archivedProjects = projects.filter(p =>  p.archived);

  // Projects the current user can see
  const accessibleProjects = isAdmin
    ? activeProjects
    : activeProjects.filter(p => {
        const email = session?.email;
        return (p.readUsers  || []).includes(email) ||
               (p.writeUsers || []).includes(email);
      });

  const value = {
    // state
    authUser, session, projects, tareas, users, logs, notifications, loaded,
    themeMode,
    // derived
    isAdmin,
    activeProjects,
    archivedProjects,
    accessibleProjects,
    // auth
    loginWithGoogle,
    logout,
    // project handlers
    handleSaveProject,
    handleArchiveProject,
    handleUnarchiveProject,
    handleSaveProjectNotes,
    handleSetUserAccess,
    // task handlers
    handleSaveTarea,
    handleUpdateEstado,
    handleArchivar,
    handleMove,
    handleQuickAssign,
    handleDeleteTarea,
    handleBulkDeleteTareas,
    handleSavePrompt,
    handleImportTareas,
    // notification handlers
    handleMarkRead,
    handleMarkAllRead,
    // user handlers
    handleSaveUser,
    handleDeleteUser,
    handleToggleTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
