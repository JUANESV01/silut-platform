# SILUT · Sistema de Información Institucional — Centro Cultural Lucy Tejada (Pereira)

Entrega final de **Ingeniería de Software II** — Universidad Tecnológica de Pereira (UTP).
Integrantes: **Miguel Angel Florian Gonzalez**, **Juan Esteban Villegas Montoya**, **Nicolas Botero Yee**.

---

## 1. Arquitectura y Stack Tecnológico (Fiel a la Entrega 2)

El sistema implementa la arquitectura definida en el documento **Diseño de Arquitectura (Entrega 2)**: un **Monolito Modular en Capas** con **NestJS (TypeScript)** sobre Express, **React + TypeScript + Tailwind CSS (SPA)**, **PostgreSQL 16 (TypeORM)** y **Redis + BullMQ** con **táctica de degradación controlada** (si Redis o SMTP no están configurados, el sistema opera con caché en memoria con TTL, cola asíncrona en proceso y bandeja interna en base de datos sin interrumpir el servicio).

```text
silut/
├── backend/                     # API REST NestJS + TypeORM + Swagger (/api/docs)
│   └── src/
│       ├── auth/                # JWT + Refresh Cookie HttpOnly + 2FA TOTP + Bloqueo fuerza bruta + ADM-01
│       ├── estudiantes/         # EST-01, EST-03, EST-04, EST-05 + Menores Ley 1581 + Propiedad (ATAM S1)
│       ├── programas/           # 7 programas, indicadores cualitativos, salones, grupos y horarios (M1)
│       ├── inscripciones/       # EST-02 Chain of Responsibility + bloqueo pesimista FOR UPDATE (R13) + ADM-02/03
│       ├── asistencia/          # EDU-03/04 lotes atómicos + alerta temprana de deserción (≥3 faltas)
│       ├── evaluacion/          # EDU-05 evaluación cualitativa por indicadores institucionales
│       ├── reportes/            # ADM-04 Facade + Strategy/Factory (XLSX, PDF, CSV) + trabajos asíncronos (202)
│       ├── dashboards/          # ADM-05 6 Dashboards interactivos + Proxy caché (TTL 5m) + invalidación por evento
│       ├── notificaciones/      # EST-06 Patrón Observer (EventEmitter2) + MailAdapter (SMTP / Simulado)
│       ├── auditoria/           # Pistas de auditoría de accesos exitosos/fallidos, 403 y CRUD
│       ├── migracion/           # Carga masiva CSV desde Alcaldía de Pereira con dry-run y alerta R05 (>2%)
│       ├── health/              # GET /api/v1/health (ping/eco para Render y balanceador)
│       ├── common/              # Guards globales (denegar por defecto), RolesGuard, AuditInterceptor, CacheService
│       └── database/            # 16 tablas (Figura 7 Entrega 2) + SeedService automático de Pereira
├── frontend/                    # SPA React 18 + Vite + TypeScript + Tailwind CSS (WCAG 2.1 AA)
│   └── src/
│       ├── api/                 # Cliente Axios centralizado con renovación de token
│       ├── context/             # Gestor de sesión y roles
│       ├── components/          # Biblioteca UI accesible (<dialog>, LegalModal, MFA, PereiraMap Leaflet)
│       └── pages/               # Landing, Login, Registro, Estudiante, Educador, 6 Dashboards, Reportes, Gestión, Admin
├── docs/                        # Manual de Usuario, Guía de Despliegue en Render y Guía de Sustentación
├── render.yaml                  # Blueprint de despliegue automático en Render (PostgreSQL + API + Static SPA)
├── docker-compose.yml           # Entorno completo local (PostgreSQL + Redis + Mailpit + Backend + Frontend)
└── .github/workflows/ci.yml     # Pipeline CI (build y tests automatizados)
```

---

## 2. Cobertura de Requerimientos y Patrones de Diseño

