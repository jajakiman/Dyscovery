import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sessionInput } from "@/lib/assessment/input";

const json = (body: object, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

export async function GET(request: Request) {
  const offset = new URL(request.url).searchParams.get("offset") ?? "0";
  if (!/^\d{1,6}$/.test(offset)) return json({ error: "Offset tidak valid." }, 400);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json({ error: "Silakan login." }, 401);
  const result = await supabase.from("assessment_sessions")
    .select("id,child_id,teacher_assignment_id,material_version_id,status,created_at")
    .order("id").range(Number(offset), Number(offset) + 49);
  if (result.error) return json({ error: "Sesi tidak tersedia." }, 503);
  return json({ sessions: result.data, offset: Number(offset), limit: 50 });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") return json({ error: "Origin tidak diizinkan." }, 403);
  if (Number(request.headers.get("content-length")) > 4096) return json({ error: "Input terlalu besar." }, 413);
  let value;
  try {
    const text = await request.text();
    if (text.length > 4096) return json({ error: "Input terlalu besar." }, 413);
    value = sessionInput(JSON.parse(text));
  } catch {
    return json({ error: "ID penugasan atau versi materi tidak valid." }, 400);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json({ error: "Silakan login." }, 401);
  const result = await supabase.rpc("create_assessment_draft", {
    p_teacher_assignment_id: value.teacherAssignmentId, p_material_version_id: value.materialVersionId,
  });
  if (result.error?.code === "42501") return json({ error: "Penugasan atau persetujuan kegiatan tidak tersedia." }, 403);
  if (result.error?.code === "22023") return json({ error: "Materi yang disetujui tidak tersedia." }, 400);
  if (result.error) return json({ error: "Draf sesi tidak dapat disimpan. Coba lagi." }, 503);
  return json({ sessionId: result.data, status: "draft" });
}
