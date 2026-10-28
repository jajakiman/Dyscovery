const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ALLOWED_MIME_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/mp4",
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function audioUploadRequestInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid audio upload input");
  const { taskAttemptId, mimeType } = input as Record<string, unknown>;

  if (typeof taskAttemptId !== "string" || !UUID_REGEX.test(taskAttemptId)) {
    throw new Error("Invalid task attempt ID");
  }
  if (typeof mimeType !== "string" || !ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    throw new Error("Invalid mime type");
  }

  return { taskAttemptId, mimeType: mimeType as AllowedMimeType };
}

export function audioFinalizeInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid audio finalize input");
  const { recordingId, contentHash, byteSize, durationMs } = input as Record<string, unknown>;

  if (typeof recordingId !== "string" || !UUID_REGEX.test(recordingId)) {
    throw new Error("Invalid recording ID");
  }
  if (typeof contentHash !== "string" || contentHash.trim().length < 16 || contentHash.length > 128) {
    throw new Error("Invalid content hash");
  }
  const size = Number(byteSize);
  if (!Number.isInteger(size) || size < 1 || size > 26214400) {
    throw new Error("Invalid byte size (max 25MB)");
  }
  const duration = Number(durationMs);
  if (!Number.isInteger(duration) || duration < 100 || duration > 1800000) {
    throw new Error("Invalid duration (100ms - 30 minutes)");
  }

  return { recordingId, contentHash: contentHash.trim(), byteSize: size, durationMs: duration };
}

export function audioPlaybackInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid audio playback input");
  const { recordingId } = input as Record<string, unknown>;

  if (typeof recordingId !== "string" || !UUID_REGEX.test(recordingId)) {
    throw new Error("Invalid recording ID");
  }

  return { recordingId };
}
