import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { credentials, identity } from "@/lib/auth/input";

const origin = "https://dyscovery.vercel.app";
const json = (body: object, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  if (request.headers.get("origin") !== origin) return json({ error: "Origin tidak diizinkan." }, 403);
  const { action } = await context.params;
  if (!["login", "register", "google", "logout", "onboarding", "forgot", "reset"].includes(action)) return json({ error: "Tidak ditemukan." }, 404);
  if (Number(request.headers.get("content-length")) > 4096) return json({ error: "Input terlalu besar." }, 413);
  const supabase = await createClient();

  if (action === "google") {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: {
      redirectTo: `${origin}/auth/callback`, skipBrowserRedirect: true,
    } });
    return error ? json({ error: "Login Google tidak tersedia." }, 400) : json({ url: data.url });
  }
  if (action === "logout") {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    return error ? json({ error: "Logout gagal. Coba lagi." }, 503) : json({ ok: true });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4096) return json({ error: "Input terlalu besar." }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "JSON tidak valid." }, 400);
  }

  if (action === "onboarding") {
    let value;
    try { value = identity(body); } catch { return json({ error: "Periksa nama, NIP, dan konfirmasi data." }, 400); }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return json({ error: "Silakan login." }, 401);
    const result = await supabase.rpc("confirm_teacher_identity", {
      p_full_name: value.fullName, p_display_name: value.displayName, p_nip: value.nip,
    });
    return result.error ? json({ error: "Identitas tidak dapat disimpan." }, 403) : json({ ok: true, teacherVerified: false });
  }

  if (action === "forgot") {
    const email = (body as { email?: unknown })?.email;
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Format email tidak valid." }, 400);
    }
    // Same answer whether or not the address exists.
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=reset` });
    return json({ message: "Jika email terdaftar, tautan atur ulang kata sandi sudah dikirim." }, 202);
  }
  if (action === "reset") {
    const password = (body as { password?: unknown })?.password;
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      return json({ error: "Kata sandi harus 8–128 karakter." }, 400);
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return json({ error: "Tautan kedaluwarsa. Minta tautan baru." }, 401);
    const result = await supabase.auth.updateUser({ password });
    return result.error ? json({ error: "Kata sandi belum dapat diperbarui." }, 400) : json({ ok: true });
  }

  let value;
  try { value = credentials(body); } catch { return json({ error: "Format email/password tidak valid (password 8–128 karakter)." }, 400); }
  if (action === "register") {
    const { error } = await supabase.auth.signUp({ ...value, options: { emailRedirectTo: `${origin}/auth/confirm` } });
    // Do not reveal whether an address already has an account.
    return error ? json({ error: "Registrasi belum dapat diproses. Coba lagi nanti." }, 400)
      : json({ message: "Jika pendaftaran dapat diproses, periksa email untuk konfirmasi." }, 202);
  }
  const { error } = await supabase.auth.signInWithPassword(value);
  return error ? json({ error: "Login gagal. Periksa kredensial dan konfirmasi email." }, 401)
    : json({ ok: true, profileUrl: "/api/auth/profile" });
}
