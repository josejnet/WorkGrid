import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { C } from "../../lib/theme";
import Btn from "../../components/ui/Btn";
import { createProject } from "../../services/projectService";
import { createTask, getAndIncrementTaskCounter } from "../../services/taskService";
import { saveUser } from "../../services/userService";
import { projectPrefix } from "../../lib/utils";

const DEMO_PROJECTS = [
  {
    nombre: "Portal Web",
    descripcion: "Rediseño completo del portal de clientes con nuevo sistema de autenticación",
    color: "#4CAF50",
    tasks: [
      { titulo: "Diseño del sistema de autenticación OAuth", tipo: "Mejora", prioridad: "Alta",   estado: "Producción"   },
      { titulo: "Migración de base de datos de usuarios",    tipo: "Mejora", prioridad: "Alta",   estado: "Producción"   },
      { titulo: "Integración con proveedor de pagos",        tipo: "Mejora", prioridad: "Alta",   estado: "Producción"   },
      { titulo: "Panel de administración de clientes",       tipo: "Mejora", prioridad: "Media",  estado: "Pruebas"       },
      { titulo: "Notificaciones por email automáticas",      tipo: "Mejora", prioridad: "Media",  estado: "Pruebas"       },
      { titulo: "API pública v2 con documentación",          tipo: "Mejora", prioridad: "Alta",   estado: "En Desarrollo" },
      { titulo: "Error 500 en formulario de registro",       tipo: "Bug",    prioridad: "Alta",   estado: "Pendiente"    },
    ],
  },
  {
    nombre: "App Móvil",
    descripcion: "Aplicación iOS/Android para gestión de pedidos en campo",
    color: "#2196F3",
    tasks: [
      { titulo: "Wireframes y prototipo navegable",           tipo: "Mejora", prioridad: "Alta",  estado: "En Desarrollo" },
      { titulo: "Configuración del entorno React Native",     tipo: "Mejora", prioridad: "Alta",  estado: "En Desarrollo" },
      { titulo: "Pantalla de login y registro",               tipo: "Mejora", prioridad: "Alta",  estado: "Pendiente"    },
      { titulo: "Módulo de pedidos offline-first",            tipo: "Mejora", prioridad: "Alta",  estado: "Pendiente"    },
      { titulo: "Push notifications",                         tipo: "Mejora", prioridad: "Media", estado: "Pendiente"    },
    ],
  },
  {
    nombre: "Panel Admin",
    descripcion: "Dashboard interno para el equipo de operaciones y soporte",
    color: "#FF9800",
    tasks: [
      { titulo: "Dashboard de métricas en tiempo real",       tipo: "Mejora", prioridad: "Alta",  estado: "Producción"   },
      { titulo: "Gestión de roles y permisos",                tipo: "Mejora", prioridad: "Alta",  estado: "En Desarrollo" },
      { titulo: "Exportación de reportes a Excel/PDF",        tipo: "Mejora", prioridad: "Media", estado: "Pendiente"    },
      { titulo: "Bug: fechas incorrectas en zona horaria UTC",tipo: "Bug",    prioridad: "Alta",  estado: "Pendiente"    },
    ],
  },
];

const DEMO_USERS = [
  { email: "ana.garcia@demo.workgrid.app",     name: "Ana García",       role: "admin", active: true },
  { email: "carlos.ruiz@demo.workgrid.app",    name: "Carlos Ruiz",      role: "user",  active: true },
  { email: "lucia.martinez@demo.workgrid.app", name: "Lucía Martínez",   role: "user",  active: true },
];

export default function DemoSeed() {
  const { isAdmin, session } = useApp();
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [log,     setLog]     = useState([]);

  if (!isAdmin) return null;

  function addLog(msg) {
    setLog(prev => [...prev, msg]);
  }

  async function handleSeed() {
    if (!window.confirm(
      "¿Crear proyectos de demo?\n\nSe crearán 3 proyectos (Portal Web, App Móvil, Panel Admin) con tareas de ejemplo y 3 usuarios de demo.\n\nSi ya existen proyectos con esos nombres se crearán duplicados."
    )) return;

    setLoading(true);
    setLog([]);

    try {
      // Create demo users
      for (const u of DEMO_USERS) {
        await saveUser(u);
        addLog(`👤 Usuario: ${u.name}`);
      }

      // Create demo projects + tasks
      for (const pDef of DEMO_PROJECTS) {
        const { tasks, ...pData } = pDef;
        const proj = await createProject(pData);
        if (!proj) { addLog(`❌ Error creando proyecto ${pData.nombre}`); continue; }
        addLog(`📁 Proyecto: ${proj.nombre}`);

        const prefix = projectPrefix(proj.nombre);
        for (const tDef of tasks) {
          const counter = await getAndIncrementTaskCounter(proj._fid);
          const taskId  = `${prefix}-${String(counter).padStart(3, "0")}`;
          await createTask(
            { ...tDef, taskId },
            proj._fid,
            session?.email ?? "demo"
          );
          addLog(`  ✓ [${taskId}] ${tDef.titulo}`);
        }
      }

      setDone(true);
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20, padding: "16px 20px", background: C.card, borderRadius: 12, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 6 }}>🌱 Datos de demo</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
          Crea 3 proyectos de ejemplo con distinto grado de avance para mostrar las funcionalidades de WorkGrid:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { nombre: "Portal Web",  pct: "80%", color: "#4CAF50", desc: "7 tareas · 3 en Producción, 2 en Pruebas, 1 en Desarrollo, 1 Pendiente" },
            { nombre: "App Móvil",   pct: "20%", color: "#2196F3", desc: "5 tareas · 2 en Desarrollo, 3 Pendientes" },
            { nombre: "Panel Admin", pct: "50%", color: "#FF9800", desc: "4 tareas · 1 en Producción, 1 en Desarrollo, 2 Pendientes" },
          ].map(p => (
            <div key={p.nombre} style={{
              background: C.surface || C.bg,
              borderRadius: 10, border: `1px solid ${p.color}44`,
              borderLeft: `4px solid ${p.color}`,
              padding: "12px 14px",
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{p.nombre}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: p.color, margin: "4px 0" }}>{p.pct}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{p.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
          También se crean 3 usuarios de demo: Ana García (admin), Carlos Ruiz y Lucía Martínez.
        </div>
        {!done ? (
          <Btn
            color={C.green}
            onClick={handleSeed}
            disabled={loading}
          >
            {loading ? "Creando datos…" : "🌱 Crear datos de demo"}
          </Btn>
        ) : (
          <div style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>
            ✅ Datos de demo creados correctamente. Recarga la página para verlos.
          </div>
        )}
      </div>

      {log.length > 0 && (
        <div style={{
          background: C.card, borderRadius: 10, border: `1px solid ${C.border}`,
          padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: C.muted,
          maxHeight: 300, overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 3,
        }}>
          {log.map((line, i) => (
            <div key={i} style={{ color: line.startsWith("❌") ? C.red || "#e53935" : line.startsWith("📁") ? C.orange : C.muted }}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
