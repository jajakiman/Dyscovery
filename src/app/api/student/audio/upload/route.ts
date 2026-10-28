import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audioUploadRequestInput } from "@/lib/assessment/audio";

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

  let uploadParams;
  try {
    const text = await request.text();
    if (text.length > 2048) return json({ error: "Input terlalu besar." }, 413);
    uploadParams = audioUploadRequestInput(JSON.parse(text));
  } catch {
    return json({ error: "Parameter permintaan upload audio tidak valid." }, 400);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase.rpc("request_audio_upload", {
    p_task_attempt_id: uploadParams.taskAttemptId,
    p_mime_type: uploadParams.mimeType,
  });

  if (result.error?.code === "42501") {
    return json({ error: "Persetujuan perekaman orang tua belum tersedia atau mode siswa tidak aktif." }, 403);
  }
  if (result.error?.code === "22023") {
    return json({ error: "Format audio tidak didukung." }, 400);
  }
  if (result.error) {
    return json({ error: "Gagal menyiapkan upload audio. Coba lagi." }, 503);
  }

  const { recordingId, storageObjectKey } = result.data as {
    recordingId: string;
    storageObjectKey: string;
  };

  // Generate signed upload URL from private-recordings bucket (valid 10 minutes)
  const { data: storageData, error: storageError } = await supabase.storage
    .from("private-recordings")
    .createSignedUploadUrl(storageObjectKey);

  if (storageError || !storageData) {
    return json({ error: "Penyimpanan privat belum siap menerima unggahan audio." }, 503);
  }

  return json({
    recordingId,
    storageObjectKey,
    signedUploadUrl: storageData.signedUrl,
    token: storageData.token,
  });
}
