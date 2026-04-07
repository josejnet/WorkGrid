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
