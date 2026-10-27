import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "ID draf tidak valid." }, { status: 400, headers });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: "Silakan login." }, { status: 401, headers });
  const result = await supabase.from("assessment_sessions")
    .select("id,status,practice_responses(item_key,response,created_at)").eq("id", id).maybeSingle();
  if (result.error) return NextResponse.json({ error: "Respons latihan belum dapat dibaca." }, { status: 503, headers });
  if (!result.data) return NextResponse.json({ error: "Draf tidak ditemukan atau tidak dapat diakses." }, { status: 404, headers });
  return NextResponse.json({ session: result.data }, { headers });
}
