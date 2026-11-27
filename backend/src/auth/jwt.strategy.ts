import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, RequestUser } from '../common/enums';
import { CacheService } from '../common/cache/cache.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'dev_jwt_secret_lucy_tejada_2026',
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (payload.jti) {
      const revoked = await this.cacheService.get<boolean>(
        `jwt:revoked:${payload.jti}`,
      );
      if (revoked) {
        throw new UnauthorizedException('La sesión ha sido revocada');
      }
    }

    return {
      id: payload.sub,
      correo: payload.correo,
      roles: payload.roles,
      debeCambiarClave: payload.debeCambiarClave,
    };
  }
}
