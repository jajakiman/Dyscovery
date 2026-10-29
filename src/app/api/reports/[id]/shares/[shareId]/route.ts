import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRevokeShareInput } from "@/lib/psychologist/directory-share";

const json = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; shareId: string }> }
) {
  if (request.headers.get("origin") !== "https://dyscovery.vercel.app") {
    return json({ error: "Origin tidak diizinkan." }, 403);
  }

  const { shareId } = await context.params;

  let revokeInput;
  try {
    revokeInput = validateRevokeShareInput({ shareId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ID izin berbagi tidak valid.";
    return json({ error: msg }, 400);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Silakan login." }, 401);

  const result = await supabase.rpc("revoke_report_share", {
    p_share_id: revokeInput.shareId,
  });

  if (result.error?.code === "42501") {
    return json(
      { error: "Hanya wali pemberi izin yang berhak mencabut akses laporan ini." },
      403
    );
  }
  if (result.error) {
    return json({ error: "Gagal mencabut izin berbagi laporan. Coba lagi." }, 503);
  }

  return json({
    shareId: revokeInput.shareId,
    status: "revoked",
    revokedAt: new Date().toISOString(),
  });
}
