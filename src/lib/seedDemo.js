import { db } from "../firebase";
import { collection, addDoc, setDoc, getDocs, query, where, doc } from "firebase/firestore";

const col = (n) => collection(db, n);

const DEMO_USERS = [
  { email: "ana@demo.com",    name: "Ana García",     role: "user", active: true },
  { email: "carlos@demo.com", name: "Carlos Ruiz",    role: "user", active: true },
  { email: "lucia@demo.com",  name: "Lucía Martínez", role: "user", active: true },
];

// Three projects with clearly different advancement levels
const PROJECTS = [
  { nombre: "Portal Web",    descripcion: "Sitio web corporativo y tienda online — proyecto maduro", color: "#f97316" },
  { nombre: "App Móvil",     descripcion: "Aplicación iOS y Android — en fase inicial",              color: "#6366f1" },
  { nombre: "Panel Admin",   descripcion: "Backoffice interno — desarrollo a mitad de camino",       color: "#10b981" },
];

function daysFromNow(d) {
  const dt = new Date(); dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}
const today = () => new Date().toISOString().slice(0, 10);

function makeTasks(pids, adminEmail) {
  const [web, app, admin] = pids;

  return [
    // ── Portal Web (7 tareas, ~80% avanzado) ──────────────────────────────────
    {
      projectId: web, taskId: "WEB-001",
      titulo: "Bug: timeout en checkout con tarjetas AMEX",
      tipo: "Bug", prioridad: "Alta", estado: "Pendiente",
      responsable: "carlos@demo.com",
      fechaInicio: today(), plazo: daysFromNow(3),
    },
    {
      projectId: web, taskId: "WEB-002",
      titulo: "Rediseño de la página de inicio (v2)",
      tipo: "Mejora", prioridad: "Media", estado: "En Desarrollo",
      responsable: "ana@demo.com",
      fechaInicio: daysFromNow(-4), plazo: daysFromNow(6),
    },
    {
      projectId: web, taskId: "WEB-003",
      titulo: "Tests E2E del flujo de checkout",
      tipo: "Mejora", prioridad: "Alta", estado: "Pruebas",
      responsable: "lucia@demo.com",
      fechaInicio: daysFromNow(-8), plazo: daysFromNow(1),
    },
    {
      projectId: web, taskId: "WEB-004",
      titulo: "Validación de formularios del carrito",
      tipo: "Bug", prioridad: "Alta", estado: "Pruebas",
      responsable: adminEmail,
      fechaInicio: daysFromNow(-6), plazo: today(),
    },
    {
      projectId: web, taskId: "WEB-005",
      titulo: "Migración a React 18 + Vite 5",
      tipo: "Mejora", prioridad: "Alta", estado: "Producción",
      responsable: "carlos@demo.com",
      fechaInicio: daysFromNow(-20), plazo: daysFromNow(-5),
      produccionAt: daysFromNow(-5),
    },
    {
      projectId: web, taskId: "WEB-006",
      titulo: "Integración con pasarela de pago Stripe",
      tipo: "Mejora", prioridad: "Alta", estado: "Producción",
      responsable: adminEmail,
      fechaInicio: daysFromNow(-15), plazo: daysFromNow(-3),
      produccionAt: daysFromNow(-3),
    },
    {
      projectId: web, taskId: "WEB-007",
      titulo: "Actualización de dependencias de seguridad",
      tipo: "Mejora", prioridad: "Baja", estado: "Producción",
      responsable: "lucia@demo.com",
      fechaInicio: daysFromNow(-12), plazo: daysFromNow(-2),
      produccionAt: daysFromNow(-2),
    },

    // ── App Móvil (5 tareas, ~20% avanzado — fase inicial) ────────────────────
    {
      projectId: app, taskId: "APP-001",
      titulo: "Pantalla de onboarding para nuevos usuarios",
      tipo: "Mejora", prioridad: "Alta", estado: "Pendiente",
      responsable: adminEmail,
      fechaInicio: daysFromNow(1), plazo: daysFromNow(10),
    },
    {
      projectId: app, taskId: "APP-002",
      titulo: "Implementación de Dark Mode",
      tipo: "Mejora", prioridad: "Baja", estado: "Pendiente",
      responsable: adminEmail,
      fechaInicio: daysFromNow(3), plazo: daysFromNow(20),
    },
    {
      projectId: app, taskId: "APP-003",
      titulo: "Diseño del sistema de navegación por tabs",
      tipo: "Mejora", prioridad: "Alta", estado: "Pendiente",
      responsable: "ana@demo.com",
      fechaInicio: daysFromNow(2), plazo: daysFromNow(8),
    },
    {
      projectId: app, taskId: "APP-004",
      titulo: "Notificaciones push con Firebase FCM",
      tipo: "Mejora", prioridad: "Media", estado: "En Desarrollo",
      responsable: "ana@demo.com",
      fechaInicio: daysFromNow(-4), plazo: daysFromNow(6),
    },
    {
      projectId: app, taskId: "APP-005",
      titulo: "Bug: crash al abrir notificaciones en Android 12",
      tipo: "Bug", prioridad: "Crítica", estado: "En Desarrollo",
      responsable: "carlos@demo.com",
      fechaInicio: daysFromNow(-2), plazo: today(),
    },

    // ── Panel Admin (3 tareas, ~50% avanzado — mitad de camino) ───────────────
    {
      projectId: admin, taskId: "ADM-001",
      titulo: "Dashboard de métricas de uso en tiempo real",
      tipo: "Mejora", prioridad: "Media", estado: "Pendiente",
      responsable: "lucia@demo.com",
      fechaInicio: daysFromNow(2), plazo: daysFromNow(12),
    },
    {
      projectId: admin, taskId: "ADM-002",
      titulo: "Sistema de roles y permisos granulares",
      tipo: "Mejora", prioridad: "Alta", estado: "En Desarrollo",
      responsable: adminEmail,
      fechaInicio: daysFromNow(-5), plazo: daysFromNow(5),
    },
    {
      projectId: admin, taskId: "ADM-003",
      titulo: "Exportación de informes a PDF",
      tipo: "Mejora", prioridad: "Media", estado: "Producción",
      responsable: "carlos@demo.com",
      fechaInicio: daysFromNow(-18), plazo: daysFromNow(-4),
      produccionAt: daysFromNow(-4),
    },
  ].map(t => ({
    ...t,
    problema:       "",
    solucion:       "",
    version:        "",
    taskPrompt:     "",
    listaChangelog: false,
    creadoEn:       new Date().toISOString(),
    creadoPor:      adminEmail,
  }));
}

