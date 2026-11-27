import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  construirCadenaValidacionInscripcion,
  ContextoInscripcion,
} from './validadores.chain';

describe('Chain of Responsibility - Validadores de Inscripción (EST-02 / R13)', () => {
  const baseContext = (): ContextoInscripcion => ({
    estudiante: {
      id: 'est-1',
      fechaNacimiento: '2005-04-10',
      consentimientoDatos: true,
    } as any,
    grupo: {
      id: 'grp-1',
      nombre: 'Danza Inicial A',
      cupoMax: 20,
      activo: true,
    } as any,
    programa: {
      id: 'prog-1',
      nombre: 'Danza',
      edadMinima: 7,
      edadMaxima: null,
      activo: true,
    } as any,
    inscritosActuales: 10,
    yaInscritoEnGrupo: false,
  });

  it('aprueba una inscripción válida con cupo y requisitos cumplidos', () => {
    const cadena = construirCadenaValidacionInscripcion();
    expect(() => cadena.validar(baseContext())).not.toThrow();
  });

  it('rechaza con 409 si el estudiante ya está inscrito en el grupo', () => {
    const cadena = construirCadenaValidacionInscripcion();
    const ctx = baseContext();
    ctx.yaInscritoEnGrupo = true;
    expect(() => cadena.validar(ctx)).toThrow(ConflictException);
  });

  it('rechaza con 422 si el estudiante no tiene consentimiento Ley 1581', () => {
    const cadena = construirCadenaValidacionInscripcion();
    const ctx = baseContext();
    ctx.estudiante.consentimientoDatos = false;
    expect(() => cadena.validar(ctx)).toThrow(UnprocessableEntityException);
  });

  it('rechaza con 422 si no cumple la edad mínima del programa', () => {
    const cadena = construirCadenaValidacionInscripcion();
    const ctx = baseContext();
    ctx.estudiante.fechaNacimiento = '2023-01-01';
    ctx.programa.edadMinima = 10;
    expect(() => cadena.validar(ctx)).toThrow(UnprocessableEntityException);
  });

  it('rechaza con 409 cuando el grupo alcanzó su cupo máximo (evita sobreventa R13)', () => {
    const cadena = construirCadenaValidacionInscripcion();
    const ctx = baseContext();
    ctx.inscritosActuales = 20;
    ctx.grupo.cupoMax = 20;
    expect(() => cadena.validar(ctx)).toThrow(ConflictException);
  });
});
