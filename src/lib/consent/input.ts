export function consentInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid consent");
  const value = input as Record<string, unknown>;
  const { guardianLinkId, purpose, decision, noticeVersion, processingScopeVersion, confirmed } = value;
  if (typeof guardianLinkId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guardianLinkId) ||
      typeof purpose !== "string" || !["activity", "recording", "ai"].includes(purpose) ||
      typeof decision !== "string" || !["grant", "deny", "withdraw"].includes(decision) ||
      typeof noticeVersion !== "string" || !noticeVersion.trim() || noticeVersion.length > 80 ||
      typeof processingScopeVersion !== "string" || !processingScopeVersion.trim() || processingScopeVersion.length > 80 ||
      confirmed !== true) throw new Error("Invalid consent");
  return { guardianLinkId, purpose, decision, noticeVersion, processingScopeVersion, confirmed };
}
