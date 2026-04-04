import { env } from '../config/env';
import { getAuthToken } from './tokenStorage';

export class ServiceError extends Error {
  constructor(message, { statusCode = null, details = null, requestId = null } = {}) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.details = details;
    this.requestId = requestId;
  }
}

const defaultHeaders = {
  Accept: 'application/json',
};

const generateRequestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

const parseJsonSafe = (text) => {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const extractErrorMessage = (payload, fallbackMessage) => {
  if (!payload) {
    return fallbackMessage;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (payload.message) {
    return String(payload.message);
  }

  if (payload.error) {
    return String(payload.error);
  }

  if (payload.resourceType === 'OperationOutcome' && Array.isArray(payload.issue) && payload.issue.length > 0) {
    const issue = payload.issue[0];
    return issue.diagnostics || issue.details?.text || fallbackMessage;
  }

  return fallbackMessage;
};

const parseResponsePayload = async (response) => {
  const text = await response.text();
  const parsed = parseJsonSafe(text);
  return parsed ?? text ?? null;
};

export async function httpRequest(
  url,
  {
    method = 'GET',
    body,
    headers = {},
    requiresAuth = true,
    timeoutMs = env.requestTimeoutMs,
  } = {},
) {
  const requestId = generateRequestId();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestHeaders = {
      ...defaultHeaders,
      ...headers,
      'X-Request-Id': requestId,
    };

    if (requiresAuth) {
      const token = getAuthToken();
      if (!token) {
        throw new ServiceError('No active session token found. Please log in again.', {
          requestId,
        });
      }

      requestHeaders.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = await parseResponsePayload(response);

    if (!response.ok) {
      const message = extractErrorMessage(payload, `Request failed with status ${response.status}.`);
      throw new ServiceError(message, {
        statusCode: response.status,
        details: payload,
        requestId,
      });
    }

    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ServiceError('Request timed out. Please retry.', {
        details: { timeoutMs },
        requestId,
      });
    }

    if (error instanceof ServiceError) {
      throw error;
    }

    throw new ServiceError('Network communication error. Verify connectivity and gateway health.', {
      details: error,
      requestId,
    });
  } finally {
    clearTimeout(timeout);
  }
}
