/**
 * Criação da partida e mulligan.
 */

import { RULES, type CardNumber, type GameEvent, type PlayerIndex } from "@digimon/shared";
import type { CardInstance, GameState, PlayerState } from "./state.js";
import { createRng, shuffle } from "./rng.js";
import { beginTurn, draw } from "./flow.js";

export interface PlayerSeed {
  id: string;
  /** 50 cartas (Digimon/Tamer/Option). */
  deck: CardNumber[];
  /** Até 5 Digi-Eggs. */
  eggDeck: CardNumber[];
}

export interface MatchSeed {
  matchId: string;
  seed: number;
  firstPlayer: PlayerIndex;
  players: [PlayerSeed, PlayerSeed];
}

interface IdGen {
  next(): number;
}

function buildInstances(numbers: CardNumber[], owner: PlayerIndex, ids: IdGen): CardInstance[] {
  return numbers.map((number) => ({ id: `c${ids.next()}`, number, owner }));
}

function emptyPlayer(seed: PlayerSeed, owner: PlayerIndex, ids: IdGen): PlayerState {
  return {
    id: seed.id,
    deck: buildInstances(seed.deck, owner, ids),
    eggDeck: buildInstances(seed.eggDeck, owner, ids),
    hand: [],
    security: [],
    trash: [],
    breeding: null,
    battle: [],
    hasMulliganed: false,
    movedFromBreedingThisTurn: false,
  };
}

/** Cria a partida: embaralha, monta a Security (5) e a mão inicial (5). Status = mulligan. */
export function createMatch(seed: MatchSeed): { state: GameState; events: GameEvent[] } {
  let counter = 0;
  const ids: IdGen = { next: () => ++counter };

  const players: [PlayerState, PlayerState] = [
    emptyPlayer(seed.players[0], 0, ids),
    emptyPlayer(seed.players[1], 1, ids),
  ];

  const state: GameState = {
    matchId: seed.matchId,
    players,
    activePlayer: seed.firstPlayer,
    firstPlayer: seed.firstPlayer,
    phase: "unsuspend",
    turn: 1,
    memory: 0,
    rngState: seed.seed >>> 0,
    nextId: counter + 1,
    status: "mulligan",
    winner: null,
  };

  const rng = createRng(state.rngState);
  for (const p of state.players) {
    p.deck = shuffle(p.deck, rng);
    p.security = p.deck.splice(0, RULES.STARTING_SECURITY);
    p.hand = p.deck.splice(0, RULES.STARTING_HAND);
  }
  state.rngState = rng.getState();

  const events: GameEvent[] = [
    { type: "matchStarted", players: [players[0].id, players[1].id], firstPlayer: seed.firstPlayer },
  ];
  return { state, events };
}

/** Aplica o mulligan de um jogador. Se ambos decidirem, inicia o 1º turno. */
export function applyMulligan(
  state: GameState,
  player: PlayerIndex,
  keep: boolean,
  events: GameEvent[],
): void {
  const p = state.players[player];

  if (!keep) {
    const rng = createRng(state.rngState);
    p.deck.push(...p.hand);
    p.hand = [];
    p.deck = shuffle(p.deck, rng);
    state.rngState = rng.getState();
    draw(state, player, RULES.STARTING_HAND, events);
  }
  p.hasMulliganed = true;

  if (state.players[0].hasMulliganed && state.players[1].hasMulliganed) {
    state.status = "playing";
    state.activePlayer = state.firstPlayer;
    state.turn = 1;
    beginTurn(state, events);
  }
}