export async function seedDemoData(adminEmail) {
  const results = { projects: 0, users: 0, tasks: 0, skipped: 0 };

  // ── 1. Create projects ──────────────────────────────────────────────────────
  const existingSnap = await getDocs(col("projects"));
  const existingNames = new Map(existingSnap.docs.map(d => [d.data().nombre, d.id]));

  const projectIds = [];
  for (const p of PROJECTS) {
    if (existingNames.has(p.nombre)) {
      projectIds.push(existingNames.get(p.nombre));
      results.skipped++;
    } else {
      const ref = await addDoc(col("projects"), {
        ...p, creadoEn: new Date().toISOString(),
        readUsers: [], writeUsers: [], taskCounter: 0,
      });
      projectIds.push(ref.id);
      results.projects++;
    }
  }

  // ── 2. Create demo users (Firestore only) ───────────────────────────────────
  for (const u of DEMO_USERS) {
    const snap = await getDocs(query(col("users"), where("email", "==", u.email)));
    if (snap.empty) {
      await setDoc(doc(db, "users", u.email), { ...u, creadoEn: new Date().toISOString(), photoURL: null });
      results.users++;
    }
  }

  // ── 3. Create tasks ─────────────────────────────────────────────────────────
  const tasks = makeTasks(projectIds, adminEmail);
  for (const t of tasks) {
    await addDoc(col("taller_tareas"), t);
    results.tasks++;
  }

  // ── 4. Sync project task counters ───────────────────────────────────────────
  const counters = {};
  tasks.forEach(t => { counters[t.projectId] = (counters[t.projectId] || 0) + 1; });
  for (const [pid, count] of Object.entries(counters)) {
    await setDoc(doc(db, "projects", pid), { taskCounter: count }, { merge: true });
  }

  return results;
}
