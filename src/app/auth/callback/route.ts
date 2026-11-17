import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/lib/data";
import { createAuthClient } from "@/lib/supabase/server";

/** Volta do link de acesso enviado por e-mail: troca o código pela sessão. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  if (code && !isDemoMode()) {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}/entrar?erro=1`);
}
