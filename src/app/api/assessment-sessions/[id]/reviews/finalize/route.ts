import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finalizeReviewInput } from "@/lib/assessment/review-report";

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") {
    return json({ error: "Origin tidak diizinkan." }, 403);
  }
  if (Number(request.headers.get("content-length")) > 2048) {
    return json({ error: "Input terlalu besar." }, 413);
  }

  let finalizeData;
  try {
    const text = await request.text();
    if (text.length > 2048) return json({ error: "Input terlalu besar." }, 413);
    finalizeData = finalizeReviewInput(JSON.parse(text));
  } catch {
    return json({ error: "ID revisi peninjauan tidak valid." }, 400);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase.rpc("finalize_review_revision", {
    p_review_revision_id: finalizeData.reviewRevisionId,
  });

  if (result.error?.code === "42501") {
    return json({ error: "Revisi tidak ditemukan atau hak guru tidak aktif." }, 403);
  }
  if (result.error) {
    return json({ error: "Gagal memfinalisasi peninjauan. Coba lagi." }, 503);
  }

  return json({ reviewRevisionId: finalizeData.reviewRevisionId, status: "finalized" });
}
