import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { profileUpdate } from "@/lib/auth/input";

const origin = "https://dyscovery.vercel.app";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const headers = { "Cache-Control": "private, no-store" };
  if (error || !data.user) return NextResponse.json({ error: "Silakan login." }, { status: 401, headers });
  const profile = await supabase
    .from("profiles")
    .select("full_name,display_name,identity_confirmed_at,verification_status,product_role")
    .eq("id", data.user.id)
    .single();
  if (profile.error) return NextResponse.json({ error: "Profil tidak tersedia." }, { status: 403, headers });

  return NextResponse.json(
    {
      email: data.user.email,
      profile: profile.data,
      avatarUrl: (data.user.user_metadata?.avatar_url as string) || null,
      suggestedName: profile.data.full_name ? null : data.user.user_metadata?.full_name ?? null,
      needsOnboarding: !profile.data.identity_confirmed_at,
    },
    { headers }
  );
}

export async function PATCH(request: Request) {
  const reqOrigin = request.headers.get("origin");
  if (reqOrigin && reqOrigin !== origin) {
    return NextResponse.json({ error: "Origin tidak diizinkan." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const headers = { "Cache-Control": "private, no-store" };
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Silakan login." }, { status: 401, headers });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 500000) {
      return NextResponse.json({ error: "Ukuran input foto atau data terlalu besar." }, { status: 413, headers });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid." }, { status: 400, headers });
  }

  let validated;
  try {
    validated = profileUpdate(body);
  } catch {
    return NextResponse.json({ error: "Data nama atau foto profil tidak valid." }, { status: 400, headers });
  }

  const profileUpdates: { full_name?: string; display_name?: string } = {};
  if (validated.fullName !== undefined) profileUpdates.full_name = validated.fullName;
  if (validated.displayName !== undefined) profileUpdates.display_name = validated.displayName || validated.fullName;

  if (Object.keys(profileUpdates).length > 0) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update(profileUpdates)
      .eq("id", authData.user.id);
    if (updateError) {
      return NextResponse.json({ error: "Gagal memperbarui nama profil." }, { status: 400, headers });
    }
  }

  if (validated.avatarUrl !== undefined) {
    const { error: metaError } = await supabase.auth.updateUser({
      data: { avatar_url: validated.avatarUrl },
    });
    if (metaError) {
      return NextResponse.json({ error: "Gagal menyimpan foto profil." }, { status: 400, headers });
    }
  }

  // Fetch updated profile
  const updatedProfile = await supabase
    .from("profiles")
    .select("full_name,display_name,identity_confirmed_at,verification_status,product_role")
    .eq("id", authData.user.id)
    .single();

  return NextResponse.json(
    {
      ok: true,
      message: "Profil berhasil diperbarui.",
      profile: updatedProfile.data,
      avatarUrl: validated.avatarUrl ?? (authData.user.user_metadata?.avatar_url as string) ?? null,
    },
    { headers }
  );
}