| Requisito / ATAM | Implementación en el código |
|---|---|
| **EST-01 / EST-03** | Registro con catálogo normalizado de barrios de Pereira, detección automática de menores (< 18 años) con datos del acudiente y consentimiento **Ley 1581/2012**, emisión de clave temporal y cambio obligatorio en primer ingreso. |
| **EST-02 / R13** | **Chain of Responsibility** (`ValidadorDuplicado → ValidadorRequisitos → ValidadorCupo`) dentro de transacción PostgreSQL con `SELECT ... FOR UPDATE` para impedir sobreventa de cupos. |
| **EST-04 / EST-05 / EST-06** | Consulta de matrícula, docente, salón, horarios, asistencia y progreso cualitativo; actualización autónoma de residencia/contacto; bandeja de notificaciones con patrón **Observer**. |
| **EDU-01 a EDU-05** | Grupos asignados al educador, registro de asistencia en lote (bloquea fechas futuras y grupos ajenos), reporte consolidado con alerta por ≥ 3 faltas consecutivas y evaluación cualitativa por indicador. |
| **ADM-01 a ADM-04** | Gestión de usuarios y roles, directorio con filtros avanzados (programa, grupo, barrio, comuna, ciudad, género, estado) y exportación asíncrona (`POST /reportes` -> `202`) mediante **ReportFacade + Strategy/Factory** en **XLSX, PDF y CSV**. |
| **ADM-05 (6 Dashboards)** | **Matrícula**, **Geográfico (Mapa interactivo Leaflet de Pereira)**, **Asistencia**, **Evaluaciones**, **Programas** y **Deserción** (comparativa 2026-2 vs 2026-1), servidos con **Proxy de caché** e invalidación por evento. |
| **Seguridad (S1–S5)** | Guard global de denegar por defecto (RK-1), RBAC (`@Roles`), verificación de propiedad (403 + auditoría en S1), bloqueo tras 5 intentos fallidos en 15 min (S2), hash `bcryptjs` (cost 12), **recuperación segura de contraseña** (`/recuperar-clave`), **cambio voluntario y obligatorio de clave** (`/seguridad`), **2FA TOTP (QR)**, Helmet, rate limiting y **logs sanitizados** (`secure-logger.ts`). |
| **UX, Marca y Legal** | Estética sobria en tema claro (blancos + colores corporativos del logotipo oficial **SILUT**: Azul Zafiro `#1B365D` y Dorado Cultural `#B47B2B`), **barra lateral izquierda desplegable**, carga rápida con *code-splitting* (`React.lazy`) y página dedicada de **Términos, Condiciones y Privacidad** (`/terminos`, Ley 1581/2012). |
| **Modificabilidad (M1)** | Creación de nuevos programas, indicadores cualitativos, salones y grupos desde la interfaz sin tocar código. |
| **Migración Alcaldía (R05)** | Descarga de plantilla CSV, validación previa (*dry-run*) con cálculo de tasa de rechazo y alerta si supera el 2%, e importación en lote. |

---

## 3. Cuentas de Demostración (Datos Semilla de Pereira)

Al iniciar el backend con `AUTO_SEED=true` sobre una base de datos vacía, se cargan automáticamente los **7 programas oficiales** del Centro Cultural Lucy Tejada, 7 salones, 7 educadores, 35 estudiantes distribuidos por barrios/comunas de Pereira (incluyendo menores con acudientes), 11 grupos (2026-2 y 2026-1), sesiones de asistencia y evaluaciones cualitativas:

| Rol | Correo | Contraseña |
|---|---|---|
| **Administrador del Sistema** | `admin@lucytejada.pereira.gov.co` | `Admin2026*` |
| **Personal Administrativo / Dirección** | `coordinacion@lucytejada.pereira.gov.co` | `Coord2026*` |
| **Educador (Danza)** | `educador@lucytejada.pereira.gov.co` | `Educador2026*` |
| **Estudiante** | `estudiante@lucytejada.pereira.gov.co` | `Estudiante2026*` |

---

## 4. Despliegue en Render y Ejecución Local

### Opción A: Despliegue en Render (Recomendado para entrega y sustentación)
Consulta la guía detallada en [docs/DESPLIEGUE_RENDER.md](docs/DESPLIEGUE_RENDER.md). El repositorio incluye el archivo `render.yaml` listo para crear en un clic la base de datos PostgreSQL, la API NestJS y el Frontend React.

### Opción B: Ejecución local con Docker Compose
```bash
docker compose up --build
```
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3000/api/v1`
- Documentación OpenAPI / Swagger: `http://localhost:3000/api/docs`
- Bandeja SMTP local (Mailpit): `http://localhost:8025`

### Opción C: Desarrollo local sin Docker
1. Configura `backend/.env` (ver `backend/.env.example`) apuntando a tu PostgreSQL local o remoto.
2. Backend: `cd backend && npm install && npm run start:dev`
3. Frontend: `cd frontend && npm install && npm run dev`

### Ejecutar pruebas automatizadas
```bash
# Backend (Jest sin base de datos real — escenario ATAM T1)
cd backend && npm test && npm run test:cov

# Frontend (Vitest)
cd frontend && npm test
```

---

## 5. Documentación Adicional
- [Guía de Despliegue en Render](docs/DESPLIEGUE_RENDER.md)
- [Manual de Usuario por Rol](docs/MANUAL_USUARIO.md)
- [Guía de Sustentación — Ingeniería de Software II](docs/GUIA_SUSTENTACION.md)
