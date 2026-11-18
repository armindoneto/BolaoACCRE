import type { ImportedResults, Rules, StandingsCriterion } from "@/lib/scoring";

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

/** Time do cadastro geral, com as edições em que ele aparece (pode não estar em nenhuma). */
export interface CatalogTeam extends Team {
  editions: { editionId: string; tier: number }[];
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
  /** Só em edições antigas importadas: o resultado final pronto. */
  importedResults: ImportedResults | null;
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
  /** Nome do palpite, dado por quem palpitou e revisado pelo administrador. */
  name: string;
  /** Participante dono do palpite; null enquanto o administrador não atribuir. */
  participantId: string | null;
  participantName: string | null;
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
  name: string;
  participantId: string | null;
  picks: Record<number, string>;
}

export interface EntryPatch {
  name?: string;
  picks?: Record<number, string>;
  /** null tira o palpite do participante. */
  participantId?: string | null;
}

export interface EditionPatch {
  name?: string;
  season?: number;
  status?: EditionStatus;
  rules?: Rules;
  entriesDeadline?: string | null;
  prizesText?: string | null;
  manualStandingsOrder?: Record<string, string[]>;
  importedResults?: ImportedResults | null;
}

export interface TeamPatch {
  name: string;
  shortName: string;
  code: string;
  color: string;
  color2: string;
}

/** Um participante do bolão: cadastrado pelo administrador, atravessa as edições. */
export interface ParticipantRef {
  id: string;
  name: string;
}

export interface Participant extends ParticipantRef {
  /** Total de palpites, somando todas as edições. */
  entryCount: number;
}

export interface Repo {
  listEditions(): Promise<Edition[]>;
  getBundle(editionId: string): Promise<EditionBundle | null>;

  saveResults(editionId: string, results: ResultInput[]): Promise<void>;
  /** Substitui todos os jogos da edição pelos informados. */
  replaceMatches(editionId: string, rows: MatchImportRow[]): Promise<void>;

  createEntry(input: NewEntryInput): Promise<Entry>;
  /** Cria vários palpites de uma vez (importação). Devolve os ids na mesma ordem. */
  createEntries(inputs: NewEntryInput[]): Promise<string[]>;
  updateEntry(entryId: string, patch: EntryPatch): Promise<void>;
  deleteEntry(entryId: string): Promise<void>;

  listParticipants(): Promise<Participant[]>;
  getParticipant(participantId: string): Promise<ParticipantRef | null>;
  createParticipant(name: string): Promise<ParticipantRef>;
  renameParticipant(participantId: string, name: string): Promise<void>;
  /** Só apaga participantes sem nenhum palpite. */
  deleteParticipant(participantId: string): Promise<void>;

  updateEdition(editionId: string, patch: EditionPatch): Promise<void>;
  /** Define os times de cada nível da edição, escolhidos do cadastro geral de times. */
  setEditionTiers(editionId: string, tiers: { tier: number; teamIds: string[] }[]): Promise<void>;
  duplicateEdition(editionId: string, name: string, season: number): Promise<string>;
  /** Cria uma edição vazia (sem times, jogos ou palpites). */
  createEdition(input: { name: string; season: number; status: EditionStatus; rules: Rules }): Promise<string>;
  deleteEdition(editionId: string): Promise<void>;

  /** Cadastro geral de times, em ordem alfabética. */
  listTeams(): Promise<CatalogTeam[]>;
  createTeam(input: TeamPatch): Promise<Team>;
  /** Só apaga times que não estão em nenhuma edição. */
  deleteTeam(teamId: string): Promise<void>;
  /** Altera os dados de um time (vale para todas as edições em que ele aparece). */
  updateTeam(teamId: string, patch: TeamPatch): Promise<void>;
  /** Guarda a imagem do escudo (PNG) e devolve o endereço público dela. */
  setTeamCrest(teamId: string, png: Uint8Array): Promise<string>;
  removeTeamCrest(teamId: string): Promise<void>;

  isAdmin(userId: string): Promise<boolean>;
}
