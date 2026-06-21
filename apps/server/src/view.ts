/**
 * Monta a AnimeMatchView de um jogador, escondendo a mão do oponente.
 */

import type { AnimeMatchView, AnimePlayerView, AnimeStackView, PlayerIndex } from "@digimon/shared";
import type { anime } from "@digimon/engine";

function stackView(s: anime.AnimeStack): AnimeStackView {
  return {
    id: s.id,
    cards: s.cards.map((c) => ({ id: c.id, cardId: c.cardId })),
    tired: s.tired,
    playedThisTurn: s.playedThisTurn,
  };
}

function playerView(p: anime.AnimePlayer, isSelf: boolean): AnimePlayerView {
  return {
    id: p.id,
    hp: p.hp,
    hand: isSelf ? p.hand.map((c) => ({ id: c.id, cardId: c.cardId })) : undefined,
    handCount: p.hand.length,
    deckCount: p.deck.length,
    trashCount: p.trash.length,
    field: p.field.map(stackView),
  };
}

export function buildAnimeView(state: anime.AnimeState, viewer: PlayerIndex): AnimeMatchView {
  return {
    matchId: state.matchId,
    you: viewer,
    activePlayer: state.activePlayer,
    turn: state.turn,
    status: state.status,
    winner: state.winner,
    players: [playerView(state.players[0], viewer === 0), playerView(state.players[1], viewer === 1)],
  };
}
