const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GrantShareInput = {
  reportVersionId: string;
  psychologistId: string;
  noticeVersion: string;
  expiresAt: string;
  includeAudio: boolean;
};

export type RevokeShareInput = {
  shareId: string;
};

export type CreateConsultationInput = {
  psychologistId: string;
  childId: string;
  reportShareId?: string;
  requestedTime?: string;
  notes?: string;
};

export type RespondConsultationInput = {
  requestId: string;
  status: "accepted" | "declined" | "completed";
};

export function validateGrantShareInput(raw: unknown): GrantShareInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Input permohonan berbagi laporan tidak valid.");
  }

  const { reportVersionId, psychologistId, noticeVersion, expiresAt, includeAudio } =
    raw as Record<string, unknown>;

  if (typeof reportVersionId !== "string" || !UUID_REGEX.test(reportVersionId)) {
    throw new Error("ID versi laporan tidak valid.");
  }

  if (typeof psychologistId !== "string" || !UUID_REGEX.test(psychologistId)) {
    throw new Error("ID psikolog tidak valid.");
  }

  if (typeof noticeVersion !== "string" || !noticeVersion.trim() || noticeVersion.length > 80) {
    throw new Error("Versi pemberitahuan persetujuan tidak valid.");
  }

  if (typeof expiresAt !== "string") {
    throw new Error("Waktu kedaluwarsa akses wajib ditentukan.");
  }

  const expDate = new Date(expiresAt);
  if (isNaN(expDate.getTime())) {
    throw new Error("Format tanggal kedaluwarsa tidak valid.");
  }

  if (expDate.getTime() <= Date.now()) {
    throw new Error("Tanggal kedaluwarsa harus berada di masa mendatang.");
  }

  return {
    reportVersionId,
    psychologistId,
    noticeVersion: noticeVersion.trim(),
    expiresAt: expDate.toISOString(),
    // Audio is strictly excluded by default unless explicitly true
    includeAudio: includeAudio === true,
  };
}

export function validateRevokeShareInput(raw: unknown): RevokeShareInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Input pencabutan izin berbagi tidak valid.");
  }

  const { shareId } = raw as Record<string, unknown>;
  if (typeof shareId !== "string" || !UUID_REGEX.test(shareId)) {
    throw new Error("ID izin berbagi tidak valid.");
  }

  return { shareId };
}

export function validateCreateConsultationInput(raw: unknown): CreateConsultationInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Input permohonan konsultasi tidak valid.");
  }

  const { psychologistId, childId, reportShareId, requestedTime, notes } =
    raw as Record<string, unknown>;

  if (typeof psychologistId !== "string" || !UUID_REGEX.test(psychologistId)) {
    throw new Error("ID psikolog tidak valid.");
  }

  if (typeof childId !== "string" || !UUID_REGEX.test(childId)) {
    throw new Error("ID anak tidak valid.");
  }

  let sanitizedShareId: string | undefined;
  if (reportShareId !== undefined && reportShareId !== null) {
    if (typeof reportShareId !== "string" || !UUID_REGEX.test(reportShareId)) {
      throw new Error("ID izin berbagi laporan tidak valid.");
    }
    sanitizedShareId = reportShareId;
  }

  let sanitizedTime: string | undefined;
  if (requestedTime !== undefined && requestedTime !== null) {
    if (typeof requestedTime !== "string") {
      throw new Error("Format waktu konsultasi tidak valid.");
    }
    const t = new Date(requestedTime);
    if (isNaN(t.getTime())) {
      throw new Error("Format waktu konsultasi tidak valid.");
    }
    sanitizedTime = t.toISOString();
  }

  let sanitizedNotes: string | undefined;
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== "string" || notes.trim().length > 2000) {
      throw new Error("Catatan konsultasi maksimal 2000 karakter.");
    }
    sanitizedNotes = notes.trim() || undefined;
  }

  return {
    psychologistId,
    childId,
    reportShareId: sanitizedShareId,
    requestedTime: sanitizedTime,
    notes: sanitizedNotes,
  };
}

export function validateRespondConsultationInput(raw: unknown): RespondConsultationInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Input tanggapan konsultasi tidak valid.");
  }

  const { requestId, status } = raw as Record<string, unknown>;

  if (typeof requestId !== "string" || !UUID_REGEX.test(requestId)) {
    throw new Error("ID permohonan konsultasi tidak valid.");
  }

  if (status !== "accepted" && status !== "declined" && status !== "completed") {
    throw new Error("Status konsultasi tidak valid.");
  }

  return {
    requestId,
    status,
  };
}
