import { C } from "./theme";

export const SUPER_ADMIN = import.meta.env.VITE_SUPER_ADMIN ?? "admin@example.com";

export const TALLER_ESTADOS  = ["Pendiente", "En Desarrollo", "Pruebas", "Producción"];
export const TALLER_TIPOS    = ["Bug", "Mejora"];
export const TALLER_PRIOS    = ["Crítica", "Alta", "Media", "Baja"];
export const PRIO_ORDER      = { "Crítica": 0, "Alta": 1, "Media": 2, "Baja": 3 };

export const ESTADO_COLORS = {
  "Pendiente":     C.muted,
  "En Desarrollo": C.blue,
  "Pruebas":       C.yellow,
  "Producción":    C.green,
  "Archivado":     C.border2,
};
export const PRIO_COLORS = {
  "Crítica": C.red, "Alta": C.orange, "Media": C.blue, "Baja": C.muted,
};
export const TIPO_ICONS = {
  "Bug": "🐛", "Mejora": "✨", "Nueva Ruta": "🗺️", "Refactorización": "♻️",
};

export const TAREA_VACIA = {
  titulo: "", problema: "", solucion: "",
  tipo: "Bug", prioridad: "Media", estado: "Pendiente",
  fechaInicio: "", plazo: "", fechaFin: "",
  responsable: "",
  listaChangelog: false,
};
