import { HttpException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { STRONG_PASSWORD_REGEX } from './auth.dto';
import { RoleName } from '../common/enums';

describe('AuthService (Seguridad / ABAS 4 S2 / Bloqueo por fuerza bruta)', () => {
  const mockRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn((x) => Promise.resolve(x)),
    create: jest.fn((x) => x),
  });

  let service: AuthService;
  let usuarioRepo: any;
  let eventEmitter: any;

  beforeEach(() => {
    usuarioRepo = mockRepo();
    eventEmitter = { emit: jest.fn() };
    const jwtService: any = {
      signAsync: jest.fn().mockResolvedValue('jwt-mock-token'),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };
    const configService: any = { get: jest.fn().mockReturnValue('secret') };
    const cacheService: any = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      usuarioRepo,
      mockRepo() as any,
      mockRepo() as any,
      mockRepo() as any,
      jwtService,
      configService,
      eventEmitter,
      cacheService,
    );
  });

  it('valida política de contraseñas robustas', () => {
    expect(STRONG_PASSWORD_REGEX.test('Admin2026*')).toBe(true);
    expect(STRONG_PASSWORD_REGEX.test('debil123')).toBe(false);
    expect(STRONG_PASSWORD_REGEX.test('Ab1*')).toBe(false);
  });

  it('bloquea la cuenta temporalmente tras 5 intentos fallidos (ABAS 4)', async () => {
    const hash = await bcrypt.hash('ClaveCorrecta2026*', 8);
    const usuario = {
      id: 'u-1',
      correo: 'admin@lucytejada.pereira.gov.co',
      hashClave: hash,
      activo: true,
      intentosFallidos: 4,
      bloqueadoHasta: null,
      mfaActivo: false,
      roles: [{ nombre: RoleName.ADMINISTRADOR }],
    };
    usuarioRepo.findOne.mockResolvedValue(usuario);

    await expect(
      service.login({ correo: usuario.correo, clave: 'Incorrecta!' }, '127.0.0.1'),
    ).rejects.toThrow(UnauthorizedException);

    expect(usuario.intentosFallidos).toBe(5);
    expect(usuario.bloqueadoHasta).not.toBeNull();

    // Siguiente intento debe devolver 429 TOO_MANY_REQUESTS
    await expect(
      service.login({ correo: usuario.correo, clave: 'ClaveCorrecta2026*' }, '127.0.0.1'),
    ).rejects.toThrow(HttpException);
  });

  it('solicita código MFA cuando el usuario tiene 2FA activo', async () => {
    const hash = await bcrypt.hash('Admin2026*', 8);
    usuarioRepo.findOne.mockResolvedValue({
      id: 'u-2',
      correo: 'admin@lucytejada.pereira.gov.co',
      hashClave: hash,
      activo: true,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      mfaActivo: true,
      mfaSecreto: 'JBSWY3DPEHPK3PXP',
      roles: [{ nombre: RoleName.ADMINISTRADOR }],
    });

    const res = await service.login(
      { correo: 'admin@lucytejada.pereira.gov.co', clave: 'Admin2026*' },
      '127.0.0.1',
    );
    expect(res.mfaRequired).toBe(true);
  });

  it('permite solicitar y completar la recuperación de contraseña con código temporal de un solo uso', async () => {
    const store = new Map<string, any>();
    const cacheService: any = {
      get: jest.fn((k) => Promise.resolve(store.get(k) ?? null)),
      set: jest.fn((k, v) => {
        store.set(k, v);
        return Promise.resolve();
      }),
      del: jest.fn((k) => {
        store.delete(k);
        return Promise.resolve();
      }),
    };
    const configService: any = { get: jest.fn().mockReturnValue(undefined) };
    const recoveryService = new AuthService(
      usuarioRepo,
      mockRepo() as any,
      mockRepo() as any,
      mockRepo() as any,
      { signAsync: jest.fn(), verifyAsync: jest.fn(), decode: jest.fn() } as any,
      configService,
      eventEmitter,
      cacheService,
    );

    const usuario = {
      id: 'u-rec',
      correo: 'estudiante@lucytejada.pereira.gov.co',
      hashClave: 'old-hash',
      activo: true,
      debeCambiarClave: true,
      intentosFallidos: 3,
      bloqueadoHasta: new Date(Date.now() + 60000),
    };
    usuarioRepo.findOne.mockResolvedValue(usuario);

    const reqRes: any = await recoveryService.solicitarRecuperacionClave(
      { correo: usuario.correo },
      '127.0.0.1',
    );
    expect(reqRes.codigoDemo).toMatch(/^\d{6}$/);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'usuario.recuperacion_clave',
      expect.objectContaining({ correo: usuario.correo }),
    );

    const resetRes = await recoveryService.restablecerClave(
      {
        correo: usuario.correo,
        codigo: reqRes.codigoDemo,
        claveNueva: 'NuevaSegura2026*',
      },
      '127.0.0.1',
    );
    expect(resetRes.message).toContain('restablecida');
    expect(usuario.intentosFallidos).toBe(0);
    expect(usuario.bloqueadoHasta).toBeNull();
    expect(store.has(`pwd:reset:${usuario.correo}`)).toBe(false);
  });
});
