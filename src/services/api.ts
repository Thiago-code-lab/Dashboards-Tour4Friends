export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export class ApiClient {
  private token: string | null = null;
  onUnauthorized: (() => void) | null = null;
  constructor(private readonly baseUrl: string) {}
  get configured(): boolean {
    return Boolean(this.baseUrl);
  }
  setSession(token: string | null): void {
    this.token = token;
  }
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.baseUrl)
      throw new ApiError('O endereço do laboratório não foi configurado neste build.', 0);
    const base = new URL(this.baseUrl);
    if (
      base.protocol !== 'https:' &&
      !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))
    )
      throw new ApiError('A API deve usar HTTPS; HTTP é permitido somente em localhost.', 0);
    const headers = new Headers(options.headers);
    const usedToken = this.token;
    if (usedToken) headers.set('Authorization', `Bearer ${usedToken}`);
    if (options.body && !(options.body instanceof FormData))
      headers.set('Content-Type', 'application/json');
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/v1${path}`, {
        ...options,
        headers,
        credentials: 'omit',
        cache: 'no-store',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError(
        'Não foi possível alcançar a API. Verifique a conexão com o laboratório.',
        0,
      );
    }
    const payload: unknown =
      response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && usedToken && this.token === usedToken) {
        this.token = null;
        this.onUnauthorized?.();
      }
      const detail =
        payload && typeof payload === 'object' && 'detail' in payload ? payload.detail : null;
      const message =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail
                .map(
                  (d: { message?: string; msg?: string }) => d.message ?? d.msg ?? 'Campo inválido',
                )
                .join(' · ')
            : 'A API não concluiu a operação.';
      throw new ApiError(
        message,
        response.status,
        response.headers.get('X-Request-ID') ?? undefined,
      );
    }
    return payload as T;
  }
  get<T>(path: string, signal?: AbortSignal) {
    return this.request<T>(path, { signal });
  }
  post<T>(path: string, payload?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      ...(payload === undefined
        ? {}
        : { body: payload instanceof FormData ? payload : JSON.stringify(payload) }),
    });
  }
  patch<T>(path: string, payload: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(payload) });
  }
}
export const api = new ApiClient(import.meta.env.VITE_API_BASE_URL ?? '');
