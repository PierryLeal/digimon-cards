/**
 * Modelo de estado da partida. Estrutura pura e serializável — sem métodos, sem I/O.
 * As transições vivem no reducer (reducer.ts). Veja docs/ARCHITECTURE.md.
 */

import type { CardNumber } from "@digimon/shared";
import type { CardInstanceId } from "@digimon/shared";
import type { CardOrientation } from "@digimon/shared";
import type { Phase, PlayerIndex } from "@digimon/shared";

/** Uma instância concreta de carta dentro da partida. */
export interface CardInstance {
  id: CardInstanceId;
  /** Referência à definição estática (em @digimon/cards). */
  number: CardNumber;
  owner: PlayerIndex;
  orientation: CardOrientation;
}

/**
 * Uma "torre" de cartas na área de batalha ou criação: a carta do topo é a
 * Digimon ativa; as de baixo formam a pilha de evolução (inherited).
 */
export interface CardStack {
  /** Topo (índice 0) é a carta atual; demais são a pilha de evolução. */
  cards: CardInstance[];
  orientation: CardOrientation;
  /** Modificador de DP acumulado nesta vez (efeitos temporários). */
  dpModifier: number;
}

export interface PlayerState {
  /** Id do usuário/sessão dono deste lado. */
  id: string;
  deck: CardInstance[];
  eggDeck: CardInstance[];
  hand: CardInstance[];
  security: CardInstance[];
  trash: CardInstance[];
  /** Slot único da área de criação (ovo/Digimon em criação), se houver. */
  breeding: CardStack | null;
  /** Digimons/Tamers/Options em jogo. */
  battle: CardStack[];
}

export interface GameState {
  matchId: string;
  players: [PlayerState, PlayerState];
  activePlayer: PlayerIndex;
  phase: Phase;
  turn: number;
  /**
   * Medidor de memória, sempre do ponto de vista do jogador ativo:
   * positivo = a favor do ativo; negativo = passou para o oponente.
   */
  memory: number;
  /** Semente do RNG (para retomar de forma determinística). */
  rngSeed: number;
  /** Vencedor, quando a partida termina. */
  winner: PlayerIndex | null;
}
