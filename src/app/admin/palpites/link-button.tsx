"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { adminEntryLink } from "../actions";

/** Copia o link de edição do palpite, para o admin repassar a quem palpitou. */
export function LinkButton({ entryId }: { entryId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copiar link de edição"
      title="Copiar o link de edição deste palpite"
      className="btn-outline size-10 min-h-10 px-0"
      onClick={async () => {
        const url = await adminEntryLink(entryId);
        if (!url) return;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Link de edição do palpite:", url);
        }
      }}
    >
      {copied ? <Check className="size-4 text-primary" /> : <Link2 className="size-4" />}
    </button>
  );
}
