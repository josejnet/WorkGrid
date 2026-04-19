export function contentHash(task) {
  const s = [task.titulo, task.problema, task.solucion, task.tipo, task.prioridad, task.taskPrompt]
    .map(v => (v || "").trim())
    .join("\x00");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/**
 * Derive a short uppercase prefix from a project name for task IDs.
 * "SBA Albacete" → "SA", "El Taller" → "ET", "Proyecto Web" → "PW"
 */
export function projectPrefix(name) {
  if (!name) return "TASK";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "TASK";
  }
  return words
    .slice(0, 4)
    .map(w => (w.replace(/[^a-zA-Z0-9]/g, "")[0] || ""))
    .join("")
    .toUpperCase() || "TASK";
}
