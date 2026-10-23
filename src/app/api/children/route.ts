import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const url = new URL(request.url);
  const offset = url.searchParams.get("offset") ?? "0";
  if (!/^\d{1,6}$/.test(offset)) return NextResponse.json({ error: "Offset tidak valid." }, { status: 400, headers });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: "Silakan login." }, { status: 401, headers });
  const profile = await supabase.from("profiles").select("product_role,verification_status,account_status").eq("id", data.user.id).single();
  if (profile.error || profile.data.product_role !== "teacher" || profile.data.verification_status !== "verified" || profile.data.account_status !== "active") {
    return NextResponse.json({ error: "Akses guru belum tersedia." }, { status: 403, headers });
  }
  const result = await supabase.from("children").select("id,display_name,grade,school_id").order("id").range(Number(offset), Number(offset) + 49);
  if (result.error) return NextResponse.json({ error: "Daftar siswa tidak tersedia." }, { status: 503, headers });
  return NextResponse.json({ children: result.data, offset: Number(offset), limit: 50 }, { headers });
}
