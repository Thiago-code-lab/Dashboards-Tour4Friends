import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from '../src/services/api';
import { ApiDataRepository } from '../src/services/data';
afterEach(() => vi.unstubAllGlobals());

describe('Cliente de sessão em memória e fonte explícita', () => {
  it('recusa JSON inválido e erros de validação malformados sem falha de renderização', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>offline</html>', { status: 200 })),
    );
    await expect(new ApiClient('https://lab.example.com').get('/dataset')).rejects.toThrow(
      'resposta inválida',
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: [null, 2, { path: ['body', 'amount'], message: 'Valor inválido' }],
          }),
          { status: 422 },
        ),
      ),
    );
    await expect(new ApiClient('https://lab.example.com').post('/costs', {})).rejects.toMatchObject(
      { status: 422, message: 'Campo inválido · Campo inválido · amount: Valor inválido' },
    );
  });
  it('interrompe uma chamada que ultrapassa o limite sem trocar a fonte', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_, options: RequestInit) =>
          new Promise((_, reject) => {
            options.signal!.addEventListener(
              'abort',
              () => reject(new DOMException('Aborted', 'AbortError')),
              { once: true },
            );
          }),
      ),
    );
    await expect(new ApiClient('https://lab.example.com', 5).get('/dataset')).rejects.toThrow(
      'demorou além do limite',
    );
  });
  it('apresenta contexto útil para 403 e 409 sem revogar a sessão', async () => {
    const client = new ApiClient('https://lab.example.com');
    client.setSession(crypto.randomUUID());
    const revoked = vi.fn();
    client.onUnauthorized = revoked;
    for (const status of [403, 409]) {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              detail:
                status === 403
                  ? 'Perfil sem permissão'
                  : 'Versão desatualizada. Reabra o registro.',
            }),
            { status },
          ),
        ),
      );
      await expect(client.patch('/bookings/B1', {})).rejects.toMatchObject({ status });
    }
    expect(revoked).not.toHaveBeenCalled();
  });
  it('envia bearer em memória e nunca cookies', async () => {
    const token = crypto.randomUUID();
    const client = new ApiClient('https://lab.example.com');
    client.setSession(token);
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await client.get('/dataset');
    const options = fetch.mock.calls[0][1] as RequestInit;
    expect(new Headers(options.headers).get('Authorization')).toBe(`Bearer ${token}`);
    expect(options.credentials).toBe('omit');
    expect(options.cache).toBe('no-store');
  });
  it('não substitui erro da API pelo dataset estático', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('offline'));
    vi.stubGlobal('fetch', fetch);
    await expect(
      new ApiDataRepository(new ApiClient('http://127.0.0.1:8000')).load(),
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('recusa transmissão de credenciais para HTTP externo', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(new ApiClient('http://external.example.com').get('/auth/me')).rejects.toThrow(
      'HTTPS',
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it('trata 401 antigo sem revogar uma sessão iniciada depois da requisição', async () => {
    let respond: (response: Response) => void = () => {
      throw new Error('Mock não inicializado');
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            respond = resolve;
          }),
      ),
    );
    const client = new ApiClient('https://lab.example.com');
    client.setSession(crypto.randomUUID());
    const expired = vi.fn();
    client.onUnauthorized = expired;
    const oldRequest = client.get('/dataset');
    client.setSession(crypto.randomUUID());
    respond(new Response(JSON.stringify({ detail: 'Sessão inválida' }), { status: 401 }));
    await expect(oldRequest).rejects.toMatchObject({ status: 401 });
    expect(expired).not.toHaveBeenCalled();
  });
  it('preserva cancelamento explícito e contexto de validação HTTP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));
    await expect(new ApiClient('https://lab.example.com').get('/dataset')).rejects.toMatchObject({
      name: 'AbortError',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: [{ message: 'Valor inválido' }] }), {
          status: 422,
          headers: { 'X-Request-ID': 'test-request' },
        }),
      ),
    );
    await expect(
      new ApiClient('https://lab.example.com').patch('/costs/CST-001', {}),
    ).rejects.toMatchObject({ status: 422, message: 'Valor inválido', requestId: 'test-request' });
  });
});
