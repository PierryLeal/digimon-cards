import { describe, expect, it } from "vitest";
import type { GameCommand, PlayerIndex } from "@digimon/shared";
import { createMatch, type MatchSeed } from "../setup.js";
import { reduce } from "../reducer.js";
import type { GameState } from "../state.js";
import { AGUMON, YOKOMON, loadContext, repeat } from "./helpers.js";

const ctx = loadContext();

function newMatch(firstPlayer: PlayerIndex = 0): GameState {
  const seed: MatchSeed = {
    matchId: "m1",
    seed: 12345,
    firstPlayer,
    players: [
      { id: "alice", deck: repeat(AGUMON, 50), eggDeck: repeat(YOKOMON, 5) },
      { id: "bob", deck: repeat(AGUMON, 50), eggDeck: repeat(YOKOMON, 5) },
    ],
  };
  return createMatch(seed).state;
}

/** Aplica uma sequência de comandos, devolvendo o estado final. */
function run(state: GameState, steps: Array<[PlayerIndex, GameCommand]>): GameState {
  let s = state;
  for (const [player, command] of steps) {
    s = reduce(ctx, s, command, player).state;
  }
  return s;
}

function bothKeep(state: GameState): GameState {
  return run(state, [
    [0, { type: "mulligan", keep: true }],
    [1, { type: "mulligan", keep: true }],
  ]);
}

describe("setup e mulligan", () => {
  it("monta security (5), mão (5) e deck restante (40)", () => {
    const s = newMatch();
    expect(s.status).toBe("mulligan");
    for (const p of s.players) {
      expect(p.security).toHaveLength(5);
      expect(p.hand).toHaveLength(5);
      expect(p.deck).toHaveLength(40);
    }
  });

  it("ao ambos manterem, começa o turno 1 do primeiro jogador (sem compra inicial)", () => {
    const s = bothKeep(newMatch(0));
    expect(s.status).toBe("playing");
    expect(s.activePlayer).toBe(0);
    expect(s.turn).toBe(1);
    expect(s.phase).toBe("main");
    expect(s.memory).toBe(0);
    expect(s.players[0].hand).toHaveLength(5); // primeiro jogador não compra no 1º turno
  });

  it("redraw no mulligan continua com 5 cartas na mão", () => {
    const s = run(newMatch(), [[0, { type: "mulligan", keep: false }]]);
    expect(s.players[0].hand).toHaveLength(5);
    expect(s.players[0].hasMulliganed).toBe(true);
    expect(s.status).toBe("mulligan"); // ainda falta o jogador 1
  });
});

describe("memória e passagem de turno", () => {
  it("jogar um Digimon gasta memória; ao ficar negativa, o turno passa", () => {
    const start = bothKeep(newMatch(0));
    const cardId = start.players[0].hand[0]!.id;
    const s = run(start, [[0, { type: "playCard", cardId }]]);

    // Agumon custa 3 → memória 0-3 = -3 → turno passa, oponente recebe 3
    expect(s.activePlayer).toBe(1);
    expect(s.memory).toBe(3);
    expect(s.turn).toBe(2);
    expect(s.players[0].battle).toHaveLength(1);
    expect(s.players[1].hand).toHaveLength(6); // oponente comprou no início do turno dele
  });

  it("passar o turno com memória positiva a descarta (oponente começa com 0)", () => {
    const start = bothKeep(newMatch(0));
    const s = run(start, [[0, { type: "passTurn" }]]);
    expect(s.activePlayer).toBe(1);
    expect(s.memory).toBe(0);
    expect(s.turn).toBe(2);
  });
});

