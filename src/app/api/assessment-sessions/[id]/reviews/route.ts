import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveReviewDraftInput } from "@/lib/assessment/review-report";

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") {
    return json({ error: "Origin tidak diizinkan." }, 403);
  }
  if (Number(request.headers.get("content-length")) > 16384) {
    return json({ error: "Input terlalu besar." }, 413);
  }

  let reviewData;
  try {
    const text = await request.text();
    if (text.length > 16384) return json({ error: "Input terlalu besar." }, 413);
    reviewData = saveReviewDraftInput(JSON.parse(text));
  } catch {
    return json({ error: "Parameter draf peninjauan tidak valid." }, 400);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase.rpc("save_review_draft", {
    p_task_attempt_id: reviewData.taskAttemptId,
    p_rubric_result: reviewData.rubricResult,
    p_annotations: reviewData.annotations,
  });

  if (result.error?.code === "42501") {
    return json({ error: "Tugas pengerjaan tidak ditemukan atau hak guru tidak aktif." }, 403);
  }
  if (result.error) {
    return json({ error: "Gagal menyimpan draf peninjauan guru. Coba lagi." }, 503);
  }

  return json({ reviewRevisionId: result.data, status: "draft" });
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
    .from("review_revisions")
    .select("id,task_attempt_id,revision,status,rubric_result,finalized_at,created_at,review_annotations(id,finding,note,evidence_location,recording_id)")
    .order("revision", { ascending: false });

  if (result.error) return json({ error: "Gagal memuat riwayat peninjauan." }, 503);

  return json({ revisions: result.data });
}
