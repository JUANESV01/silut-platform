import { BadRequestException } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';

describe('DashboardsService (ADM-05 / Proxy de Caché TR-1)', () => {
  const mockRepo = () => ({
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  });

  it('devuelve datos desde caché cuando existe entrada vigente y rechaza tipos inválidos', async () => {
    const cacheService: any = {
      get: jest.fn().mockResolvedValue({
        tipo: 'matricula',
        totalActivas: 42,
        ultimaActualizacion: '2026-11-26T18:00:00Z',
      }),
      set: jest.fn(),
    };

    const service = new DashboardsService(
      mockRepo() as any,
      mockRepo() as any,
      mockRepo() as any,
      mockRepo() as any,
      mockRepo() as any,
      mockRepo() as any,
      mockRepo() as any,
      mockRepo() as any,
      cacheService,
      { get: jest.fn().mockReturnValue('3') } as any,
    );

    const cached = await service.obtenerDashboard('matricula', false);
    expect(cached.desdeCache).toBe(true);
    expect(cached.totalActivas).toBe(42);

    await expect(service.obtenerDashboard('inexistente')).rejects.toThrow(
      BadRequestException,
    );
  });
});
