import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const headers = { "Cache-Control": "private, no-store" };
  if (error || !data.user) return NextResponse.json({ error: "Silakan login." }, { status: 401, headers });
  const profile = await supabase.from("profiles").select("full_name,display_name,identity_confirmed_at,verification_status").eq("id", data.user.id).single();
  if (profile.error) return NextResponse.json({ error: "Profil tidak tersedia." }, { status: 403, headers });
  return NextResponse.json({ email: data.user.email, profile: profile.data,
    suggestedName: profile.data.full_name ? null : data.user.user_metadata?.full_name ?? null,
    needsOnboarding: !profile.data.identity_confirmed_at }, { headers });
}
