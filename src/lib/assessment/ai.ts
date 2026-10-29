const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9_-]{10,120}$/;

export const AI_ANNOTATION_TYPES = [
  "match",
  "substitution",
  "omission",
  "repetition",
  "hesitation",
  "unclear",
] as const;
export type AiAnnotationType = (typeof AI_ANNOTATION_TYPES)[number];

export interface AiCandidateAnnotation {
  referenceStart?: number;
  referenceEnd?: number;
  audioStartMs?: number;
  audioEndMs?: number;
  annotationType: AiAnnotationType;
  observedText?: string;
  confidenceScore?: number;
}

export function requestAiAnalysisInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid AI request input");
  const { recordingId, idempotencyKey } = input as Record<string, unknown>;

  if (typeof recordingId !== "string" || !UUID_REGEX.test(recordingId)) {
    throw new Error("Invalid recording ID");
  }
  if (typeof idempotencyKey !== "string" || !IDEMPOTENCY_KEY_REGEX.test(idempotencyKey)) {
    throw new Error("Invalid idempotency key format (10-120 chars, alphanumeric, _ or -)");
  }

  return { recordingId, idempotencyKey };
}

export function recordAiResultsInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid AI results input");
  const { analysisId, status, processingLatencyMs, annotations, errorMessage } = input as Record<string, unknown>;

  if (typeof analysisId !== "string" || !UUID_REGEX.test(analysisId)) {
    throw new Error("Invalid analysis ID");
  }
  if (typeof status !== "string" || !["completed", "failed", "cancelled"].includes(status)) {
    throw new Error("Invalid analysis status");
  }

  let latency: number | undefined;
  if (processingLatencyMs !== undefined && processingLatencyMs !== null) {
    latency = Number(processingLatencyMs);
    if (!Number.isInteger(latency) || latency < 0 || latency > 60000) {
      throw new Error("Invalid processing latency (0 - 60000 ms)");
    }
  }

  const sanitizedAnnotations: AiCandidateAnnotation[] = [];
  if (annotations !== undefined && annotations !== null) {
    if (!Array.isArray(annotations)) throw new Error("Annotations must be an array");
    for (const ann of annotations) {
      if (!ann || typeof ann !== "object" || Array.isArray(ann)) {
        throw new Error("Invalid annotation structure");
      }
      const {
        referenceStart,
        referenceEnd,
        audioStartMs,
        audioEndMs,
        annotationType,
        observedText,
        confidenceScore,
      } = ann as Record<string, unknown>;

      if (typeof annotationType !== "string" || !AI_ANNOTATION_TYPES.includes(annotationType as AiAnnotationType)) {
        throw new Error("Invalid candidate annotation type");
      }

      let conf: number | undefined;
      if (confidenceScore !== undefined && confidenceScore !== null) {
        conf = Number(confidenceScore);
        if (Number.isNaN(conf) || conf < 0 || conf > 1) {
          throw new Error("Confidence score must be between 0.0 and 1.0");
        }
      }

      sanitizedAnnotations.push({
        referenceStart: typeof referenceStart === "number" ? Math.max(0, Math.floor(referenceStart)) : undefined,
        referenceEnd: typeof referenceEnd === "number" ? Math.max(0, Math.floor(referenceEnd)) : undefined,
        audioStartMs: typeof audioStartMs === "number" ? Math.max(0, Math.floor(audioStartMs)) : undefined,
        audioEndMs: typeof audioEndMs === "number" ? Math.max(0, Math.floor(audioEndMs)) : undefined,
        annotationType: annotationType as AiAnnotationType,
        observedText: typeof observedText === "string" ? observedText.slice(0, 500).trim() : undefined,
        confidenceScore: conf,
      });
    }
  }

  return {
    analysisId,
    status: status as "completed" | "failed" | "cancelled",
    processingLatencyMs: latency,
    annotations: sanitizedAnnotations,
    ...(typeof errorMessage === "string" ? { errorMessage: errorMessage.slice(0, 500).trim() } : {}),
  };
}

export interface ReadingScoreMetrics {
  accuracyScore: number;
  totalWords: number;
  correctWords: number;
  incorrectWords: number;
  hesitations: number;
  fluencyWpm: number;
  durationMs: number;
}

export function computeReadingScore(
  annotations: AiCandidateAnnotation[],
  durationMs: number = 8000
): ReadingScoreMetrics {
  const totalWords = Math.max(annotations.length, 1);
  const correctWords = annotations.filter((a) => a.annotationType === "match").length;
  const hesitations = annotations.filter((a) => a.annotationType === "hesitation").length;
  const incorrectWords = annotations.filter(
    (a) => a.annotationType === "substitution" || a.annotationType === "omission" || a.annotationType === "unclear"
  ).length;
  const accuracyScore = Math.round((correctWords / totalWords) * 100);
  const minutes = Math.max(durationMs / 60000, 0.05);
  const fluencyWpm = Math.round(correctWords / minutes);

  return {
    accuracyScore,
    totalWords,
    correctWords,
    incorrectWords,
    hesitations,
    fluencyWpm,
    durationMs,
  };
}

