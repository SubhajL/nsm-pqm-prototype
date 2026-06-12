import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiFetch } from './api-client';
import type { ApiError } from './api-client';

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error('expected apiFetch to reject');
}

function stubFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch error envelope', () => {
  it('throws ApiError carrying status, code, and message', async () => {
    stubFetchOnce(403, {
      status: 'error',
      error: { code: 'FORBIDDEN', message: 'no access' },
    });

    const error = await captureError(apiFetch('/x'));
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('no access');
  });

  it('preserves the FULL structured error payload on error.details', async () => {
    stubFetchOnce(409, {
      status: 'error',
      error: {
        code: 'INCOMPLETE_HANDOVER',
        message: 'missing artifacts',
        missing: ['as_built_drawings', 'om_manual_safety'],
      },
    });

    const error = await captureError(apiFetch('/x'));
    expect(error.details).toEqual({
      code: 'INCOMPLETE_HANDOVER',
      message: 'missing artifacts',
      missing: ['as_built_drawings', 'om_manual_safety'],
    });
  });

  it('leaves details undefined when the body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('oops', { status: 500 })),
    );

    const error = await captureError(apiFetch('/x'));
    expect(error.status).toBe(500);
    expect(error.details).toBeUndefined();
    expect(error.message).toContain('500');
  });

  it('returns the payload unchanged on success', async () => {
    stubFetchOnce(200, { status: 'success', data: [1, 2, 3] });
    const res = await apiFetch<number[]>('/x');
    expect(res.data).toEqual([1, 2, 3]);
  });
});
