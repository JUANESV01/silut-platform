import { sanitizeForLog, maskEmail } from './secure-logger';

describe('Secure Logger - Sanitización de logs y protección de secretos', () => {
  it('redacta campos sensibles de objetos anidados y tokens JWT/Bearer', () => {
    const clean: any = sanitizeForLog({
      correo: 'admin@lucytejada.pereira.gov.co',
      clave: 'SuperSecret2026*',
      claveNueva: 'OtraClave2026*',
      authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature123',
      nested: { mfaSecreto: 'JBSWY3DPEHPK3PXP', ok: true },
    });

    expect(clean.clave).toBe('[REDACTED]');
    expect(clean.claveNueva).toBe('[REDACTED]');
    expect(clean.authorization).toBe('[REDACTED]');
    expect(clean.nested.mfaSecreto).toBe('[REDACTED]');
    expect(clean.nested.ok).toBe(true);
  });

  it('redacta JWTs incrustados en cadenas de texto libre', () => {
    const text = sanitizeForLog(
      'Error en Bearer abc123token con eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc1234567890',
    );
    expect(text).toContain('Bearer [REDACTED]');
    expect(text).toContain('[JWT_REDACTED]');
  });

  it('enmascara direcciones de correo para logs de consola', () => {
    expect(maskEmail('admin@lucytejada.pereira.gov.co')).toBe(
      'ad***@lucytejada.pereira.gov.co',
    );
  });
});
