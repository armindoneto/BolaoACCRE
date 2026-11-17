import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ImportHistoryForm } from "./import-form";

export default function ImportarEdicaoPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/edicoes" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ChevronLeft className="size-4" /> Edições
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Importar bolão antigo</h1>
        <p className="text-sm text-muted">
          Para bolões já encerrados. Copie os dados da planilha (selecione as células no Excel e cole aqui). A
          edição entra direto no Histórico, com a classificação final e os pontos de cada time.
        </p>
      </div>
      <ImportHistoryForm />
    </div>
  );
}
