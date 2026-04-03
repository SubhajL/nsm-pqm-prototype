const BASE_URL = '/api';

interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  const headers = new Headers(options?.headers);
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'same-origin',
    ...options,
    headers,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(
      payload?.error?.message ?? `API error: ${res.status} ${res.statusText}`,
    ) as Error & { status?: number; code?: string };
    error.name = 'ApiError';
    error.status = res.status;
    error.code = payload?.error?.code;
    throw error;
  }
  return payload;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch<T>(path);
  return res.data;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function apiPostForm<T>(path: string, body: FormData): Promise<T> {
  const res = await apiFetch<T>(path, {
    method: 'POST',
    body,
  });
  return res.data;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch<T>(path, {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.data;
}
