import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, IS_PUBLIC_KEY } from '../decorators/auth.decorators';
import { RoleName } from '../enums';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Control de acceso basado en roles (RBAC - AD-5).
 * Si un usuario autenticado intenta acceder a un recurso fuera de su rol,
 * se deniega con 403 y se emite evento de auditoría (ATAM S1).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !Array.isArray(user.roles)) {
      throw new ForbiddenException('No cuenta con permisos para esta operación');
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      this.eventEmitter.emit('auditoria.registrar', {
        usuarioId: user.id,
        usuarioCorreo: user.correo,
        accion: 'ACCESO_DENEGADO_ROL',
        entidad: request.route?.path || request.url,
        entidadId: request.params?.id || null,
        detalle: `Rol insuficiente. Requeridos: ${requiredRoles.join(', ')}. Actuales: ${user.roles.join(', ')}`,
        ip: request.ip || request.socket?.remoteAddress || 'unknown',
        exitoso: false,
      });

      throw new ForbiddenException(
        'No cuenta con los permisos necesarios para ejecutar esta acción.',
      );
    }

    return true;
  }
}
