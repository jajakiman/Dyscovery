import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sessionEventInput } from "@/lib/assessment/lifecycle";

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") {
    return json({ error: "Origin tidak diizinkan." }, 403);
  }
  if (Number(request.headers.get("content-length")) > 4096) {
    return json({ error: "Input terlalu besar." }, 413);
  }

  const { id } = await context.params;
  let eventPayload;
  try {
    const text = await request.text();
    if (text.length > 4096) return json({ error: "Input terlalu besar." }, 413);
    const parsed = JSON.parse(text);
    eventPayload = sessionEventInput({ ...parsed, sessionId: id });
  } catch {
    return json({ error: "Parameter event sesi tidak valid." }, 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase.rpc("record_session_event", {
    p_session_id: eventPayload.sessionId,
    p_event_type: eventPayload.eventType,
    p_note: eventPayload.note ?? null,
  });

  if (result.error?.code === "42501") return json({ error: "Sesi tidak tersedia atau akses ditolak." }, 403);
  if (result.error?.code === "22023") return json({ error: "Jenis event tidak valid atau sesi tidak sedang berjalan." }, 400);
  if (result.error) return json({ error: "Gagal mencatat event sesi. Coba lagi." }, 503);

  return json({ eventId: result.data, eventType: eventPayload.eventType });
}
