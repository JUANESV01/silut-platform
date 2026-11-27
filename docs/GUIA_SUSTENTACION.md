# Guía de Sustentación — Entrega Final Ingeniería de Software II (UTP)

Este guión de 10 minutos permite demostrar en vivo ante el docente **Guillermo Roberto Solarte Martínez** que el sistema construido cumple 100% con los documentos de Visión y Alcance (Entrega 1), Diseño de Arquitectura C4/ADD/ATAM/Patrones (Entrega 2) y el análisis GEA/Canvas.

---

## Guión de Demostración en Vivo

### 1. Identidad SILUT, Barra Lateral, Oferta Pública y Términos (1 min)
- Abre la URL desplegada en Render (`https://<tu-web>.onrender.com`).
- Destaca la estética sobria en blancos con el logotipo corporativo **SILUT**, la **barra lateral izquierda desplegable** y los **7 programas oficiales** del Centro Cultural Lucy Tejada con cupos en vivo desde PostgreSQL.
- Ingresa al apartado dedicado de **Términos y Privacidad** (`/terminos`) mostrando el cumplimiento de la **Ley 1581 de 2012** y la protección reforzada de menores.
- Demuestra el flujo de **Recuperación de contraseña** (`/recuperar-clave`) y **Seguridad y Clave** (`/seguridad`).

### 2. Registro de Menor de Edad, Ley 1581 y Primer Acceso (2 min)
- Ve a `/registro`, ingresa una fecha de nacimiento de menor de 18 años (ej. `2013-05-10`) y muestra cómo aparecen automáticamente los campos obligatorios de **Acudiente / Representante Legal** (ATAM S5 / Sec. 2.6).
- Completa el registro -> muestra la **clave temporal emitida** (EST-03) -> inicia sesión con ella -> el sistema bloquea la navegación y exige **cambio obligatorio de contraseña** con política de complejidad.

### 3. Portal Estudiante e Inscripción Transaccional (1.5 min)
- Inicia sesión como `estudiante@lucytejada.pereira.gov.co`.
- Muestra **Mi Formación (EST-04)**: matrícula, docente, salón, horarios, asistencia y evaluación cualitativa (sin notas numéricas, respetando exclusión de alcance).
- Realiza una matrícula en **Inscribirme en Programas (EST-02)** explicando el patrón **Chain of Responsibility** + bloqueo pesimista `FOR UPDATE` (R13).
- Abre la pestaña **Notificaciones (EST-06)** mostrando el correo generado por el patrón **Observer**.

### 4. Portal Educador: Asistencia y Evaluación Cualitativa (1.5 min)
- Inicia sesión como `educador@lucytejada.pereira.gov.co`.
- Muestra **Control de Asistencia (EDU-03)**, la validación contra fechas futuras y el **Reporte de Asistencia (EDU-04)** resaltando estudiantes en riesgo de deserción (≥ 3 inasistencias seguidas).
- Registra una **Evaluación Cualitativa (EDU-05)** sobre un indicador del programa Danza.

### 5. Portal Administrativo: 6 Dashboards, Mapa Pereira, Reportes y Migración (2.5 min)
- Inicia sesión como `coordinacion@lucytejada.pereira.gov.co`.
- Recorre los **6 Dashboards Interactivos (ADM-05)** haciendo énfasis en el **Dashboard Geográfico con Mapa Interactivo de Pereira**, el **Dashboard de Deserción** (2026-2 vs 2026-1) y el indicador de caché (`TTL 5 min` + invalidación automática por evento).
- Ve a **Matriculados y Reportes (ADM-02/03/04)**: aplica filtros combinados (programa + barrio + género) y exporta en **XLSX**, **PDF** y **CSV** explicando **ReportFacade + Strategy + Factory Method** (ATAM M3 y R4).
- Ve a **Programas y Migración**: muestra creación de un nuevo programa sin cambiar código (ATAM **M1**) y el flujo *dry-run* de **Migración Alcaldía** con detección de duplicados y alerta **R05 (>2%)**.

### 6. Administración, Seguridad, 2FA, Auditoría y Pruebas (1.5 min)
- Inicia sesión como `admin@lucytejada.pereira.gov.co`.
- Muestra **Pistas de Auditoría** con el rastro de todos los logins y cambios recién realizados en la demo.
- Muestra la configuración de **2FA (TOTP con QR)** y el endpoint `/api/v1/health`.
- Abre **Swagger** (`/api/docs`) y muestra los resultados de las **pruebas unitarias automatizadas** (`npm test`) sin base de datos real (ATAM **T1**).
