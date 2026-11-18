import { normalizeName } from "@/lib/data/util";

/**
 * Leitura da lista de palpites de uma edição em andamento (ferramenta de uso
 * único). Uma linha por palpite, colunas separadas por tabulação (como o Excel
 * copia), ponto e vírgula ou vírgula:
 *   nome do palpite | participante | time do nível 1 | ... | time do último nível
 */

export interface ImportTeam {
  id: string;
  name: string;
  shortName: string;
  code: string;
  tier: number;
}

export interface ParsedEntryRow {
  line: number;
  name: string;
  participant: string | null;
  /** nível -> id do time */
  picks: Record<number, string>;
}

export function parseEntriesImport(input: {
  text: string;
  teams: ImportTeam[];
  /** Nomes de palpites que já existem na edição. */
  existingNames: string[];
}): { rows: ParsedEntryRow[]; errors: string[] } {
  const tiers = [...new Set(input.teams.map((t) => t.tier))].sort((a, b) => a - b);
  const byKey = new Map<string, ImportTeam>();
  for (const t of input.teams) {
    for (const key of [t.name, t.shortName, t.code]) byKey.set(normalizeName(key), t);
  }
  const taken = new Set(input.existingNames.map(normalizeName));
  const rows: ParsedEntryRow[] = [];
  const errors: string[] = [];

  input.text.split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim()) return;
    const n = i + 1;
    const sep = raw.includes("\t") ? "\t" : raw.includes(";") ? ";" : ",";
    const cols = raw.split(sep).map((c) => c.trim().replace(/^"|"$/g, "").trim().replace(/\s+/g, " "));
    while (cols.length > 0 && cols[cols.length - 1] === "") cols.pop();
    // Cabeçalho: a primeira linha, se não traz times reconhecíveis.
    if (rows.length === 0 && errors.length === 0 && !cols.slice(2).some((c) => byKey.has(normalizeName(c)))) {
      if (/palpite|aposta|nome/i.test(cols[0] ?? "")) return;
    }
    const where = `Linha ${n}`;
    const [name = "", participant = ""] = cols;
    if (name.length < 2 || name.length > 40) {
      errors.push(`${where}: o nome do palpite deve ter de 2 a 40 letras.`);
      return;
    }
    if (cols.length !== 2 + tiers.length) {
      errors.push(
        `${where}: são ${cols.length} colunas, mas o esperado é ${2 + tiers.length} (palpite, participante e um time para cada um dos ${tiers.length} níveis).`,
      );
      return;
    }
    const key = normalizeName(name);
    if (taken.has(key)) {
      errors.push(`${where}: já existe um palpite chamado "${name}".`);
      return;
    }
    const picks: Record<number, string> = {};
    let bad = false;
    tiers.forEach((tier, t) => {
      const cell = cols[2 + t];
      const team = byKey.get(normalizeName(cell));
      if (!team) {
        errors.push(`${where}: time não encontrado "${cell}" (nível ${tier}).`);
        bad = true;
      } else if (team.tier !== tier) {
        errors.push(`${where}: ${team.name} não é do nível ${tier} (é do nível ${team.tier}).`);
        bad = true;
      } else picks[tier] = team.id;
    });
    if (bad) return;
    taken.add(key);
    rows.push({ line: n, name, participant: participant || null, picks });
  });

  if (rows.length === 0 && errors.length === 0) errors.push("Nenhum palpite encontrado no texto.");
  return { rows, errors };
}
