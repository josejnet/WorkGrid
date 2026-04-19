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

/**
 * Genera un secreto API para el proyecto.
 * - El token raw (64 chars hex) se devuelve UNA sola vez y NUNCA se almacena.
 * - En Firestore solo se guarda el hash SHA-256.
 * - apiName identifica la integración en los logs (p.ej. "Claude Assistant").
 */
export async function generateProjectApiSecret(projectId, apiName = "external") {
  const array    = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  const rawToken = Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");

  const msgBuffer  = new TextEncoder().encode(rawToken);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
  const hashHex    = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  await updDoc("projects", projectId, {
    apiSecretHash:        hashHex,
    apiEnabled:           true,
    apiName:              apiName,
    apiSecretGeneratedAt: new Date().toISOString(),
  });

  return rawToken;
}

/** Revoca el secreto API del proyecto. Las peticiones con el token antiguo fallarán. */
export async function revokeProjectApiSecret(projectId) {
  await updDoc("projects", projectId, {
    apiSecretHash:        null,
    apiEnabled:           false,
    apiSecretGeneratedAt: null,
  });
}
