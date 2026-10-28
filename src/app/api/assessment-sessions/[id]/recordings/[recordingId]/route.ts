import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audioPlaybackInput } from "@/lib/assessment/audio";

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; recordingId: string }> }
) {
  const { id: sessionId, recordingId } = await context.params;

  try {
    audioPlaybackInput({ recordingId });
  } catch {
    return json({ error: "ID rekaman tidak valid." }, 400);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase.rpc("get_recording_playback_info", {
    p_recording_id: recordingId,
  });

  if (result.error?.code === "42501") {
    return json({ error: "Rekaman tidak tersedia atau izin akses telah dicabut." }, 403);
  }
  if (result.error) {
    return json({ error: "Gagal memuat informasi pemutaran audio. Coba lagi." }, 503);
  }

  const data = result.data as {
    recordingId: string;
    sessionId: string;
    storageObjectKey: string;
    mimeType: string;
    durationMs: number;
    byteSize: number;
    contentHash: string;
  };

  if (data.sessionId !== sessionId) {
    return json({ error: "Rekaman tidak sesuai dengan sesi ini." }, 404);
  }

  // Generate 60-second temporary signed URL for authorized streaming/waveform
  const { data: signedData, error: signedError } = await supabase.storage
    .from("private-recordings")
    .createSignedUrl(data.storageObjectKey, 60);

  if (signedError || !signedData) {
    return json({ error: "Gagal menerbitkan URL pemutaran audio privat." }, 503);
  }

  return json({
    recordingId: data.recordingId,
    mimeType: data.mimeType,
    durationMs: data.durationMs,
    byteSize: data.byteSize,
    contentHash: data.contentHash,
    playbackUrl: signedData.signedUrl,
  });
}
