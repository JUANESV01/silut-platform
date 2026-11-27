import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  ALLOW_PASSWORD_CHANGE_PENDING_KEY,
} from '../decorators/auth.decorators';

/**
 * Guard global de autenticación (política de denegar por defecto - ATAM RK-1).
 * Además impone el cambio obligatorio de contraseña en el primer acceso (EST-03).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const activated = (await super.canActivate(context)) as boolean;
    if (!activated) {
      throw new UnauthorizedException('Token de acceso inválido o expirado');
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const allowPending = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_PENDING_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (user?.debeCambiarClave && !allowPending) {
      throw new ForbiddenException({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message:
          'Debe cambiar su contraseña temporal antes de acceder a la plataforma.',
      });
    }

    return true;
  }
}
