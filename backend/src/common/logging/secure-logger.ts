/**
 * Utilidad de sanitización para logs y auditoría (Seguridad R08 / Entrega 2 Sec. 5.2.3).
 * Garantiza que contraseñas, tokens, códigos MFA y secretos jamás se escriban en logs ni BD.
 */
const SENSITIVE_KEYS = new Set([
  'clave',
  'claveactual',
  'clavenueva',
  'clavetemporal',
  'password',
  'hashclave',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'codigomfa',
  'mfasecreto',
  'secret',
  'codigo',
]);

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[TRUNCATED]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    // Redactar tokens Bearer o JWT embebidos en texto
    return value
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
      .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[JWT_REDACTED]');
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeForLog(item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = sanitizeForLog(v, depth + 1);
      }
    }
    return out;
  }

  return value;
}

export function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}
