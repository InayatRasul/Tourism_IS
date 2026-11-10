export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, string>;

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const TOKEN_KEY = 'tis_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

type UnavailableListener = (unavailable: boolean) => void;
let unavailableListener: UnavailableListener | null = null;

export function onServiceUnavailableChange(fn: UnavailableListener) {
  unavailableListener = fn;
}

export function triggerServiceUnavailable(unavailable: boolean) {
  if (unavailableListener) unavailableListener(unavailable);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 2800, headers, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const token = getStoredToken();
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((headers as Record<string, string>) || {}),
  };
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`/api/v1${path}`, {
      ...rest,
      headers: reqHeaders,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 503 || res.status === 502 || res.status === 504) {
      triggerServiceUnavailable(true);
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Database or backend service is unavailable.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(
        res.status,
        data.code || 'ERROR',
        data.message || `Request failed with status ${res.status}`,
        data.details
      );
    }
    return data as T;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      triggerServiceUnavailable(true);
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Request timed out after 3 seconds (NFR-02).');
    }
    triggerServiceUnavailable(true);
    throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Cannot reach server.');
  }
}
