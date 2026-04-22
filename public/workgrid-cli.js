// WorkGrid CLI — todos los eventos via addEventListener (CSP: no inline handlers)

var LS_PROJECTS  = 'wg_projects'; // JSON: [{name,url,token}]
var LS_ACTIVE    = 'wg_active';   // índice activo
var expandedId   = null;
var toastTimer;
var cachedSchema   = null;
var lastTasks      = [];   // cache para acceso a preanalysis/verification prompts en handlers
var pendingConfirm = null; // id de tarea en espera de confirmación para avanzar a Producción

// ── Utilidades ────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function $(id) { return document.getElementById(id); }
function showToast(msg, type) {
  var el = $('toast');
  el.textContent = msg;
  el.className = 'show ' + (type || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { el.className = ''; }, 3500);
}

// ── Multi-project config ──────────────────────────────────────────────────────
function getProjects() {
  // Migrar config legacy (wg_url / wg_token)
  var legacyUrl   = localStorage.getItem('wg_url');
  var legacyToken = localStorage.getItem('wg_token');
  if (legacyUrl && legacyToken && !localStorage.getItem(LS_PROJECTS)) {
    var migrated = [{ name: 'Proyecto', url: legacyUrl, token: legacyToken }];
    localStorage.setItem(LS_PROJECTS, JSON.stringify(migrated));
    localStorage.removeItem('wg_url');
    localStorage.removeItem('wg_token');
  }
  try { return JSON.parse(localStorage.getItem(LS_PROJECTS) || '[]'); }
  catch (e) { return []; }
}
function getActiveIdx() {
  var projects = getProjects();
  var idx = parseInt(localStorage.getItem(LS_ACTIVE) || '0');
  return (projects.length && idx < projects.length) ? idx : 0;
}
function getConfig() {
  var projects = getProjects();
  if (!projects.length) return { url: '', token: '', name: '' };
  return projects[getActiveIdx()] || { url: '', token: '', name: '' };
}
function saveProject(url, token, name) {
  var projects = getProjects();
  var idx = -1;
  for (var i = 0; i < projects.length; i++) { if (projects[i].url === url) { idx = i; break; } }
  if (idx >= 0) { projects[idx].token = token; projects[idx].name = name; }
  else          { projects.push({ name: name, url: url, token: token }); idx = projects.length - 1; }
  localStorage.setItem(LS_PROJECTS, JSON.stringify(projects));
  localStorage.setItem(LS_ACTIVE, String(idx));
  renderProjectSelect();
}
function deleteProject(idx) {
  var projects = getProjects();
  projects.splice(idx, 1);
  localStorage.setItem(LS_PROJECTS, JSON.stringify(projects));
  var active = getActiveIdx();
  if (active >= projects.length) localStorage.setItem(LS_ACTIVE, String(Math.max(0, projects.length - 1)));
  renderProjectSelect();
  renderProjectList();
  if (!projects.length) { setConnStatus(false); $('tasks-list').innerHTML = '<div class="empty">Configura un proyecto primero.</div>'; }
  else connect();
}
function setActiveProject(idx) {
  localStorage.setItem(LS_ACTIVE, String(idx));
  cachedSchema = null; // reset cache on project switch
  renderProjectSelect();
  renderProjectList();
  expandedId = null;
  setConnStatus(false);
  connect();
  if ($('sec-tasks').classList.contains('active')) loadTasks();
}

function renderProjectSelect() {
  var sel      = $('project-select');
  var projects = getProjects();
  var active   = getActiveIdx();
  if (!projects.length) {
    sel.innerHTML = '<option value="-1">Sin proyectos</option>';
    $('project-label').textContent = 'Sin configurar';
    return;
  }
  sel.innerHTML = projects.map(function(p, i) {
    return '<option value="' + i + '"' + (i === active ? ' selected' : '') + '>' + esc(p.name) + '</option>';
  }).join('');
  $('project-label').textContent = projects[active] ? projects[active].name : '';
}

function renderProjectList() {
  var el       = $('projects-list');
  var projects = getProjects();
  var active   = getActiveIdx();
  if (!el) return;
  if (!projects.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--muted)">No hay proyectos guardados.</p>';
    return;
  }
  el.innerHTML = '<div style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Proyectos guardados</div>'
    + projects.map(function(p, i) {
      var isActive = i === active;
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface);border:1px solid '
        + (isActive ? 'var(--accent)' : 'var(--border)') + ';border-radius:8px;margin-bottom:8px;">'
        + '<div style="flex:1;min-width:0;">'
        + '<div style="font-size:13px;font-weight:500">' + esc(p.name) + '</div>'
        + '<div style="font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.url) + '</div>'
        + '</div>'
        + (isActive
          ? '<span style="font-size:11px;color:var(--accent2);font-weight:600;white-space:nowrap">&#9679; Activo</span>'
          : '<button class="btn btn-ghost btn-sm" data-use-project="' + i + '">Usar</button>')
        + '<button class="btn btn-sm" style="background:rgba(239,68,68,.15);color:var(--danger);border:1px solid rgba(239,68,68,.25);flex-shrink:0" data-del-project="' + i + '">&#10005;</button>'
        + '</div>';
    }).join('');
}

