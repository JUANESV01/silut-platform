import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
  ConflictException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { createHash, randomInt, randomUUID } from 'crypto';
import { Educador, Estudiante, Rol, Usuario } from '../database/entities';
import { JwtPayload, RoleName } from '../common/enums';
import { CacheService } from '../common/cache/cache.service';
import {
  ActualizarRolUsuarioDto,
  CambiarClaveDto,
  CrearUsuarioDto,
  LoginDto,
  RestablecerClaveDto,
  SolicitarRecuperacionDto,
} from './auth.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    @InjectRepository(Educador)
    private readonly educadorRepo: Repository<Educador>,
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  async login(dto: LoginDto, ip: string) {
    const correo = dto.correo.trim().toLowerCase();
    const usuario = await this.usuarioRepo.findOne({
      where: { correo },
      relations: ['roles'],
    });

    if (!usuario || !usuario.activo) {
      this.eventEmitter.emit('auditoria.registrar', {
        usuarioCorreo: correo,
        accion: 'LOGIN_FALLIDO',
        entidad: 'Usuario',
        detalle: 'Usuario inexistente o inactivo',
        ip,
        exitoso: false,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Bloqueo temporal tras 5 intentos fallidos en 15 min (ABAS 4 / S2)
    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta.getTime() > Date.now()) {
      const minutos = Math.ceil(
        (usuario.bloqueadoHasta.getTime() - Date.now()) / 60000,
      );
      this.eventEmitter.emit('auditoria.registrar', {
        usuarioId: usuario.id,
        usuarioCorreo: usuario.correo,
        accion: 'LOGIN_BLOQUEADO',
        entidad: 'Usuario',
        entidadId: usuario.id,
        detalle: `Cuenta bloqueada por intentos fallidos. Restan ${minutos} min.`,
        ip,
        exitoso: false,
      });
      throw new HttpException(
        {
          code: 'ACCOUNT_LOCKED',
          message: `Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intente nuevamente en ${minutos} minuto(s).`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const passwordValid = await bcrypt.compare(dto.clave, usuario.hashClave);
    if (!passwordValid) {
      usuario.intentosFallidos += 1;
      if (usuario.intentosFallidos >= MAX_FAILED_ATTEMPTS) {
        usuario.bloqueadoHasta = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
      }
      await this.usuarioRepo.save(usuario);

      this.eventEmitter.emit('auditoria.registrar', {
        usuarioId: usuario.id,
        usuarioCorreo: usuario.correo,
        accion: 'LOGIN_FALLIDO',
        entidad: 'Usuario',
        entidadId: usuario.id,
        detalle: `Contraseña incorrecta (intento ${usuario.intentosFallidos}/${MAX_FAILED_ATTEMPTS})`,
        ip,
        exitoso: false,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificación MFA TOTP si está activo en el usuario
    if (usuario.mfaActivo && usuario.mfaSecreto) {
      if (!dto.codigoMfa) {
        return {
          mfaRequired: true,
          message: 'Ingrese el código de verificación en dos pasos (2FA/TOTP).',
        };
      }
      const isCodeValid = authenticator.verify({
        token: dto.codigoMfa.trim(),
        secret: usuario.mfaSecreto,
      });
      if (!isCodeValid) {
        this.eventEmitter.emit('auditoria.registrar', {
          usuarioId: usuario.id,
          usuarioCorreo: usuario.correo,
          accion: 'MFA_FALLIDO',
          entidad: 'Usuario',
          entidadId: usuario.id,
          detalle: 'Código TOTP inválido',
          ip,
          exitoso: false,
        });
        throw new UnauthorizedException('Código de verificación 2FA inválido');
      }
    }

    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = null;
    usuario.ultimoAcceso = new Date();
    await this.usuarioRepo.save(usuario);

    const tokens = await this.generarTokens(usuario);
    const perfil = await this.obtenerPerfil(usuario.id);

    this.eventEmitter.emit('auditoria.registrar', {
      usuarioId: usuario.id,
      usuarioCorreo: usuario.correo,
      accion: 'LOGIN_EXITOSO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      detalle: `Inicio de sesión exitoso (${perfil.roles.join(', ')})`,
      ip,
      exitoso: true,
    });

    return {
      mfaRequired: false,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      usuario: perfil,
    };
  }

  async generarTokens(usuario: Usuario) {
    const roles = (usuario.roles || []).map((r) => r.nombre);
    const jti = randomUUID();
    const payload: JwtPayload = {
      sub: usuario.id,
      correo: usuario.correo,
      roles,
      debeCambiarClave: usuario.debeCambiarClave,
      mfaVerified: usuario.mfaActivo,
      jti,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret:
        this.configService.get<string>('JWT_SECRET') ||
        'dev_jwt_secret_lucy_tejada_2026',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: usuario.id, jti },
      {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'dev_refresh_secret_lucy_tejada_2026',
        expiresIn:
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token requerido');
    }
    try {
      const decoded = await this.jwtService.verifyAsync<{ sub: string; jti?: string }>(
        refreshToken,
        {
          secret:
            this.configService.get<string>('JWT_REFRESH_SECRET') ||
            'dev_refresh_secret_lucy_tejada_2026',
        },
      );
      if (decoded.jti) {
        const revoked = await this.cacheService.get<boolean>(
          `jwt:revoked:${decoded.jti}`,
        );
        if (revoked) throw new UnauthorizedException('Sesión revocada');
      }
      const usuario = await this.usuarioRepo.findOne({
        where: { id: decoded.sub, activo: true },
        relations: ['roles'],
      });
      if (!usuario) throw new UnauthorizedException('Usuario no disponible');
      const tokens = await this.generarTokens(usuario);
      const perfil = await this.obtenerPerfil(usuario.id);
      return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, usuario: perfil };
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async logout(token?: string, userId?: string, correo?: string, ip?: string) {
    if (token) {
      try {
        const decoded = this.jwtService.decode(token) as JwtPayload | null;
        if (decoded?.jti) {
          await this.cacheService.set(`jwt:revoked:${decoded.jti}`, true, 900);
        }
      } catch {
        // ignorar
      }
    }
    this.eventEmitter.emit('auditoria.registrar', {
      usuarioId: userId || null,
      usuarioCorreo: correo || null,
      accion: 'LOGOUT',
      entidad: 'Usuario',
      entidadId: userId || null,
      detalle: 'Cierre de sesión',
      ip: ip || 'unknown',
      exitoso: true,
    });
    return { message: 'Sesión cerrada correctamente' };
  }

  async cambiarClave(usuarioId: string, dto: CambiarClaveDto, ip: string) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id: usuarioId },
      relations: ['roles'],
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const validActual = await bcrypt.compare(dto.claveActual, usuario.hashClave);
    if (!validActual) {
      throw new UnprocessableEntityException('La contraseña actual es incorrecta');
    }

    const sameAsOld = await bcrypt.compare(dto.claveNueva, usuario.hashClave);
    if (sameAsOld) {
      throw new UnprocessableEntityException(
        'La nueva contraseña no puede ser igual a la anterior',
      );
    }

    usuario.hashClave = await bcrypt.hash(dto.claveNueva, 12);
    usuario.debeCambiarClave = false;
    await this.usuarioRepo.save(usuario);

    this.eventEmitter.emit('auditoria.registrar', {
      usuarioId: usuario.id,
      usuarioCorreo: usuario.correo,
      accion: 'CAMBIO_CLAVE',
      entidad: 'Usuario',
      entidadId: usuario.id,
      detalle: 'Contraseña actualizada correctamente',
      ip,
      exitoso: true,
    });

    const tokens = await this.generarTokens(usuario);
    const perfil = await this.obtenerPerfil(usuario.id);

    return {
      message: 'Contraseña actualizada correctamente',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      usuario: perfil,
    };
  }

  /**
   * Recuperación de contraseña (R11 / autoservicio seguro).
   * Genera un código criptográfico de 6 dígitos de un solo uso con expiración de 15 min,
   * almacena únicamente su hash SHA-256 en caché y evita enumerar si el correo existe.
   */
  async solicitarRecuperacionClave(dto: SolicitarRecuperacionDto, ip: string) {
    const correo = dto.correo.trim().toLowerCase();
    const usuario = await this.usuarioRepo.findOne({ where: { correo, activo: true } });

    const mensajeGenerico =
      'Si el correo corresponde a una cuenta activa en SILUT, hemos enviado un código de verificación de 6 dígitos válido por 15 minutos.';

    if (!usuario) {
      this.eventEmitter.emit('auditoria.registrar', {
        usuarioCorreo: correo,
        accion: 'SOLICITUD_RECUPERACION_CLAVE',
        entidad: 'Usuario',
        detalle: 'Solicitud recibida para correo no registrado o inactivo',
        ip,
        exitoso: false,
      });
      return { message: mensajeGenerico };
    }

    const codigo = String(randomInt(100000, 999999));
    const codigoHash = createHash('sha256').update(`${correo}:${codigo}`).digest('hex');

    await this.cacheService.set(
      `pwd:reset:${correo}`,
      { hash: codigoHash, usuarioId: usuario.id, intentos: 0 },
      15 * 60, // 15 minutos
    );

    this.eventEmitter.emit('usuario.recuperacion_clave', {
      usuarioId: usuario.id,
      correo: usuario.correo,
      codigo,
      expiracionMinutos: 15,
    });

    this.eventEmitter.emit('auditoria.registrar', {
      usuarioId: usuario.id,
      usuarioCorreo: usuario.correo,
      accion: 'SOLICITUD_RECUPERACION_CLAVE',
      entidad: 'Usuario',
      entidadId: usuario.id,
      detalle: 'Código de recuperación temporal generado y encolado',
      ip,
      exitoso: true,
    });

    const tieneSmtp = !!this.configService.get<string>('SMTP_HOST');
    return {
      message: mensajeGenerico,
      // Si no hay servidor SMTP externo configurado (demo/Render sin SMTP), facilitamos el código
      // para permitir validar el flujo de recuperación completo durante la sustentación.
      ...(!tieneSmtp ? { codigoDemo: codigo } : {}),
    };
  }

  async restablecerClave(dto: RestablecerClaveDto, ip: string) {
    const correo = dto.correo.trim().toLowerCase();
    const registro = await this.cacheService.get<{
      hash: string;
      usuarioId: string;
      intentos: number;
    }>(`pwd:reset:${correo}`);

    if (!registro) {
      throw new UnprocessableEntityException(
        'El código de recuperación es inválido o ha expirado. Solicita uno nuevo.',
      );
    }

    if (registro.intentos >= 5) {
      await this.cacheService.del(`pwd:reset:${correo}`);
      throw new HttpException(
        {
          code: 'RESET_TOO_MANY_ATTEMPTS',
          message: 'Se superó el límite de intentos para este código. Solicita uno nuevo.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const incomingHash = createHash('sha256')
      .update(`${correo}:${dto.codigo.trim()}`)
      .digest('hex');

    if (incomingHash !== registro.hash) {
      await this.cacheService.set(
        `pwd:reset:${correo}`,
        { ...registro, intentos: registro.intentos + 1 },
        15 * 60,
      );
      this.eventEmitter.emit('auditoria.registrar', {
        usuarioId: registro.usuarioId,
        usuarioCorreo: correo,
        accion: 'RESTABLECIMIENTO_CLAVE_FALLIDO',
        entidad: 'Usuario',
        entidadId: registro.usuarioId,
        detalle: 'Código de recuperación incorrecto',
        ip,
        exitoso: false,
      });
      throw new UnprocessableEntityException('El código de verificación ingresado es incorrecto.');
    }

    const usuario = await this.usuarioRepo.findOne({
      where: { id: registro.usuarioId, activo: true },
    });
    if (!usuario) {
      throw new NotFoundException('Cuenta no disponible');
    }

    usuario.hashClave = await bcrypt.hash(dto.claveNueva, 12);
    usuario.debeCambiarClave = false;
    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = null;
    await this.usuarioRepo.save(usuario);
    await this.cacheService.del(`pwd:reset:${correo}`);

    this.eventEmitter.emit('auditoria.registrar', {
      usuarioId: usuario.id,
      usuarioCorreo: usuario.correo,
      accion: 'RESTABLECIMIENTO_CLAVE_EXITOSO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      detalle: 'Contraseña restablecida mediante código temporal seguro',
      ip,
      exitoso: true,
    });

    return {
      message: 'Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión.',
    };
  }

  async configurarMfa(usuarioId: string) {
    const usuario = await this.usuarioRepo.findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      usuario.correo,
      'SILUT Centro Cultural Lucy Tejada',
      secret,
    );
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Guardamos el secreto temporalmente hasta que el usuario confirme el código
    await this.cacheService.set(`mfa:pending:${usuarioId}`, secret, 600);

    return {
      secret,
      otpauthUrl,
      qrDataUrl,
      codigoDemoActual: authenticator.generate(secret),
    };
  }

  async activarMfa(usuarioId: string, codigo: string) {
    const usuario = await this.usuarioRepo.findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const pendingSecret = await this.cacheService.get<string>(
      `mfa:pending:${usuarioId}`,
    );
    const secret = pendingSecret || usuario.mfaSecreto;
    if (!secret) {
      throw new UnprocessableEntityException(
        'Primero debe iniciar la configuración de 2FA',
      );
    }

    const valid = authenticator.verify({ token: codigo.trim(), secret });
    if (!valid) {
      throw new UnprocessableEntityException('Código TOTP inválido o expirado');
    }

    usuario.mfaSecreto = secret;
    usuario.mfaActivo = true;
    await this.usuarioRepo.save(usuario);
    await this.cacheService.del(`mfa:pending:${usuarioId}`);

    this.eventEmitter.emit('auditoria.registrar', {
      usuarioId: usuario.id,
      usuarioCorreo: usuario.correo,
      accion: 'MFA_ACTIVADO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      detalle: 'Autenticación en dos factores (2FA) habilitada',
      exitoso: true,
    });

    return { message: 'Autenticación en dos factores (2FA) activada correctamente', mfaActivo: true };
  }

  async desactivarMfa(usuarioId: string) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id: usuarioId },
      relations: ['roles'],
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    usuario.mfaActivo = false;
    usuario.mfaSecreto = null;
    await this.usuarioRepo.save(usuario);

    this.eventEmitter.emit('auditoria.registrar', {
      usuarioId: usuario.id,
      usuarioCorreo: usuario.correo,
      accion: 'MFA_DESACTIVADO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      detalle: 'Autenticación en dos factores desactivada',
      exitoso: true,
    });

    return { message: 'Autenticación 2FA desactivada', mfaActivo: false };
  }

  async obtenerPerfil(usuarioId: string) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id: usuarioId },
      relations: ['roles'],
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const roles = (usuario.roles || []).map((r) => r.nombre);
    const estudiante = await this.estudianteRepo.findOne({ where: { usuarioId } });
    const educador = await this.educadorRepo.findOne({ where: { usuarioId } });

    const esPerfilCritico =
      roles.includes(RoleName.ADMINISTRADOR) ||
      roles.includes(RoleName.ADMINISTRATIVO);

    return {
      id: usuario.id,
      correo: usuario.correo,
      roles,
      debeCambiarClave: usuario.debeCambiarClave,
      mfaActivo: usuario.mfaActivo,
      mfaRecomendado: esPerfilCritico && !usuario.mfaActivo,
      activo: usuario.activo,
      ultimoAcceso: usuario.ultimoAcceso,
      nombreCompleto: estudiante
        ? `${estudiante.nombres} ${estudiante.apellidos}`
        : educador
          ? `${educador.nombres} ${educador.apellidos}`
          : usuario.correo.split('@')[0],
      estudianteId: estudiante?.id || null,
      educadorId: educador?.id || null,
    };
  }

  // Gestión administrativa de usuarios y roles (ADM-01)
  async listarUsuarios() {
    const usuarios = await this.usuarioRepo.find({
      relations: ['roles'],
      order: { creadoEn: 'DESC' },
    });
    return usuarios.map((u) => ({
      id: u.id,
      correo: u.correo,
      roles: (u.roles || []).map((r) => r.nombre),
      activo: u.activo,
      mfaActivo: u.mfaActivo,
      debeCambiarClave: u.debeCambiarClave,
      ultimoAcceso: u.ultimoAcceso,
      creadoEn: u.creadoEn,
    }));
  }

  async crearUsuario(dto: CrearUsuarioDto) {
    const correo = dto.correo.trim().toLowerCase();
    const existente = await this.usuarioRepo.findOne({ where: { correo } });
    if (existente) {
      throw new ConflictException('Ya existe una cuenta registrada con este correo');
    }

    const roles = await this.rolRepo.find({
      where: { nombre: In(dto.roles) },
    });
    if (roles.length === 0) {
      throw new UnprocessableEntityException('Debe asignar al menos un rol válido');
    }

    const hashClave = await bcrypt.hash(dto.clave, 12);
    const usuario = this.usuarioRepo.create({
      correo,
      hashClave,
      roles,
      debeCambiarClave: dto.debeCambiarClave ?? true,
      activo: true,
    });
    const saved = await this.usuarioRepo.save(usuario);

    if (dto.roles.includes(RoleName.EDUCADOR) && dto.nombres && dto.apellidos && dto.documento) {
      const edu = this.educadorRepo.create({
        usuarioId: saved.id,
        documento: dto.documento,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        especialidad: dto.especialidad || 'Formación Artística',
        activo: true,
      });
      await this.educadorRepo.save(edu);
    }

    this.eventEmitter.emit('usuario.credenciales_creadas', {
      usuarioId: saved.id,
      correo: saved.correo,
      nombreCompleto: dto.nombres ? `${dto.nombres} ${dto.apellidos || ''}`.trim() : saved.correo,
      claveTemporal: dto.clave,
    });

    return {
      id: saved.id,
      correo: saved.correo,
      roles: roles.map((r) => r.nombre),
      activo: saved.activo,
    };
  }

  async actualizarRolUsuario(id: string, dto: ActualizarRolUsuarioDto) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const roles = await this.rolRepo.find({
      where: { nombre: In(dto.roles) },
    });
    if (roles.length === 0) {
      throw new UnprocessableEntityException('Roles inválidos');
    }

    usuario.roles = roles;
    if (typeof dto.activo === 'boolean') {
      usuario.activo = dto.activo;
    }
    const updated = await this.usuarioRepo.save(usuario);
    return {
      id: updated.id,
      correo: updated.correo,
      roles: roles.map((r) => r.nombre),
      activo: updated.activo,
    };
  }
}
