import { env } from '../config/env';

const memoryStore = {
  session: null,
};

const isBrowser = () => typeof window !== 'undefined' && !!window.sessionStorage;

const safeParse = (rawValue) => {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
};

export function getSession() {
  if (!isBrowser()) {
    return memoryStore.session;
  }

  const parsed = safeParse(window.sessionStorage.getItem(env.jwtStorageKey));
  if (parsed) {
    memoryStore.session = parsed;
  }

  return parsed ?? memoryStore.session;
}

export function setSession(session) {
  memoryStore.session = session;

  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem(env.jwtStorageKey, JSON.stringify(session));
}

export function clearSession() {
  memoryStore.session = null;

  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(env.jwtStorageKey);
}

export function getAuthToken() {
  return getSession()?.token ?? null;
}
