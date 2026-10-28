import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sessionLifecycleIdInput } from "@/lib/assessment/lifecycle";

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") {
    return json({ error: "Origin tidak diizinkan." }, 403);
  }
  const { id } = await context.params;
  try {
    sessionLifecycleIdInput({ sessionId: id });
  } catch {
    return json({ error: "ID sesi tidak valid." }, 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase.rpc("complete_assessment_session", { p_session_id: id });
  if (result.error?.code === "42501") return json({ error: "Sesi tidak tersedia atau akses ditolak." }, 403);
  if (result.error?.code === "22023") return json({ error: "Sesi tidak sedang berlangsung." }, 400);
  if (result.error) return json({ error: "Gagal menyelesaikan sesi. Coba lagi." }, 503);

  return json({ sessionId: id, status: "completed" });
}
