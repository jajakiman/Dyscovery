import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publishReportInput } from "@/lib/assessment/review-report";

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") {
    return json({ error: "Origin tidak diizinkan." }, 403);
  }
  if (Number(request.headers.get("content-length")) > 32768) {
    return json({ error: "Input terlalu besar." }, 413);
  }

  const { id: sessionId } = await context.params;
  let reportData;
  try {
    const text = await request.text();
    if (text.length > 32768) return json({ error: "Input terlalu besar." }, 413);
    reportData = publishReportInput({ ...JSON.parse(text), sessionId });
  } catch {
    return json({ error: "Parameter penerbitan laporan tidak valid." }, 400);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase.rpc("publish_observation_report", {
    p_session_id: reportData.sessionId,
    p_findings_snapshot: reportData.findingsSnapshot,
    p_follow_up_text: reportData.followUpText ?? null,
    p_follow_up_origin: reportData.followUpOrigin ?? null,
    p_review_revision_ids: reportData.reviewRevisionIds,
  });

  if (result.error?.code === "42501") {
    return json({ error: "Sesi tidak ditemukan atau hak guru tidak aktif." }, 403);
  }
  if (result.error?.code === "22023") {
    return json({ error: "Sesi harus selesai sebelum laporan observasi dapat diterbitkan." }, 400);
  }
  if (result.error) {
    return json({ error: "Gagal menerbitkan laporan observasi. Coba lagi." }, 503);
  }

  return json({ report: result.data });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await context.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) return json({ error: "ID sesi tidak valid." }, 400);

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase
    .from("report_versions")
    .select("id,session_id,version,status,findings_snapshot,follow_up_origin,follow_up_text,published_by,published_at,created_at")
    .eq("session_id", sessionId)
    .order("version", { ascending: false });

  if (result.error) return json({ error: "Gagal memuat laporan observasi." }, 503);

  return json({ reports: result.data });
}
