import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  CambiarClaveDto,
  LoginDto,
  RestablecerClaveDto,
  SolicitarRecuperacionDto,
  VerificarMfaDto,
} from './auth.dto';
import {
  AllowPasswordChangePending,
  Public,
} from '../common/decorators/auth.decorators';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión (JWT + Refresh cookie HttpOnly + MFA opcional)' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    const result = await this.authService.login(dto, ip);

    if (!result.mfaRequired && result.refreshToken) {
      this.setRefreshCookie(res, result.refreshToken);
    }

    return {
      mfaRequired: result.mfaRequired,
      message: result.message,
      accessToken: result.accessToken,
      usuario: result.usuario,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar token de acceso desde cookie HttpOnly' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.gea_refresh_token || req.body?.refreshToken;
    const result = await this.authService.refresh(token);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      usuario: result.usuario,
    };
  }

  @ApiBearerAuth()
  @AllowPasswordChangePending()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión y revocar token actual' })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const authHeader = req.headers?.authorization as string | undefined;
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    res.clearCookie('gea_refresh_token', { path: '/' });
    return this.authService.logout(token, req.user?.id, req.user?.correo, req.ip);
  }

  @Public()
  @Post('recuperar-clave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar código seguro de recuperación de contraseña (15 min)' })
  recuperarClave(@Body() dto: SolicitarRecuperacionDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    return this.authService.solicitarRecuperacionClave(dto, ip);
  }

  @Public()
  @Post('restablecer-clave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña mediante código de recuperación de un solo uso' })
  restablecerClave(@Body() dto: RestablecerClaveDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    return this.authService.restablecerClave(dto, ip);
  }

  @ApiBearerAuth()
  @AllowPasswordChangePending()
  @Post('cambiar-clave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar contraseña (obligatorio en primer acceso - EST-03)' })
  async cambiarClave(
    @Body() dto: CambiarClaveDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.cambiarClave(req.user.id, dto, req.ip);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      message: result.message,
      accessToken: result.accessToken,
      usuario: result.usuario,
    };
  }

  @ApiBearerAuth()
  @AllowPasswordChangePending()
  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  me(@Req() req: any) {
    return this.authService.obtenerPerfil(req.user.id);
  }

  @ApiBearerAuth()
  @Post('mfa/configurar')
  @ApiOperation({ summary: 'Generar secreto y código QR para activar 2FA (TOTP)' })
  configurarMfa(@Req() req: any) {
    return this.authService.configurarMfa(req.user.id);
  }

  @ApiBearerAuth()
  @Post('mfa/activar')
  @ApiOperation({ summary: 'Verificar código TOTP y activar 2FA' })
  activarMfa(@Body() dto: VerificarMfaDto, @Req() req: any) {
    return this.authService.activarMfa(req.user.id, dto.codigo);
  }

  @ApiBearerAuth()
  @Post('mfa/desactivar')
  @ApiOperation({ summary: 'Desactivar autenticación en dos factores (2FA)' })
  desactivarMfa(@Req() req: any) {
    return this.authService.desactivarMfa(req.user.id);
  }

  private setRefreshCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('gea_refresh_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
