# Manual de Usuario Operativo · SILUT (Centro Cultural Lucy Tejada)

Este manual cubre los flujos operativos de cada rol institucional, la navegación con barra lateral desplegable, la recuperación/cambio de contraseña y el apartado de Términos y Condiciones.

## Navegación General y Seguridad de Cuenta (Todos los Roles)
- **Barra lateral izquierda desplegable**: permite acceder con un clic a la Oferta Formativa, los módulos de tu rol, **Seguridad y Clave** (`/seguridad`) y **Términos y Privacidad** (`/terminos`). En escritorio puedes contraerla o expandirla; en celular se abre como menú deslizante.
- **Recuperar contraseña**: si olvidaste tu clave, ingresa a **¿Olvidaste tu contraseña?** en el Login (`/recuperar-clave`), solicita el código temporal de 6 dígitos (vigencia 15 min) y define una nueva clave segura.
- **Cambiar contraseña y 2FA**: desde **Seguridad y Clave** en la barra lateral, cualquier usuario autenticado puede cambiar su contraseña actual y activar la verificación en dos pasos (TOTP con QR).

---

## 1. Estudiante y Acudiente

### 1.1 Registro inicial y autorización Ley 1581 (EST-01 / EST-03)
1. Desde la página principal, haz clic en **Inscribirme** o **Registrarme e inscribirme**.
2. Diligencia tus datos personales y selecciona tu **Barrio de Pereira** (la comuna y geolocalización se asignan automáticamente).
3. Si la fecha de nacimiento corresponde a un **menor de 18 años**, el formulario desplegará obligatoriamente la sección de **Acudiente / Representante Legal** conforme a la Ley 1581 de 2012.
4. Revisa el **Aviso de Privacidad y Términos de Uso** y marca la casilla de autorización.
5. Al confirmar, el sistema emite tu usuario y **contraseña temporal**. En tu primer ingreso deberás definir una contraseña personal robusta (mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial).

### 1.2 Consulta académica, inscripción y perfil (EST-02, EST-04, EST-05, EST-06)
- **Mi Formación y Progreso**: consulta tus grupos activos, formador, salón físico, horarios, porcentaje de asistencia y evaluación cualitativa por cada indicador del programa.
- **Inscribirme en Programas**: explora los 7 programas oficiales con cupos en tiempo real y matricúlate en un clic (el sistema valida edad, requisitos y cupo de forma atómica).
- **Mi Perfil y Seguridad**: actualiza teléfono, dirección y barrio autónomamente y activa 2FA (TOTP) si lo deseas.
- **Notificaciones**: consulta avisos de matrícula, cambios de horario, evaluaciones y alertas de asistencia.

---

## 2. Educador (Formador Artístico)

1. Inicia sesión con tus credenciales docentes (`educador@lucytejada.pereira.gov.co`).
2. Selecciona el grupo asignado en el selector superior (**EDU-02**).
3. **Control de Asistencia (EDU-03)**: crea o selecciona la fecha de la jornada (el sistema bloquea fechas futuras), marca **Presente / Ausente / Excusado** y guarda en lote.
4. **Reporte de Asistencia (EDU-04)**: consulta el consolidado porcentual del grupo e identifica alertas de estudiantes con ≥ 3 inasistencias consecutivas.
5. **Evaluación Cualitativa (EDU-05)**: selecciona estudiante, indicador institucional del programa y nivel cualitativo (`Inicial`, `En Proceso`, `Destacado`, `Sobresaliente`) junto con la observación pedagógica.

---

## 3. Personal Administrativo y Dirección

1. Inicia sesión con credenciales administrativas (`coordinacion@lucytejada.pereira.gov.co`).
2. **6 Dashboards Interactivos (ADM-05)**: navega entre **Matrícula**, **Geográfico (Mapa interactivo de Pereira)**, **Asistencia**, **Evaluaciones**, **Programas** y **Deserción**. Puedes pulsar **Recalcular ahora** para refrescar la caché manualmente.
3. **Matriculados y Reportes (ADM-02, ADM-03, ADM-04)**: segmenta por programa, grupo, barrio/comuna de Pereira, ciudad de origen, género o búsqueda libre, y exporta en **XLSX**, **PDF** o **CSV** sin bloquear la pantalla.
4. **Programas y Migración (Sec. 2.6 / R05)**:
   - Crea nuevos programas con sus indicadores cualitativos sin modificar código.
   - Crea salones y grupos con horarios (el sistema valida automáticamente cruces de salón o educador).
   - Descarga la plantilla CSV de la Alcaldía, valida el lote (*Dry-run*) y ejecuta la importación masiva.

---

## 4. Administrador del Sistema

1. Inicia sesión con credenciales de administrador (`admin@lucytejada.pereira.gov.co`).
2. **Usuarios y Roles (ADM-01)**: crea cuentas institucionales o docentes, asigna roles y revoca o reactiva accesos inmediatamente.
3. **Pistas de Auditoría**: filtra eventos por acción (`LOGIN_EXITOSO`, `LOGIN_FALLIDO`, `ACCESO_NO_AUTORIZADO_ESTUDIANTE`, `CREAR_INSCRIPCION`, etc.), correo y estado; monitorea intentos fallidos de las últimas 24 horas.
4. **Mi 2FA (MFA)**: activa la autenticación en dos factores escaneando el código QR con Google Authenticator o Authy.
5. **Estado del Servicio**: supervisa la salud en vivo de PostgreSQL, caché y tiempo de actividad (`/api/v1/health`).
