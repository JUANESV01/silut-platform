import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { Estudiante, Grupo, Inscripcion, Rol, Usuario } from '../database/entities';
import { EstadoInscripcion, RoleName } from '../common/enums';
import { findBarrioCoords } from '../common/catalogs/pereira.catalog';
import {
  calcularEdad,
  generarClaveTemporal,
} from '../estudiantes/estudiantes.service';
import { CacheService } from '../common/cache/cache.service';

export interface FilaMigracionAlcaldia {
  fila: number;
  tipoDocumento: string;
  documento: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  genero: string;
  telefono: string;
  correo: string;
  direccion: string;
  barrio: string;
  ciudadOrigen: string;
  programa?: string;
  acudienteNombre?: string;
  acudienteDocumento?: string;
  acudienteTelefono?: string;
}

export interface ResultadoValidacionFila {
  fila: number;
  documento: string;
  correo: string;
  nombreCompleto: string;
  valido: boolean;
  errores: string[];
}

/**
 * Módulo de Migración desde archivos de la Alcaldía de Pereira (R05, VyA Sec. 15).
 * Implementa carga validada (dry-run con tasa de rechazo) y confirmación en lote.
 */
@Injectable()
export class MigracionService {
  constructor(
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionRepo: Repository<Inscripcion>,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  obtenerPlantillaCsv(): string {
    const header =
      'tipo_documento,documento,nombres,apellidos,fecha_nacimiento,genero,telefono,correo,direccion,barrio,ciudad_origen,programa,acudiente_nombre,acudiente_documento,acudiente_telefono';
    const sample1 =
      'CC,1088991122,Laura,Restrepo Mejía,2001-03-15,Femenino,3105551234,laura.restrepo@correo.com,Cra 7 # 18-20,Centro,Pereira,Danza,,,';
    const sample2 =
      'TI,1088993344,Mateo,Cárdenas López,2012-08-22,Masculino,3154449876,mateo.cardenas@correo.com,Mz 12 Casa 4,Cuba,Pereira,Teatro,Martha López,42123456,3154449876';
    return '\uFEFF' + [header, sample1, sample2].join('\r\n');
  }

  parsearCsv(contenido: string): FilaMigracionAlcaldia[] {
    const clean = contenido.replace(/^\uFEFF/, '').trim();
    const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new UnprocessableEntityException(
        'El archivo CSV debe contener encabezados y al menos una fila de datos.',
      );
    }

    const sep = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
    const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase());

    const idx = (name: string) => headers.indexOf(name);
    const filas: FilaMigracionAlcaldia[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
      const get = (name: string) => {
        const pos = idx(name);
        return pos >= 0 ? cols[pos] || '' : '';
      };

      filas.push({
        fila: i + 1,
        tipoDocumento: get('tipo_documento') || 'CC',
        documento: get('documento'),
        nombres: get('nombres'),
        apellidos: get('apellidos'),
        fechaNacimiento: get('fecha_nacimiento'),
        genero: get('genero') || 'No especificado',
        telefono: get('telefono'),
        correo: get('correo').toLowerCase(),
        direccion: get('direccion'),
        barrio: get('barrio') || 'Centro',
        ciudadOrigen: get('ciudad_origen') || 'Pereira',
        programa: get('programa'),
        acudienteNombre: get('acudiente_nombre'),
        acudienteDocumento: get('acudiente_documento'),
        acudienteTelefono: get('acudiente_telefono'),
      });
    }

