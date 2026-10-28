import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { taskAttemptInput } from "@/lib/assessment/lifecycle";

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") {
    return json({ error: "Origin tidak diizinkan." }, 403);
  }
  if (Number(request.headers.get("content-length")) > 8192) {
    return json({ error: "Input terlalu besar." }, 413);
  }

  let attemptData;
  try {
    const text = await request.text();
    if (text.length > 8192) return json({ error: "Input terlalu besar." }, 413);
    attemptData = taskAttemptInput(JSON.parse(text));
  } catch {
    return json({ error: "Parameter task attempt tidak valid." }, 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase.rpc("save_task_attempt", {
    p_item_key: attemptData.itemKey,
    p_encounter_type: attemptData.encounterType,
    p_phase: attemptData.phase,
    p_response: attemptData.response,
    p_request_id: attemptData.requestId,
    p_attempt_number: attemptData.attemptNumber,
  });

  if (result.error?.code === "42501") return json({ error: "Mode siswa tidak aktif atau sesi tidak valid." }, 403);
  if (result.error?.code === "22023") return json({ error: "Parameter pengerjaan tidak valid atau respons konflik." }, 400);
  if (result.error) return json({ error: "Gagal menyimpan jawaban. Coba lagi." }, 503);

  return json({ attemptId: result.data });
}
