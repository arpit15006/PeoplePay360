/**
 * Thin fetch wrapper for the PeoplePay360 API.
 *
 * Requests go to the relative `/api` path so Vite's dev proxy forwards them to
 * the Express server (see vite.config.ts). `credentials: 'include'` is required
 * because auth rides on an httpOnly `token` cookie.
 */

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Auth rides entirely on the httpOnly `token` cookie sent by credentials:
 * 'include'. The JWT is deliberately never mirrored into localStorage: anything
 * kept there is readable by any script on the page, so a single XSS would leak a
 * token valid for seven days, whereas an httpOnly cookie cannot be read by JS.
 * The API accepts either a cookie or a Bearer header, so the cookie alone is
 * sufficient and strictly safer.
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...init,
    headers,
  });

  // 204 / empty body
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    // The API error handler returns { success: false, error: "..." }; older
    // handlers used { message: "..." }. Accept either.
    const message = data?.error || data?.message || `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
