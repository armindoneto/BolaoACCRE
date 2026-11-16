"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { createBrowserAuthClient } from "@/lib/supabase/browser";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function withGoogle() {
    const supabase = createBrowserAuthClient();
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
  }

  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createBrowserAuthClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    });
    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <div className="card space-y-1 p-5 text-center">
        <Mail className="mx-auto size-8 text-primary" />
        <p className="font-bold">Confira seu e-mail</p>
        <p className="text-sm text-muted">
          Mandamos um link para <strong>{email}</strong>. Toque nele para entrar.
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-4">
      <button type="button" onClick={withGoogle} className="btn-outline min-h-12 w-full">
        Entrar com Google
      </button>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={withEmail} className="space-y-2">
        <label htmlFor="email" className="label">Seu e-mail</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
        />
        <button type="submit" className="btn-primary min-h-12 w-full" disabled={status === "sending"}>
          {status === "sending" ? "Enviando…" : "Receber link por e-mail"}
        </button>
        {status === "error" && (
          <p className="text-sm text-danger">Não deu para enviar o e-mail. Confira o endereço e tente de novo.</p>
        )}
      </form>
    </div>
  );
}
