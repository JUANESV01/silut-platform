import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EstudiantesService, calcularEdad } from './estudiantes.service';
import { RoleName } from '../common/enums';

describe('EstudiantesService (EST-01 / Ley 1581 S5 / Propiedad S1)', () => {
  const mockRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn((x) => Promise.resolve({ id: 'new-id', ...x })),
    create: jest.fn((x) => x),
  });

  let service: EstudiantesService;
  let estudianteRepo: any;
  let usuarioRepo: any;
  let rolRepo: any;
  let eventEmitter: any;
  let cacheService: any;

  beforeEach(() => {
    estudianteRepo = mockRepo();
    usuarioRepo = mockRepo();
    rolRepo = mockRepo();
    eventEmitter = { emit: jest.fn() };
    cacheService = { delByPrefix: jest.fn().mockResolvedValue(undefined) };

    service = new EstudiantesService(
      estudianteRepo,
      usuarioRepo,
      rolRepo,
      mockRepo() as any,
      mockRepo() as any,
      mockRepo() as any,
      eventEmitter,
      cacheService,
    );
  });

  it('calcula edad correctamente', () => {
    expect(calcularEdad('2000-01-01')).toBeGreaterThanOrEqual(25);
    expect(calcularEdad('2016-01-01')).toBeLessThan(18);
  });

  it('exige aceptación de política de tratamiento de datos (Ley 1581)', async () => {
    await expect(
      service.registrar({
        tipoDocumento: 'CC',
        documento: '10880001',
        nombres: 'Ana',
        apellidos: 'Ruiz',
        fechaNacimiento: '2000-05-01',
        genero: 'Femenino',
        telefono: '3101234567',
        correo: 'ana@correo.com',
        direccion: 'Calle 10',
        barrio: 'Centro',
        ciudadOrigen: 'Pereira',
        consentimientoDatos: false,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('exige datos de acudiente para menores de 18 años (ATAM S5)', async () => {
    await expect(
      service.registrar({
        tipoDocumento: 'TI',
        documento: '10880002',
        nombres: 'Samuel',
        apellidos: 'Toro',
        fechaNacimiento: '2014-05-01',
        genero: 'Masculino',
        telefono: '3101234567',
        correo: 'samuel@correo.com',
        direccion: 'Calle 10',
        barrio: 'Cuba',
        ciudadOrigen: 'Pereira',
        consentimientoDatos: true,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('ATAM S1: bloquea con 403 y audita si un estudiante intenta ver datos de otro estudiante', async () => {
    estudianteRepo.findOne.mockResolvedValue({
      id: 'est-victima',
      usuarioId: 'user-victima',
      nombres: 'Otro',
    });

    await expect(
      service.obtenerPorId(
        'est-victima',
        {
          id: 'user-atacante',
          correo: 'curioso@correo.com',
          roles: [RoleName.ESTUDIANTE],
          debeCambiarClave: false,
        },
        '192.168.1.50',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'auditoria.registrar',
      expect.objectContaining({
        accion: 'ACCESO_NO_AUTORIZADO_ESTUDIANTE',
        exitoso: false,
      }),
    );
  });
});
