import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import {
  Asistencia,
  Estudiante,
  Evaluacion,
  Inscripcion,
  Rol,
  Usuario,
} from '../database/entities';
import {
  EstadoAsistencia,
  RequestUser,
  RoleName,
} from '../common/enums';
import { findBarrioCoords } from '../common/catalogs/pereira.catalog';
import {
  ActualizarPerfilEstudianteDto,
  RegistrarEstudianteDto,
} from './estudiantes.dto';
import { CacheService } from '../common/cache/cache.service';

export function calcularEdad(fechaNacimiento: string): number {
  const dob = new Date(fechaNacimiento);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function generarClaveTemporal(): string {
  const hex = randomBytes(3).toString('hex');
  return `Lucy${hex.toUpperCase()}*9`;
}

@Injectable()
export class EstudiantesService {
  constructor(
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionRepo: Repository<Inscripcion>,
    @InjectRepository(Asistencia)
    private readonly asistenciaRepo: Repository<Asistencia>,
    @InjectRepository(Evaluacion)
    private readonly evaluacionRepo: Repository<Evaluacion>,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  async registrar(dto: RegistrarEstudianteDto) {
    if (!dto.consentimientoDatos) {
      throw new UnprocessableEntityException(
        'Debe aceptar la política de tratamiento de datos personales (Ley 1581 de 2012).',
      );
    }

    const edad = calcularEdad(dto.fechaNacimiento);
    const esMenor = edad < 18;

    if (esMenor) {
      if (!dto.acudienteNombre?.trim() || !dto.acudienteDocumento?.trim() || !dto.acudienteTelefono?.trim()) {
        throw new UnprocessableEntityException(
          'Para estudiantes menores de edad es obligatorio registrar nombre, documento y teléfono del acudiente o representante legal (Ley 1581 de 2012).',
        );
      }
    }

    const correo = dto.correo.trim().toLowerCase();
    const existenteCorreo = await this.usuarioRepo.findOne({ where: { correo } });
    if (existenteCorreo) {
      throw new ConflictException('Ya existe una cuenta registrada con este correo electrónico.');
    }

    const existenteDoc = await this.estudianteRepo.findOne({
      where: { documento: dto.documento.trim() },
    });
    if (existenteDoc) {
      throw new ConflictException('Ya existe un estudiante registrado con este número de documento.');
    }

    let rolEstudiante = await this.rolRepo.findOne({
      where: { nombre: RoleName.ESTUDIANTE },
    });
    if (!rolEstudiante) {
      rolEstudiante = await this.rolRepo.save(
        this.rolRepo.create({
          nombre: RoleName.ESTUDIANTE,
          descripcion: 'Estudiante del Centro Cultural Lucy Tejada',
        }),
      );
    }

    const claveTemporal = generarClaveTemporal();
    const hashClave = await bcrypt.hash(claveTemporal, 12);

    const usuario = await this.usuarioRepo.save(
      this.usuarioRepo.create({
        correo,
        hashClave,
        debeCambiarClave: true, // EST-03: cambio obligatorio en el primer inicio de sesión
        mfaActivo: false,
        activo: true,
        roles: [rolEstudiante],
      }),
    );

    const coords = findBarrioCoords(dto.barrio);
    const estudiante = await this.estudianteRepo.save(
      this.estudianteRepo.create({
        usuarioId: usuario.id,
        tipoDocumento: dto.tipoDocumento,
        documento: dto.documento.trim(),
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        fechaNacimiento: dto.fechaNacimiento,
        genero: dto.genero,
        telefono: dto.telefono.trim(),
        direccion: dto.direccion.trim(),
        barrio: coords ? coords.barrio : dto.barrio.trim(),
        comuna: dto.comuna?.trim() || coords?.comuna || 'Sin especificar',
        ciudadOrigen: dto.ciudadOrigen.trim(),
        latitud: coords?.lat ?? 4.8143,
        longitud: coords?.lng ?? -75.6946,
        esMenor,
        acudienteNombre: esMenor ? dto.acudienteNombre?.trim() || null : null,
        acudienteDocumento: esMenor ? dto.acudienteDocumento?.trim() || null : null,
        acudienteTelefono: esMenor ? dto.acudienteTelefono?.trim() || null : null,
        acudienteCorreo: esMenor ? dto.acudienteCorreo?.trim() || null : null,
        acudienteParentesco: esMenor ? dto.acudienteParentesco?.trim() || 'Acudiente' : null,
        consentimientoDatos: true,
        consentimientoFecha: new Date(),
        consentimientoVersion: 'v1.0-2026',
      }),
    );

    // Emitir evento Observer para envío de credenciales temporales (EST-03)
    this.eventEmitter.emit('usuario.credenciales_creadas', {
      usuarioId: usuario.id,
      correo: usuario.correo,
      nombreCompleto: `${estudiante.nombres} ${estudiante.apellidos}`,
      claveTemporal,
    });

    await this.cacheService.delByPrefix('dashboard:');

    return {
      estudiante,
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        debeCambiarClave: true,
      },
      // En entorno académico/demo mostramos la clave temporal en respuesta de registro
      // además de enviarla por el NotificationService (EST-03)
      claveTemporalDemo: claveTemporal,
      mensaje:
        'Estudiante registrado exitosamente. Las credenciales temporales han sido remitidas al correo registrado.',
    };
  }

  /**
   * Consulta académica completa del estudiante autenticado (EST-04).
   */
  async obtenerMiResumenAcademico(usuarioId: string) {
    const estudiante = await this.estudianteRepo.findOne({
      where: { usuarioId },
      relations: ['usuario'],
    });
    if (!estudiante) {
      throw new NotFoundException('Perfil de estudiante no encontrado');
    }

    const inscripciones = await this.inscripcionRepo.find({
      where: { estudianteId: estudiante.id },
      relations: [
        'grupo',
        'grupo.programa',
        'grupo.educador',
        'grupo.salon',
        'grupo.horarios',
      ],
      order: { fecha: 'DESC' },
    });

    const inscripcionesDetalle = await Promise.all(
      inscripciones.map(async (insc) => {
        const asistencias = await this.asistenciaRepo.find({
          where: { inscripcionId: insc.id },
          relations: ['sesion'],
        });
        const totalSesiones = asistencias.length;
        const presentes = asistencias.filter(
          (a) => a.estado === EstadoAsistencia.PRESENTE,
        ).length;
        const excusados = asistencias.filter(
          (a) => a.estado === EstadoAsistencia.EXCUSADO,
        ).length;
        const ausentes = asistencias.filter(
          (a) => a.estado === EstadoAsistencia.AUSENTE,
        ).length;
        const porcentajeAsistencia =
          totalSesiones > 0
            ? Math.round(((presentes + excusados * 0.5) / totalSesiones) * 100)
            : 100;

        const evaluaciones = await this.evaluacionRepo.find({
          where: { inscripcionId: insc.id },
          relations: ['indicador'],
          order: { fecha: 'DESC' },
        });

        return {
          id: insc.id,
          estado: insc.estado,
          fechaInscripcion: insc.fecha,
          programa: insc.grupo?.programa
            ? {
                id: insc.grupo.programa.id,
                nombre: insc.grupo.programa.nombre,
                descripcion: insc.grupo.programa.descripcion,
              }
            : null,
          grupo: insc.grupo
            ? {
                id: insc.grupo.id,
                nombre: insc.grupo.nombre,
                periodo: insc.grupo.periodo,
                cupoMax: insc.grupo.cupoMax,
              }
            : null,
          educador: insc.grupo?.educador
            ? `${insc.grupo.educador.nombres} ${insc.grupo.educador.apellidos}`
            : 'Por asignar',
          salon: insc.grupo?.salon
            ? {
                nombre: insc.grupo.salon.nombre,
                ubicacion: insc.grupo.salon.ubicacion,
              }
            : null,
          horarios: (insc.grupo?.horarios || []).map((h) => ({
            diaSemana: h.diaSemana,
            horaInicio: h.horaInicio,
            horaFin: h.horaFin,
          })),
          asistenciaResumen: {
            totalSesiones,
            presentes,
            ausentes,
            excusados,
            porcentajeAsistencia,
          },
          evaluaciones: evaluaciones.map((ev) => ({
            id: ev.id,
            indicador: ev.indicador?.nombre || 'Indicador',
            indicadorDescripcion: ev.indicador?.descripcion || '',
            concepto: ev.concepto,
            observacion: ev.observacion,
            periodo: ev.periodo,
            fecha: ev.fecha,
          })),
        };
      }),
    );

    return {
      estudiante: {
        id: estudiante.id,
        tipoDocumento: estudiante.tipoDocumento,
        documento: estudiante.documento,
        nombres: estudiante.nombres,
        apellidos: estudiante.apellidos,
        correo: estudiante.usuario?.correo,
        fechaNacimiento: estudiante.fechaNacimiento,
        edad: calcularEdad(estudiante.fechaNacimiento),
        genero: estudiante.genero,
        telefono: estudiante.telefono,
        direccion: estudiante.direccion,
        barrio: estudiante.barrio,
        comuna: estudiante.comuna,
        ciudadOrigen: estudiante.ciudadOrigen,
        esMenor: estudiante.esMenor,
        acudienteNombre: estudiante.acudienteNombre,
        acudienteTelefono: estudiante.acudienteTelefono,
        acudienteParentesco: estudiante.acudienteParentesco,
        consentimientoDatos: estudiante.consentimientoDatos,
        consentimientoFecha: estudiante.consentimientoFecha,
      },
      inscripciones: inscripcionesDetalle,
    };
  }

  /**
   * Actualización autónoma de contacto y dirección (EST-05).
   */
  async actualizarMiPerfil(usuarioId: string, dto: ActualizarPerfilEstudianteDto) {
    const estudiante = await this.estudianteRepo.findOne({ where: { usuarioId } });
    if (!estudiante) {
      throw new NotFoundException('Perfil de estudiante no encontrado');
    }

    if (dto.telefono !== undefined) estudiante.telefono = dto.telefono.trim();
    if (dto.direccion !== undefined) estudiante.direccion = dto.direccion.trim();
    if (dto.barrio !== undefined) {
      const coords = findBarrioCoords(dto.barrio);
      estudiante.barrio = coords ? coords.barrio : dto.barrio.trim();
      estudiante.comuna = dto.comuna?.trim() || coords?.comuna || estudiante.comuna;
      if (coords) {
        estudiante.latitud = coords.lat;
        estudiante.longitud = coords.lng;
      }
    } else if (dto.comuna !== undefined) {
      estudiante.comuna = dto.comuna.trim();
    }
    if (dto.ciudadOrigen !== undefined) estudiante.ciudadOrigen = dto.ciudadOrigen.trim();
    if (dto.acudienteTelefono !== undefined && estudiante.esMenor) {
      estudiante.acudienteTelefono = dto.acudienteTelefono.trim();
    }

    const updated = await this.estudianteRepo.save(estudiante);
    await this.cacheService.delByPrefix('dashboard:');
    return updated;
  }

  /**
   * Consulta por ID con verificación estricta de propiedad del recurso (ATAM ABAS 3 / S1).
   * Si un estudiante intenta ver los datos de otro estudiante, se devuelve 403 y se audita.
   */
  async obtenerPorId(id: string, user: RequestUser, ip: string) {
    const estudiante = await this.estudianteRepo.findOne({
      where: { id },
      relations: ['usuario'],
    });
    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    const esAdminOEducador =
      user.roles.includes(RoleName.ADMINISTRADOR) ||
      user.roles.includes(RoleName.ADMINISTRATIVO) ||
      user.roles.includes(RoleName.EDUCADOR);

    if (!esAdminOEducador && estudiante.usuarioId !== user.id) {
      this.eventEmitter.emit('auditoria.registrar', {
        usuarioId: user.id,
        usuarioCorreo: user.correo,
        accion: 'ACCESO_NO_AUTORIZADO_ESTUDIANTE',
        entidad: 'Estudiante',
        entidadId: id,
        detalle: 'Intento de acceso a datos personales de otro estudiante (bloqueado S1)',
        ip,
        exitoso: false,
      });
      throw new ForbiddenException(
        'No tiene autorización para consultar los datos de otro estudiante.',
      );
    }

    return estudiante;
  }
}
