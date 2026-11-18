import { normalizeName } from "@/lib/data/util";

/**
 * Leitura dos dados de um bolão ANTIGO, colados da planilha (colunas separadas
 * por tabulação, que é como o Excel copia, ou por ponto e vírgula).
 *
 * NÍVEIS — uma linha por nível: "1: Flamengo, Palmeiras".
 *
 * PONTOS DOS TIMES — lista de lançamentos, time por time:
 *   2º turno                          <- nome da etapa (vale para o que vem depois)
 *   Flamengo                          <- nome do time
 *   1,0   Empate                 21ª Rodada
 *   3,0   Vitória                22ª Rodada
 *   0,5   Vitória fora de casa   22ª Rodada
 * Cada lançamento é: pontos, descrição e, se houver, um complemento (a rodada).
 * A descrição é guardada exatamente como está escrita: nenhuma regra é
 * aplicada. O total do time na etapa é a soma dos seus lançamentos.
 *
 * PALPITES — uma linha por palpite:
 *   palpite | participante | <um time por nível...> | pos 1 | pts 1 | pos 2 | pts 2
 * As colunas "pos N" (posição final na etapa N) e "pts N" (pontos na etapa N,
 * só para conferência) são opcionais.
 */

export interface ParsedTeamScore {
  tenths: number;
  items: { label: string; tenths: number; detail?: string }[];
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
  /** Avisos que não impedem a importação (ex.: time sem nenhum lançamento numa etapa). */
  warnings: string[];
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

/** Uma linha de lançamento: pontos, descrição e complemento opcional. */
function pointLine(line: string): { tenths: number; label: string; detail?: string } | "bad-number" | null {
  let cells: string[];
  if (line.includes("\t") || line.includes(";")) cells = splitLine(line);
  else {
    // Sem tabulação (texto copiado de PDF, por exemplo): pontos, espaço e o resto.
    const m = /^\s*(\S+)\s+(.*)$/.exec(line);
    cells = m ? [m[1], ...m[2].split(/\s{2,}/).map((c) => c.trim())] : [line.trim()];
  }
  const filled = cells.filter((c) => c !== "");
  if (filled.length < 2 || !/^[+\-−]?\d/.test(cells[0])) return null;
  const tenths = parseTenths(cells[0]);
  if (tenths === undefined) return "bad-number";
  const [label, ...rest] = cells.slice(1).filter((c) => c !== "");
  const detail = rest.join(" · ");
  return detail ? { tenths, label, detail } : { tenths, label };
}

export function parseHistory(input: {
  periodNames: string[];
  /** Uma linha por nível: "1: Flamengo, Palmeiras". */
  tiersText: string;
  /** Lançamentos de cada time, com linhas de etapa e de time (veja o topo do arquivo). */
  pointsText: string;
  entriesText: string;
  /** Times já cadastrados: apelido (nome curto, sigla) -> nome do cadastro. */
  aliases?: Record<string, string>;
}): { ok: true; data: ParsedHistory } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const periods = input.periodNames.map((p) => p.trim()).filter(Boolean);
  if (periods.length === 0) errors.push("Informe o nome de pelo menos uma etapa (ex.: 1º turno, 2º turno).");
  if (new Set(periods.map(normalizeName)).size !== periods.length) errors.push("Há etapas com o mesmo nome.");

