# WorkGrid

[![Donate with PayPal](https://img.shields.io/badge/Donate-PayPal-00457C?logo=paypal&logoColor=white)](https://www.paypal.com/donate/?business=josejcoy%40gmail.com&currency_code=EUR&item_name=Support%20WorkGrid)

> Self-hosted, AI-ready task management · React + Firebase + Vercel  
> Gestión de tareas auto-alojada y lista para IA · React + Firebase + Vercel

If WorkGrid helps you, consider supporting development via PayPal.  
Si WorkGrid te resulta útil, considera apoyar el desarrollo a través de PayPal.

---

## Table of contents / Índice

- [English](#english)
  - [What is WorkGrid?](#what-is-workgrid)
  - [Features](#features)
  - [Requirements](#requirements)
  - [Install](#install)
  - [WorkGrid CLI](#workgrid-cli)
  - [REST API for AI Agents](#rest-api-for-ai-agents)
  - [AI Workflow (10 steps)](#ai-workflow-10-steps)
  - [Install with AI](#install-with-ai)
  - [Privacy note](#privacy-note)
- [Español](#español)
  - [¿Qué es WorkGrid?](#qué-es-workgrid)
  - [Características](#características)
  - [Requisitos](#requisitos)
  - [Instalación](#instalación)
  - [WorkGrid CLI](#workgrid-cli-1)
  - [API REST para agentes IA](#api-rest-para-agentes-ia)
  - [Flujo de trabajo IA (10 pasos)](#flujo-de-trabajo-ia-10-pasos)
  - [Instalar con IA](#instalar-con-ia)
  - [Privacidad](#privacidad)

---

## Screenshots

### Dashboard
![WorkGrid Dashboard](./secreenshot1.png)

### Project Board
![WorkGrid Project Board](./secreenshot2.png)

---

## English

### What is WorkGrid?

WorkGrid is a multi-project task board where tasks move through a linear state machine:

```
Pending → In Progress → Testing → Production
```

It ships with a REST API and a standalone CLI tool so AI agents can read tasks, execute them, and advance their state — without any human in the loop.

### Features

| Feature | Description |
|---------|-------------|
| **Multi-project board** | Separate kanban-style board per project with priorities, types, deadlines |
| **Linear state machine** | Pending → In Progress → Testing → Production |
| **REST API** | Vercel serverless endpoint at `/api/taller` |
| **OpenAPI 3.0 spec** | `openapi.yaml` — machine-readable contract for LLM tool use |
| **WorkGrid CLI** | Standalone HTML tool — no build step, works offline |
| **AI prompts** | `ai_prompt`, `preanalysis_prompt`, `verification_prompt` generated server-side |
| **Dynamic schema** | CLI inspects `/schema` on connect and adapts to custom fields |
| **Controlled transitions** | Verification gate before each state advance; two-step confirm for Production |
| **Bulk import** | Paste AI-generated tasks in structured text; content-hash deduplication |
| **CSV import/export** | Excel-friendly per-project export and import |
| **Backup system** | Full JSON snapshots with conflict resolution and re-linking tool |
| **App Check** | Firebase App Check with reCAPTCHA v3 support |
| **Access control** | Per-project read/write user lists; super-admin role |

### Requirements

1. Node.js LTS
2. A Firebase project (free Spark plan works)
3. A Vercel account (free Hobby plan works)

### Install

```bash
git clone https://github.com/josejnet/WorkGrid
cd WorkGrid
npm install
```

Copy `.env.example` to `.env.local` and fill in your Firebase values:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_SUPER_ADMIN=your@email.com

# Optional — restrict sign-in to a domain or specific emails
VITE_ALLOWED_DOMAIN=yourcompany.com
VITE_ALLOWED_EMAILS=alice@gmail.com,bob@gmail.com

# Optional — Firebase App Check
VITE_RECAPTCHA_SITE_KEY=
```

Start locally:

```bash
npm run dev
```

Deploy to Vercel:

```bash
npx vercel --prod
```

Add the following env var in Vercel to enable the REST API:

```
FIREBASE_SERVICE_ACCOUNT_B64=<base64-encoded Firebase service account JSON>
```

The first user to register becomes admin automatically.

---

### WorkGrid CLI

`public/workgrid-cli.html` is a zero-dependency standalone tool for interacting with any WorkGrid deployment:

- Connect with URL + Bearer token
- Browse and filter tasks by state, priority, or project
- Advance task state with verification gates and two-step confirm for Production
- Bulk import tasks from AI-generated structured text
- Bulk import supports explicit multiline blocks using `<<INICIO>>` / `<<FIN>>`
- Import parser keeps backward compatibility with legacy indented text and returns clear errors for malformed blocks
- Copy `preanalysis_prompt` and `verification_prompt` to clipboard with one click
- **Dynamic schema inspection** — fetches `/schema` on connect and adapts field handling automatically

Open it directly in a browser (`file://`) or serve it from your Vercel deployment at `/workgrid-cli.html`.

---

### REST API for AI Agents

WorkGrid exposes a serverless API at `/api/taller`. Full specification: [`openapi.yaml`](./openapi.yaml)

#### Enable the API

Go to **Settings → Project Master**, open a project, and click **Generate API token**.  
Use the token as `Authorization: Bearer <token>` on every request.

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/taller/schema` | Discover fields, state machine, AI workflow steps |
| `GET` | `/api/taller/tasks` | List tasks (filter by `estado`, `projectId`, `tipo`, `prioridad`) |
| `GET` | `/api/taller/tasks/:id` | Get one task with all AI prompts |
| `POST` | `/api/taller/tasks` | Create a task |
| `POST` | `/api/taller/tasks/:id/advance` | Advance task to next state |

Every task response includes:
- `ai_prompt` — full context for executing the task
- `preanalysis_prompt` — checklist to evaluate before starting
- `verification_prompt` — quality/readiness checklist before advancing
- `next_state` — the state the task would move to on advance

---

### AI Workflow (10 steps)

```
1.  GET /schema              → cache fields and endpoints
2.  GET /tasks?estado=Pending → list tasks awaiting work
3.  Read preanalysis_prompt  → evaluate: conflicts? already done? risks?
4.  Decide                   → PROCEED / PAUSE / MODIFY
5.  POST /advance            → move to In Progress
6.  Execute work             → use ai_prompt as context
7.  Read verification_prompt → verify implementation quality
8.  POST /advance            → move to Testing
9.  Read verification_prompt → verify production readiness (⚠ irreversible)
10. POST /advance            → move to Production
```

Steps 3–4 and 7–9 are **verification gates** — the API returns the relevant prompt and the agent must evaluate it before proceeding.

---

### Install with AI

You can set up WorkGrid end-to-end by instructing an AI assistant:

1. Clone and install: `git clone https://github.com/josejnet/WorkGrid && npm install`
2. Create a Firebase project and fill `.env.local`
3. Deploy: `npx vercel --prod`
4. Set `FIREBASE_SERVICE_ACCOUNT_B64` in Vercel env vars (enables the API)
5. Generate an API token from **Settings → Project Master**
6. Open `/workgrid-cli.html` and connect with your URL + token

---

### Privacy note

This public repo contains no personal data:
- No private `.env` secrets (only `.env.example` with placeholders)
- No personal task exports or backups
- Firebase config comes entirely from your own env vars

---

---

## Español

### ¿Qué es WorkGrid?

WorkGrid es un gestor de tareas multi-proyecto donde las tareas avanzan por una máquina de estados lineal:

```
Pendiente → En Desarrollo → Pruebas → Producción
```

Incluye una API REST y una herramienta CLI standalone para que agentes de IA puedan leer tareas, ejecutarlas y avanzar su estado de forma autónoma.

### Características

| Característica | Descripción |
|---------------|-------------|
| **Tablero multi-proyecto** | Tablero estilo kanban por proyecto con prioridades, tipos y plazos |
| **Máquina de estados lineal** | Pendiente → En Desarrollo → Pruebas → Producción |
| **API REST** | Endpoint serverless en Vercel en `/api/taller` |
| **Especificación OpenAPI 3.0** | `openapi.yaml` — contrato legible por máquina para LLMs |
| **WorkGrid CLI** | Herramienta HTML standalone — sin build, funciona offline |
| **Prompts IA** | `ai_prompt`, `preanalysis_prompt`, `verification_prompt` generados en servidor |
| **Schema dinámico** | La CLI inspecciona `/schema` al conectar y adapta el manejo de campos |
| **Transiciones controladas** | Verificación antes de avanzar estado; doble confirmación para Producción |
| **Importación masiva** | Pega tareas generadas por IA en texto estructurado; deduplicación por hash |
| **Importación/exportación CSV** | Por proyecto, compatible con Excel |
| **Sistema de backup** | Snapshots JSON completos con resolución de conflictos y re-vinculación |
| **App Check** | Firebase App Check con soporte para reCAPTCHA v3 |
| **Control de acceso** | Listas de usuarios con permisos por proyecto; rol de super-admin |

### Requisitos

1. Node.js LTS
2. Un proyecto Firebase (el plan gratuito Spark funciona)
3. Una cuenta en Vercel (el plan gratuito Hobby funciona)

### Instalación

```bash
git clone https://github.com/josejnet/WorkGrid
cd WorkGrid
npm install
```

Copia `.env.example` a `.env.local` y rellena tus datos de Firebase:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_SUPER_ADMIN=tu@email.com

# Opcional — restringe el inicio de sesión a un dominio o emails concretos
VITE_ALLOWED_DOMAIN=tuempresa.com
VITE_ALLOWED_EMAILS=alice@gmail.com,bob@gmail.com

# Opcional — Firebase App Check
VITE_RECAPTCHA_SITE_KEY=
```

Arranca en local:

```bash
npm run dev
```

Deploy en Vercel:

```bash
npx vercel --prod
```

Añade la siguiente variable de entorno en Vercel para activar la API REST:

```
FIREBASE_SERVICE_ACCOUNT_B64=<JSON de cuenta de servicio de Firebase en base64>
```

El primer usuario en registrarse se convierte en admin automáticamente.

---

### WorkGrid CLI

`public/workgrid-cli.html` es una herramienta standalone sin dependencias para interactuar con cualquier instancia de WorkGrid:

- Conéctate con URL + token Bearer
- Navega y filtra tareas por estado, prioridad o proyecto
- Avanza el estado de las tareas con verificación previa; doble confirmación para Producción
- Importa tareas en bloque desde texto estructurado generado por IA
- La importación masiva soporta bloques multilínea explícitos con `<<INICIO>>` / `<<FIN>>`
- El parser mantiene compatibilidad con formato legacy indentado y devuelve errores claros en bloques mal cerrados
- Copia `preanalysis_prompt` y `verification_prompt` al portapapeles con un clic
- **Inspección dinámica del schema** — consulta `/schema` al conectar y adapta el manejo de campos automáticamente

Ábrelo directamente en el navegador (`file://`) o accede desde tu despliegue en `/workgrid-cli.html`.

---

### API REST para agentes IA

WorkGrid expone una API serverless en `/api/taller`. Especificación completa en [`openapi.yaml`](./openapi.yaml)

#### Activar la API

Ve a **Configuración → Maestro de proyectos**, abre un proyecto y haz clic en **Generar token API**.  
Usa el token como `Authorization: Bearer <token>` en cada petición.

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/taller/schema` | Descubre campos, máquina de estados y pasos del flujo IA |
| `GET` | `/api/taller/tasks` | Lista tareas (filtra por `estado`, `projectId`, `tipo`, `prioridad`) |
| `GET` | `/api/taller/tasks/:id` | Obtiene una tarea con todos sus prompts IA |
| `POST` | `/api/taller/tasks` | Crea una tarea |
| `POST` | `/api/taller/tasks/:id/advance` | Avanza la tarea al siguiente estado |

Cada respuesta de tarea incluye:
- `ai_prompt` — contexto completo para ejecutar la tarea
- `preanalysis_prompt` — checklist para evaluar antes de empezar
- `verification_prompt` — checklist de calidad/preparación antes de avanzar
- `next_state` — el estado al que pasaría la tarea al avanzar

---

### Flujo de trabajo IA (10 pasos)

```
1.  GET /schema                    → cachear campos y endpoints
2.  GET /tasks?estado=Pendiente    → listar tareas en espera
3.  Leer preanalysis_prompt        → evaluar: ¿conflictos? ¿ya existe? ¿riesgos?
4.  Decidir                        → CONTINUAR / PAUSAR / MODIFICAR
5.  POST /advance                  → pasar a En Desarrollo
6.  Ejecutar el trabajo            → usar ai_prompt como contexto
7.  Leer verification_prompt       → verificar calidad de la implementación
8.  POST /advance                  → pasar a Pruebas
9.  Leer verification_prompt       → verificar preparación para producción (⚠ irreversible)
10. POST /advance                  → pasar a Producción
```

Los pasos 3–4 y 7–9 son **puertas de verificación** — la API devuelve el prompt correspondiente y el agente debe evaluarlo antes de continuar.

---

### Instalar con IA

Puedes configurar WorkGrid de principio a fin instruyendo a un asistente IA:

1. Clonar e instalar: `git clone https://github.com/josejnet/WorkGrid && npm install`
2. Crear un proyecto Firebase y rellenar `.env.local`
3. Deploy: `npx vercel --prod`
4. Configurar `FIREBASE_SERVICE_ACCOUNT_B64` en las variables de entorno de Vercel (activa la API)
5. Generar un token API desde **Configuración → Maestro de proyectos**
6. Abrir `/workgrid-cli.html` y conectar con la URL + token

---

### Privacidad

Este repositorio público no contiene datos personales:
- Sin secretos `.env` privados (solo `.env.example` con placeholders)
- Sin exportaciones ni backups de tareas personales
- La configuración de Firebase proviene únicamente de tus propias variables de entorno
