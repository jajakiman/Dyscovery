import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audioFinalizeInput } from "@/lib/assessment/audio";

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") {
    return json({ error: "Origin tidak diizinkan." }, 403);
  }
  if (Number(request.headers.get("content-length")) > 2048) {
    return json({ error: "Input terlalu besar." }, 413);
  }

  let finalizeParams;
  try {
    const text = await request.text();
    if (text.length > 2048) return json({ error: "Input terlalu besar." }, 413);
    finalizeParams = audioFinalizeInput(JSON.parse(text));
  } catch {
    return json({ error: "Metadata audio tidak valid." }, 400);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase.rpc("finalize_audio_upload", {
    p_recording_id: finalizeParams.recordingId,
    p_content_hash: finalizeParams.contentHash,
    p_byte_size: finalizeParams.byteSize,
    p_duration_ms: finalizeParams.durationMs,
  });

  if (result.error?.code === "42501") {
    return json({ error: "Otorisasi finalisasi tidak valid atau rekaman tidak ditemukan." }, 403);
  }
  if (result.error?.code === "22023") {
    return json({ error: "Parameter durasi, ukuran, atau hash tidak valid." }, 400);
  }
  if (result.error) {
    return json({ error: "Gagal memfinalisasi rekaman. Coba lagi." }, 503);
  }

  return json({ recordingId: finalizeParams.recordingId, status: "ready" });
}
