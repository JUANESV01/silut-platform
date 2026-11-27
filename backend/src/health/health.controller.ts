import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '../common/decorators/auth.decorators';
import { CacheService } from '../common/cache/cache.service';

/**
 * Endpoint /health para detección de fallas Ping/Eco (Entrega 2, Sec. 4.7 y 5.2.1).
 * Usado por Render y balanceadores de carga.
 */
@ApiTags('Salud del Sistema')
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Verifica estado de API, PostgreSQL y caché/Redis (ping/eco)' })
  async check() {
    let dbOk = false;
    try {
      await this.dataSource.query('SELECT 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const payload = {
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database: dbOk ? 'up' : 'down',
        cache: this.cacheService.isRedisConnected() ? 'redis' : 'memory-fallback',
      },
    };

    if (!dbOk) {
      throw new ServiceUnavailableException(payload);
    }

    return payload;
  }
}
