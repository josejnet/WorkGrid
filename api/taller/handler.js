/**
 * El Taller — API Serverless (Vercel)
 *
 * Accesible en:  /api/taller/schema
 *                /api/taller/tasks
 *                /api/taller/tasks/:id
 *                /api/taller/tasks/:id/advance
 *
 * El routing está en vercel.json:
 *   /api/taller/(.*) → /api/taller/handler?path=$1
 *
 * VARIABLE DE ENTORNO REQUERIDA EN VERCEL
 *   FIREBASE_SERVICE_ACCOUNT_B64  → JSON de cuenta de servicio en base64
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                 from 'firebase-admin/firestore';
import { createHash }                   from 'crypto';

// ── Máquina de estados ────────────────────────────────────────────────────────
const NEXT_STATE = {
  'Pendiente':     'En Desarrollo',
  'En Desarrollo': 'Pruebas',
  'Pruebas':       'Producción',
  'Producción':    null,
  'Archivado':     null,
};

function projectPrefix(name) {
  if (!name) return 'TASK';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'TASK';
  }
  return words.slice(0, 4)
    .map(w => (w.replace(/[^a-zA-Z0-9]/g, '')[0] || ''))
    .join('').toUpperCase() || 'TASK';
}

function sha256hex(s) {
  return createHash('sha256').update(s).digest('hex');
}

// Mirrors frontend src/lib/utils.js contentHash — same algorithm, same output
function contentHash(task) {
  const s = [task.titulo, task.problema, task.solucion, task.tipo, task.prioridad, task.taskPrompt]
    .map(v => (v || '').trim())
    .join('\x00');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function sanitizeTask(id, data) {
  const task = {
    id,
    taskId:       data.taskId       || null,
    titulo:       data.titulo       || '',
    tipo:         data.tipo         || 'Mejora',
    problema:     data.problema     || '',
    solucion:     data.solucion     || '',
    prioridad:    data.prioridad    || 'Media',
    estado:       data.estado       || 'Pendiente',
    next_state:   NEXT_STATE[data.estado] ?? null,
    responsable:  data.responsable  || null,
    fechaInicio:  data.fechaInicio  || null,
    plazo:        data.plazo        || null,
    fechaFin:     data.fechaFin     || null,
    produccionAt: data.produccionAt || null,
    taskPrompt:   data.taskPrompt   || null,
    creadoEn:     data.creadoEn     || null,
    creadoPor:    data.creadoPor    || null,
  };
  const promptParts = [];
  if (data.taskPrompt) promptParts.push(data.taskPrompt);
  else {
    if (data.titulo)   promptParts.push(`Tarea: ${data.titulo}`);
    if (data.problema) promptParts.push(`Problema: ${data.problema}`);
    if (data.solucion) promptParts.push(`Solución propuesta: ${data.solucion}`);
  }
  task.ai_prompt = promptParts.length > 0 ? promptParts.join('\n\n') : null;

  // Verification prompt — for tasks currently in progress (before the next advance)
  if (task.estado === 'En Desarrollo' || task.estado === 'Pruebas') {
    const toProduccion = task.next_state === 'Producción';
    const lines = [
      `VERIFICACIÓN — "${task.titulo}"`,
      `${task.estado} → ${task.next_state}` + (toProduccion ? '  ⚠ El siguiente advance es IRREVERSIBLE' : ''),
      '',
    ];
    if (task.estado === 'En Desarrollo') {
      lines.push(
        'Antes de llamar a POST /advance, verifica que la implementación está completa:',
        '',
        '1. CÓDIGO',
        '   ✓ Compila/transpila sin errores',
        '   ✓ La funcionalidad principal funciona correctamente',
        '   ✓ No hay regresiones en áreas adyacentes',
        '   ✓ Sigue las convenciones del proyecto',
        '',
        '2. CALIDAD',
        '   ✓ Sin console.log, prints o debugs temporales',
        '   ✓ Sin credenciales ni datos sensibles hardcodeados',
        '',
        'Llama a /advance solo cuando hayas verificado todos los puntos.',
      );
    } else {
      lines.push(
        '⚠ El siguiente advance lleva a PRODUCCIÓN. Verifica con cuidado:',
        '',
        '1. FUNCIONALIDAD',
        '   ✓ Todos los escenarios principales funcionan sin errores',
        '   ✓ Los casos límite están manejados correctamente',
        '',
        '2. REVISIÓN',
        '   ✓ El código ha sido revisado (self-review o peer review)',
        '   ✓ Los comentarios de revisión están resueltos',
        '',
        '3. PRODUCCIÓN',
        '   ✓ Funciona en un entorno equivalente al de producción',
        '   ✓ Sin secretos, credenciales ni datos sensibles expuestos',
        '   ✓ El rendimiento es aceptable bajo carga normal',
        '',
        '⚠ Solo avanza si TODOS los puntos están confirmados. Esta acción es irreversible.',
      );
    }
    task.verification_prompt = lines.join('\n');
  } else {
    task.verification_prompt = null;
  }

  // Pre-analysis prompt — only for tasks that can still advance
  if (task.next_state) {
    const lines = [
      `PRE-ANÁLISIS — "${task.titulo}"`,
      `Tipo: ${task.tipo} | Prioridad: ${task.prioridad} | ${task.estado} → ${task.next_state}`,
      '',
    ];
    if (data.problema) lines.push(`Problema: ${data.problema}`, '');
    if (data.solucion) lines.push(`Solución propuesta: ${data.solucion}`, '');
    lines.push(
      'Antes de ejecutar POST /advance, evalúa estos puntos:',
      '',
      '1. EXISTENCIA  ¿Ya existe código que implemente esto parcial o totalmente?',
      '               Si existe: describe dónde está y qué hace exactamente.',
      '               Si no existe: confirma que es implementación nueva.',
      '',
      '2. CONFLICTOS  ¿Qué archivos, funciones o módulos se verán afectados?',
      '               Lista cada uno con una breve justificación.',
      '',
      '3. IMPACTO     Clasifica el riesgo global del cambio:',
      '               sin riesgo · bajo · medio · alto',
      '               Justifica la clasificación.',
      '',
      '4. DECISIÓN',
      '   ✓ PROCEDER   tarea clara, sin conflictos críticos → llama a POST /advance',
      '   ✗ PAUSAR     dependencias no resueltas o impacto alto → no avances',
      '   ⚠ MODIFICAR  la definición debe ajustarse antes de ejecutar',
      '',
      'Solo llama a /advance si tu decisión es PROCEDER.',
    );
    task.preanalysis_prompt = lines.join('\n');
  } else {
    task.preanalysis_prompt = null;
  }

  return task;
}

function getDb() {
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 no configurada en Vercel');
    const sa = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    initializeApp({ credential: cert(sa) });
  }
  return getFirestore();
}

async function resolveProject(token) {
  if (!token) return null;
  const hashed = sha256hex(token);
  const snap = await getDb()
    .collection('projects')
    .where('apiSecretHash', '==', hashed)
    .where('apiEnabled',    '==', true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

function extractToken(req) {
  const auth = (req.headers.authorization || '').trim();
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
}


async function resolveTask(db, projectId, id) {
  const direct = await db.collection('taller_tareas').doc(id).get();
  if (direct.exists && direct.data().projectId === projectId) {
    return { ref: direct.ref, data: direct.data() };
  }
  const byShort = await db.collection('taller_tareas')
    .where('projectId', '==', projectId)
    .where('taskId',    '==', id)
    .limit(1).get();
  if (!byShort.empty) {
    return { ref: byShort.docs[0].ref, data: byShort.docs[0].data() };
  }
  return null;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

function handleSchema(req, res, p) {
  res.status(200).json({
    api: 'El Taller API', version: '1',
    description: 'API para gestionar tareas de El Taller.',
    project: { id: p.id, nombre: p.nombre },
    authentication: 'Cabecera HTTP: Authorization: Bearer <token>',
    endpoints: [
      { id: 'schema',       method: 'GET',  path: '/api/taller/schema' },
      { id: 'list_tasks',   method: 'GET',  path: '/api/taller/tasks',
        query_params: { estado: 'Pendiente|En Desarrollo|Pruebas|Producción|Archivado', prioridad: 'Crítica|Alta|Media|Baja', limit: '1-200' } },
      { id: 'get_task',     method: 'GET',  path: '/api/taller/tasks/:id' },
      { id: 'create_task',  method: 'POST', path: '/api/taller/tasks',
        body: { titulo: 'REQUERIDO', tipo: 'Bug|Mejora', problema: '', solucion: '', prioridad: 'Crítica|Alta|Media|Baja', taskPrompt: '', responsable: '', fechaInicio: '', plazo: '' } },
      { id: 'advance_task', method: 'POST', path: '/api/taller/tasks/:id/advance' },
    ],
    state_machine: {
      states: ['Pendiente', 'En Desarrollo', 'Pruebas', 'Producción', 'Archivado'],
      transitions: {
        'Pendiente':     { next: 'En Desarrollo' },
        'En Desarrollo': { next: 'Pruebas' },
        'Pruebas':       { next: 'Producción' },
        'Producción':    { next: null },
        'Archivado':     { next: null },
      },
    },
    ai_workflow: {
      steps: [
        { step: 1, action: 'GET /api/taller/schema',                  note: 'Inspecciona el esquema: campos, estados y endpoints. Cachéalo.' },
        { step: 2, action: 'GET /api/taller/tasks?estado=Pendiente',  note: 'Lista tareas. Cada una incluye ai_prompt y preanalysis_prompt.' },
        { step: 3, action: 'Leer preanalysis_prompt de la tarea',      note: 'Evalúa existencia, conflictos e impacto ANTES de avanzar.' },
        { step: 4, action: 'Decidir: PROCEDER / PAUSAR / MODIFICAR',  note: 'Solo continúa si la decisión es PROCEDER.' },
        { step: 5, action: 'POST /api/taller/tasks/:id/advance',       note: 'Avanza a "En Desarrollo". Hazlo antes de tocar código.' },
        { step: 6, action: 'Leer ai_prompt y ejecutar el trabajo' },
        { step: 7, action: 'POST /api/taller/tasks/:id/advance',       note: 'Avanza a "Pruebas".' },
        { step: 8, action: 'POST /api/taller/tasks/:id/advance',       note: 'Avanza a "Producción".' },
      ],
    },
  });
}

async function handleListTasks(req, res, p) {
  const db = getDb();
  const { estado, prioridad, limit } = req.query;
  let q = db.collection('taller_tareas').where('projectId', '==', p.id);
  if (estado)    q = q.where('estado',    '==', estado);
  if (prioridad) q = q.where('prioridad', '==', prioridad);
  const maxLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const snap     = await q.limit(maxLimit).get();
  const tasks    = snap.docs.map(d => sanitizeTask(d.id, d.data()));
  res.status(200).json({ tasks, total: tasks.length });
}

async function handleGetTask(req, res, p, id) {
  const db   = getDb();
  const task = await resolveTask(db, p.id, id);
  if (!task) return res.status(404).json({ error: 'NOT_FOUND', message: `Tarea "${id}" no encontrada` });
  res.status(200).json(sanitizeTask(task.ref.id, task.data));
}

async function handleCreateTask(req, res, p) {
  const db = getDb();
  const { titulo, tipo, problema, solucion, prioridad, responsable, fechaInicio, plazo, taskPrompt } = req.body || {};

  if (!titulo || typeof titulo !== 'string' || titulo.trim().length === 0)
    return res.status(400).json({ error: 'VALIDATION', message: 'titulo es obligatorio' });
  if (titulo.trim().length > 500)
    return res.status(400).json({ error: 'VALIDATION', message: 'titulo supera los 500 caracteres' });

  const TIPO_MAP = {
    bug: 'Bug', defect: 'Bug', error: 'Bug',
    mejora: 'Mejora', feature: 'Mejora', improvement: 'Mejora', enhancement: 'Mejora', task: 'Mejora',
  };
  const tipoNorm = tipo ? (TIPO_MAP[(tipo || '').toLowerCase()] || null) : 'Mejora';
  if (tipo && !tipoNorm)
    return res.status(400).json({ error: 'VALIDATION', message: 'tipo debe ser: Bug | Mejora' });

  const PRIO_MAP = {
    crítica: 'Crítica', critica: 'Crítica', critical: 'Crítica', urgent: 'Crítica', urgente: 'Crítica',
    alta: 'Alta', high: 'Alta',
    media: 'Media', medium: 'Media', normal: 'Media',
    baja: 'Baja', low: 'Baja',
  };
  const prioNorm = prioridad ? (PRIO_MAP[(prioridad || '').toLowerCase()] || null) : 'Media';
  if (prioridad && !prioNorm)
    return res.status(400).json({ error: 'VALIDATION', message: 'prioridad debe ser: Crítica | Alta | Media | Baja' });

  // Duplicate detection — uses same djb2 algorithm as frontend (src/lib/utils.js)
  const importHash = contentHash({
    titulo:     titulo.trim(),
    problema:   problema   || '',
    solucion:   solucion   || '',
    tipo:       tipoNorm   || 'Mejora',
    prioridad:  prioNorm   || 'Media',
    taskPrompt: taskPrompt || '',
  });
  const dupSnap = await db.collection('taller_tareas')
    .where('projectId', '==', p.id)
    .where('importHash', '==', importHash)
    .limit(1)
    .get();
  if (!dupSnap.empty) {
    const dup = dupSnap.docs[0].data();
    return res.status(200).json({
      status: 'skipped', id: dupSnap.docs[0].id,
      taskId: dup.taskId, titulo: dup.titulo,
      message: 'Tarea ya existente (duplicado por contenido)',
    });
  }

  const projectRef = db.collection('projects').doc(p.id);
  const counter    = await db.runTransaction(async txn => {
    const snap = await txn.get(projectRef);
    const next = (snap.data()?.taskCounter || 0) + 1;
    txn.update(projectRef, { taskCounter: next });
    return next;
  });
  const prefix  = projectPrefix(p.nombre);
  const taskId  = `${prefix}-${String(counter).padStart(3, '0')}`;
  const now     = new Date().toISOString();
  const today   = now.slice(0, 10);
  const creator = `api:${p.apiName || 'external'}`;

  const payload = {
    projectId: p.id, taskId,
    titulo:    titulo.trim(),
    tipo:      tipoNorm || 'Mejora',
    problema:  problema || '', solucion: solucion || '',
    prioridad: prioNorm || 'Media',
    estado:    'Pendiente',
    responsable:    responsable || 'Wk-CLI',
    fechaInicio:    fechaInicio || today,
    plazo:          plazo       || '',
    fechaFin: '', produccionAt: null, archivedAt: null,
    listaChangelog: false,
    taskPrompt: taskPrompt || '',
    importHash,
    creadoEn: now, creadoPor: creator,
  };

  const ref = await db.collection('taller_tareas').add(payload);
  await db.collection('taller_log').add({
    projectId: p.id, projectName: p.nombre || null,
    taskId: ref.id, taskTitle: payload.titulo, taskShortId: taskId,
    affectedUser: responsable || null,
    action: 'task_created', detail: `Tarea creada vía API: ${payload.titulo}`,
    performedBy: creator, timestamp: now,
  });

  res.status(201).json({ status: 'created', id: ref.id, taskId, titulo: payload.titulo, estado: 'Pendiente', next_state: 'En Desarrollo', creadoEn: now });
}

async function handleAdvanceTask(req, res, p, id) {
  const db   = getDb();
  const task = await resolveTask(db, p.id, id);
  if (!task) return res.status(404).json({ error: 'NOT_FOUND', message: `Tarea "${id}" no encontrada` });

  const current = task.data.estado;
  const next    = NEXT_STATE[current];
  if (!next) return res.status(400).json({ error: 'INVALID_STATE', message: `No se puede avanzar desde "${current}"`, current_state: current, next_state: null });

  const now     = new Date().toISOString();
  const updates = { estado: next };
  if (next === 'Producción') { updates.produccionAt = now.slice(0, 10); updates.listaChangelog = true; }
  await task.ref.update(updates);

  const creator = `api:${p.apiName || 'external'}`;
  await db.collection('taller_log').add({
    projectId: p.id, projectName: p.nombre || null,
    taskId: task.ref.id, taskTitle: task.data.titulo, taskShortId: task.data.taskId || null,
    affectedUser: task.data.responsable || null,
    action: 'task_status_changed', detail: `${current} → ${next} (vía API)`,
    performedBy: creator, timestamp: now,
  });

  const ADVANCE_GUIDANCE = {
    'En Desarrollo': 'Ejecuta el trabajo usando ai_prompt. Antes de avanzar a Pruebas, verifica la implementación con el campo verification_prompt de la tarea.',
    'Pruebas':       '⚠ El próximo advance lleva a PRODUCCIÓN (irreversible). Lee y verifica todos los puntos en verification_prompt antes de avanzar.',
    'Producción':    null,
    'Archivado':     null,
  };

  res.status(200).json({
    id:                   task.ref.id,
    taskId:               task.data.taskId || null,
    estado_anterior:      current,
    estado_nuevo:         next,
    next_state:           NEXT_STATE[next] ?? null,
    verification_required: !!(ADVANCE_GUIDANCE[next]),
    guidance:             ADVANCE_GUIDANCE[next] || null,
    timestamp:            now,
  });
}

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // Autenticación
  let project;
  try {
    project = await resolveProject(extractToken(req));
  } catch (err) {
    console.error('[taller_api] auth error:', err);
    return res.status(500).json({ error: 'INTERNAL', message: 'Error de autenticación: ' + err.message });
  }
  if (!project) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token inválido o proyecto sin API activa.' });
  }

  // Path: viene como query param "path" inyectado por vercel.json routes
  // Ej: /api/taller/tasks/123/advance → path="tasks/123/advance"
  const rawPath = Array.isArray(req.query.path)
    ? req.query.path.join('/')
    : (req.query.path || '');
  let segs = rawPath.split('/').filter(Boolean);

  // Fallback: parsear desde req.url si no hay query param (acceso directo)
  if (segs.length === 0) {
    const urlPath = (req.url || '').split('?')[0];
    const PREFIX  = '/api/taller/';
    if (urlPath.startsWith(PREFIX)) segs = urlPath.slice(PREFIX.length).split('/').filter(Boolean);
  }

  const method = req.method;
  try {
    if (method === 'GET'  && segs.length === 1 && segs[0] === 'schema')                                         return handleSchema(req, res, project);
    if (method === 'GET'  && segs.length === 1 && segs[0] === 'tasks')                                          return await handleListTasks(req, res, project);
    if (method === 'GET'  && segs.length === 2 && segs[0] === 'tasks')                                          return await handleGetTask(req, res, project, segs[1]);
    if (method === 'POST' && segs.length === 1 && segs[0] === 'tasks')                                          return await handleCreateTask(req, res, project);
    if (method === 'POST' && segs.length === 3 && segs[0] === 'tasks' && segs[2] === 'advance')                  return await handleAdvanceTask(req, res, project, segs[1]);

    return res.status(404).json({ error: 'NOT_FOUND', message: `Ruta no existe: ${method} /api/taller/${segs.join('/')}` });
  } catch (err) {
    console.error('[taller_api] handler error:', err);
    return res.status(500).json({ error: 'INTERNAL', message: err.message });
  }
}