// ── Config ────────────────────────────────────────────────────────────────────
function saveConfig() {
  var url   = $('cfg-url').value.trim().replace(/\/$/, '');
  var token = $('cfg-token').value.trim();
  if (!url || !token) { showToast('URL y token son obligatorios', 'error'); return; }
  $('cfg-msg').innerHTML = '<span style="color:var(--muted)">Conectando\u2026</span>';
  // Guarda provisional para poder hacer la llamada API
  saveProject(url, token, url.split('/').pop() || 'Proyecto');
  // Actualiza nombre real desde schema
  apiCall('GET', 'schema')
    .then(function(schema) {
      var nombre = (schema.project && schema.project.nombre) || 'Proyecto';
      saveProject(url, token, nombre);
      setConnStatus(true, nombre);
      $('cfg-msg').innerHTML = '<span style="color:var(--accent2)">&#10003; Conectado a: <b>' + esc(nombre) + '</b></span>';
      $('cfg-url').value = ''; $('cfg-token').value = '';
      renderProjectList();
      renderSchema(schema);
    })
    .catch(function(e) {
      // Elimina el proyecto provisional si falla y era nuevo
      var projects = getProjects();
      var idx = getActiveIdx();
      if (projects[idx] && (projects[idx].name === url.split('/').pop() || projects[idx].name === 'Proyecto')) {
        deleteProject(idx);
      }
      setConnStatus(false);
      $('cfg-msg').innerHTML = '<span style="color:var(--danger)">&#10007; ' + esc(e.message) + '</span>';
    });
}

