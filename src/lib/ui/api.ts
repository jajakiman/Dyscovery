export type ApiResult<T = Record<string, unknown>> = { ok: boolean; status: number; data: T & { error?: string } };

export async function api<T = Record<string, unknown>>(path: string, body?: object): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      method: body ? "POST" : "GET", cache: "no-store", credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Koneksi gagal. Periksa jaringan lalu coba lagi." } as ApiResult<T>["data"] };
  }
}
