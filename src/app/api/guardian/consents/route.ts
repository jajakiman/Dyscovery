import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consentInput } from "@/lib/consent/input";

const json = (body: object, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

export async function GET(request: Request) {
  const offset = new URL(request.url).searchParams.get("offset") ?? "0";
  if (!/^\d{1,6}$/.test(offset)) return json({ error: "Offset tidak valid." }, 400);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json({ error: "Silakan login." }, 401);
  const result = await supabase.from("guardian_links")
    .select("id,child_id,relationship,verified_at").eq("guardian_id", data.user.id)
    .order("id").range(Number(offset), Number(offset) + 49);
  if (result.error) return json({ error: "Hubungan wali tidak tersedia." }, 503);
  const notices = await supabase.from("consent_notices")
    .select("purpose,notice_version,processing_scope_version,notice_text,processing_scope,enabled")
    .order("purpose").order("notice_version").order("processing_scope_version")
    .range(Number(offset), Number(offset) + 49);
  if (notices.error) return json({ error: "Pemberitahuan tidak tersedia." }, 503);
  const events = await supabase.from("consent_events")
    .select("id,guardian_link_id,purpose,decision,notice_version,processing_scope_version,recorded_at")
    .order("id", { ascending: false }).range(Number(offset), Number(offset) + 49);
  if (events.error) return json({ error: "Riwayat persetujuan tidak tersedia." }, 503);
  return json({ guardianLinks: result.data, notices: notices.data, events: events.data,
    offset: Number(offset), limit: 50 });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") return json({ error: "Origin tidak diizinkan." }, 403);
  if (Number(request.headers.get("content-length")) > 4096) return json({ error: "Input terlalu besar." }, 413);
  let value;
  try {
    const text = await request.text();
    if (text.length > 4096) return json({ error: "Input terlalu besar." }, 413);
    value = consentInput(JSON.parse(text));
  } catch {
    return json({ error: "Periksa keputusan, versi pemberitahuan, cakupan, dan konfirmasi." }, 400);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json({ error: "Silakan login." }, 401);
  const result = await supabase.rpc("record_guardian_consent", {
    p_guardian_link_id: value.guardianLinkId, p_purpose: value.purpose, p_decision: value.decision,
    p_notice_version: value.noticeVersion, p_processing_scope_version: value.processingScopeVersion,
  });
  if (result.error?.code === "42501") return json({ error: "Akses wali tidak tersedia." }, 403);
  if (result.error?.code === "22023") return json({ error: "Keputusan atau pemberitahuan tidak tersedia." }, 400);
  if (result.error) return json({ error: "Persetujuan tidak dapat disimpan. Coba lagi." }, 503);
  return json({ ok: true });
}