describe("criação e evolução", () => {
  it("eclode ovo, evolui da mão e move para a batalha", () => {
    const start = bothKeep(newMatch(0));
    const agumonInHand = start.players[0].hand[0]!.id;

    const afterHatch = run(start, [[0, { type: "hatchEgg" }]]);
    const breedingId = afterHatch.players[0].breeding!.id;
    expect(afterHatch.players[0].breeding!.cards).toHaveLength(1);

    const afterDigivolve = run(afterHatch, [
      [0, { type: "digivolve", sourceId: agumonInHand, targetId: breedingId }],
    ]);
    // Evolução de custo 0: memória inalterada; pilha com 2 cartas; comprou o bônus
    expect(afterDigivolve.memory).toBe(0);
    expect(afterDigivolve.players[0].breeding!.cards).toHaveLength(2);
    expect(afterDigivolve.players[0].hand).toHaveLength(5); // -1 evolução +1 bônus

    const afterMove = run(afterDigivolve, [[0, { type: "moveFromBreeding" }]]);
    expect(afterMove.players[0].breeding).toBeNull();
    expect(afterMove.players[0].battle).toHaveLength(1);
    expect(afterMove.players[0].battle[0]!.playedThisTurn).toBe(false); // pode atacar
  });
});

describe("batalha e security", () => {
  it("ataque à Security com Digimon de DP igual deleta o atacante", () => {
    // Prepara um atacante (Agumon) vindo da criação, que pode atacar no mesmo turno.
    const start = bothKeep(newMatch(0));
    const agumonInHand = start.players[0].hand[0]!.id;
    let s = run(start, [[0, { type: "hatchEgg" }]]);
    const breedingId = s.players[0].breeding!.id;
    s = run(s, [
      [0, { type: "digivolve", sourceId: agumonInHand, targetId: breedingId }],
      [0, { type: "moveFromBreeding" }],
    ]);

    const attackerId = s.players[0].battle[0]!.id;
    const secBefore = s.players[1].security.length;
    s = run(s, [[0, { type: "attack", attackerId, target: { kind: "security" } }]]);

    // Security é Agumon (2000) vs atacante Agumon (2000) → empate → atacante deletado
    expect(s.players[0].battle).toHaveLength(0);
    expect(s.players[1].security).toHaveLength(secBefore - 1);
    expect(s.players[1].trash).toHaveLength(1);
  });

  it("atacar a Security vazia vence o jogo", () => {
    let s = bothKeep(newMatch(0));
    // Prepara um atacante apto.
    const agumonInHand = s.players[0].hand[0]!.id;
    s = run(s, [[0, { type: "hatchEgg" }]]);
    const breedingId = s.players[0].breeding!.id;
    s = run(s, [
      [0, { type: "digivolve", sourceId: agumonInHand, targetId: breedingId }],
      [0, { type: "moveFromBreeding" }],
    ]);
    // Esvazia a Security do oponente (cenário de borda controlado).
    s = structuredClone(s);
    s.players[1].security = [];

    const attackerId = s.players[0].battle[0]!.id;
    s = run(s, [[0, { type: "attack", attackerId, target: { kind: "security" } }]]);

    expect(s.status).toBe("ended");
    expect(s.winner).toBe(0);
  });
});

describe("condições de derrota", () => {
  it("comprar de um deck vazio faz o jogador perder (deck-out)", () => {
    let s = bothKeep(newMatch(0));
    s = structuredClone(s);
    s.players[1].deck = []; // jogador 1 comprará de deck vazio no início do turno dele
    s = run(s, [[0, { type: "passTurn" }]]);
    expect(s.status).toBe("ended");
    expect(s.winner).toBe(0);
  });
});

describe("validações", () => {
  it("rejeita ação fora do seu turno", () => {
    const s = bothKeep(newMatch(0));
    const cardId = s.players[1].hand[0]!.id;
    expect(() => reduce(ctx, s, { type: "playCard", cardId }, 1)).toThrow(/turno/i);
  });

  it("rejeita evolução sobre um alvo inexistente", () => {
    const s = bothKeep(newMatch(0));
    const sourceId = s.players[0].hand[0]!.id;
    expect(() =>
      reduce(ctx, s, { type: "digivolve", sourceId, targetId: "inexistente" }, 0),
    ).toThrow(/não encontrado/i);
  });
});
