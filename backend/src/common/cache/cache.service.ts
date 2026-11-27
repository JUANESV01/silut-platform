import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

/**
 * Servicio de caché Proxy (cache-aside) con soporte Redis y degradación controlada
 * en memoria (Entrega 2, Sec. 5.2.1 y AD-6).
 * Si REDIS_URL no está configurado o Redis falla, el sistema continúa operando sin caerse.
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private redisAvailable = false;
  private readonly memoryStore = new Map<string, MemoryEntry>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.log(
        'REDIS_URL no configurado: operando en modo degradado con caché en memoria (TTL).',
      );
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        lazyConnect: true,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
      });

      this.redis.on('ready', () => {
        this.redisAvailable = true;
        this.logger.log('Conexión a Redis establecida correctamente.');
      });

      this.redis.on('error', (err) => {
        if (this.redisAvailable) {
          this.logger.warn(`Redis no disponible, usando caché en memoria: ${err.message}`);
        }
        this.redisAvailable = false;
      });

      await this.redis.connect();
      await this.redis.ping();
      this.redisAvailable = true;
    } catch (err) {
      this.logger.warn(
        `No se pudo conectar a Redis (${(err as Error).message}). Usando fallback en memoria.`,
      );
      this.redisAvailable = false;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        // ignorar al cerrar
      }
    }
  }

  isRedisConnected(): boolean {
    return this.redisAvailable;
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis && this.redisAvailable) {
      try {
        const raw = await this.redis.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        this.redisAvailable = false;
      }
    }

    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    const serialized = JSON.stringify(value);
    if (this.redis && this.redisAvailable) {
      try {
        await this.redis.set(key, serialized, 'EX', ttlSeconds);
        return;
      } catch {
        this.redisAvailable = false;
      }
    }

    this.memoryStore.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis && this.redisAvailable) {
      try {
        await this.redis.del(key);
      } catch {
        this.redisAvailable = false;
      }
    }
    this.memoryStore.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (this.redis && this.redisAvailable) {
      try {
        const keys = await this.redis.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch {
        this.redisAvailable = false;
      }
    }
    for (const k of Array.from(this.memoryStore.keys())) {
      if (k.startsWith(prefix)) {
        this.memoryStore.delete(k);
      }
    }
  }
}
