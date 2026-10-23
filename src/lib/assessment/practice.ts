export function practiceInput(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Invalid practice");
  const { itemKey, response, requestId } = input as Record<string, unknown>;
  if (typeof itemKey !== "string" || !/^[a-z0-9-]{1,80}$/.test(itemKey) ||
      typeof response !== "string" || !response.trim() || response.length > 500 ||
      typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
    throw new Error("Invalid practice");
  }
  return { itemKey, response, requestId };
}
