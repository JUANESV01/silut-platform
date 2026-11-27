import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import {
  Asistencia,
  Auditoria,
  Educador,
  Estudiante,
  Evaluacion,
  Grupo,
  Horario,
  IndicadorEvaluacion,
  Inscripcion,
  Notificacion,
  Programa,
  Rol,
  Salon,
  Sesion,
  Usuario,
} from './database/entities';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuthModule } from './auth/auth.module';
import { EstudiantesModule } from './estudiantes/estudiantes.module';
import { ProgramasModule } from './programas/programas.module';
import { InscripcionesModule } from './inscripciones/inscripciones.module';
import { AsistenciaModule } from './asistencia/asistencia.module';
import { EvaluacionModule } from './evaluacion/evaluacion.module';
import { ReportesModule } from './reportes/reportes.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { MigracionModule } from './migracion/migracion.module';
import { HealthModule } from './health/health.module';
import { SeedService } from './database/seed.service';

const ALL_ENTITIES = [
  Rol,
  Usuario,
  Salon,
  Programa,
  IndicadorEvaluacion,
  Educador,
  Estudiante,
  Grupo,
  Horario,
  Inscripcion,
  Sesion,
  Asistencia,
  Evaluacion,
  Notificacion,
  Auditoria,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const useSsl =
          config.get<string>('DB_SSL') === 'true' ||
          (config.get<string>('NODE_ENV') === 'production' &&
            config.get<string>('DB_SSL') !== 'false');

        return {
          type: 'postgres',
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: config.get<string>('DB_HOST') || 'localhost',
                port: Number(config.get<string>('DB_PORT') || 5432),
                username: config.get<string>('DB_USER') || 'lucytejada',
                password:
                  config.get<string>('DB_PASS') || 'lucytejada_dev_password',
                database: config.get<string>('DB_NAME') || 'lucytejada_gea',
              }),
          entities: ALL_ENTITIES,
          synchronize: config.get<string>('DB_SYNCHRONIZE') !== 'false',
          ssl: useSsl ? { rejectUnauthorized: false } : false,
          extra: {
            max: 25, // Pool dimensionado para picos concurrentes (ATAM SP-1 / R1)
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
          },
        };
      },
    }),
    TypeOrmModule.forFeature(ALL_ENTITIES),
    CommonModule,
    AuthModule,
    EstudiantesModule,
    ProgramasModule,
    InscripcionesModule,
    AsistenciaModule,
    EvaluacionModule,
    ReportesModule,
    DashboardsModule,
    NotificacionesModule,
    AuditoriaModule,
    MigracionModule,
    HealthModule,
  ],
  providers: [
    SeedService,
    // Pipeline global de seguridad (Entrega 2, Sec. 4.4.1 y ATAM RK-1)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
