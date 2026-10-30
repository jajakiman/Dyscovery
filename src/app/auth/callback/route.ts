import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  if (code && code.length < 4096) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const target = params.get("next") === "reset" ? "/masuk?reset=1" : "/masuk";
    if (!error) return NextResponse.redirect(new URL(target, "https://dyscovery.vercel.app"));
  }
  return NextResponse.json({ error: "Login Google gagal atau dibatalkan. Mulai login kembali." }, {
    status: 400, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}
