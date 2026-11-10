import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiFetch,
  getStoredToken,
  onServiceUnavailableChange,
  setStoredToken,
} from './client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiFetch', () => {
  let unavailable: boolean[];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    unavailable = [];
    onServiceUnavailableChange((u) => unavailable.push(u));
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefixes /api/v1, sends JSON and returns parsed data', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { status: 'ok' }));
    const data = await apiFetch<{ status: string }>('/health');
    expect(data).toEqual({ status: 'ok' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/health');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('attaches the stored JWT as a Bearer token', async () => {
    setStoredToken('abc.def.ghi');
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await apiFetch('/auth/me');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('turns API error bodies into ApiError with code and field details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        code: 'VALIDATION_ERROR',
        message: 'Some fields are invalid',
        details: { email: 'Enter a valid email address' },
      })
    );
    const err = await apiFetch('/auth/register').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual({ email: 'Enter a valid email address' });
    expect(unavailable).toEqual([]);
  });

  it('does not treat 401/409 as service unavailable', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { code: 'EMAIL_TAKEN', message: 'taken' }));
    const err = await apiFetch('/auth/register').catch((e) => e);
    expect(err.code).toBe('EMAIL_TAKEN');
    expect(unavailable).toEqual([]);
  });

  it.each([502, 503, 504])('signals Service Unavailable on HTTP %i (NFR-02)', async (status) => {
    fetchMock.mockResolvedValue(jsonResponse(status, {}));
    const err = await apiFetch('/health').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(unavailable).toEqual([true]);
  });

  it('signals Service Unavailable when the server is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await apiFetch('/health').catch((e) => e);
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(unavailable).toEqual([true]);
  });

  it('aborts a hanging request after the timeout and signals unavailable', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          );
        })
    );
    const started = Date.now();
    const err = await apiFetch('/health', { timeoutMs: 50 }).catch((e) => e);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(err.message).toMatch(/timed out/i);
    expect(unavailable).toEqual([true]);
  });

  it('uses a default timeout below the 3 second NFR-02 budget', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return new Promise(() => {});
    });
    void apiFetch('/health').catch(() => {});
    vi.advanceTimersByTime(2999);
    expect(signal?.aborted).toBe(true);
    vi.useRealTimers();
  });
});

describe('token storage', () => {
  it('stores and clears the token', () => {
    setStoredToken('t1');
    expect(getStoredToken()).toBe('t1');
    setStoredToken(null);
    expect(getStoredToken()).toBeNull();
  });
});
