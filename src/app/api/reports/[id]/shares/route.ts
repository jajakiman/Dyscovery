import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateGrantShareInput } from "@/lib/psychologist/directory-share";

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
  if (Number(request.headers.get("content-length")) > 2048) {
    return json({ error: "Input terlalu besar." }, 413);
  }

  const { id: reportVersionId } = await context.params;

  let shareInput;
  try {
    const text = await request.text();
    if (text.length > 2048) return json({ error: "Input terlalu besar." }, 413);
    shareInput = validateGrantShareInput({
      ...JSON.parse(text),
      reportVersionId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parameter berbagi tidak valid.";
    return json({ error: msg }, 400);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase.rpc("grant_report_share", {
    p_report_version_id: shareInput.reportVersionId,
    p_psychologist_id: shareInput.psychologistId,
    p_notice_version: shareInput.noticeVersion,
    p_expires_at: shareInput.expiresAt,
    p_include_audio: shareInput.includeAudio,
  });

  if (result.error?.code === "42501") {
    return json(
      { error: "Hanya wali terverifikasi yang berhak membagikan laporan terbit kepada psikolog terverifikasi." },
      403
    );
  }
  if (result.error?.code === "22023") {
    return json({ error: "Tanggal kedaluwarsa harus berada di masa mendatang." }, 400);
  }
  if (result.error) {
    return json({ error: "Gagal memberikan izin akses laporan. Coba lagi." }, 503);
  }

  return json({
    shareId: result.data,
    status: "granted",
    expiresAt: shareInput.expiresAt,
    includeAudio: shareInput.includeAudio,
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: reportVersionId } = await context.params;
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  // Retrieve shares for this report version governed by RLS
  const { data, error } = await supabase
    .from("report_shares")
    .select(`
      id,
      report_version_id,
      psychologist_id,
      notice_version,
      scope,
      granted_at,
      expires_at,
      revoked_at
    `)
    .eq("report_version_id", reportVersionId);

  if (error) {
    return json({ error: "Gagal membaca riwayat berbagi laporan." }, 503);
  }

  return json({ shares: data ?? [] });
}
