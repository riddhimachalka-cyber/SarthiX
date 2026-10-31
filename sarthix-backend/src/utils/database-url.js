export function isExpectedIntegrationUrl(value, projectRef) {
  let uri;
  try {
    uri = new URL(value);
    return ['postgres:', 'postgresql:'].includes(uri.protocol)
      && uri.hostname.toLowerCase().endsWith('.pooler.supabase.com')
      && uri.port === '5432'
      && uri.pathname.replace(/^\/+|\/+$/g, '') === 'postgres'
      && decodeURIComponent(uri.username) === `postgres.${projectRef}`;
  } catch {
    return false;
  }
}
