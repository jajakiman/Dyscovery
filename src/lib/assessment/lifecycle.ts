const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ITEM_KEY_REGEX = /^[a-z0-9-]{1,80}$/;

export const ENCOUNTER_TYPES = [
  "letter_arrange",
  "spelling_image",
  "word_read",
  "passage_read",
  "comprehension",
] as const;
export type EncounterType = (typeof ENCOUNTER_TYPES)[number];

export const PHASES = ["warmup", "practice", "screening"] as const;
export type Phase = (typeof PHASES)[number];

export const ALLOWED_EVENT_TYPES = ["pause_requested", "resumed", "teacher_called"] as const;
export type AllowedEventType = (typeof ALLOWED_EVENT_TYPES)[number];

export function sessionLifecycleIdInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid session input");
  const { sessionId } = input as Record<string, unknown>;
  if (typeof sessionId !== "string" || !UUID_REGEX.test(sessionId)) {
    throw new Error("Invalid session ID");
  }
  return { sessionId };
}

export function sessionEventInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid session event input");
  const { sessionId, eventType, note } = input as Record<string, unknown>;
  if (typeof sessionId !== "string" || !UUID_REGEX.test(sessionId)) {
    throw new Error("Invalid session ID");
  }
  if (typeof eventType !== "string" || !ALLOWED_EVENT_TYPES.includes(eventType as AllowedEventType)) {
    throw new Error("Invalid event type");
  }
  let sanitizedNote: string | undefined;
  if (note !== undefined && note !== null) {
    if (typeof note !== "string" || !note.trim() || note.length > 500) {
      throw new Error("Invalid note");
    }
    sanitizedNote = note.trim();
  }
  return { sessionId, eventType: eventType as AllowedEventType, note: sanitizedNote };
}

export function taskAttemptInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid task attempt input");
  const { itemKey, encounterType, phase, response, requestId, attemptNumber = 1 } = input as Record<string, unknown>;

  if (typeof itemKey !== "string" || !ITEM_KEY_REGEX.test(itemKey)) {
    throw new Error("Invalid item key");
  }
  if (typeof encounterType !== "string" || !ENCOUNTER_TYPES.includes(encounterType as EncounterType)) {
    throw new Error("Invalid encounter type");
  }
  if (typeof phase !== "string" || !PHASES.includes(phase as Phase)) {
    throw new Error("Invalid phase");
  }
  if (typeof requestId !== "string" || !UUID_REGEX.test(requestId)) {
    throw new Error("Invalid request ID");
  }
  const attempt = Number(attemptNumber);
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new Error("Invalid attempt number");
  }

  if (response !== undefined && response !== null) {
    const serialized = JSON.stringify(response);
    if (!serialized || serialized.length > 4096) {
      throw new Error("Response payload too large");
    }
  }

  return {
    itemKey,
    encounterType: encounterType as EncounterType,
    phase: phase as Phase,
    response: response ?? null,
    requestId,
    attemptNumber: attempt,
  };
}
