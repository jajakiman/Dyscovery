import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  if (user.error || !user.data.user) return NextResponse.json({ error: "Silakan login." }, { status: 401, headers });
  const result = await supabase.rpc("student_session_items");
  if (result.error) {
    const status = result.error.code === "42501" ? 403 : result.error.code === "22023" ? 404 : 503;
    return NextResponse.json({ error: "Materi membaca belum tersedia untuk sesi ini." }, { status, headers });
  }
  return NextResponse.json(result.data, { headers });
}
