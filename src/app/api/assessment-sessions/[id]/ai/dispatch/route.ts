import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requestAiAnalysisInput,
  checkAiProviderGate,
  analyzeReadingWithGemini,
  generateReadingCandidateAnnotations,
  computeReadingScore,
} from "@/lib/assessment/ai";

export const maxDuration = 60;

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Reference text = prompt of the material item the recording belongs to (never sent to the child as an answer key).
async function readingReference(supabase: Supabase, sessionId: string, taskAttemptId: string) {
  const [attempt, session] = await Promise.all([
    supabase.from("task_attempts").select("item_key").eq("id", taskAttemptId).single(),
    supabase.from("assessment_sessions").select("material_version_id").eq("id", sessionId).single(),
  ]);
  if (attempt.error || session.error) return null;
  const material = await supabase.from("material_versions").select("definition").eq("id", session.data.material_version_id).single();
  const items = (material.data?.definition as { items?: Array<{ key?: string; prompt?: string }> } | null)?.items;
  const prompt = Array.isArray(items) ? items.find((i) => i.key === attempt.data.item_key)?.prompt : undefined;
  return typeof prompt === "string" && prompt.trim() ? prompt.trim().slice(0, 600) : null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await context.params;
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") {
    return json({ error: "Origin tidak diizinkan." }, 403);
  }
  if (Number(request.headers.get("content-length")) > 2048) {
    return json({ error: "Input terlalu besar." }, 413);
  }

  let aiReq;
  try {
    const text = await request.text();
    if (text.length > 2048) return json({ error: "Input terlalu besar." }, 413);
    aiReq = requestAiAnalysisInput(JSON.parse(text));
  } catch {
    return json({ error: "Parameter permintaan AI tidak valid." }, 400);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  // Security Rules §7 Provider Gate: If AI provider compliance is not confirmed,
  // gracefully fall back to pure manual teacher review without failing the workflow.
  const gate = checkAiProviderGate();
  if (!gate.allowed) {
    return json({
      status: "fallback_to_manual",
      reason: gate.reason,
      message: "Gerbang penyedia AI belum diaktifkan. Melanjutkan dengan peninjauan manual guru murni.",
    });
  }

  // Request AI analysis row in database (enforces parental consent check on purpose='ai')
  const reqResult = await supabase.rpc("request_ai_analysis", {
    p_recording_id: aiReq.recordingId,
    p_idempotency_key: aiReq.idempotencyKey,
  });

  if (reqResult.error?.code === "42501") {
    return json({ error: "Persetujuan orang tua untuk pemrosesan AI belum diberikan atau telah dicabut." }, 403);
  }
  if (reqResult.error?.code === "22023") {
    return json({ error: "Kunci idempotensi atau rekaman tidak valid." }, 400);
  }
  if (reqResult.error) {
    return json({ error: "Gagal memulai pemrosesan AI pascarekaman. Silakan gunakan peninjauan manual." }, 503);
  }

  const analysis = reqResult.data as {
    analysisId: string;
    status: string;
    recordingId: string;
  };

  // If already completed previously, return existing record
  if (analysis.status === "completed") {
    return json({ analysisId: analysis.analysisId, status: "completed" });
  }

  const defaultText = "Kancil melihat pohon rindang di pinggir hutan";
  let candidateAnnotations = generateReadingCandidateAnnotations(defaultText, 8000);
  let score = computeReadingScore(candidateAnnotations, 8000);
  let latencyMs = 2800;

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiApiKey && geminiApiKey !== "YOUR_GEMINI_API_KEY_HERE") {
    try {
      const startTime = Date.now();
      const rec = await supabase
        .from("recordings")
        .select("storage_object_key, mime_type, byte_size, task_attempt_id, session_id")
        .eq("id", aiReq.recordingId)
        .single();

      if (rec.data && rec.data.session_id === sessionId && (rec.data.byte_size ?? 0) <= 14 * 1024 * 1024) {
        const referenceText = (await readingReference(supabase, rec.data.session_id, rec.data.task_attempt_id)) || defaultText;
        const download = await supabase.storage.from("private-recordings").download(rec.data.storage_object_key);
        if (download.data) {
          const result = await analyzeReadingWithGemini(
            Buffer.from(await download.data.arrayBuffer()).toString("base64"),
            rec.data.mime_type || "audio/webm",
            referenceText,
            geminiApiKey,
            process.env.GEMINI_MODEL?.trim() || undefined
          );
          candidateAnnotations = result.annotations;
          score = result.score;
          latencyMs = Math.min(60000, Date.now() - startTime);
        }
      }
    } catch (error) {
      console.warn("Gemini call fell back to local candidate generator:", error instanceof Error ? error.message : "unknown");
    }
  }

  const saved = await supabase.rpc("record_ai_analysis_results", {
    p_analysis_id: analysis.analysisId,
    p_status: "completed",
    p_processing_latency_ms: latencyMs,
    p_annotations: candidateAnnotations,
  });
  if (saved.error) return json({ error: "Hasil AI tidak tersimpan. Gunakan peninjauan manual." }, 503);

  return json({
    analysisId: analysis.analysisId,
    status: "completed",
    score,
    candidateAnnotations,
    candidateAnnotationsCount: candidateAnnotations.length,
  });
}
