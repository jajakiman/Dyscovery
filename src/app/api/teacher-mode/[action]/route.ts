import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { teacherPin } from "@/lib/auth/teacher-pin";

const json = (body: object, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

export async function GET(_request: Request, context: { params: Promise<{ action: string }> }) {
  if ((await context.params).action !== "status") return json({ error: "Tidak ditemukan." }, 404);
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  if (user.error || !user.data.user) return json({ error: "Silakan login." }, 401);
  const result = await supabase.rpc("current_student_mode");
  return result.error ? json({ error: "Mode tidak tersedia." }, 503) : json(result.data);
}

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  if (process.env.ENABLE_SYNTHETIC_TEACHER_PIN !== "true") return json({ error: "Fitur uji nonaktif." }, 403);
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") return json({ error: "Origin tidak diizinkan." }, 403);
  const { action } = await context.params;
  if (!["pin", "enter", "unlock"].includes(action)) return json({ error: "Tidak ditemukan." }, 404);
  if (Number(request.headers.get("content-length")) > 4096) return json({ error: "Input terlalu besar." }, 413);
  let pin = "";
  let sessionId = "";
  try {
    const text = await request.text();
    if (text.length > 4096) return json({ error: "Input terlalu besar." }, 413);
    const body = JSON.parse(text);
    if (action === "enter") {
      if (!body || typeof body.sessionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.sessionId)) throw new Error();
      sessionId = body.sessionId;
    } else pin = teacherPin(body);
  } catch {
    return json({ error: "PIN atau ID sesi tidak valid." }, 400);
  }
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  if (user.error || !user.data.user) return json({ error: "Silakan login." }, 401);
  const result = action === "enter" ? await supabase.rpc("enter_student_mode", { p_session_id: sessionId })
    : action === "pin" ? await supabase.rpc("set_teacher_pin", { p_pin: pin })
    : await supabase.rpc("unlock_teacher_mode", { p_pin: pin });
  if (result.error) return json({ error: "Operasi ditolak atau tidak tersedia." }, result.error.code === "42501" || result.error.code === "22023" ? 403 : 503);
  if (action === "unlock" && !result.data?.ok) return json({ error: "PIN salah atau akses terkunci sementara." }, 403);
  return json(action === "unlock" ? result.data : { ok: true });
}
