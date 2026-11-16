import Link from "next/link";
import { EDITION_STATUS_LABEL, type Edition } from "@/lib/data";

/** Mostra em qual edição o admin está mexendo. */
export function EditionHeader({ edition, title }: { edition: Edition; title: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-sm text-muted">
          {edition.name} · {EDITION_STATUS_LABEL[edition.status]}
        </p>
      </div>
      <Link href="/admin/edicoes" className="no-print text-sm font-semibold text-primary">
        Trocar de edição
      </Link>
    </div>
  );
}
