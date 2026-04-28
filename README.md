# WorkGrid

[![Donate with PayPal](https://img.shields.io/badge/Donate-PayPal-00457C?logo=paypal&logoColor=white)](https://www.paypal.com/donate/?business=josejcoy%40gmail.com&currency_code=EUR&item_name=Support%20WorkGrid)

> Self-hosted task management · React + Firebase + Vercel  
> Gestión de tareas auto-alojada · React + Firebase + Vercel

If WorkGrid helps you, consider supporting development via PayPal.  
Si WorkGrid te resulta útil, considera apoyar el desarrollo a través de PayPal.

---

## 🎯 Live demo / Demo en vivo

**[https://work-grid-six.vercel.app](https://work-grid-six.vercel.app)**

> This is an educational demo with sample data. Login with:
> - **Email:** `user@user.com` · **Password:** `useruser`
>
> Esta es una demo educativa con datos de ejemplo. Accede con:
> - **Email:** `user@user.com` · **Contraseña:** `useruser`

---

## Table of contents / Índice

- [English](#english)
  - [What is WorkGrid?](#what-is-workgrid)
  - [Features](#features)
  - [Requirements](#requirements)
  - [Install](#install)
  - [WorkGrid CLI](#workgrid-cli)
  - [REST API](#rest-api)
  - [Privacy note](#privacy-note)
- [Español](#español)
  - [¿Qué es WorkGrid?](#qué-es-workgrid)
  - [Características](#características)
  - [Requisitos](#requisitos)
  - [Instalación](#instalación)
  - [WorkGrid CLI](#workgrid-cli-1)
  - [API REST](#api-rest-1)
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

It ships with a REST API and a standalone CLI tool for automation and external integrations.

### Features

| Feature | Description |
|---------|-------------|
| **Multi-project board** | Separate kanban-style board per project with priorities, types, deadlines |
| **Linear state machine** | Pending → In Progress → Testing → Production |
| **REST API** | Vercel serverless endpoint at `/api/taller` |
| **WorkGrid CLI** | Standalone HTML tool — no build step, works offline |
| **Dynamic schema** | CLI inspects `/schema` on connect and adapts to custom fields |
| **Controlled transitions** | Verification gate before each state advance; two-step confirm for Production |
| **Bulk import** | Paste structured text tasks; content-hash deduplication |
| **CSV import/export** | Excel-friendly per-project export and import |
| **Backup system** | Full JSON snapshots with conflict resolution and re-linking tool |
| **App Check** | Firebase App Check with reCAPTCHA v3 support |
| **Access control** | Per-project read/write user lists; super-admin role |

### Requirements

1. Node.js LTS
2. A Firebase project (free Spark plan works)
3. A Vercel account (free Hobby plan works)

### Install

#### 1. Clone and install

```bash
git clone https://github.com/josejnet/WorkGrid
cd WorkGrid
npm install
```

#### 2. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project.
2. **Firestore Database** → Create database → choose **Production mode** → select your region → Create.
3. **Authentication** → Sign-in method → enable **Google** (and optionally **Email/Password**).
4. In Authentication → Settings → **Authorized domains**, add your Vercel deployment domain (e.g. `myapp.vercel.app`).
5. Go to **Project Settings** → General → scroll to "Your apps" → click the web icon `</>` → register the app → copy the config object.

#### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values from the Firebase config:

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

# Optional — Firebase App Check (reCAPTCHA v3)
VITE_RECAPTCHA_SITE_KEY=
```

#### 4. Deploy Firestore security rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

Or paste the contents of `firestore.rules` directly in Firebase Console → Firestore → Rules.

#### 5. Run locally

```bash
npm run dev
```

The first user to sign in becomes admin automatically.

#### 6. Deploy to Vercel

```bash
npx vercel --prod
```

Add all `VITE_FIREBASE_*` environment variables in **Vercel → Settings → Environment Variables**.

To enable the REST API, also add:

```
FIREBASE_SERVICE_ACCOUNT_B64=<base64-encoded Firebase service account JSON>
```

Generate the service account key in Firebase Console → Project Settings → Service accounts → Generate new private key. Then encode it:

```bash
base64 -i serviceAccount.json | tr -d '\n'
```

---

### WorkGrid CLI

`public/workgrid-cli.html` is a zero-dependency standalone tool for interacting with any WorkGrid deployment:

- Connect with URL + Bearer token
- Browse and filter tasks by state, priority, or project
- Advance task state with verification gates and two-step confirm for Production
- Bulk import tasks from structured text
- Bulk import supports explicit multiline blocks using `<<INICIO>>` / `<<FIN>>`
- **Dynamic schema inspection** — fetches `/schema` on connect and adapts field handling automatically

Open it directly in a browser (`file://`) or serve it from your Vercel deployment at `/workgrid-cli.html`.

---

### REST API

WorkGrid exposes a serverless API at `/api/taller`.

#### Enable the API

Go to **Settings → Project Master**, open a project, and click **Generate API token**.  
Use the token as `Authorization: Bearer <token>` on every request.

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/taller/schema` | Discover fields and state machine |
| `GET` | `/api/taller/tasks` | List tasks (filter by `estado`, `projectId`, `tipo`, `prioridad`) |
| `GET` | `/api/taller/tasks/:id` | Get one task |
| `POST` | `/api/taller/tasks` | Create a task |
| `POST` | `/api/taller/tasks/:id/advance` | Advance task to next state |

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

Incluye una API REST y una herramienta CLI standalone para automatización e integraciones externas.

### Características

| Característica | Descripción |
|---------------|-------------|
| **Tablero multi-proyecto** | Tablero estilo kanban por proyecto con prioridades, tipos y plazos |
| **Máquina de estados lineal** | Pendiente → En Desarrollo → Pruebas → Producción |
| **API REST** | Endpoint serverless en Vercel en `/api/taller` |
| **WorkGrid CLI** | Herramienta HTML standalone — sin build, funciona offline |
| **Schema dinámico** | La CLI inspecciona `/schema` al conectar y adapta el manejo de campos |
| **Transiciones controladas** | Verificación antes de avanzar estado; doble confirmación para Producción |
| **Importación masiva** | Pega tareas en texto estructurado; deduplicación por hash |
| **Importación/exportación CSV** | Por proyecto, compatible con Excel |
| **Sistema de backup** | Snapshots JSON completos con resolución de conflictos y re-vinculación |
| **App Check** | Firebase App Check con soporte para reCAPTCHA v3 |
| **Control de acceso** | Listas de usuarios con permisos por proyecto; rol de super-admin |

### Requisitos

1. Node.js LTS
2. Un proyecto Firebase (el plan gratuito Spark funciona)
3. Una cuenta en Vercel (el plan gratuito Hobby funciona)

### Instalación

#### 1. Clonar e instalar

```bash
git clone https://github.com/josejnet/WorkGrid
cd WorkGrid
npm install
```

#### 2. Crear un proyecto Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) y crea un nuevo proyecto.
2. **Firestore Database** → Crear base de datos → elige **modo Producción** → selecciona tu región → Crear.
3. **Authentication** → Método de acceso → activa **Google** (y opcionalmente **Correo electrónico/contraseña**).
4. En Authentication → Configuración → **Dominios autorizados**, añade el dominio de tu despliegue en Vercel (p. ej. `miapp.vercel.app`).
5. Ve a **Configuración del proyecto** → General → desplázate hasta "Tus apps" → haz clic en el icono web `</>` → registra la app → copia el objeto de configuración.

#### 3. Configurar variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores del config de Firebase:

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

# Opcional — Firebase App Check (reCAPTCHA v3)
VITE_RECAPTCHA_SITE_KEY=
```

#### 4. Desplegar las reglas de Firestore

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

O pega el contenido de `firestore.rules` directamente en Firebase Console → Firestore → Reglas.

#### 5. Arrancar en local

```bash
npm run dev
```

El primer usuario en registrarse se convierte en admin automáticamente.

#### 6. Desplegar en Vercel

```bash
npx vercel --prod
```

Añade todas las variables `VITE_FIREBASE_*` en **Vercel → Settings → Environment Variables**.

Para activar la API REST, añade también:

```
FIREBASE_SERVICE_ACCOUNT_B64=<JSON de cuenta de servicio de Firebase en base64>
```

Genera la clave de cuenta de servicio en Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada. Luego codifícala:

```bash
base64 -i serviceAccount.json | tr -d '\n'
```

---

### WorkGrid CLI

`public/workgrid-cli.html` es una herramienta standalone sin dependencias para interactuar con cualquier instancia de WorkGrid:

- Conéctate con URL + token Bearer
- Navega y filtra tareas por estado, prioridad o proyecto
- Avanza el estado de las tareas con verificación previa; doble confirmación para Producción
- Importa tareas en bloque desde texto estructurado
- La importación masiva soporta bloques multilínea explícitos con `<<INICIO>>` / `<<FIN>>`
- **Inspección dinámica del schema** — consulta `/schema` al conectar y adapta el manejo de campos automáticamente

Ábrelo directamente en el navegador (`file://`) o accede desde tu despliegue en `/workgrid-cli.html`.

---

### API REST

WorkGrid expone una API serverless en `/api/taller`.

#### Activar la API

Ve a **Configuración → Maestro de proyectos**, abre un proyecto y haz clic en **Generar token API**.  
Usa el token como `Authorization: Bearer <token>` en cada petición.

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/taller/schema` | Descubre campos y máquina de estados |
| `GET` | `/api/taller/tasks` | Lista tareas (filtra por `estado`, `projectId`, `tipo`, `prioridad`) |
| `GET` | `/api/taller/tasks/:id` | Obtiene una tarea |
| `POST` | `/api/taller/tasks` | Crea una tarea |
| `POST` | `/api/taller/tasks/:id/advance` | Avanza la tarea al siguiente estado |

---

### Privacidad

Este repositorio público no contiene datos personales:
- Sin secretos `.env` privados (solo `.env.example` con placeholders)
- Sin exportaciones ni backups de tareas personales
- La configuración de Firebase proviene únicamente de tus propias variables de entorno
