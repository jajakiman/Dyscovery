import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const offset = new URL(request.url).searchParams.get("offset") ?? "0";
  if (!/^\d{1,6}$/.test(offset)) return NextResponse.json({ error: "Offset tidak valid." }, { status: 400, headers });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: "Silakan login." }, { status: 401, headers });
  const result = await supabase.from("material_versions")
    .select("id,material_key,version,definition,content_hash,notice_version,processing_scope_version")
    .order("id").range(Number(offset), Number(offset) + 49);
  if (result.error) return NextResponse.json({ error: "Materi tidak tersedia." }, { status: 503, headers });
  return NextResponse.json({ materials: result.data, offset: Number(offset), limit: 50 }, { headers });
}
