function assertSafeContentPath(path) {
  if (
    typeof path !== 'string' ||
    path.length === 0 ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.split('/').some((segment) => segment === '..' || segment === '')
  ) {
    throw new Error('Content paths must stay inside the public root');
  }
}

export function resolveContentUrl(path, baseUrl = '/') {
  assertSafeContentPath(path);

  const normalizedBase = `/${baseUrl}`.replace(/\/{2,}/g, '/').replace(/\/?$/, '/');
  return `${normalizedBase}${path}`;
}

