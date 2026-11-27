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

## Opción alternativa recomendada para BD: PostgreSQL en Neon (sin vencimiento de 30 días + múltiples bases/ramas)

En el plan gratuito de Render la base de datos PostgreSQL caduca a los 30 días. Si prefieres **Neon** (`neon.tech`, PostgreSQL 16 gratuito permanente y con soporte para múltiples bases de datos o ramas `staging` y `producción` en el mismo proyecto):

1. Crea un proyecto gratuito en [https://console.neon.tech](https://console.neon.tech) (por ejemplo `silut-lucytejada`).
2. Puedes crear varias bases de datos o ramas (ej. `silut_prod` y `silut_staging`) dentro del mismo proyecto Neon sin costo.
3. Copia la cadena de conexión **Pooled connection string** de Neon:
   ```text
   postgresql://neondb_owner:TU_CLAVE@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. En **Render** → servicio `silut-lucytejada-api` → **Environment**:
   - Reemplaza `DATABASE_URL` por la cadena de Neon.
   - Verifica que `DB_SSL=true`, `DB_SYNCHRONIZE=true` y `AUTO_SEED=true` estén activos.
5. Guarda y reinicia el servicio: SILUT creará automáticamente las 16 tablas y sembrará los datos iniciales y las cuentas de **Juan, Miguel y Nicolás** (con cambio obligatorio de clave).

---

## Notas importantes para el plan gratuito de Render

- **Arranque en frío (cold start)**: los Web Services del plan gratuito de Render se suspenden tras 15 minutos de inactividad y tardan ~30 segundos en despertar en la primera petición. **Tip para la sustentación**: abre la URL 2 minutos antes de presentar ante el docente.
- **Redis opcional (Degradación controlada)**: Si en el futuro deseas conectar **Render Key Value (Redis)**, solo agrega la variable de entorno `REDIS_URL` en `gea-lucytejada-api`; el `CacheService` y `NotificacionesService` (BullMQ) se conectarán automáticamente sin cambiar código. Sin `REDIS_URL`, el sistema usa el modo degradado documentado en la Entrega 2 (caché en memoria con TTL + cola asíncrona en proceso).
- **Correo SMTP opcional**: Si deseas envío de correos reales (ej. Brevo, Resend o Gmail App Password), agrega las variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM` en el panel de Render. Sin ellas, el `SmtpMailAdapter` guarda cada correo en la bandeja interna del sistema (`notificacion`) para poder demostrar EST-03 y EST-06 en la sustentación.
