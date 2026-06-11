/**
 * Visão filtrada da partida enviada a um jogador (StateView do protocolo).
 *
 * O servidor monta uma `MatchView` por jogador, escondendo a informação oculta do
 * oponente (mão, deck, security). Zonas públicas (batalha, criação, lixo) vão completas.
 */

import type { CardNumber } from "./types.js";
import type { Phase, PlayerIndex } from "./phases.js";

/** Carta visível (com número) dentro de uma view. */
export interface CardView {
  id: string;
  number: CardNumber;
}

/** Pilha (Digimon/Tamer em jogo) — sempre pública. */
export interface StackView {
  id: string;
  cards: CardView[];
  suspended: boolean;
}

export interface PlayerView {
  id: string;
  /** Mão completa apenas para o próprio jogador; senão `undefined`. */
  hand?: CardView[];
  handCount: number;
  deckCount: number;
  eggDeckCount: number;
  securityCount: number;
  trash: CardView[];
  breeding: StackView | null;
  battle: StackView[];
}

/** Escolha pendente, incluída apenas quando é a vez deste jogador decidir. */
export interface ChoiceView {
  choiceId: string;
  prompt: string;
  options: { id: string; label: string }[];
  min: number;
  max: number;
}

export type MatchStatus = "mulligan" | "playing" | "ended";

export interface MatchView {
  matchId: string;
  /** Índice de quem está recebendo esta view. */
  you: PlayerIndex;
  activePlayer: PlayerIndex;
  phase: Phase;
  turn: number;
  /** Memória do ponto de vista do jogador ativo. */
  memory: number;
  status: MatchStatus;
  winner: PlayerIndex | null;
  players: [PlayerView, PlayerView];
  /** Presente apenas se houver uma escolha pendente para você. */
  choice: ChoiceView | null;
}
