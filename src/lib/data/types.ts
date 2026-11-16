import type { Rules, StandingsCriterion } from "@/lib/scoring";

export type EditionStatus = "draft" | "open_for_entries" | "running" | "finished";

export const EDITION_STATUS_LABEL: Record<EditionStatus, string> = {
  draft: "Rascunho",
  open_for_entries: "Palpites abertos",
  running: "Em andamento",
  finished: "Encerrada",
};

export interface Team {
  id: string;
  name: string;
  shortName: string;
  /** Sigla de 3 letras, usada no escudo quando não há imagem. */
  code: string;
  crestUrl: string | null;
  color: string;
  color2: string;
}

export interface EditionTeam extends Team {
  tier: number;
}

export interface Edition {
  id: string;
  competitionName: string;
  standingsCriteria: StandingsCriterion[];
  season: number;
  name: string;
  status: EditionStatus;
  rules: Rules;
  entriesDeadline: string | null;
  prizesText: string | null;
  /** turno -> ids dos times, para desempates que o sistema não resolve sozinho. */
  manualStandingsOrder: Record<string, string[]>;
}

export interface Match {
  id: string;
  round: number;
  date: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface Entry {
  id: string;
  participantId: string;
  participantName: string;
  nickname: string | null;
  selectionKey: string;
  /** nível -> id do time */
  picks: Record<number, string>;
  createdAt: string;
}

export interface EditionBundle {
  edition: Edition;
  teams: EditionTeam[];
  matches: Match[];
  entries: Entry[];
}

export interface ResultInput {
  matchId: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface MatchImportRow {
  round: number;
  date: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface NewEntryInput {
  editionId: string;
  participantName: string;
  /** Se informado, o palpite entra para este participante (e usa o link dele). */
  participantId?: string;
  userId?: string | null;
  nickname: string | null;
  picks: Record<number, string>;
}

export interface EditionPatch {
  name?: string;
  season?: number;
  status?: EditionStatus;
  rules?: Rules;
  entriesDeadline?: string | null;
  prizesText?: string | null;
  manualStandingsOrder?: Record<string, string[]>;
}

export interface TeamPatch {
  name: string;
  shortName: string;
  code: string;
  color: string;
  color2: string;
}

export interface TokenAccess {
  token: string;
  editionId: string;
  participantId: string;
  participantName: string;
  entries: Entry[];
}

export interface Repo {
  listEditions(): Promise<Edition[]>;
  getBundle(editionId: string): Promise<EditionBundle | null>;

  saveResults(editionId: string, results: ResultInput[]): Promise<void>;
  /** Substitui todos os jogos da edição pelos informados. */
  replaceMatches(editionId: string, rows: MatchImportRow[]): Promise<void>;

  createEntry(input: NewEntryInput): Promise<{ entry: Entry; token: string }>;
  updateEntry(
    entryId: string,
    patch: { nickname: string | null; picks: Record<number, string>; participantName?: string },
  ): Promise<void>;
  deleteEntry(entryId: string): Promise<void>;
  /** Link pessoal de um palpite (para o admin repassar). */
  getEntryToken(entryId: string): Promise<string | null>;
  getByToken(token: string): Promise<TokenAccess | null>;
  /** Palpites de um usuário com conta, na edição informada. */
  getByUser(userId: string, editionId: string): Promise<TokenAccess | null>;
  /** Liga os palpites de um link pessoal a uma conta. */
  linkTokenToUser(token: string, userId: string): Promise<void>;

  updateEdition(editionId: string, patch: EditionPatch): Promise<void>;
  /** Define os times de cada nível; cria os times que ainda não existem. */
  setEditionTiers(editionId: string, tiers: { tier: number; teamNames: string[] }[]): Promise<void>;
  duplicateEdition(editionId: string, name: string, season: number): Promise<string>;
  deleteEdition(editionId: string): Promise<void>;

  /** Altera os dados de um time (vale para todas as edições em que ele aparece). */
  updateTeam(teamId: string, patch: TeamPatch): Promise<void>;
  /** Guarda a imagem do escudo (PNG) e devolve o endereço público dela. */
  setTeamCrest(teamId: string, png: Uint8Array): Promise<string>;
  removeTeamCrest(teamId: string): Promise<void>;

  isAdmin(userId: string): Promise<boolean>;
}
