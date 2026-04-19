# WorkGrid

WorkGrid is a self-hosted, AI-ready task management system built on React + Firebase + Vercel.

[![Donate with PayPal](https://img.shields.io/badge/Donate-PayPal-00457C?logo=paypal&logoColor=white)](https://www.paypal.com/donate/?business=josejcoy%40gmail.com&currency_code=EUR&item_name=Support%20WorkGrid)

If WorkGrid helps you, consider supporting development via PayPal.

---

## What's new

- **WorkGrid CLI** — standalone HTML tool for managing tasks without the full app
- **REST API** — Vercel serverless endpoint for AI agent integration (`/api/taller`)
- **OpenAPI 3.0 spec** — `openapi.yaml` documents all endpoints for LLM agents
- **AI workflow** — pre-analysis prompts, verification prompts, and controlled state transitions
- **Bulk import** — paste AI-generated tasks in structured format; duplicate detection via content hash
- **CSV import** — Excel-friendly import/export per project
- **Backup system** — export/import full JSON snapshots with conflict resolution
- **URL re-linking tool** — update all project URLs after migration in one click

---

## Screenshots

### Dashboard (anonymized)
![WorkGrid Dashboard](./secreenshot1.png)

### Project Board (anonymized)
![WorkGrid Project Board](./secreenshot2.png)

---

## English

### What is WorkGrid?
WorkGrid is a multi-project task board where tasks move through a linear state machine:

```
Pending → In Progress → Testing → Production
```

It includes a REST API and CLI tool so AI agents can read tasks, execute them, and advance their state autonomously.

### What do I need?
1. Node.js (LTS)
2. A Firebase project (free tier is fine)
3. A Vercel account (free tier)

### Install

```bash
git clone https://github.com/josejnet/WorkGrid
cd WorkGrid
npm install
```

Copy `.env.example` to `.env.local` and fill your Firebase values:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_SUPER_ADMIN=your@email.com
```

Start locally:

```bash
npm run dev
```

Deploy to Vercel:

```bash
npx vercel --prod
```

The first user to register becomes admin automatically.

---

## WorkGrid CLI

`public/workgrid-cli.html` is a standalone tool (no build step) for interacting with your WorkGrid API:

- Connect to any WorkGrid deployment with URL + Bearer token
- Browse, filter, and advance tasks
- Bulk import tasks from AI-generated text
- Dynamic schema inspection — adapts to your API fields automatically

Open it directly in a browser or serve it from your Vercel deployment at `/workgrid-cli.html`.

---

## REST API for AI Agents

WorkGrid exposes a serverless API at `/api/taller`. Any AI agent can:

1. `GET /api/taller/schema` — discover fields, state machine, and workflow steps
2. `GET /api/taller/tasks?estado=Pendiente` — list pending tasks (includes `ai_prompt`, `preanalysis_prompt`, `verification_prompt`)
3. `POST /api/taller/tasks/{id}/advance` — advance task state

Full specification: [`openapi.yaml`](./openapi.yaml)

### Enable the API
Go to **Settings → Project Master**, open a project, and click **Generate API token**. Use the token as `Authorization: Bearer <token>`.

### AI workflow (10 steps)
1. `GET /schema` — cache fields and endpoints
2. `GET /tasks?estado=Pendiente` — list tasks
3. Read `preanalysis_prompt` — evaluate before starting (conflicts? already exists?)
4. Decide: **PROCEED** / **PAUSE** / **MODIFY**
5. `POST /advance` → In Progress
6. Execute work using `ai_prompt`
7. Read `verification_prompt` — verify implementation quality
8. `POST /advance` → Testing
9. Read `verification_prompt` — verify production readiness (irreversible step)
10. `POST /advance` → Production

---

## Español

### ¿Qué es WorkGrid?
WorkGrid es un gestor de tareas multi-proyecto con API REST y herramienta CLI para que agentes de IA puedan trabajar con las tareas de forma autónoma.

Las tareas siguen una máquina de estados lineal:
```
Pendiente → En Desarrollo → Pruebas → Producción
```

### Instalación

```bash
git clone https://github.com/josejnet/WorkGrid
cd WorkGrid
npm install
```

Crea `.env.local` desde `.env.example` con tus datos de Firebase:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_SUPER_ADMIN=tu@email.com
```

Arranca en local:
```bash
npm run dev
```

Deploy en Vercel:
```bash
npx vercel --prod
```

El primer usuario en registrarse se convierte en admin automáticamente.

---

## WorkGrid CLI

`public/workgrid-cli.html` es una herramienta standalone (sin build) para interactuar con tu API de WorkGrid:

- Conéctate a cualquier instancia con URL + token Bearer
- Navega, filtra y avanza tareas
- Importa tareas en bloque desde texto generado por IA
- Inspección dinámica del schema — se adapta a los campos de tu API

Ábrelo directamente en el navegador o accede desde tu despliegue en `/workgrid-cli.html`.

---

## API REST para Agentes IA

WorkGrid expone una API serverless en `/api/taller`. Especificación completa en [`openapi.yaml`](./openapi.yaml).

### Activar la API
Ve a **Configuración → Maestro de proyectos**, abre un proyecto y haz clic en **Generar token API**.

### Variables de entorno en Vercel
```
FIREBASE_SERVICE_ACCOUNT_B64=<base64 del JSON de cuenta de servicio de Firebase>
```

---

## Install with AI

You can set up WorkGrid end-to-end with an AI assistant.

1. Ask the AI to clone and install: `git clone https://github.com/josejnet/WorkGrid && npm install`
2. Ask it to create your Firebase project and fill `.env.local`
3. Ask it to deploy: `npx vercel --prod`
4. Ask it to set `FIREBASE_SERVICE_ACCOUNT_B64` in Vercel env vars to enable the API
5. Generate an API token from Settings → Project Master
6. Open `/workgrid-cli.html` and connect with your URL + token

---

## Privacy note

This public repo contains no personal data:
- No private `.env` secrets
- No personal task exports
- Firebase config comes from your own env vars
