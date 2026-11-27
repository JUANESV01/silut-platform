import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Educador,
  Grupo,
  Horario,
  IndicadorEvaluacion,
  Inscripcion,
  Programa,
  Salon,
} from '../database/entities';
import { EstadoInscripcion } from '../common/enums';
import { CacheService } from '../common/cache/cache.service';
import {
  ActualizarHorarioGrupoDto,
  CrearGrupoDto,
  CrearIndicadorDto,
  CrearProgramaDto,
  CrearSalonDto,
  HorarioItemDto,
} from './programas.dto';

function horariosSeCruzan(a: HorarioItemDto, b: { diaSemana: string; horaInicio: string; horaFin: string }): boolean {
  if (a.diaSemana.toLowerCase() !== b.diaSemana.toLowerCase()) return false;
  return a.horaInicio < b.horaFin && b.horaInicio < a.horaFin;
}

@Injectable()
export class ProgramasService {
  constructor(
    @InjectRepository(Programa)
    private readonly programaRepo: Repository<Programa>,
    @InjectRepository(IndicadorEvaluacion)
    private readonly indicadorRepo: Repository<IndicadorEvaluacion>,
    @InjectRepository(Salon)
    private readonly salonRepo: Repository<Salon>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(Horario)
    private readonly horarioRepo: Repository<Horario>,
    @InjectRepository(Educador)
    private readonly educadorRepo: Repository<Educador>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionRepo: Repository<Inscripcion>,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  async listarProgramas() {
    const programas = await this.programaRepo.find({
      relations: ['indicadores', 'grupos', 'grupos.educador', 'grupos.salon', 'grupos.horarios'],
      order: { nombre: 'ASC' },
    });

    const conteosRaw = await this.inscripcionRepo
      .createQueryBuilder('i')
      .select('i.grupo_id', 'grupoId')
      .addSelect('COUNT(i.id)', 'total')
      .where('i.estado = :estado', { estado: EstadoInscripcion.ACTIVA })
      .groupBy('i.grupo_id')
      .getRawMany<{ grupoId: string; total: string }>();

    const conteoMap = new Map(conteosRaw.map((c) => [c.grupoId, Number(c.total)]));

    return programas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      requisitos: p.requisitos,
      edadMinima: p.edadMinima,
      edadMaxima: p.edadMaxima,
      activo: p.activo,
      indicadores: (p.indicadores || []).sort((a, b) => a.orden - b.orden),
      grupos: (p.grupos || []).map((g) => {
        const inscritos = conteoMap.get(g.id) || 0;
        return {
          id: g.id,
          nombre: g.nombre,
          periodo: g.periodo,
          cupoMax: g.cupoMax,
          inscritos,
          cuposDisponibles: Math.max(0, g.cupoMax - inscritos),
          activo: g.activo,
          educador: g.educador
            ? {
                id: g.educador.id,
                nombreCompleto: `${g.educador.nombres} ${g.educador.apellidos}`,
                especialidad: g.educador.especialidad,
              }
            : null,
          salon: g.salon
            ? {
                id: g.salon.id,
                nombre: g.salon.nombre,
                ubicacion: g.salon.ubicacion,
                capacidad: g.salon.capacidad,
              }
            : null,
          horarios: g.horarios || [],
        };
      }),
    }));
  }

  async crearPrograma(dto: CrearProgramaDto) {
    const dup = await this.programaRepo.findOne({ where: { nombre: dto.nombre.trim() } });
    if (dup) {
      throw new ConflictException('Ya existe un programa con ese nombre');
    }

    const programa = await this.programaRepo.save(
      this.programaRepo.create({
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion || '',
        requisitos: dto.requisitos || 'Interés en el proceso formativo y asistencia regular.',
        edadMinima: dto.edadMinima ?? 6,
        edadMaxima: dto.edadMaxima ?? null,
        activo: true,
      }),
    );

    if (dto.indicadores && dto.indicadores.length > 0) {
      const inds = dto.indicadores.map((ind, idx) =>
        this.indicadorRepo.create({
          programaId: programa.id,
          nombre: ind.nombre.trim(),
          descripcion: ind.descripcion.trim(),
          orden: ind.orden ?? idx + 1,
          activo: true,
        }),
      );
      await this.indicadorRepo.save(inds);
    }

    await this.cacheService.delByPrefix('dashboard:');
    return this.programaRepo.findOne({
      where: { id: programa.id },
      relations: ['indicadores'],
    });
  }

  async agregarIndicador(programaId: string, dto: CrearIndicadorDto) {
    const programa = await this.programaRepo.findOne({ where: { id: programaId } });
    if (!programa) throw new NotFoundException('Programa no encontrado');

    const count = await this.indicadorRepo.count({ where: { programaId } });
    return this.indicadorRepo.save(
      this.indicadorRepo.create({
        programaId,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion.trim(),
        orden: dto.orden ?? count + 1,
        activo: true,
      }),
    );
  }

  async listarSalones() {
    return this.salonRepo.find({ order: { nombre: 'ASC' } });
  }

  async crearSalon(dto: CrearSalonDto) {
    const dup = await this.salonRepo.findOne({ where: { nombre: dto.nombre.trim() } });
    if (dup) throw new ConflictException('Ya existe un salón con ese nombre');

    return this.salonRepo.save(
      this.salonRepo.create({
        nombre: dto.nombre.trim(),
        ubicacion: dto.ubicacion.trim(),
        capacidad: dto.capacidad,
        activo: true,
      }),
    );
  }

  async listarEducadores() {
    const educadores = await this.educadorRepo.find({
      relations: ['usuario'],
      order: { apellidos: 'ASC' },
    });
    return educadores.map((e) => ({
      id: e.id,
      usuarioId: e.usuarioId,
      documento: e.documento,
      nombres: e.nombres,
      apellidos: e.apellidos,
      nombreCompleto: `${e.nombres} ${e.apellidos}`,
      correo: e.usuario?.correo,
      especialidad: e.especialidad,
      telefono: e.telefono,
      activo: e.activo,
    }));
  }

  async crearGrupo(dto: CrearGrupoDto) {
    const [programa, educador, salon] = await Promise.all([
      this.programaRepo.findOne({ where: { id: dto.programaId } }),
      this.educadorRepo.findOne({ where: { id: dto.educadorId } }),
      this.salonRepo.findOne({ where: { id: dto.salonId } }),
    ]);

    if (!programa) throw new NotFoundException('Programa no encontrado');
    if (!educador) throw new NotFoundException('Educador no encontrado');
    if (!salon) throw new NotFoundException('Salón no encontrado');

    // Validar conflicto de horario de salón o educador en el mismo periodo (Sec. 4.7 -> 409)
    const gruposMismoPeriodo = await this.grupoRepo.find({
      where: { periodo: dto.periodo, activo: true },
      relations: ['horarios'],
    });

    for (const g of gruposMismoPeriodo) {
      if (g.salonId === dto.salonId || g.educadorId === dto.educadorId) {
        for (const hExistente of g.horarios || []) {
          for (const hNuevo of dto.horarios || []) {
            if (horariosSeCruzan(hNuevo, hExistente)) {
              const recurso = g.salonId === dto.salonId ? 'salón' : 'educador';
              throw new ConflictException(
                `Conflicto de horario: el ${recurso} ya está asignado al grupo "${g.nombre}" el día ${hExistente.diaSemana} (${hExistente.horaInicio}-${hExistente.horaFin}).`,
              );
            }
          }
        }
      }
    }

    const grupo = await this.grupoRepo.save(
      this.grupoRepo.create({
        programaId: dto.programaId,
        educadorId: dto.educadorId,
        salonId: dto.salonId,
        nombre: dto.nombre.trim(),
        cupoMax: dto.cupoMax,
        periodo: dto.periodo.trim(),
        activo: true,
      }),
    );

    if (dto.horarios && dto.horarios.length > 0) {
      await this.horarioRepo.save(
        dto.horarios.map((h) =>
          this.horarioRepo.create({
            grupoId: grupo.id,
            diaSemana: h.diaSemana,
            horaInicio: h.horaInicio,
            horaFin: h.horaFin,
          }),
        ),
      );
    }

    await this.cacheService.delByPrefix('dashboard:');
    return this.grupoRepo.findOne({
      where: { id: grupo.id },
      relations: ['programa', 'educador', 'salon', 'horarios'],
    });
  }

  async actualizarHorariosGrupo(grupoId: string, dto: ActualizarHorarioGrupoDto) {
    const grupo = await this.grupoRepo.findOne({
      where: { id: grupoId },
      relations: ['programa', 'inscripciones', 'inscripciones.estudiante', 'inscripciones.estudiante.usuario'],
    });
    if (!grupo) throw new NotFoundException('Grupo no encontrado');

    await this.horarioRepo.delete({ grupoId });
    const nuevos = await this.horarioRepo.save(
      dto.horarios.map((h) =>
        this.horarioRepo.create({
          grupoId,
          diaSemana: h.diaSemana,
          horaInicio: h.horaInicio,
          horaFin: h.horaFin,
        }),
      ),
    );

    if (typeof dto.activo === 'boolean') {
      grupo.activo = dto.activo;
      await this.grupoRepo.save(grupo);
    }

    const destinatarios = (grupo.inscripciones || [])
      .filter((i) => i.estado === EstadoInscripcion.ACTIVA && i.estudiante?.usuario)
      .map((i) => ({
        usuarioId: i.estudiante.usuario.id,
        correo: i.estudiante.usuario.correo,
        nombre: `${i.estudiante.nombres} ${i.estudiante.apellidos}`,
      }));

    if (destinatarios.length > 0) {
      const resumen = nuevos
        .map((h) => `${h.diaSemana}: ${h.horaInicio} - ${h.horaFin}`)
        .join(' | ');
      this.eventEmitter.emit('horario.modificado', {
        grupoNombre: grupo.nombre,
        programaNombre: grupo.programa?.nombre || 'Programa',
        destinatarios,
        nuevoHorario: resumen,
      });
    }

    await this.cacheService.delByPrefix('dashboard:');
    return { ...grupo, horarios: nuevos };
  }

  async listarGruposDelEducador(usuarioId: string) {
    const educador = await this.educadorRepo.findOne({ where: { usuarioId } });
    if (!educador) {
      return [];
    }

    const grupos = await this.grupoRepo.find({
      where: { educadorId: educador.id },
      relations: [
        'programa',
        'programa.indicadores',
        'salon',
        'horarios',
        'inscripciones',
        'inscripciones.estudiante',
        'inscripciones.estudiante.usuario',
      ],
      order: { nombre: 'ASC' },
    });

    return grupos.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      periodo: g.periodo,
      cupoMax: g.cupoMax,
      activo: g.activo,
      programa: {
        id: g.programa?.id,
        nombre: g.programa?.nombre,
        indicadores: (g.programa?.indicadores || []).sort((a, b) => a.orden - b.orden),
      },
      salon: g.salon,
      horarios: g.horarios || [],
      estudiantes: (g.inscripciones || [])
        .filter((i) => i.estado === EstadoInscripcion.ACTIVA)
        .map((i) => ({
          inscripcionId: i.id,
          estudianteId: i.estudiante.id,
          documento: i.estudiante.documento,
          nombres: i.estudiante.nombres,
          apellidos: i.estudiante.apellidos,
          correo: i.estudiante.usuario?.correo,
          telefono: i.estudiante.telefono,
          barrio: i.estudiante.barrio,
          esMenor: i.estudiante.esMenor,
        })),
    }));
  }

  async listarTodosLosGrupos() {
    return this.grupoRepo.find({
      relations: ['programa', 'programa.indicadores', 'educador', 'salon', 'horarios'],
      order: { periodo: 'DESC', nombre: 'ASC' },
    });
  }
}
