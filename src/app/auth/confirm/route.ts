import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const hash = new URL(request.url).searchParams.get("token_hash");
  if (hash && hash.length < 4096) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: hash, type: "email" });
    if (!error) return NextResponse.redirect(new URL("/masuk", "https://dyscovery.vercel.app"));
  }
  return NextResponse.json({ error: "Konfirmasi gagal, kedaluwarsa, atau sudah digunakan." }, {
    status: 400, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}
