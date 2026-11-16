"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <div className="no-print space-y-1">
      <button type="button" className="btn-primary min-h-12 w-full" onClick={() => window.print()}>
        <Printer className="size-4" /> Imprimir ou salvar em PDF
      </button>
      <p className="text-center text-xs text-muted">
        Na janela que abrir, escolha &ldquo;Salvar como PDF&rdquo;. No celular, o PDF pode ser enviado direto pelo WhatsApp.
      </p>
    </div>
  );
}
