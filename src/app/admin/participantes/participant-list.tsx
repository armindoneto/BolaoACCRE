"use client";

import { useMemo, useState } from "react";
import type { Participant } from "@/lib/data/types";
import type { Trophies } from "@/lib/trophy-types";
import { ListFilter, normalizeSearch, type EditionOption } from "../list-filter";
import { ParticipantCard } from "./participant-card";

export interface ParticipantItem {
  participant: Participant;
  trophies: Trophies;
  /** Edições em que a pessoa tem palpite, com os nomes dos palpites. */
  editions: { editionId: string; entryNames: string[] }[];
}

/** Participantes com busca e filtro por edição (o filtro mostra só quem tem palpite nela). */
export function ParticipantList({
  items,
  editions,
  workingEditionId,
}: {
  items: ParticipantItem[];
  editions: EditionOption[];
  /** Edição em que o admin está trabalhando (para o botão "Novo palpite"). */
  workingEditionId: string;
}) {
  const [query, setQuery] = useState("");
  // Abre com todos: quem acabou de ser cadastrado ainda não tem palpite.
  const [editionId, setEditionId] = useState("");
  const editionName = new Map(editions.map((e) => [e.id, e.name]));
  const shown = useMemo(() => {
    const q = normalizeSearch(query.trim());
    return items.filter((item) => {
      const inEdition = item.editions.find((e) => e.editionId === editionId);
      if (editionId && !inEdition) return false;
      // A busca também acha a pessoa pelo nome de um palpite.
      const searchable = [
        item.participant.name,
        ...(editionId ? inEdition!.entryNames : item.editions.flatMap((e) => e.entryNames)),
      ].join(" ");
      return !q || normalizeSearch(searchable).includes(q);
    });
  }, [items, query, editionId]);

  return (
    <div className="space-y-3">
      <ListFilter
        query={query}
        onQuery={setQuery}
        editionId={editionId}
        onEdition={setEditionId}
        editions={editions}
        placeholder="Buscar participante ou palpite"
        count={shown.length}
      />
      {shown.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">Nenhum participante encontrado.</p>
      ) : (
        <ul className="grid items-start gap-2 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((item) => {
            const inEdition = item.editions.find((e) => e.editionId === editionId);
            const subtitle = editionId
              ? inEdition!.entryNames.join(" · ")
              : item.editions.length === 0
                ? "sem palpites"
                : item.editions.length === 1
                  ? `${editionName.get(item.editions[0].editionId)}: ${item.editions[0].entryNames.join(" · ")}`
                  : `palpites em ${item.editions.length} edições`;
            return (
              <li key={item.participant.id}>
                <ParticipantCard
                  participant={item.participant}
                  editionId={workingEditionId}
                  subtitle={subtitle}
                  editions={item.editions.map((e) => ({
                    name: editionName.get(e.editionId) ?? "",
                    entryNames: e.entryNames,
                  }))}
                  trophies={item.trophies}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
