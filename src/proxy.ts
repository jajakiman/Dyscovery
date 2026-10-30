import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { homeFor, rolesFor } from "@/lib/auth/role-home";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  try {
    const { url, key } = getSupabaseConfig();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values, headers) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    const roles = rolesFor(request.nextUrl.pathname);
    if (roles) {
      const userId = data?.claims?.sub;
      if (!userId) return NextResponse.redirect(new URL("/masuk", request.url));
      const { data: profile } = await supabase.from("profiles").select("product_role").eq("id", userId).single();
      const role = profile?.product_role;
      if (!roles.includes(role)) return NextResponse.redirect(new URL(homeFor(role), request.url));
    }
  } catch {
    // Graceful fallback when Supabase keys are not configured in local environment
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|mascot/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
