import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

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
    .from("ai_analyses")
    .select("id,recording_id,status,processing_latency_ms,created_at,ai_annotations(id,reference_start,reference_end,audio_start_ms,audio_end_ms,annotation_type,observed_text,confidence_score)")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (result.error) return json({ error: "Kandidat anotasi AI tidak tersedia atau izin akses dicabut." }, 503);

  const analysesWithScores = (result.data ?? []).map((analysis) => {
    const rawAnns = (analysis.ai_annotations ?? []) as Array<{
      annotation_type: string;
    }>;
    const annotationsCount = rawAnns.length;
    const correctCount = rawAnns.filter((a) => a.annotation_type === "match").length;
    const accuracyScore = annotationsCount > 0 ? Math.round((correctCount / annotationsCount) * 100) : 0;

    return {
      ...analysis,
      score: {
        accuracyScore,
        totalWords: annotationsCount,
        correctWords: correctCount,
        incorrectWords: annotationsCount - correctCount,
      },
    };
  });

  return json({ analyses: analysesWithScores });
}
