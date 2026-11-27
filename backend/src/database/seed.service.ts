import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Asistencia,
  Auditoria,
  Educador,
  Estudiante,
  Evaluacion,
  Grupo,
  Horario,
  IndicadorEvaluacion,
  Inscripcion,
  Notificacion,
  Programa,
  Rol,
  Salon,
  Sesion,
  Usuario,
} from './entities';
import {
  ConceptoEvaluacion,
  EstadoAsistencia,
  EstadoEnvioNotificacion,
  EstadoInscripcion,
  RoleName,
} from '../common/enums';
import { BARRIOS_PEREIRA } from '../common/catalogs/pereira.catalog';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Rol) private readonly rolRepo: Repository<Rol>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Salon) private readonly salonRepo: Repository<Salon>,
    @InjectRepository(Programa) private readonly programaRepo: Repository<Programa>,
    @InjectRepository(IndicadorEvaluacion) private readonly indicadorRepo: Repository<IndicadorEvaluacion>,
    @InjectRepository(Educador) private readonly educadorRepo: Repository<Educador>,
    @InjectRepository(Estudiante) private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(Grupo) private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(Horario) private readonly horarioRepo: Repository<Horario>,
    @InjectRepository(Inscripcion) private readonly inscripcionRepo: Repository<Inscripcion>,
    @InjectRepository(Sesion) private readonly sesionRepo: Repository<Sesion>,
    @InjectRepository(Asistencia) private readonly asistenciaRepo: Repository<Asistencia>,
    @InjectRepository(Evaluacion) private readonly evaluacionRepo: Repository<Evaluacion>,
    @InjectRepository(Notificacion) private readonly notificacionRepo: Repository<Notificacion>,
    @InjectRepository(Auditoria) private readonly auditoriaRepo: Repository<Auditoria>,
  ) {}

  async onApplicationBootstrap() {
    const autoSeed = this.configService.get<string>('AUTO_SEED');
    if (autoSeed === 'false') return;
    try {
      await this.seedIfEmpty();
    } catch (err) {
      this.logger.warn(`Auto-seed omitido: ${(err as Error).message}`);
    }
  }

  async seedIfEmpty(): Promise<{ seeded: boolean; message: string }> {
    const existingUsers = await this.usuarioRepo.count();
    if (existingUsers > 0) {
      this.logger.log('Base de datos ya inicializada; omitiendo seed.');
      return { seeded: false, message: 'Ya existen datos iniciales' };
    }

    this.logger.log('Inicializando datos semilla del Centro Cultural Lucy Tejada (Pereira)...');

    // 1. Roles
    const rolesData = [
      { nombre: RoleName.ADMINISTRADOR, descripcion: 'Administrador del sistema, usuarios, roles y auditoría' },
      { nombre: RoleName.ADMINISTRATIVO, descripcion: 'Personal administrativo y dirección del Centro Cultural' },
      { nombre: RoleName.EDUCADOR, descripcion: 'Formador artístico con gestión de grupos, asistencia y evaluación' },
      { nombre: RoleName.ESTUDIANTE, descripcion: 'Estudiante inscrito en programas formativos del Centro' },
    ];
    const rolesMap = new Map<RoleName, Rol>();
    for (const r of rolesData) {
      const saved = await this.rolRepo.save(this.rolRepo.create(r));
      rolesMap.set(r.nombre, saved);
    }

    // 2. Usuarios administrativos y administrador
    const hashAdmin = await bcrypt.hash('Admin2026*', 10);
    const hashCoord = await bcrypt.hash('Coord2026*', 10);
    const hashEdu = await bcrypt.hash('Educador2026*', 10);
    const hashEst = await bcrypt.hash('Estudiante2026*', 10);

    const adminUser = await this.usuarioRepo.save(
      this.usuarioRepo.create({
        correo: 'admin@lucytejada.pereira.gov.co',
        hashClave: hashAdmin,
        debeCambiarClave: false,
        activo: true,
        roles: [rolesMap.get(RoleName.ADMINISTRADOR)!],
      }),
    );

    await this.usuarioRepo.save(
      this.usuarioRepo.create({
        correo: 'coordinacion@lucytejada.pereira.gov.co',
        hashClave: hashCoord,
        debeCambiarClave: false,
        activo: true,
        roles: [rolesMap.get(RoleName.ADMINISTRATIVO)!],
      }),
    );

    // 3. Salones físicos del Centro Cultural Lucy Tejada
    const salonesSpec = [
      { nombre: 'Salón de Danza 201', ubicacion: 'Piso 2 · Ala Norte', capacidad: 28 },
      { nombre: 'Sala de Teatro Lucy Tejada', ubicacion: 'Piso 1 · Auditorio Menor', capacidad: 25 },
      { nombre: 'Aula de Cuerdas Pulsadas 302', ubicacion: 'Piso 3 · Escuela de Música', capacidad: 20 },
      { nombre: 'Salón Sinfónico 305', ubicacion: 'Piso 3 · Ala Sur', capacidad: 30 },
      { nombre: 'Patio Acústico Banda Marcial', ubicacion: 'Plazoleta Interna · Nivel 1', capacidad: 35 },
      { nombre: 'Sala Coral 308', ubicacion: 'Piso 3 · Escuela de Música', capacidad: 30 },
      { nombre: 'Taller de Artes Visuales 104', ubicacion: 'Piso 1 · Laboratorio Creativo', capacidad: 22 },
    ];
    const salones: Salon[] = [];
    for (const s of salonesSpec) {
      salones.push(await this.salonRepo.save(this.salonRepo.create(s)));
    }

    // 4. Los 7 Programas Formativos oficiales + 4 indicadores cualitativos cada uno
    const programasSpec = [
      {
        nombre: 'Danza',
        descripcion: 'Formación en danza folclórica colombiana, contemporánea y expresión corporal.',
        requisitos: 'Edad mínima 7 años, ropa cómoda para movimiento y compromiso de asistencia semanal.',
        edadMinima: 7,
        indicadores: [
          ['Expresión Corporal y Ritmo', 'Coordina movimiento corporal con pulso musical y sentido escénico.'],
          ['Técnica y Postura', 'Aplica alineación corporal, equilibrio y pasos base del repertorio.'],
          ['Trabajo en Ensamble', 'Se integra armónicamente en montajes coreográficos grupales.'],
          ['Apropiación Cultural', 'Reconoce el valor patrimonial de las danzas tradicionales y contemporáneas.'],
        ],
      },
      {
        nombre: 'Teatro',
        descripcion: 'Exploración actoral, improvisación, técnica vocal y puesta en escena.',
        requisitos: 'Edad mínima 8 años, disposición para trabajo colaborativo y lectura dramática.',
        edadMinima: 8,
        indicadores: [
          ['Proyección Vocal y Dicción', 'Articula con claridad y controla la respiración en escena.'],
          ['Construcción de Personaje', 'Explora intenciones, gestualidad y verdad escénica en sus roles.'],
          ['Improvisación y Creatividad', 'Responde con agilidad y escucha activa ante propuestas escénicas.'],
          ['Disciplina de Montaje', 'Cumple ensayos, trazos escénicos y acuerdos colectivos.'],
        ],
      },
      {
        nombre: 'Cuerdas Pulsadas',
        descripcion: 'Interpretación de tiple, bandola, guitarra acústica y repertorio andino colombiano.',
        requisitos: 'Edad mínima 8 años; preferible instrumento propio para práctica en casa.',
        edadMinima: 8,
        indicadores: [
          ['Técnica Instrumental', 'Ejecuta digitación, pulsación y afinación con precisión progresiva.'],
          ['Lectura Musical', 'Interpreta partituras, cifrados y figuras rítmicas del nivel.'],
          ['Repertorio Andino', 'Apropia bambucos, pasillos y piezas tradicionales con musicalidad.'],
          ['Práctica de Ensamble', 'Mantiene tempo y balance sonoro junto a otros instrumentistas.'],
        ],
      },
      {
        nombre: 'Cuerdas Sinfónicas',
        descripcion: 'Violín, viola, violonchelo y contrabajo con enfoque de orquesta juvenil.',
        requisitos: 'Edad mínima 7 años y disponibilidad para ensayo parcial y ensayo general.',
        edadMinima: 7,
        indicadores: [
          ['Manejo del Arco y Sonido', 'Produce tono limpio y controla articulaciones básicas del arco.'],
          ['Afinación y Oído Musical', 'Identifica y corrige alturas con precisión auditiva.'],
          ['Lectura a Primera Vista', 'Descifra notación musical, dinámicas y compases propios del nivel.'],
          ['Desempeño Orquestal', 'Sigue indicaciones de dirección y empaste con su fila.'],
        ],
      },
      {
        nombre: 'Banda Músico Marcial',
        descripcion: 'Percusión marcial, vientos bronce/madera y desplazamientos coreográficos.',
        requisitos: 'Edad mínima 10 años y disposición para presentaciones cívicas en Pereira.',
        edadMinima: 10,
        indicadores: [
          ['Precisión Rítmica y Cadencia', 'Mantiene pulso estable en marcha y ejecuciones percusivas.'],
          ['Técnica de Viento / Percusión', 'Controla embocadura, baqueteo y proyección sonora.'],
          ['Formación y Desplazamiento', 'Ejecuta alineaciones y movimientos sincronizados en conjunto.'],
          ['Sentido de Pertenencia', 'Demuestra puntualidad, cuidado instrumental y respeto grupal.'],
        ],
      },
      {
        nombre: 'Coros',
        descripcion: 'Técnica vocal colectiva, polifonía infantil, juvenil y repertorio coral latinoamericano.',
        requisitos: 'Edad mínima 6 años; no requiere experiencia previa.',
        edadMinima: 6,
        indicadores: [
          ['Técnica Vocal y Respiración', 'Aplica apoyo diafragmático y colocación vocal saludable.'],
          ['Afinación Coral', 'Sostiene su línea melódica en obras al unísono y a varias voces.'],
          ['Empaste y Escucha Activa', 'Equilibra su volumen y timbre con el resto de la cuerda.'],
          ['Expresividad Interpretativa', 'Transmite matices, fraseo y sentido poético del repertorio.'],
        ],
      },
      {
        nombre: 'Laboratorio de Artes Visuales',
        descripcion: 'Dibujo, pintura, grabado, fotografía experimental y escultura contemporánea.',
        requisitos: 'Edad mínima 7 años; ganas de explorar técnicas plásticas y visuales.',
        edadMinima: 7,
        indicadores: [
          ['Exploración de Técnicas y Materiales', 'Experimenta con dominio creciente en dibujo, color y volumen.'],
          ['Composición y Lenguaje Visual', 'Organiza elementos plásticos con intención estética clara.'],
          ['Proceso Creativo y Bitácora', 'Documenta bocetos, referentes e ideas de obra personal.'],
          ['Reflexión Crítica', 'Participa constructivamente en socializaciones y exposiciones.'],
        ],
      },
    ];

    const programas: Programa[] = [];
    const indicadoresPorPrograma = new Map<string, IndicadorEvaluacion[]>();

    for (const pSpec of programasSpec) {
      const prog = await this.programaRepo.save(
        this.programaRepo.create({
          nombre: pSpec.nombre,
          descripcion: pSpec.descripcion,
          requisitos: pSpec.requisitos,
          edadMinima: pSpec.edadMinima,
          activo: true,
        }),
      );
      programas.push(prog);
      const inds: IndicadorEvaluacion[] = [];
      for (let i = 0; i < pSpec.indicadores.length; i++) {
        const [nombre, descripcion] = pSpec.indicadores[i];
        inds.push(
          await this.indicadorRepo.save(
            this.indicadorRepo.create({
              programaId: prog.id,
              nombre,
              descripcion,
              orden: i + 1,
              activo: true,
            }),
          ),
        );
      }
      indicadoresPorPrograma.set(prog.id, inds);
    }

    // 5. 7 Educadores (uno por disciplina)
    const educadoresSpec = [
      { correo: 'educador@lucytejada.pereira.gov.co', doc: '1088100001', nom: 'Carolina', ape: 'Valencia Ríos', esp: 'Danza Folclórica y Contemporánea', tel: '3104451101' },
      { correo: 'teatro.docente@lucytejada.pereira.gov.co', doc: '1088100002', nom: 'Andrés Felipe', ape: 'Marín Toro', esp: 'Dirección y Actuación Teatral', tel: '3114451102' },
      { correo: 'cuerdas.docente@lucytejada.pereira.gov.co', doc: '1088100003', nom: 'Héctor Fabio', ape: 'Ospina Cardona', esp: 'Tiple, Bandola y Guitarra Andina', tel: '3124451103' },
      { correo: 'sinfonica.docente@lucytejada.pereira.gov.co', doc: '1088100004', nom: 'Diana Marcela', ape: 'Quintero López', esp: 'Violín y Dirección Orquestal', tel: '3134451104' },
      { correo: 'banda.docente@lucytejada.pereira.gov.co', doc: '1088100005', nom: 'Jhon Jairo', ape: 'Londoño Mejía', esp: 'Percusión y Banda Músico Marcial', tel: '3144451105' },
      { correo: 'coros.docente@lucytejada.pereira.gov.co', doc: '1088100006', nom: 'Paola Andrea', ape: 'Gómez Restrepo', esp: 'Dirección Coral y Técnica Vocal', tel: '3154451106' },
      { correo: 'visuales.docente@lucytejada.pereira.gov.co', doc: '1088100007', nom: 'Sebastián', ape: 'Castaño Arias', esp: 'Artes Plásticas y Grabado', tel: '3164451107' },
    ];

    const educadores: Educador[] = [];
    for (const ed of educadoresSpec) {
      const u = await this.usuarioRepo.save(
        this.usuarioRepo.create({
          correo: ed.correo,
          hashClave: hashEdu,
          debeCambiarClave: false,
          activo: true,
          roles: [rolesMap.get(RoleName.EDUCADOR)!],
        }),
      );
      educadores.push(
        await this.educadorRepo.save(
          this.educadorRepo.create({
            usuarioId: u.id,
            documento: ed.doc,
            nombres: ed.nom,
            apellidos: ed.ape,
            especialidad: ed.esp,
            telefono: ed.tel,
            activo: true,
          }),
        ),
      );
    }

    // 6. Grupos activos (2026-2) + 2 grupos históricos (2026-1) para comparativa de deserción
    const gruposSpec = [
      { progIdx: 0, eduIdx: 0, salonIdx: 0, nombre: 'Danza Folclórica · Inicial A', cupo: 24, periodo: '2026-2', horarios: [['Martes', '16:00', '18:00'], ['Jueves', '16:00', '18:00']] },
      { progIdx: 0, eduIdx: 0, salonIdx: 0, nombre: 'Danza Contemporánea · Juvenil B', cupo: 20, periodo: '2026-2', horarios: [['Miércoles', '18:00', '20:00'], ['Viernes', '18:00', '20:00']] },
      { progIdx: 1, eduIdx: 1, salonIdx: 1, nombre: 'Teatro · Exploración Escénica A', cupo: 22, periodo: '2026-2', horarios: [['Lunes', '16:00', '18:00'], ['Miércoles', '16:00', '18:00']] },
      { progIdx: 2, eduIdx: 2, salonIdx: 2, nombre: 'Cuerdas Pulsadas · Ensamble Andino', cupo: 18, periodo: '2026-2', horarios: [['Martes', '14:00', '16:00'], ['Jueves', '14:00', '16:00']] },
      { progIdx: 3, eduIdx: 3, salonIdx: 3, nombre: 'Cuerdas Sinfónicas · Semillero Orquestal', cupo: 25, periodo: '2026-2', horarios: [['Lunes', '15:00', '17:00'], ['Jueves', '15:00', '17:00']] },
      { progIdx: 4, eduIdx: 4, salonIdx: 4, nombre: 'Banda Músico Marcial · Titular', cupo: 30, periodo: '2026-2', horarios: [['Miércoles', '15:00', '17:30'], ['Sábado', '09:00', '12:00']] },
      { progIdx: 5, eduIdx: 5, salonIdx: 5, nombre: 'Coro Infantil y Juvenil Lucy Tejada', cupo: 28, periodo: '2026-2', horarios: [['Martes', '17:00', '19:00'], ['Viernes', '17:00', '19:00']] },
      { progIdx: 6, eduIdx: 6, salonIdx: 6, nombre: 'Artes Visuales · Dibujo y Pintura A', cupo: 20, periodo: '2026-2', horarios: [['Sábado', '08:30', '11:30']] },
      { progIdx: 6, eduIdx: 6, salonIdx: 6, nombre: 'Artes Visuales · Grabado y Fotografía B', cupo: 18, periodo: '2026-2', horarios: [['Jueves', '17:00', '19:30']] },
      // Histórico 2026-1 para comparación de deserción
      { progIdx: 0, eduIdx: 0, salonIdx: 0, nombre: 'Danza Folclórica · Cohorte 2026-1', cupo: 24, periodo: '2026-1', horarios: [['Martes', '16:00', '18:00']] },
      { progIdx: 2, eduIdx: 2, salonIdx: 2, nombre: 'Cuerdas Pulsadas · Cohorte 2026-1', cupo: 18, periodo: '2026-1', horarios: [['Jueves', '14:00', '16:00']] },
    ];

    const grupos: Grupo[] = [];
    for (const g of gruposSpec) {
      const savedGrupo = await this.grupoRepo.save(
        this.grupoRepo.create({
          programaId: programas[g.progIdx].id,
          educadorId: educadores[g.eduIdx].id,
          salonId: salones[g.salonIdx].id,
          nombre: g.nombre,
          cupoMax: g.cupo,
          periodo: g.periodo,
          activo: g.periodo === '2026-2',
        }),
      );
      for (const [dia, ini, fin] of g.horarios) {
        await this.horarioRepo.save(
          this.horarioRepo.create({
            grupoId: savedGrupo.id,
            diaSemana: dia,
            horaInicio: ini,
            horaFin: fin,
          }),
        );
      }
      grupos.push(savedGrupo);
    }

    // 7. 35 Estudiantes realistas de Pereira y área metropolitana (adultos y menores con acudiente)
    const nombresM = ['Santiago', 'Mateo', 'Sebastián', 'Samuel', 'Alejandro', 'Daniel', 'Nicolás', 'Emiliano', 'Tomás', 'Juan José', 'Esteban', 'Jerónimo', 'Miguel Ángel', 'Camilo', 'Andrés', 'David', 'Felipe'];
    const nombresF = ['Valentina', 'Sofía', 'Isabella', 'Mariana', 'Camila', 'Gabriela', 'Salomé', 'Luciana', 'Antonella', 'Sara', 'Manuela', 'Valeria', 'Laura', 'Juliana', 'María José', 'Paula', 'Daniela', 'Natalia'];
    const apellidos = ['Giraldo', 'Ospina', 'Restrepo', 'Cardona', 'Mejía', 'Valencia', 'Ríos', 'Toro', 'Marín', 'Quintero', 'López', 'Londoño', 'Castaño', 'Arias', 'Betancur', 'Hincapié', 'Salazar', 'Ramírez'];
    const ciudades = ['Pereira', 'Pereira', 'Pereira', 'Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Marsella', 'Manizales', 'Armenia'];

    const estudiantes: Estudiante[] = [];

    for (let idx = 0; idx < 35; idx++) {
      const esFemenino = idx % 2 === 0;
      const genero = idx === 34 ? 'No binario' : esFemenino ? 'Femenino' : 'Masculino';
      const nombres = idx === 0
        ? 'Valentina'
        : esFemenino
          ? nombresF[idx % nombresF.length]
          : nombresM[idx % nombresM.length];
      const ape1 = idx === 0 ? 'Ospina' : apellidos[idx % apellidos.length];
      const ape2 = idx === 0 ? 'Giraldo' : apellidos[(idx + 5) % apellidos.length];

      const correo =
        idx === 0
          ? 'estudiante@lucytejada.pereira.gov.co'
          : `est${idx + 1}.${nombres.toLowerCase().replace(/[^a-z]/g, '')}@correo.com`;

      const esMenor = idx % 3 === 1; // ~33% menores de edad con consentimiento cualificado
      const anioNac = esMenor ? 2011 + (idx % 6) : 1995 + (idx % 12);
      const mesNac = String((idx % 12) + 1).padStart(2, '0');
      const diaNac = String((idx % 26) + 1).padStart(2, '0');
      const fechaNacimiento = `${anioNac}-${mesNac}-${diaNac}`;

      const barrioInfo = BARRIOS_PEREIRA[idx % BARRIOS_PEREIRA.length];
      const ciudadOrigen = ciudades[idx % ciudades.length];

      const u = await this.usuarioRepo.save(
        this.usuarioRepo.create({
          correo,
          hashClave: hashEst,
          debeCambiarClave: false,
          activo: true,
          roles: [rolesMap.get(RoleName.ESTUDIANTE)!],
        }),
      );

      const est = await this.estudianteRepo.save(
        this.estudianteRepo.create({
          usuarioId: u.id,
          tipoDocumento: esMenor ? 'TI' : 'CC',
          documento: `1088${String(200000 + idx * 137)}`,
          nombres,
          apellidos: `${ape1} ${ape2}`,
          fechaNacimiento,
          genero,
          telefono: `31${idx % 9}${String(4500000 + idx * 12345).slice(0, 7)}`,
          direccion: `Calle ${14 + (idx % 30)} # ${4 + (idx % 15)}-${10 + (idx % 50)}`,
          barrio: barrioInfo.barrio,
          comuna: barrioInfo.comuna,
          ciudadOrigen,
          latitud: barrioInfo.lat,
          longitud: barrioInfo.lng,
          esMenor,
          acudienteNombre: esMenor ? `Martha Lucía ${ape2}` : null,
          acudienteDocumento: esMenor ? `42${String(100000 + idx * 97)}` : null,
          acudienteTelefono: esMenor ? `300${String(5100000 + idx * 451)}` : null,
          acudienteCorreo: esMenor ? `acudiente${idx}@correo.com` : null,
          acudienteParentesco: esMenor ? 'Madre / Acudiente' : null,
          consentimientoDatos: true,
          consentimientoFecha: new Date('2026-08-01T10:00:00Z'),
          consentimientoVersion: 'v1.0-2026',
        }),
      );
      estudiantes.push(est);
    }

    // 8. Inscripciones en los 9 grupos activos (2026-2) + 6 históricas (2026-1)
    const gruposActivos = grupos.slice(0, 9);
    const inscripcionesActivas: Inscripcion[] = [];

    for (let i = 0; i < estudiantes.length; i++) {
      const g1 = gruposActivos[i % gruposActivos.length];
      const retirado = i === 12 || i === 25;
      const insc = await this.inscripcionRepo.save(
        this.inscripcionRepo.create({
          estudianteId: estudiantes[i].id,
          grupoId: g1.id,
          estado: retirado ? EstadoInscripcion.RETIRADA : EstadoInscripcion.ACTIVA,
          fechaBaja: retirado ? new Date('2026-10-15T14:00:00Z') : null,
          motivo: retirado ? 'Cruce con jornada académica escolar' : null,
        }),
      );
      if (!retirado) inscripcionesActivas.push(insc);

      // Algunos estudiantes inscritos en un segundo programa artístico
      if (i < 14) {
        const g2 = gruposActivos[(i + 3) % gruposActivos.length];
        if (g2.id !== g1.id) {
          const insc2 = await this.inscripcionRepo.save(
            this.inscripcionRepo.create({
              estudianteId: estudiantes[i].id,
              grupoId: g2.id,
              estado: EstadoInscripcion.ACTIVA,
            }),
          );
          inscripcionesActivas.push(insc2);
        }
      }
    }

    // Inscripciones históricas 2026-1 (algunas retiradas para comparativa de deserción)
    for (let i = 0; i < 6; i++) {
      const gHist = grupos[9 + (i % 2)];
      await this.inscripcionRepo.save(
        this.inscripcionRepo.create({
          estudianteId: estudiantes[i].id,
          grupoId: gHist.id,
          estado: i < 4 ? EstadoInscripcion.RETIRADA : EstadoInscripcion.COMPLETADA,
          fechaBaja: i < 4 ? new Date('2026-05-10T10:00:00Z') : null,
          motivo: i < 4 ? 'Cambio de residencia' : null,
        }),
      );
    }

    // 9. Sesiones y asistencias (Agosto, Septiembre, Octubre, Noviembre 2026)
    const fechasSesiones = [
      '2026-08-18',
      '2026-09-08',
      '2026-09-22',
      '2026-10-13',
      '2026-10-27',
      '2026-11-10',
      '2026-11-17',
    ];

    const conceptosCiclo = [
      ConceptoEvaluacion.INICIAL,
      ConceptoEvaluacion.EN_PROCESO,
      ConceptoEvaluacion.DESTACADO,
      ConceptoEvaluacion.SOBRESALIENTE,
    ];

    for (const g of gruposActivos) {
      const inscsGrupo = inscripcionesActivas.filter((i) => i.grupoId === g.id);

      for (let fIdx = 0; fIdx < fechasSesiones.length; fIdx++) {
        const sesion = await this.sesionRepo.save(
          this.sesionRepo.create({
            grupoId: g.id,
            fecha: fechasSesiones[fIdx],
            tema: `Sesión formativa #${fIdx + 1} · Práctica y técnica`,
          }),
        );

        for (let eIdx = 0; eIdx < inscsGrupo.length; eIdx++) {
          const insc = inscsGrupo[eIdx];
          let estado = EstadoAsistencia.PRESENTE;

          // Generar casos realistas de deserción por >=3 inasistencias consecutivas al final
          if (eIdx === inscsGrupo.length - 1 && fIdx >= 4) {
            estado = EstadoAsistencia.AUSENTE;
          } else if ((eIdx + fIdx) % 9 === 0) {
            estado = EstadoAsistencia.EXCUSADO;
          } else if ((eIdx + fIdx) % 7 === 0) {
            estado = EstadoAsistencia.AUSENTE;
          }

          await this.asistenciaRepo.save(
            this.asistenciaRepo.create({
              sesionId: sesion.id,
              inscripcionId: insc.id,
              estado,
            }),
          );
        }
      }

      // 10. Evaluaciones cualitativas por indicador del programa
      const inds = indicadoresPorPrograma.get(g.programaId) || [];
      for (let eIdx = 0; eIdx < inscsGrupo.length; eIdx++) {
        const insc = inscsGrupo[eIdx];
        for (let k = 0; k < inds.length; k++) {
          const concepto = conceptosCiclo[(eIdx + k + 1) % conceptosCiclo.length];
          await this.evaluacionRepo.save(
            this.evaluacionRepo.create({
              inscripcionId: insc.id,
              indicadorId: inds[k].id,
              concepto,
              observacion:
                concepto === ConceptoEvaluacion.SOBRESALIENTE
                  ? 'Excelente compromiso, dominio técnico sobresaliente y liderazgo en clase.'
                  : concepto === ConceptoEvaluacion.DESTACADO
                    ? 'Progreso constante y sólida apropiación de las herramientas artísticas.'
                    : concepto === ConceptoEvaluacion.EN_PROCESO
                      ? 'Avanza adecuadamente; se recomienda reforzar práctica semanal.'
                      : 'Iniciando adaptación al grupo y exploración de bases formativas.',
              periodo: '2026-2',
            }),
          );
        }
      }
    }

    // 11. Notificaciones iniciales de ejemplo para el estudiante demo
    await this.notificacionRepo.save([
      this.notificacionRepo.create({
        usuarioId: estudiantes[0].usuarioId,
        tipo: 'MATRICULA',
        asunto: 'Matrícula confirmada · Danza Folclórica',
        mensaje:
          'Hola Valentina, tu matrícula en el Centro Cultural Lucy Tejada (periodo 2026-2) está activa. Recuerda revisar tu horario y salón asignado.',
        destinatarioCorreo: 'estudiante@lucytejada.pereira.gov.co',
        estadoEnvio: EstadoEnvioNotificacion.ENVIADO,
        leida: false,
      }),
      this.notificacionRepo.create({
        usuarioId: estudiantes[0].usuarioId,
        tipo: 'RECORDATORIO',
        asunto: 'Muestra Artística Semestral · Noviembre 2026',
        mensaje:
          'Te invitamos al ensayo general de la muestra artística en el Teatro Santiago Londoño · Centro Cultural Lucy Tejada.',
        destinatarioCorreo: 'estudiante@lucytejada.pereira.gov.co',
        estadoEnvio: EstadoEnvioNotificacion.ENVIADO,
        leida: false,
      }),
    ]);

    // 12. Registros iniciales de auditoría
    await this.auditoriaRepo.save([
      this.auditoriaRepo.create({
        usuarioId: adminUser.id,
        usuarioCorreo: adminUser.correo,
        accion: 'INICIALIZACION_SISTEMA',
        entidad: 'Sistema',
        detalle: 'Carga inicial de catálogos, 7 programas oficiales, salones, educadores y estudiantes de Pereira',
        ip: '127.0.0.1',
        exitoso: true,
      }),
    ]);

    this.logger.log(
      'Seed completado: 7 programas, 7 salones, 7 educadores, 35 estudiantes, 11 grupos, asistencias y evaluaciones.',
    );
    return { seeded: true, message: 'Datos iniciales cargados correctamente' };
  }
}
