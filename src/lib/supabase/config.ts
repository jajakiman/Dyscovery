export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key || !key.startsWith("sb_publishable_")) {
    throw new Error("Supabase URL and publishable key must be configured.");
  }
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("Supabase URL must use HTTPS without credentials.");
  }
  return { url, key };
}
