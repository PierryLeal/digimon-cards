/**
 * Modelo de estado da partida. Estrutura pura e serializável — sem métodos, sem I/O.
 * As transições vivem no reducer (reducer.ts). Veja docs/ARCHITECTURE.md.
 */

import type { CardInstanceId, CardNumber, Phase, PlayerIndex } from "@digimon/shared";

/** Uma instância concreta de carta dentro da partida. */
export interface CardInstance {
  id: CardInstanceId;
  /** Referência à definição estática (em @digimon/cards). */
  number: CardNumber;
  owner: PlayerIndex;
}

/**
 * Uma "torre" na área de batalha ou criação: o topo (índice 0) é a carta atual
 * (Digimon/Tamer); as de baixo formam a pilha de evolução (efeitos herdados).
 */
export interface CardStack {
  /** Id do stack (estável = id da carta que está no topo ao ser criado). */
  id: CardInstanceId;
  /** Topo (índice 0) é a carta atual; demais são fontes de evolução. */
  cards: CardInstance[];
  suspended: boolean;
  /** Enjoo de invocação: foi jogado neste turno (não pode atacar). */
  playedThisTurn: boolean;
}

export interface PlayerState {
  id: string;
  deck: CardInstance[]; // índice 0 = topo
  eggDeck: CardInstance[];
  hand: CardInstance[];
  security: CardInstance[]; // índice 0 = topo
  trash: CardInstance[];
  breeding: CardStack | null;
  battle: CardStack[];
  /** Já fez (ou recusou) o mulligan. */
  hasMulliganed: boolean;
  /** Já moveu da criação para a batalha neste turno (limite 1/turno). */
  movedFromBreedingThisTurn: boolean;
}

export type GameStatus = "mulligan" | "playing" | "ended";

/** Ação terminal aplicada à seleção de uma escolha pendente. */
export type PendingAction = { kind: "unsuspendStacks"; player: PlayerIndex };

/** Uma escolha que o engine aguarda um jogador resolver (reação/alvo). */
export interface PendingChoice {
  choiceId: string;
  /** Quem decide. */
  player: PlayerIndex;
  prompt: string;
  options: { id: string; label: string }[];
  min: number;
  max: number;
  action: PendingAction;
}

/** Efeito agendado para a fase End do turno atual. */
export type DelayedEffect = { kind: "memory"; owner: PlayerIndex; delta: number };

export interface GameState {
  matchId: string;
  players: [PlayerState, PlayerState];
  activePlayer: PlayerIndex;
  firstPlayer: PlayerIndex;
  phase: Phase;
  turn: number;
  /** Memória do ponto de vista do jogador ativo (positivo = a favor dele). */
  memory: number;
  /** Estado interno do RNG (persistido para determinismo/replay). */
  rngState: number;
  /** Contador para gerar ids de instância. */
  nextId: number;
  status: GameStatus;
  winner: PlayerIndex | null;
  /** Escolha aguardando resolução (bloqueia outros comandos enquanto aberta). */
  pendingChoice: PendingChoice | null;
  /** Efeitos a aplicar no fim do turno atual. */
  delayedEndOfTurn: DelayedEffect[];
}

/** Índice do oponente. */
export function opponentOf(p: PlayerIndex): PlayerIndex {
  return p === 0 ? 1 : 0;
}
