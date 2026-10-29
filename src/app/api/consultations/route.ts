import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateCreateConsultationInput,
  validateRespondConsultationInput,
} from "@/lib/psychologist/directory-share";

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") {
    return json({ error: "Origin tidak diizinkan." }, 403);
  }
  if (Number(request.headers.get("content-length")) > 4096) {
    return json({ error: "Input terlalu besar." }, 413);
  }

  let consInput;
  try {
    const text = await request.text();
    if (text.length > 4096) return json({ error: "Input terlalu besar." }, 413);
    consInput = validateCreateConsultationInput(JSON.parse(text));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parameter permohonan konsultasi tidak valid.";
    return json({ error: msg }, 400);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase.rpc("create_consultation_request", {
    p_psychologist_id: consInput.psychologistId,
    p_child_id: consInput.childId,
    p_report_share_id: consInput.reportShareId ?? null,
    p_requested_time: consInput.requestedTime ?? null,
    p_notes: consInput.notes ?? null,
  });

  if (result.error?.code === "42501") {
    return json(
      { error: "Hanya wali terverifikasi yang dapat mengajukan konsultasi ke psikolog terverifikasi." },
      403
    );
  }
  if (result.error) {
    return json({ error: "Gagal membuat permohonan konsultasi. Coba lagi." }, 503);
  }

  return json({
    consultationRequestId: result.data,
    status: "pending",
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  // Teachers are strictly excluded via RLS (medical confidentiality)
  const { data, error } = await supabase
    .from("consultation_requests")
    .select(`
      id,
      guardian_link_id,
      psychologist_id,
      report_share_id,
      requested_time,
      status,
      notes,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return json({ error: "Gagal mengambil daftar permohonan konsultasi." }, 503);
  }

  return json({ consultations: data ?? [] });
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") {
    return json({ error: "Origin tidak diizinkan." }, 403);
  }
  if (Number(request.headers.get("content-length")) > 2048) {
    return json({ error: "Input terlalu besar." }, 413);
  }

  let respInput;
  try {
    const text = await request.text();
    if (text.length > 2048) return json({ error: "Input terlalu besar." }, 413);
    respInput = validateRespondConsultationInput(JSON.parse(text));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parameter tanggapan tidak valid.";
    return json({ error: msg }, 400);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase.rpc("respond_consultation_request", {
    p_request_id: respInput.requestId,
    p_status: respInput.status,
  });

  if (result.error?.code === "42501") {
    return json(
      { error: "Hanya psikolog penerima yang dapat memperbarui status konsultasi." },
      403
    );
  }
  if (result.error?.code === "22023") {
    return json({ error: "Status konsultasi tidak valid." }, 400);
  }
  if (result.error) {
    return json({ error: "Gagal memperbarui status konsultasi. Coba lagi." }, 503);
  }

  return json({
    requestId: respInput.requestId,
    status: respInput.status,
  });
}
