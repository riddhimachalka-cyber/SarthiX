const SAFE_ERROR_CODES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ETIMEDOUT',
  'ECONNABORTED',
  '28P01',
  '28000',
  '3D000',
  '57014',
  '08000',
  '08001',
  '08004',
  '08006',
  '08007',
  '08P01',
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'CERT_UNTRUSTED',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'ERR_TLS_HANDSHAKE_TIMEOUT',
]);

const CATEGORY_MESSAGES = {
  dns: 'Database host name could not be resolved.',
  network: 'Database network connection could not be established.',
  timeout: 'Database connection or query timed out.',
  authentication: 'Database authentication was rejected.',
  database: 'Database connection or query failed.',
  tls: 'Database TLS negotiation failed.',
};

function categoryFor(code) {
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(code)) return 'dns';
  if (['ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'ECONNABORTED'].includes(code)) return 'network';
  if (['ETIMEDOUT', '57014'].includes(code)) return 'timeout';
  if (['28P01', '28000'].includes(code)) return 'authentication';
  if (code === '3D000') return 'database';
  if (code.startsWith('CERT_') || code.includes('SELF_SIGNED_CERT') || code.startsWith('ERR_TLS')) return 'tls';
  if (code.startsWith('08')) return 'network';
  return 'database';
}

export function databaseErrorDiagnostic(error) {
  const suppliedCode = typeof error?.code === 'string' ? error.code : '';
  const code = SAFE_ERROR_CODES.has(suppliedCode)
    || (/^[0-9A-Z]{5}$/.test(suppliedCode) && suppliedCode.startsWith('08'))
    ? suppliedCode
    : 'UNKNOWN';
  const category = categoryFor(code);
  return {
    code,
    category,
    message: CATEGORY_MESSAGES[category],
  };
}

export function logDatabaseError(error, logger = console.error) {
  logger('[database] PostgreSQL operation failed', databaseErrorDiagnostic(error));
}
