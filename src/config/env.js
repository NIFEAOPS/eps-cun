const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = Object.freeze({
  apiGatewayUrl: trimTrailingSlash(import.meta.env.VITE_API_GATEWAY_URL ?? ''),
  appointmentsServiceUrl: trimTrailingSlash(import.meta.env.VITE_APPOINTMENTS_SERVICE_URL ?? ''),
  medicationsServiceUrl: trimTrailingSlash(import.meta.env.VITE_MEDICATIONS_SERVICE_URL ?? ''),
  authLoginPath: import.meta.env.VITE_AUTH_LOGIN_PATH ?? '/auth/login',
  jwtStorageKey: import.meta.env.VITE_JWT_STORAGE_KEY ?? 'clinical_sanctuary_session',
  requestTimeoutMs: toPositiveNumber(import.meta.env.VITE_REQUEST_TIMEOUT_MS, 15000),
});

const servicePathByName = {
  appointments: '/appointments',
  medications: '/medications',
};

export function resolveServiceBaseUrl(serviceName) {
  if (serviceName === 'appointments' && env.appointmentsServiceUrl) {
    return env.appointmentsServiceUrl;
  }

  if (serviceName === 'medications' && env.medicationsServiceUrl) {
    return env.medicationsServiceUrl;
  }

  if (env.apiGatewayUrl) {
    const basePath = servicePathByName[serviceName] ?? '';
    return `${env.apiGatewayUrl}${basePath}`;
  }

  throw new Error(
    `Service base URL not configured for ${serviceName}. Configure VITE_API_GATEWAY_URL or VITE_${serviceName.toUpperCase()}_SERVICE_URL.`,
  );
}

export function joinUrl(baseUrl, path) {
  if (!path) {
    return baseUrl;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const normalizedBase = trimTrailingSlash(baseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
