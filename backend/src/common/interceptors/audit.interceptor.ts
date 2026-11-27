import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUDIT_KEY, AuditMetadata } from '../decorators/auth.decorators';
import { sanitizeForLog } from '../logging/secure-logger';

/**
 * Interceptor de auditoría transversal (Decorator @Auditar - Entrega 2, Sec. 5.1 y 5.2.3).
 * Registra creación, modificación, eliminación y accesos sensibles con usuario, IP y fecha.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata>(
      AUDIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown';

    return next.handle().pipe(
      tap((responseBody) => {
        const entityId =
          request.params?.id ||
          responseBody?.id ||
          responseBody?.data?.id ||
          null;
        this.eventEmitter.emit('auditoria.registrar', {
          usuarioId: user?.id || null,
          usuarioCorreo: user?.correo || request.body?.correo || 'anonimo',
          accion: metadata.accion,
          entidad: metadata.entidad,
          entidadId: entityId ? String(entityId) : null,
          detalle: `${request.method} ${request.originalUrl}`,
          ip,
          exitoso: true,
        });
      }),
      catchError((err) => {
        this.eventEmitter.emit('auditoria.registrar', {
          usuarioId: user?.id || null,
          usuarioCorreo: user?.correo || request.body?.correo || 'anonimo',
          accion: metadata.accion,
          entidad: metadata.entidad,
          entidadId: request.params?.id || null,
          detalle: String(
            sanitizeForLog(
              `Error en ${request.method} ${request.originalUrl}: ${err?.message || 'Error'}`,
            ),
          ),
          ip,
          exitoso: false,
        });
        return throwError(() => err);
      }),
    );
  }
}
