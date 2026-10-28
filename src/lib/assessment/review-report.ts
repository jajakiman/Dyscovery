const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const REVIEW_FINDINGS = [
  "match",
  "substitution",
  "omission",
  "repetition",
  "hesitation",
  "unclear",
  "general_observation",
] as const;
export type ReviewFinding = (typeof REVIEW_FINDINGS)[number];

export const FOLLOW_UP_ORIGINS = ["expert_rule", "teacher_manual"] as const;
export type FollowUpOrigin = (typeof FOLLOW_UP_ORIGINS)[number];

export interface ReviewAnnotationInput {
  finding: ReviewFinding;
  note?: string;
  evidenceLocation?: Record<string, unknown>;
  recordingId?: string;
}

export function saveReviewDraftInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid review input");
  const { taskAttemptId, rubricResult, annotations } = input as Record<string, unknown>;

  if (typeof taskAttemptId !== "string" || !UUID_REGEX.test(taskAttemptId)) {
    throw new Error("Invalid task attempt ID");
  }

  let sanitizedRubric: Record<string, unknown> | null = null;
  if (rubricResult !== undefined && rubricResult !== null) {
    if (typeof rubricResult !== "object" || Array.isArray(rubricResult)) {
      throw new Error("Invalid rubric result format");
    }
    sanitizedRubric = rubricResult as Record<string, unknown>;
  }

  let sanitizedAnnotations: ReviewAnnotationInput[] = [];
  if (annotations !== undefined && annotations !== null) {
    if (!Array.isArray(annotations)) throw new Error("Annotations must be an array");
    sanitizedAnnotations = annotations.map((ann, idx) => {
      if (!ann || typeof ann !== "object" || Array.isArray(ann)) {
        throw new Error(`Invalid annotation at index ${idx}`);
      }
      const { finding, note, evidenceLocation, recordingId } = ann as Record<string, unknown>;
      if (typeof finding !== "string" || !REVIEW_FINDINGS.includes(finding as ReviewFinding)) {
        throw new Error(`Invalid finding type at index ${idx}`);
      }
      let sanitizedNote: string | undefined;
      if (note !== undefined && note !== null) {
        if (typeof note !== "string" || !note.trim() || note.length > 1000) {
          throw new Error(`Invalid note at index ${idx}`);
        }
        sanitizedNote = note.trim();
      }
      let sanitizedRecId: string | undefined;
      if (recordingId !== undefined && recordingId !== null) {
        if (typeof recordingId !== "string" || !UUID_REGEX.test(recordingId)) {
          throw new Error(`Invalid recording ID at index ${idx}`);
        }
        sanitizedRecId = recordingId;
      }
      let sanitizedLocation: Record<string, unknown> | undefined;
      if (evidenceLocation !== undefined && evidenceLocation !== null) {
        if (typeof evidenceLocation !== "object" || Array.isArray(evidenceLocation)) {
          throw new Error(`Invalid evidence location at index ${idx}`);
        }
        sanitizedLocation = evidenceLocation as Record<string, unknown>;
      }

      return {
        finding: finding as ReviewFinding,
        note: sanitizedNote,
        evidenceLocation: sanitizedLocation,
        recordingId: sanitizedRecId,
      };
    });
  }

  return {
    taskAttemptId,
    rubricResult: sanitizedRubric,
    annotations: sanitizedAnnotations,
  };
}

export function finalizeReviewInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid finalize review input");
  const { reviewRevisionId } = input as Record<string, unknown>;

  if (typeof reviewRevisionId !== "string" || !UUID_REGEX.test(reviewRevisionId)) {
    throw new Error("Invalid review revision ID");
  }

  return { reviewRevisionId };
}

export function publishReportInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid report publication input");
  const { sessionId, findingsSnapshot, followUpText, followUpOrigin, reviewRevisionIds } = input as Record<
    string,
    unknown
  >;

  if (typeof sessionId !== "string" || !UUID_REGEX.test(sessionId)) {
    throw new Error("Invalid session ID");
  }

  if (!findingsSnapshot || typeof findingsSnapshot !== "object" || Array.isArray(findingsSnapshot)) {
    throw new Error("Invalid findings snapshot");
  }

  let sanitizedOrigin: FollowUpOrigin | undefined;
  if (followUpOrigin !== undefined && followUpOrigin !== null) {
    if (typeof followUpOrigin !== "string" || !FOLLOW_UP_ORIGINS.includes(followUpOrigin as FollowUpOrigin)) {
      throw new Error("Invalid follow-up origin");
    }
    sanitizedOrigin = followUpOrigin as FollowUpOrigin;
  }

  let sanitizedFollowUp: string | undefined;
  if (followUpText !== undefined && followUpText !== null) {
    if (typeof followUpText !== "string" || !followUpText.trim() || followUpText.length > 5000) {
      throw new Error("Invalid follow-up text");
    }
    sanitizedFollowUp = followUpText.trim();
  }

  const sanitizedRevisionIds: string[] = [];
  if (reviewRevisionIds !== undefined && reviewRevisionIds !== null) {
    if (!Array.isArray(reviewRevisionIds)) throw new Error("reviewRevisionIds must be an array");
    for (const id of reviewRevisionIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        throw new Error("Invalid review revision ID in list");
      }
      sanitizedRevisionIds.push(id);
    }
  }

  return {
    sessionId,
    findingsSnapshot: findingsSnapshot as Record<string, unknown>,
    followUpText: sanitizedFollowUp,
    followUpOrigin: sanitizedOrigin,
    reviewRevisionIds: sanitizedRevisionIds,
  };
}
