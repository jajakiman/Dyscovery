export type ApiResult<T = Record<string, unknown>> = { ok: boolean; status: number; data: T & { error?: string } };

export async function api<T = Record<string, unknown>>(
  path: string,
  body?: object,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const method = init?.method ?? (body ? "POST" : "GET");
    const response = await fetch(path, {
      method,
      cache: "no-store",
      credentials: "same-origin",
      headers: body
        ? { "Content-Type": "application/json", ...(init?.headers ? (init.headers as Record<string, string>) : {}) }
        : init?.headers,
      body: body ? JSON.stringify(body) : undefined,
      ...init,
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Koneksi gagal. Periksa jaringan lalu coba lagi." } as ApiResult<T>["data"] };
  }
}
