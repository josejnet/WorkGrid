import { addDocCol, loadCol } from "./db";
import { db } from "../firebase";
import {
  collection, query, orderBy, limit, getDocs, where,
} from "firebase/firestore";

/**
 * taller_log document shape:
 * {
 *   projectId:   string,
 *   projectName: string,
 *   taskId:      string | null,
 *   taskTitle:   string | null,
 *   action:      "task_created" | "task_edited" | "task_status_changed" |
 *                "task_assigned" | "task_moved" |
 *                "project_created" | "project_archived" | "project_unarchived",
 *   detail:      string,   // human-readable, e.g. "Pendiente → En Desarrollo"
 *   performedBy: string,   // email
 *   timestamp:   string,   // ISO
 * }
 */

export async function writeLog(entry) {
  return addDocCol("taller_log", {
    projectId:    entry.projectId    ?? null,
    projectName:  entry.projectName  ?? null,
    taskId:       entry.taskId       ?? null,
    taskTitle:    entry.taskTitle    ?? null,
    taskShortId:  entry.taskShortId  ?? null,
    action:       entry.action,
    detail:       entry.detail       ?? "",
    affectedUser: entry.affectedUser ?? null,
    performedBy:  entry.performedBy,
    timestamp:    new Date().toISOString(),
  });
}

/** Fetch latest N log entries, optionally scoped to a set of projectIds */
export async function getRecentLogs(limitN = 30, accessibleProjectIds = null) {
  try {
    const col  = collection(db, "taller_log");
    const q    = query(col, orderBy("timestamp", "desc"), limit(limitN));
    const snap = await getDocs(q);
    const all  = snap.docs.map(d => ({ _fid: d.id, ...d.data() }));
    if (!accessibleProjectIds) return all;
    return all.filter(e => accessibleProjectIds.includes(e.projectId));
  } catch (e) {
    console.error("getRecentLogs:", e);
    return [];
  }
}

/** Fetch up to limitN entries for the detailed log view (admin only) */
export async function getAllLogs(limitN = 500) {
  try {
    const col  = collection(db, "taller_log");
    const q    = query(col, orderBy("timestamp", "desc"), limit(limitN));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ _fid: d.id, ...d.data() }));
  } catch (e) {
    console.error("getAllLogs:", e);
    return [];
  }
}
