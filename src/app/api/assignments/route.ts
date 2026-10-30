import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: "Silakan login." }, { status: 401, headers });
  const result = await supabase.rpc("my_assignments");
  if (result.error) return NextResponse.json({ error: "Penugasan tidak tersedia." }, { status: 503, headers });
  return NextResponse.json({ assignments: result.data }, { headers });
}