  // ---------- níveis ----------
  // Time já cadastrado, escrito pelo nome curto ou pela sigla, passa a usar o nome do cadastro.
  const canonicalOf = new Map<string, string>();
  for (const [alias, full] of Object.entries(input.aliases ?? {})) {
    canonicalOf.set(normalizeName(alias), full);
    canonicalOf.set(normalizeName(full), full);
  }
  const tierOfTeam = new Map<string, number>(); // nome normalizado -> nível
  const displayName = new Map<string, string>();
  input.tiersText.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const m = /^\s*(?:n[ií]vel\s*)?(\d+)\s*[:;\t–-]\s*(.+)$/i.exec(line);
    if (!m) {
      errors.push(`Níveis, linha ${i + 1}: use o formato "1: Time A, Time B".`);
      return;
    }
    const tier = Number(m[1]);
    for (const raw of m[2].split(/[,;\t]/)) {
      const written = raw.trim().replace(/\s+/g, " ");
      if (!written) continue;
      const name = canonicalOf.get(normalizeName(written)) ?? written;
      const key = normalizeName(name);
      if (tierOfTeam.has(key)) errors.push(`Níveis, linha ${i + 1}: ${name} aparece mais de uma vez.`);
      else {
        tierOfTeam.set(key, tier);
        displayName.set(key, name);
      }
    }
  });
  const tierNumbers = [...new Set(tierOfTeam.values())].sort((a, b) => a - b);
  const tiers = tierNumbers.map((tier) => ({
    tier,
    teamNames: [...tierOfTeam.entries()].filter(([, t]) => t === tier).map(([key]) => displayName.get(key)!),
  }));
  if (tiers.length === 0) errors.push("Níveis: informe os times de cada nível.");
  for (const t of tiers) {
    if (t.teamNames.length < 2) errors.push(`Níveis: o nível ${t.tier} tem só um time.`);
  }

  const aliasOf = new Map<string, string>();
  for (const [alias, full] of Object.entries(input.aliases ?? {})) {
    if (tierOfTeam.has(normalizeName(full))) aliasOf.set(normalizeName(alias), normalizeName(full));
  }
  const teamKey = (text: string): string | undefined => {
    const key = normalizeName(text);
    const resolved = aliasOf.get(key) ?? key;
    return tierOfTeam.has(resolved) ? resolved : undefined;
  };

  // ---------- pontos dos times ----------
  const teamScores: Map<string, ParsedTeamScore>[] = periods.map(() => new Map());
  let period = periods.length === 1 ? 0 : -1;
  let team: string | undefined;
  // Depois de um nome de time não reconhecido, os lançamentos dele são pulados (o erro já foi apontado).
  let skipping = false;
  let lines = 0;
  input.pointsText.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const where = `Pontos, linha ${i + 1}`;
    // Título (etapa ou time) tem prioridade, mesmo que o nome comece com número ("2º turno").
    const only = splitLine(line).filter((c) => c !== "");
    const whole = only.length === 1 ? only[0] : line.trim();
    const isTitle =
      periods.some((name) => normalizeName(name) === normalizeName(whole)) || teamKey(whole) !== undefined;
    const parsed = isTitle ? null : pointLine(line);
    if (parsed === "bad-number") {
      errors.push(`${where}: "${line.trim().split(/[\t;\s]/)[0]}" não é um número de pontos (use no máximo uma casa decimal).`);
      return;
    }
    if (parsed === null) {
      // Linha de título: nome de uma etapa ou de um time.
      const title = isTitle ? whole : (only[0] ?? "");
      const p = periods.findIndex((name) => normalizeName(name) === normalizeName(title));
      if (p >= 0) {
        period = p;
        return;
      }
      team = teamKey(title);
      skipping = !team;
      if (!team) errors.push(`${where}: "${title}" não é uma etapa nem um time dos níveis informados.`);
      return;
    }
    if (period < 0) {
      if (!errors.some((e) => e.startsWith("Pontos: escreva"))) {
        errors.push(`Pontos: escreva o nome da etapa (${periods.join(" ou ")}) numa linha antes dos times dela.`);
      }
      return;
    }
    if (skipping) return;
    if (!team) {
      if (!errors.some((e) => e.includes("antes do nome de um time"))) {
        errors.push(`${where}: há um lançamento antes do nome de um time.`);
      }
      return;
    }
    const score = teamScores[period].get(team) ?? { tenths: 0, items: [] };
    score.items.push(parsed);
    score.tenths += parsed.tenths;
    teamScores[period].set(team, score);
    lines++;
  });
  if (lines === 0 && errors.length === 0) errors.push("Pontos: cole os lançamentos de cada time.");
  periods.forEach((periodName, p) => {
    const missing = [...tierOfTeam.keys()].filter((key) => !teamScores[p].has(key)).map((key) => displayName.get(key)!);
    if (missing.length > 0) {
      warnings.push(`Sem nenhum lançamento em ${periodName} (ficam com 0 ponto): ${missing.join(", ")}.`);
    }
  });

  // ---------- palpites ----------
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
        const key = teamKey(cell);
        if (!key || tierOfTeam.get(key) !== tier) {
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
      warnings,
      periods,
      tiers,
      teamScores: teamScores.map(
        (map) => new Map([...map.entries()].map(([key, score]) => [displayName.get(key)!, score])),
      ),
      entries,
    },
  };
}
