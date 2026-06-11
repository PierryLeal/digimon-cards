/**
 * Monta a MatchView de um jogador a partir do estado autoritativo, escondendo a
 * informação oculta do oponente (mão, deck, security). Veja docs/PROTOCOL.md.
 */

import type { MatchView, PlayerIndex, PlayerView, StackView } from "@digimon/shared";
import type { CardStack, GameState, PlayerState } from "@digimon/engine";

function stackView(s: CardStack): StackView {
  return {
    id: s.id,
    cards: s.cards.map((c) => ({ id: c.id, number: c.number })),
    suspended: s.suspended,
  };
}

function playerView(p: PlayerState, isSelf: boolean): PlayerView {
  return {
    id: p.id,
    hand: isSelf ? p.hand.map((c) => ({ id: c.id, number: c.number })) : undefined,
    handCount: p.hand.length,
    deckCount: p.deck.length,
    eggDeckCount: p.eggDeck.length,
    // Security é oculta para ambos (face down): só a contagem.
    securityCount: p.security.length,
    trash: p.trash.map((c) => ({ id: c.id, number: c.number })),
    breeding: p.breeding ? stackView(p.breeding) : null,
    battle: p.battle.map(stackView),
  };
}

export function buildView(state: GameState, viewer: PlayerIndex): MatchView {
  const pc = state.pendingChoice;
  return {
    matchId: state.matchId,
    you: viewer,
    activePlayer: state.activePlayer,
    phase: state.phase,
    turn: state.turn,
    memory: state.memory,
    status: state.status,
    winner: state.winner,
    players: [playerView(state.players[0], viewer === 0), playerView(state.players[1], viewer === 1)],
    choice:
      pc && pc.player === viewer
        ? { choiceId: pc.choiceId, prompt: pc.prompt, options: pc.options, min: pc.min, max: pc.max }
        : null,
  };
}
