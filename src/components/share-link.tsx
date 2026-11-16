"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";

/** Link pessoal com botões grandes de copiar e enviar pelo WhatsApp. */
export function ShareLink({ url, message }: { url: string; message: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.getElementById("share-url") as HTMLInputElement | null;
      input?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-2">
      <input id="share-url" readOnly value={url} className="input text-sm" onFocus={(e) => e.target.select()} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="btn-outline min-h-12">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copiado!" : "Copiar link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary min-h-12"
        >
          <MessageCircle className="size-4" /> WhatsApp
        </a>
      </div>
    </div>
  );
}
