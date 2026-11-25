const BILLING_ORIGINS = new Set([
  'https://promptos.jussco.company',
  'https://promptos.foundercontrolroom.org',
  'https://jussray.github.io',
]);

export function billingCors(request) {
  const origin = request.headers.get('Origin');
  const headers = { Vary: 'Origin', 'Cache-Control': 'no-store' };
  if (origin === null) return { allowed: true, headers };
  if (!BILLING_ORIGINS.has(origin)) return { allowed: false, headers };
  return { allowed: true, headers: {
    ...headers,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  } };
}
