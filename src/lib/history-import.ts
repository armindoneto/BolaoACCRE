import { normalizeName } from "@/lib/data/util";

/**
 * Leitura dos dados de um bolão ANTIGO, colados da planilha (colunas separadas
 * por tabulação, que é como o Excel copia, ou por ponto e vírgula).
 *
 * Tabela de TIMES — uma linha por time em cada etapa:
 *   nível | time | etapa | total | <uma coluna por tipo de ponto...>
 * As colunas depois de "total" são o detalhamento; o nome de cada uma vem do
 * cabeçalho. "total" pode ficar vazio (vale a soma do detalhamento).
 *
 * Tabela de PALPITES — uma linha por palpite:
 *   palpite | participante | <um time por nível...> | pos 1 | pts 1 | pos 2 | pts 2
 * As colunas "pos N" (posição final na etapa N) e "pts N" (pontos na etapa N,
 * só para conferência) são opcionais.
 */

export interface ParsedTeamScore {
  tenths: number;
  items: { label: string; tenths: number }[];
}

export interface ParsedEntry {
  name: string;
  participant: string | null;
  /** nível -> nome do time (como na tabela de times) */
  picks: Record<number, string>;
  /** posição final em cada etapa, quando informada */
  positions: (number | undefined)[];
}

export interface ParsedHistory {
  periods: string[];
  tiers: { tier: number; teamNames: string[] }[];
  /** por etapa: nome do time -> pontos */
  teamScores: Map<string, ParsedTeamScore>[];
  entries: ParsedEntry[];
}

function splitLine(line: string): string[] {
  const sep = line.includes("\t") ? "\t" : ";";
  return line.split(sep).map((c) => c.trim().replace(/^"|"$/g, "").trim());
}

function rows(text: string): { n: number; cols: string[] }[] {
  return text
    .split(/\r?\n/)
    .map((line, i) => ({ n: i + 1, cols: splitLine(line) }))
    .filter((r) => r.cols.some((c) => c !== ""));
}

/** "12,5", "12.5", "-3", "−3" -> décimos inteiros. undefined se não for um número com até 1 casa. */
export function parseTenths(text: string): number | undefined {
  const clean = text.replace(/\s/g, "").replace("−", "-").replace(",", ".");
  if (!/^[+-]?\d+(\.\d)?$/.test(clean)) return undefined;
  return Math.round(Number(clean) * 10);
}

const fmt = (tenths: number) => (tenths / 10).toLocaleString("pt-BR");

