import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { practiceInput } from "@/lib/assessment/practice";

const json = (body: object, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

export async function GET() {
  if (process.env.ENABLE_SYNTHETIC_TEACHER_PIN !== "true") return json({ error: "Fitur uji nonaktif." }, 403);
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  if (user.error || !user.data.user) return json({ error: "Silakan login." }, 401);
  const result = await supabase.rpc("student_practice");
  if (result.error) return json({ error: "Mode siswa atau materi latihan sintetis tidak tersedia." }, result.error.code === "42501" ? 403 : result.error.code === "22023" ? 400 : 503);
  return json(result.data);
}

export async function POST(request: Request) {
  if (process.env.ENABLE_SYNTHETIC_TEACHER_PIN !== "true") return json({ error: "Fitur uji nonaktif." }, 403);
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") return json({ error: "Origin tidak diizinkan." }, 403);
  if (Number(request.headers.get("content-length")) > 4096) return json({ error: "Input terlalu besar." }, 413);
  let value;
  try {
    const text = await request.text();
    if (text.length > 4096) return json({ error: "Input terlalu besar." }, 413);
    value = practiceInput(JSON.parse(text));
  } catch { return json({ error: "Respons latihan tidak valid." }, 400); }
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  if (user.error || !user.data.user) return json({ error: "Silakan login." }, 401);
  const result = await supabase.rpc("save_student_practice", {
    p_item_key: value.itemKey, p_response: value.response, p_request_id: value.requestId,
  });
  if (result.error) return json({ error: "Respons ditolak: periksa izin, materi, atau pengiriman sebelumnya." }, result.error.code === "42501" ? 403 : result.error.code === "22023" ? 400 : 503);
  return json({ ok: true, responseId: result.data });
}
