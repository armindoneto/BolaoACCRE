"use client";

import { Search } from "lucide-react";

export interface EditionOption {
  id: string;
  name: string;
}

export const normalizeSearch = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Busca por nome e escolha de edição, usadas nas listas de times e de participantes do admin. */
export function ListFilter({
  query,
  onQuery,
  editionId,
  onEdition,
  editions,
  placeholder,
  count,
}: {
  query: string;
  onQuery: (value: string) => void;
  /** "" = todas as edições. */
  editionId: string;
  onEdition: (value: string) => void;
  editions: EditionOption[];
  placeholder: string;
  /** Quantos itens aparecem com o filtro atual. */
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative block w-full sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          className="input pl-9"
        />
      </label>
      <select
        aria-label="Filtrar por edição"
        className="input w-full sm:w-64"
        value={editionId}
        onChange={(e) => onEdition(e.target.value)}
      >
        <option value="">Todas as edições</option>
        {editions.map((e) => (
          <option key={e.id} value={e.id}>{e.name}</option>
        ))}
      </select>
      <span className="text-sm text-muted">{count} {count === 1 ? "resultado" : "resultados"}</span>
    </div>
  );
}