// ── API ───────────────────────────────────────────────────────────────────────
function apiCall(method, path, body) {
  var c = getConfig();
  if (!c.url || !c.token) return Promise.reject(new Error('Sin configurar. Ve a Configuración primero.'));
  var opts = { method: method, headers: { 'Authorization': 'Bearer ' + c.token, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(c.url.replace(/\/$/, '') + '/' + path.replace(/^\//, ''), opts)
    .then(function(res) {
      return res.json().then(function(data) {
        if (!res.ok) throw new Error(data.message || 'HTTP ' + res.status);
        return data;
      });
    });
}

// ── Connect ───────────────────────────────────────────────────────────────────
function connect() {
  var c = getConfig();
  if (!c.url || !c.token) return;
  apiCall('GET', 'schema')
    .then(function(schema) {
      var nombre = (schema.project && schema.project.nombre) || 'Proyecto';
      saveProject(c.url, c.token, nombre);
      setConnStatus(true, nombre);
      renderSchema(schema);
      if ($('sec-tasks').classList.contains('active')) loadTasks();
    })
    .catch(function(e) {
      setConnStatus(false);
      if ($('cfg-msg')) $('cfg-msg').innerHTML = '<span style="color:var(--danger)">&#10007; ' + esc(e.message) + '</span>';
    });
}
function setConnStatus(ok, name) {
  $('conn-dot').className   = 'dot ' + (ok ? 'ok' : 'err');
  $('conn-text').textContent = ok ? 'Conectado' : 'Desconectado';
  if (name) { $('project-label').textContent = name; renderProjectSelect(); }
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function nav(id) {
  document.querySelectorAll('section').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('nav button').forEach(function(b) { b.classList.remove('active'); });
  $('sec-' + id).classList.add('active');
  var nb = $('nav-' + id); if (nb) nb.classList.add('active');
  if (id === 'tasks')  loadTasks();
  if (id === 'config') renderProjectList();
}

// ── Tasks (compact) ───────────────────────────────────────────────────────────
function loadTasks() {
  var sp = $('tasks-spinner'); sp.style.display = 'inline-block';
  var estado    = $('filter-estado').value;
  var prioridad = $('filter-prio').value;
  var path = 'tasks', params = [];
  if (estado)    params.push('estado='    + encodeURIComponent(estado));
  if (prioridad) params.push('prioridad=' + encodeURIComponent(prioridad));
  if (params.length) path += '?' + params.join('&');
  apiCall('GET', path)
    .then(function(d) { renderTasks(d.tasks); })
    .catch(function(e){ $('tasks-list').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; })
    .finally(function(){ sp.style.display = 'none'; });
}

function stateBadge(s) {
  var map = { 'Pendiente':'pend','En Desarrollo':'dev','Pruebas':'test','Producción':'prod','Archivado':'arch' };
  return '<span class="badge badge-' + (map[s] || 'pend') + '">' + esc(s) + '</span>';
}
function prioBadge(p) {
  var map = { 'Crítica':'crit','Alta':'alta','Media':'media','Baja':'baja' };
  return '<span class="badge badge-' + (map[p] || 'media') + '">' + esc(p) + '</span>';
}

function renderTasks(tasks) {
  lastTasks      = tasks || [];
  pendingConfirm = null; // reset two-step confirm on any re-render
  var el = $('tasks-list');
  if (!tasks || !tasks.length) { el.innerHTML = '<div class="empty">No hay tareas con ese filtro.</div>'; return; }
  el.innerHTML = tasks.map(function(t) {
    var exp         = expandedId === t.id;
    var toProduccion = t.next_state === 'Producción';
    // Advance button: danger style for Producción transition
    var advBtn = t.next_state
      ? '<button class="btn btn-sm" style="margin-left:auto;flex-shrink:0;padding:3px 10px;font-size:11px;'
        + (toProduccion
          ? 'background:rgba(239,68,68,.15);color:var(--danger);border:1px solid rgba(239,68,68,.35)'
          : 'background:var(--accent2);color:#fff;border:none')
        + '" data-advance="' + esc(t.id) + '" data-taskid="' + esc(t.taskId || '') + '" data-next-state="' + esc(t.next_state) + '">'
        + (toProduccion ? '&#9888;&nbsp;' : '&#8594;&nbsp;') + esc(t.next_state) + '</button>'
      : '<span style="margin-left:auto;font-size:11px;color:var(--muted);flex-shrink:0">&#9679; Terminal</span>';

    var html = '<div class="task-card' + (exp ? ' expanded' : '') + '" data-id="' + esc(t.id) + '">'
      + '<div class="task-row">'
      + '<span class="task-id">' + esc(t.taskId || t.id.slice(0, 8)) + '</span>'
      + stateBadge(t.estado) + prioBadge(t.prioridad)
      + '<span style="font-size:11px;color:var(--muted)">' + esc(t.tipo) + '</span>'
      + advBtn
      + '</div>'
      + '<div class="task-titulo">' + esc(t.titulo) + '</div>';

    // Detalle expandido
    if (exp) {
      html += '<div class="task-detail">';
      if (t.problema) html += '<div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5">'
        + esc(t.problema.slice(0, 200)) + (t.problema.length > 200 ? '…' : '') + '</div>';

      // ── Pre-análisis (amber) — para evaluar antes de empezar
      if (t.preanalysis_prompt) {
        html += promptBox({
          id:         t.id,
          dataAttr:   'data-copy-preanalysis',
          color:      '245,158,11',
          cssColor:   'var(--warn)',
          label:      '&#9889; Pre-análisis recomendado antes de avanzar',
          prompt:     t.preanalysis_prompt,
        });
      }

      // ── Verificación (green) — para confirmar trabajo completado
      if (t.verification_prompt) {
        html += promptBox({
          id:         t.id,
          dataAttr:   'data-copy-verification',
          color:      '16,185,129',
          cssColor:   'var(--accent2)',
          label:      '&#10003; Verificación requerida antes de avanzar' + (toProduccion ? ' &#9888;' : ''),
          prompt:     t.verification_prompt,
        });
      }

      if (t.responsable) html += '<div style="font-size:11px;color:var(--muted);margin-top:8px">&#128100; ' + esc(t.responsable) + '</div>';
      html += '<div style="font-size:10px;color:var(--muted);margin-top:6px;opacity:.6">ID: ' + esc(t.id) + '</div>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  }).join('');
}

// Helper: genera HTML para secciones colapsables de prompts (pre-análisis / verificación)
function promptBox(opts) {
  return '<details style="margin-top:8px;background:rgba(' + opts.color + ',.06);border:1px solid rgba(' + opts.color + ',.25);border-radius:6px;overflow:hidden">'
    + '<summary style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none">'
    + '<span style="font-size:11px;font-weight:600;color:' + opts.cssColor + '">' + opts.label + '</span>'
    + '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">'
    + '<button class="btn btn-sm" ' + opts.dataAttr + '="' + esc(opts.id) + '" style="font-size:10px;padding:2px 8px;background:rgba(' + opts.color + ',.2);border:1px solid rgba(' + opts.color + ',.4);color:' + opts.cssColor + '">&#128203; Copiar</button>'
    + '<span style="font-size:10px;color:var(--muted)">&#9660;</span>'
    + '</div></summary>'
    + '<pre style="margin:0;padding:10px 14px;font-size:11px;color:rgba(' + opts.color + ',.85);white-space:pre-wrap;font-family:monospace;border-top:1px solid rgba(' + opts.color + ',.2);line-height:1.6">' + esc(opts.prompt) + '</pre>'
    + '</details>';
}

function toggleTask(id) {
  expandedId = expandedId === id ? null : id;
  loadTasks();
}

function advanceTask(id, taskId) {
  apiCall('POST', 'tasks/' + id + '/advance')
    .then(function(data) {
      showToast((taskId || id) + ' \u2192 ' + data.estado_nuevo, 'success');
      expandedId = null;
      loadTasks();
    })
    .catch(function(e) { showToast(e.message, 'error'); });
}

// ── Schema Inspection ─────────────────────────────────────────────────────────

// Known aliases for standard fields (canonical key → accepted synonyms)
var FIELD_ALIASES = {
  titulo:      ['titulo', 'title', 'tarea'],
  problema:    ['problema', 'problem'],
  solucion:    ['solucion', 'solución', 'solution'],
  taskPrompt:  ['taskprompt', 'prompt', 'task_prompt'],
  prioridad:   ['prioridad', 'priority'],
  tipo:        ['tipo', 'type'],
  responsable: ['responsable', 'assignee'],
  fechaInicio: ['fechainicio', 'fecha_inicio', 'start_date'],
  plazo:       ['plazo', 'deadline', 'due_date'],
};

// Parse the create_task.body descriptor into structured field metadata
function parseSchemaFields(schema) {
  var endpoint = (schema.endpoints || []).find(function(e) { return e.id === 'create_task'; });
  if (!endpoint || !endpoint.body) return [];
  return Object.keys(endpoint.body).map(function(key) {
    var desc     = endpoint.body[key] || '';
    var required = desc === 'REQUERIDO';
    var values   = (!required && desc.indexOf('|') >= 0)
      ? desc.split('|').map(function(v) { return v.trim(); })
      : null;
    return { name: key, required: required, values: values };
  });
}

// Returns cached schema or fetches from API
function ensureSchema() {
  if (cachedSchema) return Promise.resolve(cachedSchema);
  return apiCall('GET', 'schema').then(function(s) {
    cachedSchema = s;
    renderSchema(s);
    return s;
  });
}

// Validates a task object against schema field rules (required + enum)
function validatePayload(task, schemaFields) {
  var errors = [];
  schemaFields.forEach(function(f) {
    if (f.required && (!task[f.name] || !String(task[f.name]).trim())) {
      errors.push('"' + f.name + '" es obligatorio');
    }
    if (f.values && task[f.name]) {
      var v = String(task[f.name]);
      if (f.values.indexOf(v) < 0) {
        errors.push('"' + f.name + '" debe ser ' + f.values.join(' | ') + ' (recibido: "' + v + '")');
      }
    }
  });
  return errors;
}

// Get a field value from a raw parsed block using known aliases + canonical name
function getFieldFromBlock(rawBlock, fieldName) {
  var aliases = FIELD_ALIASES[fieldName] || [fieldName.toLowerCase()];
  for (var i = 0; i < aliases.length; i++) {
    if (rawBlock[aliases[i]] !== undefined) return rawBlock[aliases[i]];
  }
  return undefined;
}

// Build a task object from a parsed block, using schema field list for custom fields
function buildTaskFromBlock(rawBlock, schemaFields) {
  var standardKeys = Object.keys(FIELD_ALIASES);
  var task = {};
  // Standard fields with aliases and defaults
  standardKeys.forEach(function(key) {
    var val = getFieldFromBlock(rawBlock, key);
    task[key] = val !== undefined ? val : '';
  });
  task.prioridad = task.prioridad || 'Media';
  task.tipo      = task.tipo      || 'Mejora';
  // Custom fields discovered from schema (not in standard alias table)
  if (schemaFields) {
    schemaFields.forEach(function(f) {
      if (standardKeys.indexOf(f.name) < 0 && rawBlock[f.name.toLowerCase()] !== undefined) {
        task[f.name] = rawBlock[f.name.toLowerCase()];
      }
    });
  }
  return task;
}

// Update the AI prompt textarea with schema-derived field list
function updateAiPrompt(schemaFields) {
  var el = $('ai-prompt-text');
  if (!el || !schemaFields || !schemaFields.length) return;
  var text     = el.textContent || el.innerText;
  var startTag = 'CAMPOS DISPONIBLES:';
  var endTag   = 'REGLAS:';
  var si = text.indexOf(startTag);
  var ei = text.indexOf(endTag);
  if (si < 0 || ei < 0 || ei <= si) return;

  var lines = schemaFields.map(function(f) {
    var key = f.name === 'taskPrompt' ? 'prompt' : f.name;
    var pad = key + Array(Math.max(2, 10 - key.length + 1)).join(' ');
    var desc;
    if (f.name === 'titulo') {
      desc = '(OBLIGATORIO) Título breve y descriptivo. Máx. 200 caracteres.';
    } else if (f.name === 'taskPrompt') {
      desc = 'Instrucción detallada para que una IA ejecute esta tarea.\n'
           + '            Incluye: qué archivo/componente tocar, comportamiento esperado,\n'
           + '            restricciones y criterio de éxito.';
    } else if (f.values) {
      desc = f.values.join(' | ');
      if (f.name === 'prioridad') desc += '   (default: Media)';
      if (f.name === 'tipo')      desc += '   (default: Mejora)';
    } else {
      desc = '';
    }
    return '  ' + pad + desc;
  }).filter(function(l) { return l.trim(); }).join('\n');

  el.textContent = text.substring(0, si) + startTag + '\n' + lines + '\n\n' + text.substring(ei);
}

// ── Batch Import ──────────────────────────────────────────────────────────────
function parseTasks(text, schemaFields) {
  if (!text || !text.trim()) return [];
  var blocks = [];
  var newFmt = /===\s*TAREA\s*===([\s\S]*?)===\s*FIN\s*===/gi;
  var m;
  while ((m = newFmt.exec(text)) !== null) blocks.push(m[1]);
  if (!blocks.length) blocks = text.split(/\n\s*---+\s*\n/);

  var tasks = [];
  blocks.forEach(function(block, blockIdx) {
    block = block.trim(); if (!block) return;
    var task = {}, lines = block.split('\n'), curKey = null, curVal = [];
    var inExplicitMultiline = false;

    function closeCurrentField() {
      if (!curKey) return;
      task[curKey] = curVal.join('\n').trim();
    }

    lines.forEach(function(line) {
      var kv = line.match(/^([a-z_\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1a-z0-9]+)\s*:\s*(.*)/i);

      // Explicit multiline mode: only <<FIN>> can close it.
      if (inExplicitMultiline) {
        if (line.trim() === '<<FIN>>') {
          closeCurrentField();
          curKey = null;
          curVal = [];
          inExplicitMultiline = false;
        } else {
          curVal.push(line);
        }
        return;
      }

      if (kv) {
        closeCurrentField();
        curKey = kv[1].toLowerCase().replace(/prompt$/, 'taskprompt');
        var firstVal = kv[2] || '';

        if (firstVal.trim() === '<<INICIO>>') {
          curVal = [];
          inExplicitMultiline = true;
        } else {
          curVal = [firstVal];
        }
      } else if (curKey) {
        // Backward compatibility:
        // keep legacy indented continuation, and also tolerate non-key lines
        // so long paragraphs are not silently truncated.
        curVal.push(line.trim());
      }
    });

    if (inExplicitMultiline) {
      throw new Error('Bloque multilínea sin cerrar (falta <<FIN>>) en la tarea #' + (blockIdx + 1) + ' para el campo "' + curKey + '".');
    }
    closeCurrentField();
    tasks.push(buildTaskFromBlock(task, schemaFields));
  });
  return tasks.filter(function(t) { return t.titulo; });
}

function previewImport() {
  var text         = $('import-text').value;
  var schemaFields = cachedSchema ? parseSchemaFields(cachedSchema) : null;
  var preview = $('import-preview');
  var btn     = $('btn-run-import');
  $('import-progress').style.display = 'none';
  var tasks = [];
  try {
    tasks = parseTasks(text, schemaFields);
  } catch (err) {
    preview.innerHTML = '<div class="preview-item" style="border-color:var(--danger);color:var(--danger)">'
      + '<div class="pi-title">Formato inválido</div>'
      + '<div class="pi-meta">' + esc(err && err.message ? err.message : 'Error de parseo') + '</div>'
      + '</div>';
    btn.disabled = true;
    btn.textContent = 'Importar todas';
    return;
  }
  if (!tasks.length) { preview.innerHTML = ''; btn.disabled = true; btn.textContent = 'Importar todas'; return; }
  preview.innerHTML = '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">'
    + tasks.length + ' tarea' + (tasks.length !== 1 ? 's' : '') + ' detectada' + (tasks.length !== 1 ? 's' : '') + ' — revisa antes de importar:</div>'
    + tasks.map(function(t, i) {
      return '<div class="preview-item" id="pi-' + i + '">'
        + '<div class="pi-title">' + esc(t.titulo) + '</div>'
        + '<div class="pi-meta">' + esc(t.tipo) + ' · ' + esc(t.prioridad)
        + (t.problema ? ' · ' + esc(t.problema.slice(0, 80)) + (t.problema.length > 80 ? '\u2026' : '') : '')
        + '</div></div>';
    }).join('');
  btn.disabled = false;
  btn.textContent = 'Importar ' + tasks.length + ' tarea' + (tasks.length !== 1 ? 's' : '');
}

function runImport() {
  var btn  = $('btn-run-import');
  var prog = $('import-progress');
  btn.disabled = true;
  prog.style.display = 'block';
  prog.innerHTML = '<span style="color:var(--muted)">Verificando esquema\u2026</span>';

  ensureSchema()
    .then(function(schema) {
      var schemaFields = parseSchemaFields(schema);
      var tasks = [];
      try {
        tasks = parseTasks($('import-text').value, schemaFields);
      } catch (err) {
        prog.style.display = 'block';
        prog.innerHTML = '<span style="color:var(--danger)"><b>Formato inválido:</b> '
          + esc(err && err.message ? err.message : 'Error de parseo') + '</span>';
        btn.disabled = false;
        showToast('Formato de importación inválido', 'error');
        return;
      }
      if (!tasks.length) { btn.disabled = false; prog.style.display = 'none'; return; }

      var results = [];
      var i = 0;

      function updateProgress() {
        var ok      = results.filter(function(r) { return r.ok; }).length;
        var skipped = results.filter(function(r) { return r.skipped; }).length;
        var fail    = results.filter(function(r) { return !r.ok && !r.skipped; }).length;
        prog.innerHTML = 'Importando ' + (i + 1) + ' de ' + tasks.length + '\u2026 '
          + '<b style="color:var(--accent2)">' + ok + ' creadas</b>'
          + (skipped ? ' · <b style="color:var(--warn)">' + skipped + ' omitidas</b>' : '')
          + (fail ? ' · <b style="color:var(--danger)">' + fail + ' errores</b>' : '');
      }
      function finish() {
        var ok      = results.filter(function(r) { return r.ok; });
        var skipped = results.filter(function(r) { return r.skipped; });
        var fail    = results.filter(function(r) { return !r.ok && !r.skipped; });
        var html = '';
        if (ok.length)      html += '<div style="color:var(--accent2);margin-bottom:6px"><b>&#10003; ' + ok.length + ' creada' + (ok.length !== 1 ? 's' : '') + ' correctamente</b></div>';
        if (skipped.length) html += '<div style="color:var(--warn);margin-bottom:6px"><b>&#8635; ' + skipped.length + ' ya existente' + (skipped.length !== 1 ? 's' : '') + ' (omitida' + (skipped.length !== 1 ? 's' : '') + ')</b>'
          + skipped.map(function(r) {
            return '<div style="font-size:12px;color:var(--muted);padding:2px 0 2px 12px">&#8226; ' + esc(r.titulo)
              + (r.taskId ? ' <span style="font-family:monospace;color:var(--warn)">' + esc(r.taskId) + '</span>' : '') + '</div>';
          }).join('') + '</div>';
        if (fail.length) {
          html += '<div style="color:var(--danger);margin-bottom:4px"><b>&#10007; ' + fail.length + ' no importada' + (fail.length !== 1 ? 's' : '') + ':</b></div>';
          html += fail.map(function(r) {
            return '<div style="font-size:12px;color:var(--danger);padding:3px 0 3px 12px">&#8226; ' + esc(r.titulo)
              + (r.error ? ' <span style="color:var(--muted)">— ' + esc(r.error) + '</span>' : '') + '</div>';
          }).join('');
        }
        prog.innerHTML = html;
        btn.disabled = false;
        var toastMsg = [];
        if (ok.length)      toastMsg.push(ok.length + ' creadas');
        if (skipped.length) toastMsg.push(skipped.length + ' ya existían');
        if (fail.length)    toastMsg.push(fail.length + ' errores');
        showToast(toastMsg.join(' · '), ok.length > 0 ? 'success' : (skipped.length > 0 ? '' : 'error'));
        results.forEach(function(r, idx) {
          var el = $('pi-' + idx);
          if (el) el.style.borderColor = r.ok ? 'var(--accent2)' : (r.skipped ? 'var(--warn)' : 'var(--danger)');
        });
      }
      function next() {
        if (i >= tasks.length) { finish(); return; }
        if (i < tasks.length - 1) updateProgress();
        var t = tasks[i];
        // Local schema validation before sending
        var errs = validatePayload(t, schemaFields);
        if (errs.length) {
          results.push({ titulo: t.titulo || '(sin título)', ok: false, error: errs.join('; ') });
          i++; next(); return;
        }
        apiCall('POST', 'tasks', t)
          .then(function(data) {
            if (data && data.status === 'skipped') {
              results.push({ titulo: t.titulo, skipped: true, taskId: data.taskId });
            } else {
              results.push({ titulo: t.titulo, ok: true, taskId: data && data.taskId });
            }
          })
          .catch(function(e) { results.push({ titulo: t.titulo, ok: false, error: e.message }); })
          .finally(function(){ i++; next(); });
      }
      next();
    })
    .catch(function(e) {
      prog.innerHTML = '<span style="color:var(--danger)">&#10007; Error cargando esquema: ' + esc(e.message) + '</span>';
      btn.disabled = false;
    });
}

// ── Clipboard helper ──────────────────────────────────────────────────────────
function copyToClipboard(text, toastMsg) {
  var done = function() { showToast(toastMsg || 'Copiado', 'success'); };
  if (navigator.clipboard) { navigator.clipboard.writeText(text).then(done).catch(done); return; }
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta); ta.select(); document.execCommand('copy');
  document.body.removeChild(ta); done();
}

// ── Copy AI prompt ────────────────────────────────────────────────────────────
function copyAiPrompt() {
  var el  = $('ai-prompt-text');
  var btn = $('btn-copy-prompt');
  if (!el) return;
  var text = el.innerText || el.textContent;
  var done = function() {
    btn.textContent = '\u2713 Copiado';
    setTimeout(function() { btn.innerHTML = '&#128203; Copiar'; }, 2000);
  };
  if (navigator.clipboard) { navigator.clipboard.writeText(text).then(done).catch(done); }
  else {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); done();
  }
}

// ── Schema ────────────────────────────────────────────────────────────────────
function loadSchema() {
  apiCall('GET', 'schema').then(renderSchema).catch(function(e) { showToast(e.message, 'error'); });
}
function renderSchema(data) {
  cachedSchema = data;
  var schemaFields = parseSchemaFields(data);
  var html = '';

  // Project header
  if (data.project) {
    html += '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;">'
      + '<div>'
      + '<div style="font-size:15px;font-weight:600">' + esc(data.project.nombre) + '</div>'
      + '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + esc(data.api || 'El Taller API') + ' · v' + esc(data.version || '1') + '</div>'
      + '</div>'
      + '<span style="font-size:10px;background:rgba(16,185,129,.15);color:var(--accent2);border-radius:10px;padding:3px 10px;font-weight:600">&#9679; conectado</span>'
      + '</div>';
  }

  // Fields catalog
  if (schemaFields.length) {
    html += '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:14px;">'
      + '<div style="padding:10px 16px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px">'
      + 'Campos — POST /tasks (' + schemaFields.length + ' campos)</div>';

    schemaFields.forEach(function(f) {
      var isCustom = !FIELD_ALIASES[f.name];
      html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid rgba(42,45,58,.5);flex-wrap:wrap;">'
        + '<code style="font-size:12px;color:var(--accent);min-width:110px;flex-shrink:0">' + esc(f.name) + (isCustom ? ' <span style="font-size:9px;color:var(--warn);background:rgba(245,158,11,.15);border-radius:6px;padding:1px 5px">custom</span>' : '') + '</code>'
        + (f.required
          ? '<span style="font-size:10px;background:rgba(239,68,68,.15);color:var(--danger);border-radius:10px;padding:1px 7px;font-weight:600;flex-shrink:0">REQUERIDO</span>'
          : '<span style="font-size:10px;color:var(--muted);flex-shrink:0">opcional</span>')
        + (f.values
          ? '<span style="font-size:11px;color:var(--muted)">' + f.values.map(function(v) {
              return '<code style="background:var(--bg);padding:1px 5px;border-radius:3px">' + esc(v) + '</code>';
            }).join('<span style="color:var(--border)"> | </span>') + '</span>'
          : '<span style="font-size:11px;color:var(--muted)">texto libre</span>')
        + '</div>';
    });
    html += '</div>';
  }

  // State machine
  if (data.state_machine && data.state_machine.states) {
    var states = data.state_machine.states;
    var trans  = data.state_machine.transitions || {};
    html += '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin-bottom:14px;">'
      + '<div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px">Máquina de estados</div>'
      + '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:12px">';
    states.forEach(function(s, i) {
      var isTerminal = trans[s] && trans[s].next === null;
      html += '<span style="padding:4px 12px;border-radius:12px;background:var(--bg);border:1px solid ' + (isTerminal ? 'rgba(16,185,129,.4)' : 'var(--border)') + ';color:' + (isTerminal ? 'var(--accent2)' : 'var(--text)') + '">'
        + esc(s) + (isTerminal ? ' &#9679;' : '') + '</span>';
      if (trans[s] && trans[s].next) html += '<span style="color:var(--muted)">&#8594;</span>';
    });
    html += '</div></div>';
  }

  // Endpoints list
  if (data.endpoints && data.endpoints.length) {
    html += '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:14px;">'
      + '<div style="padding:10px 16px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px">Endpoints</div>';
    data.endpoints.forEach(function(ep) {
      var methodColor = ep.method === 'GET' ? 'var(--accent)' : 'var(--accent2)';
      html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid rgba(42,45,58,.5)">'
        + '<code style="font-size:10px;font-weight:700;color:' + methodColor + ';min-width:38px;flex-shrink:0">' + esc(ep.method) + '</code>'
        + '<code style="font-size:12px;color:var(--muted)">' + esc(ep.path) + '</code>'
        + '</div>';
    });
    html += '</div>';
  }

  // Raw JSON collapsible
  html += '<details style="margin-bottom:0">'
    + '<summary style="cursor:pointer;font-size:12px;color:var(--muted);padding:8px 2px;user-select:none;list-style:none">&#9654; Ver JSON completo</summary>'
    + '<pre class="schema-pre">' + esc(JSON.stringify(data, null, 2)) + '</pre>'
    + '</details>';

  $('schema-content').innerHTML = html;
  updateAiPrompt(schemaFields);
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Nav
  $('nav-tasks').addEventListener('click',  function() { nav('tasks'); });
  $('nav-import').addEventListener('click', function() { nav('import'); });
  $('nav-schema').addEventListener('click', function() { nav('schema'); });
  $('nav-config').addEventListener('click', function() { nav('config'); });

  // Project select (switcher en sidebar)
  $('project-select').addEventListener('change', function() {
    var idx = parseInt(this.value);
    if (idx >= 0) setActiveProject(idx);
  });

  // Tasks
  $('btn-refresh').addEventListener('click', loadTasks);
  $('filter-estado').addEventListener('change', loadTasks);
  $('filter-prio').addEventListener('change',   loadTasks);

  // Tasks list: advance (with two-step confirm for Producción) + copy prompts + toggle card
  $('tasks-list').addEventListener('click', function(e) {
    // ── Advance button ──
    var advBtn = e.target.closest('[data-advance]');
    if (advBtn) {
      var tid    = advBtn.getAttribute('data-advance');
      var taskId = advBtn.getAttribute('data-taskid');
      var nextSt = advBtn.getAttribute('data-next-state');

      if (nextSt === 'Producción') {
        if (pendingConfirm === tid) {
          // Second click: confirmed — proceed
          pendingConfirm = null;
          advanceTask(tid, taskId);
        } else {
          // First click: require confirmation
          pendingConfirm = tid;
          advBtn.style.background = 'var(--danger)';
          advBtn.style.color      = '#fff';
          advBtn.style.border     = 'none';
          advBtn.innerHTML        = '&#9888; ¿Confirmar → Producción?';
          showToast('⚠ Haz clic de nuevo para confirmar el avance a Producción', '');
        }
      } else {
        pendingConfirm = null;
        advanceTask(tid, taskId);
      }
      return;
    }

    // ── Copy pre-analysis ──
    var copyPre = e.target.closest('[data-copy-preanalysis]');
    if (copyPre) {
      e.stopPropagation();
      var task = lastTasks.find(function(t) { return t.id === copyPre.getAttribute('data-copy-preanalysis'); });
      if (task && task.preanalysis_prompt) copyToClipboard(task.preanalysis_prompt, 'Pre-análisis copiado');
      return;
    }

    // ── Copy verification ──
    var copyVer = e.target.closest('[data-copy-verification]');
    if (copyVer) {
      e.stopPropagation();
      var task = lastTasks.find(function(t) { return t.id === copyVer.getAttribute('data-copy-verification'); });
      if (task && task.verification_prompt) copyToClipboard(task.verification_prompt, 'Verificación copiada');
      return;
    }

    // Don't toggle card when interacting with a details prompt block
    if (e.target.closest('details')) return;
    // Reset pending confirm if clicking outside
    if (pendingConfirm) { pendingConfirm = null; loadTasks(); return; }

    var card = e.target.closest('[data-id]');
    if (card) toggleTask(card.getAttribute('data-id'));
  });

  // Import
  $('import-text').addEventListener('input', previewImport);
  $('btn-run-import').addEventListener('click', runImport);
  $('btn-clear-import').addEventListener('click', function() { $('import-text').value = ''; previewImport(); });
  $('btn-copy-prompt').addEventListener('click', function(e) { e.stopPropagation(); copyAiPrompt(); });

  // Config: guardar nuevo proyecto
  $('btn-save-config').addEventListener('click', saveConfig);

  // Config: lista de proyectos (event delegation para Usar / Eliminar)
  $('projects-list').addEventListener('click', function(e) {
    var useBtn = e.target.closest('[data-use-project]');
    if (useBtn) { setActiveProject(parseInt(useBtn.getAttribute('data-use-project'))); return; }
    var delBtn = e.target.closest('[data-del-project]');
    if (delBtn) { deleteProject(parseInt(delBtn.getAttribute('data-del-project'))); return; }
  });

  // Schema
  $('btn-refresh-schema').addEventListener('click', loadSchema);

  // Init
  renderProjectSelect();
  connect();
});
