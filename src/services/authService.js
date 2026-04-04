import { env, joinUrl } from '../config/env';
import { httpRequest, ServiceError } from './httpClient';
import { clearSession, getSession, setSession } from './tokenStorage';

const normalizeRole = (role) => {
  const normalized = String(role ?? '').toLowerCase();

  if (normalized.includes('admin')) {
    return 'Admin';
  }

  return 'Paciente';
};

const parseJwtPayload = (token) => {
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length < 2) {
      return null;
    }

    const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const mapAuthErrorMessage = (error) => {
  if (error instanceof ServiceError && error.statusCode === 401) {
    return 'Credenciales invalidas o token expirado.';
  }

  if (error instanceof ServiceError && error.statusCode === 403) {
    return 'El rol no tiene permisos para acceder a este modulo.';
  }

  if (error instanceof ServiceError) {
    return `${error.message} (trace: ${error.requestId ?? 'n/a'})`;
  }

  return 'No se pudo autenticar la sesion. Intenta de nuevo.';
};

export async function login({ email, password, role }) {
  if (!email || !password) {
    throw new Error('Email y password son obligatorios.');
  }

  if (!env.apiGatewayUrl) {
    throw new Error('Configura VITE_API_GATEWAY_URL para autenticar via API Gateway.');
  }

  try {
    const authResponse = await httpRequest(joinUrl(env.apiGatewayUrl, env.authLoginPath), {
      method: 'POST',
      requiresAuth: false,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        email,
        password,
        role,
      },
    });

    const token = authResponse?.token ?? authResponse?.accessToken;
    if (!token) {
      throw new Error('Respuesta de login invalida: token ausente.');
    }

    const tokenPayload = parseJwtPayload(token);
    const resolvedRole = normalizeRole(authResponse?.user?.role ?? tokenPayload?.role ?? role);

    const session = {
      token,
      user: {
        id: authResponse?.user?.id ?? tokenPayload?.sub ?? email,
        email,
        role: resolvedRole,
        fullName: authResponse?.user?.fullName ?? tokenPayload?.name ?? 'Usuario EPS',
      },
      issuedAt: new Date().toISOString(),
    };

    setSession(session);
    return session;
  } catch (error) {
    throw new Error(mapAuthErrorMessage(error));
  }
}

export function getCurrentSession() {
  return getSession();
}

export function logout() {
  clearSession();
}

export function isAuthenticated() {
  const session = getSession();
  return !!session?.token;
}
