import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function GET() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "Silakan login." }, 401);
  }

  // Retrieve verified psychologist cards from official directory
  const { data, error } = await supabase
    .from("psychologist_profiles")
    .select(`
      profile_id,
      avatar_url,
      credential_id,
      credential_type,
      institution_name,
      clinic_address,
      profiles:profile_id (
        full_name,
        display_name
      )
    `)
    .eq("verification_status", "verified");

  if (error) {
    return json({ error: "Gagal mengambil daftar psikolog terverifikasi." }, 503);
  }

  return json({ psychologists: data ?? [] });
}
