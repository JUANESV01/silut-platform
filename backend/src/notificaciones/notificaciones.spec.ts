import {
  NotifAsistenciaListener,
  NotifCredencialesListener,
  NotifMatriculaListener,
} from './notificaciones.listeners';

describe('Patrón Observer - Listeners de Notificaciones (EST-03 / EST-06 / R10)', () => {
  it('encola correo de credenciales con máxima prioridad y sin documento de identidad (R10)', async () => {
    const mockService: any = { encolar: jest.fn().mockResolvedValue({}) };
    const listener = new NotifCredencialesListener(mockService);

    await listener.manejar({
      usuarioId: 'u-1',
      correo: 'nuevo@correo.com',
      nombreCompleto: 'Camila Giraldo',
      claveTemporal: 'LucyABC*9',
    });

    expect(mockService.encolar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'CREDENCIALES',
        prioridad: 1,
        destinatarioCorreo: 'nuevo@correo.com',
      }),
    );
  });

  it('encola confirmación de matrícula al recibir inscripcion.creada', async () => {
    const mockService: any = { encolar: jest.fn().mockResolvedValue({}) };
    const listener = new NotifMatriculaListener(mockService);

    await listener.manejar({
      inscripcionId: 'i-1',
      usuarioId: 'u-1',
      correo: 'est@correo.com',
      estudianteNombre: 'Mateo',
      programaNombre: 'Teatro',
      grupoNombre: 'Teatro A',
      salonNombre: 'Sala 1',
      educadorNombre: 'Andrés Marín',
    });

    expect(mockService.encolar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'MATRICULA' }),
    );
  });

  it('dispara alertas por inasistencias reiteradas al recibir asistencia.registrada', async () => {
    const mockService: any = { encolar: jest.fn().mockResolvedValue({}) };
    const listener = new NotifAsistenciaListener(mockService);

    await listener.manejar({
      grupoId: 'g-1',
      grupoNombre: 'Danza A',
      programaNombre: 'Danza',
      fecha: '2026-11-20',
      alertasDesercion: [
        {
          usuarioId: 'u-5',
          correo: 'est5@correo.com',
          estudianteNombre: 'Sofía',
          inasistenciasConsecutivas: 3,
        },
      ],
    });

    expect(mockService.encolar).toHaveBeenCalledTimes(1);
    expect(mockService.encolar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ALERTA_ASISTENCIA' }),
    );
  });
});
