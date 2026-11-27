# Guía de Despliegue en Render — SILUT (Centro Cultural Lucy Tejada)

Esta guía explica paso a paso cómo publicar **SILUT** completo (Base de datos PostgreSQL + API NestJS + Frontend SPA React) en **Render** usando el archivo Blueprint `render.yaml` incluido en la raíz del repositorio.

---

## Paso 1: Subir el proyecto a GitHub

1. Inicializa el repositorio (si aún no está en Git) y sube los archivos a un repositorio de GitHub:
   ```bash
   git init
   git add .
   git commit -m "Entrega final Ingeniería de Software II - Plataforma GEA Lucy Tejada"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
   git push -u origin main
   ```

---

## Paso 2: Crear el Blueprint en Render (Automático con `render.yaml`)

1. Ingresa a [https://dashboard.render.com](https://dashboard.render.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **New +** → **Blueprint**.
3. Selecciona tu repositorio de GitHub.
4. Render detectará automáticamente el archivo `render.yaml`, que aprovisiona los 3 recursos:
   - **`silut-lucytejada-db`**: Base de datos gestionada **PostgreSQL** (`plan: free`).
   - **`silut-lucytejada-api`**: Servicio web **Node.js (NestJS)** con healthcheck en `/api/v1/health`, SSL habilitado contra PostgreSQL y carga automática de datos semilla (`AUTO_SEED=true`).
   - **`silut-lucytejada-web`**: Sitio estático **React + Vite** con regla de reescritura SPA (`/* → /index.html`) y enlace automático a `VITE_API_URL`.
5. Cuando Render solicite el valor de `CORS_ORIGIN`, puedes colocar inicialmente `*` o dejarlo en blanco (el backend ya acepta dominios `*.onrender.com` de forma segura) y luego, tras el despliegue, fijar la URL exacta del frontend (ej. `https://gea-lucytejada-web.onrender.com`).
6. Haz clic en **Apply** y espera 3–5 minutos mientras compilan ambos servicios.

---

## Paso 3: Verificación post-despliegue

1. **Healthcheck de la API**: abre `https://<tu-api>.onrender.com/api/v1/health`. Debe responder:
   ```json
   {
     "status": "ok",
     "services": { "database": "up", "cache": "memory-fallback" }
   }
   ```
2. **Documentación Swagger / OpenAPI**: abre `https://<tu-api>.onrender.com/api/docs`.
3. **Aplicación Web (Frontend)**: abre `https://<tu-web>.onrender.com`. Verás el catálogo en vivo con los **7 programas artísticos** y sus cupos cargados automáticamente desde PostgreSQL.

---

## Notas importantes para el plan gratuito de Render

- **Arranque en frío (cold start)**: los Web Services del plan gratuito de Render se suspenden tras 15 minutos de inactividad y tardan ~30 segundos en despertar en la primera petición. **Tip para la sustentación**: abre la URL 2 minutos antes de presentar ante el docente.
- **Redis opcional (Degradación controlada)**: Si en el futuro deseas conectar **Render Key Value (Redis)**, solo agrega la variable de entorno `REDIS_URL` en `gea-lucytejada-api`; el `CacheService` y `NotificacionesService` (BullMQ) se conectarán automáticamente sin cambiar código. Sin `REDIS_URL`, el sistema usa el modo degradado documentado en la Entrega 2 (caché en memoria con TTL + cola asíncrona en proceso).
- **Correo SMTP opcional**: Si deseas envío de correos reales (ej. Brevo, Resend o Gmail App Password), agrega las variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM` en el panel de Render. Sin ellas, el `SmtpMailAdapter` guarda cada correo en la bandeja interna del sistema (`notificacion`) para poder demostrar EST-03 y EST-06 en la sustentación.
