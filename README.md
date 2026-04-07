# WorkGrid

WorkGrid is a simple multi-project task board (React + Firebase).

[![Donate with PayPal](https://img.shields.io/badge/Donate-PayPal-00457C?logo=paypal&logoColor=white)](https://www.paypal.com/donate/?business=josejcoy%40gmail.com&currency_code=EUR&item_name=Support%20WorkGrid)

If WorkGrid helps you, consider supporting development via PayPal: **josejcoy@gmail.com**.

---

## Screenshots

### Dashboard (anonymized)
![WorkGrid Dashboard](./secreenshot1.png)

### Project Board (anonymized)
![WorkGrid Project Board](./secreenshot2.png)

---

## English (ELI5)

### What is WorkGrid?
Think of WorkGrid like a digital whiteboard:
- You create projects.
- Inside each project, you create tasks.
- Tasks move across columns (Pending, In Progress, Testing, Production).

### What do I need before I start?
1. Node.js installed (LTS version).
2. A Firebase project (free tier is fine).
3. This repository downloaded/cloned.

### Install (super simple)
1. Open a terminal in the project folder.
2. Install packages:

```bash
npm install
```

3. Create a local env file from the template:
- Copy `.env.example` to `.env.local`
- Fill your Firebase values in `.env.local`

Example keys you must fill:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

4. Start the app:

```bash
npm run dev
```

5. Open the URL shown in terminal (usually `http://localhost:5173`).

### Build for production

```bash
npm run build
```

### Important privacy note
This public repo is sanitized:
- No personal task dumps.
- No private `.env` secrets.
- Firebase config comes from your own env vars.

---

## Español (ELI5)

### ¿Qué es WorkGrid?
Piensa en WorkGrid como una pizarra digital:
- Creas proyectos.
- Dentro de cada proyecto, creas tareas.
- Las tareas se mueven por columnas (Pendiente, En Desarrollo, Pruebas, Producción).

### ¿Qué necesito antes de empezar?
1. Node.js instalado (versión LTS).
2. Un proyecto en Firebase (vale el plan gratis).
3. Este repositorio descargado/clonado.

### Instalación (muy fácil)
1. Abre una terminal en la carpeta del proyecto.
2. Instala dependencias:

```bash
npm install
```

3. Crea tu archivo de entorno local desde la plantilla:
- Copia `.env.example` a `.env.local`
- Rellena tus valores de Firebase en `.env.local`

Claves que debes rellenar:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

4. Arranca la app:

```bash
npm run dev
```

5. Abre la URL que salga en terminal (normalmente `http://localhost:5173`).

### Build para producción

```bash
npm run build
```

### Nota importante de privacidad
Este repo público está saneado:
- Sin exportaciones de tareas personales.
- Sin secretos privados (`.env`).
- La configuración Firebase la pones tú con tus variables de entorno.

---

## Install With AI (Step by Step)
You can install WorkGrid end-to-end with an AI assistant like ChatGPT/Codex.

1. Ask the AI to prepare your local setup.
Example: "Help me install WorkGrid on Windows/Mac/Linux."

2. Ask it to check prerequisites.
- Node.js version
- npm available
- Git available

3. Ask it to install dependencies.
```bash
npm install
```

4. Ask it to create your env file from template.
- Copy `.env.example` to `.env.local`
- Fill Firebase values

5. Ask it to validate your Firebase config.
- Auth enabled (Google)
- Firestore created
- Rules/deploy status checked

6. Ask it to run the project locally.
```bash
npm run dev
```

7. Ask it to verify login + first admin bootstrap.
- First user should be admin (fresh database)

8. Ask it to build before publish.
```bash
npm run build
```

9. Ask it to deploy.
- Vercel/Firebase Hosting (your choice)
- Confirm production URL

---

## Instálalo Con IA (Paso a Paso)
Puedes instalar WorkGrid de principio a fin con un asistente de IA como ChatGPT/Codex.

1. Pide a la IA que te guíe en la instalación local.
Ejemplo: "Ayúdame a instalar WorkGrid en Windows/Mac/Linux."

2. Pídele que valide requisitos.
- Versión de Node.js
- npm disponible
- Git disponible

3. Pídele instalar dependencias.
```bash
npm install
```

4. Pídele crear tu archivo de entorno desde la plantilla.
- Copiar `.env.example` a `.env.local`
- Rellenar variables de Firebase

5. Pídele validar configuración de Firebase.
- Auth habilitado (Google)
- Firestore creado
- Reglas/deploy revisados

6. Pídele arrancar el proyecto local.
```bash
npm run dev
```

7. Pídele comprobar login + admin inicial.
- El primer usuario debe quedar como admin (base de datos nueva)

8. Pídele compilar antes de publicar.
```bash
npm run build
```

9. Pídele desplegar.
- Vercel/Firebase Hosting (lo que prefieras)
- Confirmar URL de producción
