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

/**
 * Checks provider compliance and environment gate as mandated by Security Rules §7 and PRD §3.3.
 * AI analysis on children's voice recordings remains disabled unless compliance and terms of service
 * are explicitly confirmed. If disabled, system falls back to pure manual teacher review.
 */
export function checkAiProviderGate(): { allowed: boolean; fallback: boolean; reason?: string } {
  const enabled = process.env.ENABLE_AI_PROCESSING === "true";
  const complianceConfirmed = process.env.AI_PROVIDER_COMPLIANCE_CONFIRMED === "true";

  if (!enabled || !complianceConfirmed) {
    return {
      allowed: false,
      fallback: true,
      reason: "AI provider compliance gate not enabled. Gracefully falling back to manual teacher review.",
    };
  }

  return { allowed: true, fallback: false };
}