    return filas;
  }

  async validarFilas(filas: FilaMigracionAlcaldia[]) {
    const docsExistentes = new Set(
      (await this.estudianteRepo.find({ select: ['documento'] })).map((e) => e.documento),
    );
    const correosExistentes = new Set(
      (await this.usuarioRepo.find({ select: ['correo'] })).map((u) => u.correo.toLowerCase()),
    );

    const docsEnArchivo = new Set<string>();
    const correosEnArchivo = new Set<string>();

    const detalle: ResultadoValidacionFila[] = [];

    for (const f of filas) {
      const errores: string[] = [];
      if (!f.documento) errores.push('Documento obligatorio');
      if (!f.nombres || !f.apellidos) errores.push('Nombres y apellidos obligatorios');
      if (!f.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo)) {
        errores.push('Correo electrónico inválido');
      }
      if (!f.fechaNacimiento || isNaN(Date.parse(f.fechaNacimiento))) {
        errores.push('Fecha de nacimiento inválida (use YYYY-MM-DD)');
      } else if (calcularEdad(f.fechaNacimiento) < 18) {
        if (!f.acudienteNombre || !f.acudienteDocumento || !f.acudienteTelefono) {
          errores.push('Menor de edad sin datos completos de acudiente (Ley 1581)');
        }
      }

      if (f.documento && (docsExistentes.has(f.documento) || docsEnArchivo.has(f.documento))) {
        errores.push('Documento duplicado en base o archivo');
      }
      if (f.correo && (correosExistentes.has(f.correo) || correosEnArchivo.has(f.correo))) {
        errores.push('Correo duplicado en base o archivo');
      }

      if (f.documento) docsEnArchivo.add(f.documento);
      if (f.correo) correosEnArchivo.add(f.correo);

      detalle.push({
        fila: f.fila,
        documento: f.documento,
        correo: f.correo,
        nombreCompleto: `${f.nombres} ${f.apellidos}`.trim(),
        valido: errores.length === 0,
        errores,
      });
    }

    const total = detalle.length;
    const validos = detalle.filter((d) => d.valido).length;
    const rechazados = total - validos;
    const tasaRechazoPct = total > 0 ? Number(((rechazados / total) * 100).toFixed(2)) : 0;

    return {
      totalFilas: total,
      validos,
      rechazados,
      tasaRechazoPct,
      alertaR05: tasaRechazoPct > 2,
      detalle,
    };
  }

  async ejecutarMigracion(contenidoCsv: string, soloValidar = false) {
    const filas = this.parsearCsv(contenidoCsv);
    const validacion = await this.validarFilas(filas);

    if (soloValidar) {
      return { modo: 'validacion', ...validacion };
    }

    let rolEstudiante = await this.rolRepo.findOne({
      where: { nombre: RoleName.ESTUDIANTE },
    });
    if (!rolEstudiante) {
      rolEstudiante = await this.rolRepo.save(
        this.rolRepo.create({ nombre: RoleName.ESTUDIANTE }),
      );
    }

    const grupos = await this.grupoRepo.find({
      where: { activo: true },
      relations: ['programa'],
    });

    const validMap = new Set(
      validacion.detalle.filter((d) => d.valido).map((d) => d.fila),
    );

    let importados = 0;
    let inscripcionesCreadas = 0;

    for (const f of filas) {
      if (!validMap.has(f.fila)) continue;

      const claveTemp = generarClaveTemporal();
      const hashClave = await bcrypt.hash(claveTemp, 10);

      const usuario = await this.usuarioRepo.save(
        this.usuarioRepo.create({
          correo: f.correo,
          hashClave,
          debeCambiarClave: true,
          activo: true,
          roles: [rolEstudiante],
        }),
      );

      const coords = findBarrioCoords(f.barrio);
      const esMenor = calcularEdad(f.fechaNacimiento) < 18;

      const estudiante = await this.estudianteRepo.save(
        this.estudianteRepo.create({
          usuarioId: usuario.id,
          tipoDocumento: f.tipoDocumento,
          documento: f.documento,
          nombres: f.nombres,
          apellidos: f.apellidos,
          fechaNacimiento: f.fechaNacimiento,
          genero: f.genero,
          telefono: f.telefono || 'Sin registrar',
          direccion: f.direccion || 'Sin registrar',
          barrio: coords ? coords.barrio : f.barrio,
          comuna: coords?.comuna || 'Comuna Centro',
          ciudadOrigen: f.ciudadOrigen,
          latitud: coords?.lat ?? 4.8143,
          longitud: coords?.lng ?? -75.6946,
          esMenor,
          acudienteNombre: esMenor ? f.acudienteNombre || null : null,
          acudienteDocumento: esMenor ? f.acudienteDocumento || null : null,
          acudienteTelefono: esMenor ? f.acudienteTelefono || null : null,
          consentimientoDatos: true,
          consentimientoFecha: new Date(),
          consentimientoVersion: 'migracion-alcaldia-2026',
        }),
      );
      importados++;

      // Si viene nombre de programa, intentar matricular en grupo activo con cupo
      if (f.programa) {
        const grupoMatch = grupos.find(
          (g) => g.programa?.nombre.toLowerCase() === f.programa!.toLowerCase(),
        );
        if (grupoMatch) {
          const inscritos = await this.inscripcionRepo.count({
            where: { grupoId: grupoMatch.id, estado: EstadoInscripcion.ACTIVA },
          });
          if (inscritos < grupoMatch.cupoMax) {
            await this.inscripcionRepo.save(
              this.inscripcionRepo.create({
                estudianteId: estudiante.id,
                grupoId: grupoMatch.id,
                estado: EstadoInscripcion.ACTIVA,
              }),
            );
            inscripcionesCreadas++;
          }
        }
      }

      this.eventEmitter.emit('usuario.credenciales_creadas', {
        usuarioId: usuario.id,
        correo: usuario.correo,
        nombreCompleto: `${estudiante.nombres} ${estudiante.apellidos}`,
        claveTemporal: claveTemp,
      });
    }

    await this.cacheService.delByPrefix('dashboard:');

    return {
      modo: 'importacion',
      ...validacion,
      importados,
      inscripcionesCreadas,
    };
  }
}
