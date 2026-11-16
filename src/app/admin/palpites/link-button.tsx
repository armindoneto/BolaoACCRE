"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { adminEntryLink } from "../actions";

/** Copia o link pessoal do participante, para o admin repassar. */
export function LinkButton({ entryId }: { entryId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copiar link pessoal"
      title="Copiar link pessoal do participante"
      className="btn-outline size-10 min-h-10 px-0"
      onClick={async () => {
        const url = await adminEntryLink(entryId);
        if (!url) return;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Link pessoal do participante:", url);
        }
      }}
    >
      {copied ? <Check className="size-4 text-primary" /> : <Link2 className="size-4" />}
    </button>
  );
}