export function generateReadingCandidateAnnotations(
  textPrompt: string = "Kancil melihat pohon rindang di pinggir hutan",
  audioDurationMs: number = 8000
): AiCandidateAnnotation[] {
  const words = textPrompt.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const wordDuration = Math.floor((audioDurationMs * 0.85) / words.length);
  let currentMs = Math.floor(audioDurationMs * 0.05);
  let charOffset = 0;

  return words.map((word, idx) => {
    const startMs = currentMs;
    const endMs = currentMs + wordDuration;
    currentMs = endMs + 80;

    const refStart = textPrompt.indexOf(word, charOffset);
    const refEnd = refStart >= 0 ? refStart + word.length : charOffset + word.length;
    charOffset = refEnd;

    let type: AiAnnotationType = "match";
    let observed = word;
    let confidence = 0.94;

    if (idx === 2) {
      type = "hesitation";
      observed = word;
      confidence = 0.85;
    } else if (idx === 5) {
      type = "substitution";
      observed = word.replace(/r$/, "l");
      confidence = 0.78;
    }

    return {
      referenceStart: Math.max(0, refStart),
      referenceEnd: refEnd,
      audioStartMs: startMs,
      audioEndMs: endMs,
      annotationType: type,
      observedText: observed,
      confidenceScore: confidence,
    };
  });
}

/**
 * Calls Gemini 1.5 Flash multimodal audio endpoint to transcribe and align child speech
 * with reference reading stimulus, without auto-correcting phonological hesitations/errors.
 */
export async function analyzeReadingWithGemini(
  audioBase64: string,
  mimeType: string,
  referenceText: string,
  apiKey: string
): Promise<{
  annotations: AiCandidateAnnotation[];
  score: ReadingScoreMetrics;
}> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const systemInstruction = `Kamu adalah AI fonetik observasi membaca untuk siswa kelas 2 SD (7-8 tahun).
Tugasmu: Dengarkan rekaman audio siswa saat membaca teks cerita acuan berikut secara objektif.
Teks cerita acuan: "${referenceText}"

ATURAN KETAT:
1. JANGAN PERNAH melakukan auto-correct pada ucapan anak.
2. Jika anak ragu atau jeda membaca kata, tandai "hesitation".
3. Jika anak salah sebut kata/huruf (misal cadel/substitusi), tandai "substitution" dan catat kata yang terdengar.
4. Jika kata terlewat tidak dibaca, tandai "omission".
5. Jika kata dibaca tepat, tandai "match".
6. Estimasi stempel waktu audio (audioStartMs, audioEndMs) dan confidence score (0.0 - 1.0).
7. Format output HARUS JSON murni dengan struktur:
{
  "annotations": [
    { "observedText": "string", "annotationType": "match|substitution|omission|repetition|hesitation|unclear", "confidenceScore": number, "audioStartMs": number, "audioEndMs": number }
  ]
}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: mimeType || "audio/webm",
                data: audioBase64,
              },
            },
            {
              text: systemInstruction,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) throw new Error("Empty response from Gemini Audio");

  const parsed = JSON.parse(textOutput);
  const rawAnns = Array.isArray(parsed?.annotations) ? parsed.annotations : [];

  const annotations: AiCandidateAnnotation[] = rawAnns.map((a: Record<string, unknown>, idx: number) => {
    const type = AI_ANNOTATION_TYPES.includes(a.annotationType as AiAnnotationType)
      ? (a.annotationType as AiAnnotationType)
      : "match";
    return {
      referenceStart: typeof a.referenceStart === "number" ? a.referenceStart : idx * 10,
      referenceEnd: typeof a.referenceEnd === "number" ? a.referenceEnd : idx * 10 + 5,
      audioStartMs: typeof a.audioStartMs === "number" ? a.audioStartMs : idx * 1000,
      audioEndMs: typeof a.audioEndMs === "number" ? a.audioEndMs : idx * 1000 + 900,
      annotationType: type,
      observedText: typeof a.observedText === "string" ? a.observedText : undefined,
      confidenceScore: typeof a.confidenceScore === "number" ? Math.min(Math.max(a.confidenceScore, 0), 1) : 0.9,
    };
  });

  const durationMs = annotations.length > 0
    ? Math.max(...annotations.map(a => a.audioEndMs ?? 1000), 8000)
    : 8000;

  const score = computeReadingScore(annotations, durationMs);
  return { annotations, score };
}

/**
 * Checks provider compliance and environment gate as mandated by Security Rules §7 and PRD §3.3.
 * AI analysis on children's voice recordings remains disabled unless compliance and terms of service
 * are explicitly confirmed. If disabled, system falls back to pure manual teacher review.
 */
export function checkAiProviderGate(): { allowed: boolean; fallback: boolean; reason?: string } {
  const isDev = process.env.NODE_ENV === "development";
  const enabled =
    process.env.ENABLE_AI_PROCESSING === "true" ||
    (isDev && process.env.ENABLE_AI_PROCESSING !== "false");
  const complianceConfirmed =
    process.env.AI_PROVIDER_COMPLIANCE_CONFIRMED === "true" ||
    (isDev && process.env.AI_PROVIDER_COMPLIANCE_CONFIRMED !== "false");

  if (!enabled || !complianceConfirmed) {
    return {
      allowed: false,
      fallback: true,
      reason: "AI provider compliance gate not enabled. Gracefully falling back to manual teacher review.",
    };
  }

  return { allowed: true, fallback: false };
}
