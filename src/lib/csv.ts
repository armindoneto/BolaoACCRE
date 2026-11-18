import { normalizeName } from "@/lib/data/util";
import type { MatchImportRow } from "@/lib/data/types";

export interface CsvTeam {
  id: string;
  name: string;
  shortName: string;
  code: string;
}

/** "25/04/2026 16:00" ou "2026-04-25" -> ISO, no horário de Brasília. */
export function parseBrDate(text: string): string | null | undefined {
  const value = text.trim();
  if (!value) return null;
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(value);
  let parts: [string, string, string, string, string] | null = null;
  if (m) parts = [m[3], m[2], m[1], m[4] ?? "12", m[5] ?? "00"];
  else {
    m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2}))?/.exec(value);
    if (m) parts = [m[1], m[2], m[3], m[4] ?? "12", m[5] ?? "00"];
  }
  if (!parts) return undefined;
  const [y, mo, d, h, mi] = parts;
  const date = new Date(`${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi}:00-03:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * Lê a tabela de jogos em CSV. Colunas (separadas por ; , ou tab), em um dos formatos:
 *   rodada; mandante; visitante; gols mandante; gols visitante
 *   rodada; data; mandante; visitante; gols mandante; gols visitante
 * Data e gols são opcionais. A primeira linha pode ser um cabeçalho.
 */
export function parseMatchesCsv(
  text: string,
  teams: CsvTeam[],
): { rows: MatchImportRow[]; errors: string[] } {
  const index = new Map<string, string>();
  for (const t of teams) {
    for (const key of [t.name, t.shortName, t.code]) index.set(normalizeName(key), t.id);
  }
  const rows: MatchImportRow[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    const sep = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ",";
    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const n = i + 1;
    if (!/^\d+$/.test(cols[0])) {
      if (rows.length === 0 && errors.length === 0 && /rodada/i.test(cols[0])) return; // cabeçalho
      errors.push(`Linha ${n}: a rodada deve ser um número.`);
      return;
    }
    // Dois formatos: com data (rodada; data; mandante; visitante) ou sem data
    // (rodada; mandante; visitante). A data sempre começa com um número; um time, não.
    const withDate = cols[1] === "" ? cols.length >= 4 : /^\d/.test(cols[1] ?? "");
    const [dateText, homeText, awayText, hg, ag] = withDate
      ? [cols[1], cols[2] ?? "", cols[3] ?? "", cols[4] ?? "", cols[5] ?? ""]
      : ["", cols[1] ?? "", cols[2] ?? "", cols[3] ?? "", cols[4] ?? ""];
    if (!homeText || !awayText) {
      errors.push(`Linha ${n}: faltam colunas (rodada, mandante e visitante).`);
      return;
    }
    const date = parseBrDate(dateText);
    if (date === undefined) errors.push(`Linha ${n}: data inválida "${dateText}" (use dd/mm/aaaa hh:mm).`);
    const home = index.get(normalizeName(homeText));
    const away = index.get(normalizeName(awayText));
    if (!home) errors.push(`Linha ${n}: time não encontrado "${homeText}".`);
    if (!away) errors.push(`Linha ${n}: time não encontrado "${awayText}".`);
    if (home && home === away) errors.push(`Linha ${n}: mandante e visitante são o mesmo time.`);
    let homeGoals: number | null = null;
    let awayGoals: number | null = null;
    if (hg !== "" || ag !== "") {
      if (!/^\d+$/.test(hg) || !/^\d+$/.test(ag)) errors.push(`Linha ${n}: placar incompleto ou inválido.`);
      else {
        homeGoals = Number(hg);
        awayGoals = Number(ag);
      }
    }
    if (home && away && home !== away && date !== undefined) {
      rows.push({ round: Number(cols[0]), date, homeTeamId: home, awayTeamId: away, homeGoals, awayGoals });
    }
  });
  if (rows.length === 0 && errors.length === 0) errors.push("Nenhum jogo encontrado no texto.");
  return { rows, errors };
}
