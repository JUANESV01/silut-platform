import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AsistenciaService,
  contarInasistenciasConsecutivas,
} from './asistencia.service';
import { EstadoAsistencia, RoleName } from '../common/enums';

describe('AsistenciaService (EDU-03 / EDU-04 / Deserción)', () => {
  const mockRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((x) => x),
    createQueryBuilder: jest.fn(),
  });

  let service: AsistenciaService;
  let sesionRepo: any;
  let asistenciaRepo: any;
  let grupoRepo: any;
  let educadorRepo: any;
  let inscripcionRepo: any;
  let dataSource: any;
  let eventEmitter: any;
  let cacheService: any;
  let configService: any;

  beforeEach(() => {
    sesionRepo = mockRepo();
    asistenciaRepo = mockRepo();
    grupoRepo = mockRepo();
    educadorRepo = mockRepo();
    inscripcionRepo = mockRepo();
    dataSource = {
      transaction: jest.fn((cb) =>
        cb({
          findOne: jest.fn().mockResolvedValue({ id: 'insc-1', grupoId: 'grp-1' }),
          create: jest.fn((_e, x) => x),
          save: jest.fn((_e, x) => Promise.resolve(x)),
        }),
      ),
    };
    eventEmitter = { emit: jest.fn() };
    cacheService = { delByPrefix: jest.fn().mockResolvedValue(undefined) };
    configService = { get: jest.fn().mockReturnValue('3') };

    service = new AsistenciaService(
      sesionRepo,
      asistenciaRepo,
      grupoRepo,
      educadorRepo,
      inscripcionRepo,
      dataSource,
      eventEmitter,
      cacheService,
      configService,
    );
  });

  it('cuenta correctamente las inasistencias consecutivas más recientes', () => {
    expect(
      contarInasistenciasConsecutivas([
        EstadoAsistencia.AUSENTE,
        EstadoAsistencia.AUSENTE,
        EstadoAsistencia.AUSENTE,
        EstadoAsistencia.PRESENTE,
      ]),
    ).toBe(3);

    expect(
      contarInasistenciasConsecutivas([
        EstadoAsistencia.PRESENTE,
        EstadoAsistencia.AUSENTE,
        EstadoAsistencia.AUSENTE,
      ]),
    ).toBe(0);
  });

  it('rechaza crear una sesión para una fecha futura (regla de dominio)', async () => {
    grupoRepo.findOne.mockResolvedValue({
      id: 'grp-1',
      educadorId: 'edu-1',
    });
    educadorRepo.findOne.mockResolvedValue({ id: 'edu-1', usuarioId: 'u-edu' });

    const futuro = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);

    await expect(
      service.crearOObtenerSesion(
        { grupoId: 'grp-1', fecha: futuro },
        { id: 'u-edu', correo: 'e@test.com', roles: [RoleName.EDUCADOR], debeCambiarClave: false },
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('impide con 403 que un educador gestione un grupo que no tiene asignado', async () => {
    grupoRepo.findOne.mockResolvedValue({
      id: 'grp-1',
      educadorId: 'edu-dueno',
    });
    educadorRepo.findOne.mockResolvedValue({ id: 'edu-ajeno', usuarioId: 'u-ajeno' });

    await expect(
      service.crearOObtenerSesion(
        { grupoId: 'grp-1', fecha: '2026-11-10' },
        { id: 'u-ajeno', correo: 'otro@test.com', roles: [RoleName.EDUCADOR], debeCambiarClave: false },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('guarda asistencia en lote, invalida caché de dashboards y emite evento Observer', async () => {
    sesionRepo.findOne.mockResolvedValue({
      id: 'ses-1',
      grupoId: 'grp-1',
      fecha: '2026-11-15',
    });
    grupoRepo.findOne.mockResolvedValue({
      id: 'grp-1',
      nombre: 'Danza A',
      educadorId: 'edu-1',
      programa: { nombre: 'Danza' },
    });
    educadorRepo.findOne.mockResolvedValue({ id: 'edu-1', usuarioId: 'u-edu' });

    const res = await service.registrarAsistencia(
      'ses-1',
      {
        registros: [{ inscripcionId: 'insc-1', estado: EstadoAsistencia.PRESENTE }],
      },
      { id: 'u-edu', correo: 'e@test.com', roles: [RoleName.EDUCADOR], debeCambiarClave: false },
    );

    expect(res.totalRegistrados).toBe(1);
    expect(cacheService.delByPrefix).toHaveBeenCalledWith('dashboard:');
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'asistencia.registrada',
      expect.objectContaining({ grupoId: 'grp-1' }),
    );
  });
});
