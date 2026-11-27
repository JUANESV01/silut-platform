import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Estudiante, Grupo, Programa } from '../database/entities';
import { calcularEdad } from '../estudiantes/estudiantes.service';

export interface ContextoInscripcion {
  estudiante: Estudiante;
  grupo: Grupo;
  programa: Programa;
  inscritosActuales: number;
  yaInscritoEnGrupo: boolean;
}

/**
 * Patrón Chain of Responsibility (Entrega 2, Figura 5 y Sec. 5.1).
 * Encadena validaciones independientes para inscripciones:
 *   ValidadorDuplicado -> ValidadorRequisitos -> ValidadorCupo.
 */
export abstract class ValidadorInscripcion {
  protected siguiente: ValidadorInscripcion | null = null;

  enlazar(siguiente: ValidadorInscripcion): ValidadorInscripcion {
    this.siguiente = siguiente;
    return siguiente;
  }

  validar(ctx: ContextoInscripcion): void {
    this.ejecutarValidacion(ctx);
    if (this.siguiente) {
      this.siguiente.validar(ctx);
    }
  }

  protected abstract ejecutarValidacion(ctx: ContextoInscripcion): void;
}

export class ValidadorDuplicado extends ValidadorInscripcion {
  protected ejecutarValidacion(ctx: ContextoInscripcion): void {
    if (ctx.yaInscritoEnGrupo) {
      throw new ConflictException(
        'El estudiante ya se encuentra matriculado en este grupo.',
      );
    }
  }
}

export class ValidadorRequisitos extends ValidadorInscripcion {
  protected ejecutarValidacion(ctx: ContextoInscripcion): void {
    if (!ctx.programa.activo || !ctx.grupo.activo) {
      throw new UnprocessableEntityException(
        'El programa o grupo seleccionado no se encuentra abierto para matrícula.',
      );
    }

    if (!ctx.estudiante.consentimientoDatos) {
      throw new UnprocessableEntityException(
        'El estudiante debe contar con consentimiento de tratamiento de datos personales (Ley 1581).',
      );
    }

    const edad = calcularEdad(ctx.estudiante.fechaNacimiento);
    if (ctx.programa.edadMinima && edad < ctx.programa.edadMinima) {
      throw new UnprocessableEntityException(
        `El programa "${ctx.programa.nombre}" requiere una edad mínima de ${ctx.programa.edadMinima} años (edad actual: ${edad}).`,
      );
    }
    if (ctx.programa.edadMaxima && edad > ctx.programa.edadMaxima) {
      throw new UnprocessableEntityException(
        `El programa "${ctx.programa.nombre}" admite hasta ${ctx.programa.edadMaxima} años (edad actual: ${edad}).`,
      );
    }
  }
}

export class ValidadorCupo extends ValidadorInscripcion {
  protected ejecutarValidacion(ctx: ContextoInscripcion): void {
    if (ctx.inscritosActuales >= ctx.grupo.cupoMax) {
      throw new ConflictException(
        `No hay cupos disponibles en el grupo "${ctx.grupo.nombre}" (${ctx.inscritosActuales}/${ctx.grupo.cupoMax}).`,
      );
    }
  }
}

export function construirCadenaValidacionInscripcion(): ValidadorInscripcion {
  const duplicado = new ValidadorDuplicado();
  const requisitos = new ValidadorRequisitos();
  const cupo = new ValidadorCupo();
  duplicado.enlazar(requisitos).enlazar(cupo);
  return duplicado;
}