export function parseHistory(input: {
  periodNames: string[];
  teamsText: string;
  entriesText: string;
  /** Apelidos conhecidos de times (nome curto, sigla) -> nome completo. */
  aliases?: Record<string, string>;
}): { ok: true; data: ParsedHistory } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const periods = input.periodNames.map((p) => p.trim()).filter(Boolean);
  if (periods.length === 0) errors.push("Informe o nome de pelo menos uma etapa (ex.: 1º turno, 2º turno).");
  if (new Set(periods.map(normalizeName)).size !== periods.length) errors.push("Há etapas com o mesmo nome.");

  const periodIndex = (text: string): number => {
    if (/^\d+$/.test(text)) return Number(text) - 1;
    return periods.findIndex((p) => normalizeName(p) === normalizeName(text));
  };

  // ---------- times ----------
  const teamRows = rows(input.teamsText);
  const tierOfTeam = new Map<string, number>(); // nome normalizado -> nível
  const displayName = new Map<string, string>();
  const teamScores: Map<string, ParsedTeamScore>[] = periods.map(() => new Map());

  if (teamRows.length < 2) {
    errors.push("Times: cole a tabela com o cabeçalho e pelo menos uma linha.");
  } else {
    const header = teamRows[0].cols;
    const labels = header.slice(4).map((h) => h.trim());
    if (header.length < 4) errors.push("Times: o cabeçalho precisa de pelo menos 4 colunas (nível, time, etapa, total).");
    labels.forEach((label, i) => {
      if (!label) errors.push(`Times: a coluna ${i + 5} do cabeçalho está sem nome.`);
    });
    for (const { n, cols } of teamRows.slice(1)) {
      const where = `Times, linha ${n}`;
      const [tierText = "", name = "", periodText = "", totalText = ""] = cols;
      if (!/^\d+$/.test(tierText) || Number(tierText) < 1) {
        errors.push(`${where}: o nível deve ser um número.`);
        continue;
      }
      if (!name) {
        errors.push(`${where}: falta o nome do time.`);
        continue;
      }
      const p = periodIndex(periodText);
      if (p < 0 || p >= periods.length) {
        errors.push(`${where}: etapa "${periodText}" não existe (use 1 a ${periods.length} ou o nome da etapa).`);
        continue;
      }
      const key = normalizeName(name);
      const tier = Number(tierText);
      if (tierOfTeam.has(key) && tierOfTeam.get(key) !== tier) {
        errors.push(`${where}: ${name} aparece em dois níveis diferentes.`);
        continue;
      }
      tierOfTeam.set(key, tier);
      if (!displayName.has(key)) displayName.set(key, name);
      if (teamScores[p].has(key)) {
        errors.push(`${where}: ${name} está repetido na etapa ${periods[p]}.`);
        continue;
      }
      const items: { label: string; tenths: number }[] = [];
      let bad = false;
      labels.forEach((label, i) => {
        const cell = cols[4 + i] ?? "";
        if (cell === "") return;
        const value = parseTenths(cell);
        if (value === undefined) {
          errors.push(`${where}: "${cell}" na coluna "${label}" não é um número (use no máximo uma casa decimal).`);
          bad = true;
        } else if (value !== 0) items.push({ label, tenths: value });
      });
      const sum = items.reduce((total, item) => total + item.tenths, 0);
      let tenths = sum;
      if (totalText !== "") {
        const total = parseTenths(totalText);
        if (total === undefined) {
          errors.push(`${where}: total "${totalText}" não é um número.`);
          bad = true;
        } else if (items.length > 0 && total !== sum) {
          errors.push(`${where}: o total de ${name} é ${fmt(total)}, mas o detalhamento soma ${fmt(sum)}.`);
          bad = true;
        } else tenths = total;
      } else if (items.length === 0) {
        errors.push(`${where}: ${name} está sem total e sem detalhamento.`);
        bad = true;
      }
      if (!bad) teamScores[p].set(key, { tenths, items });
    }
    for (const [key, name] of displayName) {
      periods.forEach((period, p) => {
        if (!teamScores[p].has(key) && errors.length === 0) {
          errors.push(`Times: falta a linha de ${name} na etapa ${period}.`);
        }
      });
    }
  }

  const tierNumbers = [...new Set(tierOfTeam.values())].sort((a, b) => a - b);
  const tiers = tierNumbers.map((tier) => ({
    tier,
    teamNames: [...tierOfTeam.entries()].filter(([, t]) => t === tier).map(([key]) => displayName.get(key)!),
  }));
  for (const t of tiers) {
    if (t.teamNames.length < 2) errors.push(`Times: o nível ${t.tier} tem só um time.`);
  }

  // ---------- palpites ----------
  const aliasOf = new Map<string, string>();
  for (const [alias, full] of Object.entries(input.aliases ?? {})) {
    if (tierOfTeam.has(normalizeName(full))) aliasOf.set(normalizeName(alias), normalizeName(full));
  }
  const entryRows = rows(input.entriesText);
  const entries: ParsedEntry[] = [];
  const posCol: (number | undefined)[] = periods.map(() => undefined);
  const ptsCol: (number | undefined)[] = periods.map(() => undefined);

  if (entryRows.length < 2) {
    errors.push("Palpites: cole a tabela com o cabeçalho e pelo menos uma linha.");
  } else if (tierNumbers.length > 0) {
    const header = entryRows[0].cols;
    const pickStart = 2;
    header.slice(pickStart + tierNumbers.length).forEach((h, i) => {
      const col = pickStart + tierNumbers.length + i;
      const m = /^(pos|posicao|posição|pts|pontos)\D*(\d+)$/i.exec(h.trim());
      if (!h.trim()) return;
      if (!m || Number(m[2]) < 1 || Number(m[2]) > periods.length) {
        errors.push(`Palpites: não entendi a coluna "${h}" do cabeçalho (use "pos 1", "pts 1", "pos 2"...).`);
        return;
      }
      if (/^pos/i.test(m[1])) posCol[Number(m[2]) - 1] = col;
      else ptsCol[Number(m[2]) - 1] = col;
    });
    if (header.length < pickStart + tierNumbers.length) {
      errors.push(
        `Palpites: o cabeçalho precisa de palpite, participante e mais ${tierNumbers.length} colunas (um time por nível).`,
      );
    }
    const seen = new Set<string>();
    for (const { n, cols } of entryRows.slice(1)) {
      const where = `Palpites, linha ${n}`;
      const name = (cols[0] ?? "").replace(/\s+/g, " ");
      if (name.length < 2 || name.length > 40) {
        errors.push(`${where}: o nome do palpite deve ter de 2 a 40 letras.`);
        continue;
      }
      if (seen.has(normalizeName(name))) {
        errors.push(`${where}: já existe outro palpite chamado "${name}".`);
        continue;
      }
      seen.add(normalizeName(name));
      const picks: Record<number, string> = {};
      let bad = false;
      tierNumbers.forEach((tier, i) => {
        const cell = cols[pickStart + i] ?? "";
        let key = normalizeName(cell);
        key = aliasOf.get(key) ?? key;
        if (tierOfTeam.get(key) !== tier) {
          errors.push(
            cell
              ? `${where}: "${cell}" não é um time do nível ${tier}.`
              : `${where}: falta o time do nível ${tier}.`,
          );
          bad = true;
        } else picks[tier] = displayName.get(key)!;
      });
      const positions = periods.map((_, p) => {
        const col = posCol[p];
        const cell = col === undefined ? "" : (cols[col] ?? "").replace(/[º°.]/g, "");
        if (cell === "") return undefined;
        if (!/^\d+$/.test(cell) || Number(cell) < 1) {
          errors.push(`${where}: posição "${cols[col!]}" inválida.`);
          bad = true;
          return undefined;
        }
        return Number(cell);
      });
      if (!bad) {
        periods.forEach((period, p) => {
          const col = ptsCol[p];
          const cell = col === undefined ? "" : (cols[col] ?? "");
          if (cell === "") return;
          const given = parseTenths(cell);
          const sum = tierNumbers.reduce(
            (total, tier) => total + (teamScores[p].get(normalizeName(picks[tier]))?.tenths ?? 0),
            0,
          );
          if (given === undefined) errors.push(`${where}: pontos "${cell}" não é um número.`);
          else if (given !== sum) {
            errors.push(
              `${where}: ${name} tem ${fmt(given)} pts na planilha (${period}), mas os times dele somam ${fmt(sum)}.`,
            );
          }
        });
        entries.push({ name, participant: (cols[1] ?? "").replace(/\s+/g, " ") || null, picks, positions });
      }
    }
    periods.forEach((period, p) => {
      const withPosition = entries.filter((e) => e.positions[p] !== undefined).length;
      if (withPosition > 0 && withPosition < entries.length) {
        errors.push(`Palpites: na etapa ${period}, só ${withPosition} de ${entries.length} palpites têm posição. Preencha todos ou nenhum.`);
      }
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      periods,
      tiers,
      teamScores: teamScores.map(
        (map) => new Map([...map.entries()].map(([key, score]) => [displayName.get(key)!, score])),
      ),
      entries,
    },
  };
}
