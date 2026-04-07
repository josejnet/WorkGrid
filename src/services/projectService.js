import { loadCol, addDocCol, updDoc } from "./db";
import { db } from "../firebase";
import { doc, runTransaction } from "firebase/firestore";

export const getProjects = () => loadCol("projects");

export async function createProject(data) {
  const payload = {
    ...data,
    readUsers:  [],
    writeUsers: [],
    archived:   false,
    archivedAt: null,
    creadoEn:   new Date().toISOString(),
  };
  const id = await addDocCol("projects", payload);
  return id ? { ...payload, _fid: id } : null;
}

export async function updateProject(id, data) {
  await updDoc("projects", id, data);
}

export async function updateProjectAccess(id, readUsers, writeUsers) {
  await updDoc("projects", id, { readUsers, writeUsers });
}

export async function archiveProject(id) {
  const ts = new Date().toISOString().slice(0, 10);
  await updDoc("projects", id, { archived: true, archivedAt: ts });
  return ts;
}

export async function unarchiveProject(id) {
  await updDoc("projects", id, { archived: false, archivedAt: null });
}

/**
 * Atomically increment project.taskCounter and return the new value.
 * Used to generate sequential task IDs like "SA-001".
 */
export async function getAndIncrementTaskCounter(projectId) {
  const ref = doc(db, "projects", projectId);
  return runTransaction(db, async (txn) => {
    const snap = await txn.get(ref);
    const next = (snap.data()?.taskCounter || 0) + 1;
    txn.update(ref, { taskCounter: next });
    return next;
  });
}
