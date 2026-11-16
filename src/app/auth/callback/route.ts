import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/lib/data";
import { createAuthClient } from "@/lib/supabase/server";

/** Volta do Google ou do link do e-mail: troca o código pela sessão. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/meus-palpites";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/meus-palpites";

  if (code && !isDemoMode()) {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}/entrar?erro=1`);
}
