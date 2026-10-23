export function sessionInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid session");
  const { teacherAssignmentId, materialVersionId } = input as Record<string, unknown>;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof teacherAssignmentId !== "string" || !uuid.test(teacherAssignmentId) ||
      typeof materialVersionId !== "string" || !uuid.test(materialVersionId)) throw new Error("Invalid session");
  return { teacherAssignmentId, materialVersionId };
}
