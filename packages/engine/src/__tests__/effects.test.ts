import { describe, expect, it } from "vitest";
import type { GameCommand, PlayerIndex } from "@digimon/shared";
import { createMatch, type MatchSeed } from "../setup.js";
import { reduce } from "../reducer.js";
import { deleteStack } from "../flow.js";
import { computeDp } from "../effects/triggers.js";
import type { CardInstance, CardStack, GameState } from "../state.js";
import {
  AGUMON,
  GABUMON,
  GARURUMON,
  GOMAMON,
  GREYMON,
  LEOMON,
  METALGREYMON,
  YOKOMON,
  loadContext,
  repeat,
} from "./helpers.js";

const ctx = loadContext();

function newMatch(deckCard = AGUMON): GameState {
  const seed: MatchSeed = {
    matchId: "m",
    seed: 99,
    firstPlayer: 0,
    players: [
      { id: "a", deck: repeat(deckCard, 50), eggDeck: repeat(YOKOMON, 5) },
      { id: "b", deck: repeat(deckCard, 50), eggDeck: repeat(YOKOMON, 5) },
    ],
  };
  return createMatch(seed).state;
}

function bothKeep(state: GameState): GameState {
  let s = reduce(ctx, state, { type: "mulligan", keep: true }, 0).state;
  s = reduce(ctx, s, { type: "mulligan", keep: true }, 1).state;
  return s;
}

function card(id: string, number: string, owner: PlayerIndex): CardInstance {
  return { id, number, owner };
}

function stackOf(cards: CardInstance[], suspended = false): CardStack {
  return { id: cards[0]!.id, cards, suspended, playedThisTurn: false };
}

describe("modificadores de DP (efeitos contínuos/herdados)", () => {
  it("Yokomon (herdado) dá +1000 DP só ao atacar", () => {
    const s = newMatch();
    const stack = stackOf([card("t", AGUMON, 0), card("y", YOKOMON, 0)]);
    s.players[0].battle.push(stack);
    expect(computeDp(ctx, s, stack, true)).toBe(3000); // 2000 + 1000
    expect(computeDp(ctx, s, stack, false)).toBe(2000);
  });

  it("Greymon (herdado) dá +2000 DP só no turno do controlador", () => {
    const s = newMatch();
    const stack = stackOf([card("t", AGUMON, 0), card("g", GREYMON, 0)]);
    s.activePlayer = 0;
    expect(computeDp(ctx, s, stack, false)).toBe(4000); // 2000 + 2000
    s.activePlayer = 1;
    expect(computeDp(ctx, s, stack, false)).toBe(2000); // não é seu turno
  });
});

describe("[On Play]", () => {
  it("Gabumon compra 1 carta ao ser jogado", () => {
    const start = bothKeep(newMatch(GABUMON));
    const deckBefore = start.players[0].deck.length;
    const cardId = start.players[0].hand[0]!.id;
    const s = reduce(ctx, start, { type: "playCard", cardId }, 0).state;
    // -1 da compra de Gabumon (onPlay). O turno pode passar pelo custo, mas a compra ocorreu.
    expect(s.players[0].deck.length).toBe(deckBefore - 1);
  });

  it("Garurumon desvira automaticamente quando há só 1 alvo", () => {
    const start = bothKeep(newMatch());
    const s0 = structuredClone(start);
    s0.memory = 10; // evita passagem de turno pelo custo
    s0.players[0].battle.push(stackOf([card("susp", AGUMON, 0)], true));
    s0.players[0].hand.push(card("gar", GARURUMON, 0));

    const s = reduce(ctx, s0, { type: "playCard", cardId: "gar" }, 0).state;
    expect(s.pendingChoice).toBeNull();
    expect(s.players[0].battle.find((x) => x.id === "susp")!.suspended).toBe(false);
  });

  it("Garurumon pede escolha quando há 2+ alvos; resolveChoice desvira o escolhido", () => {
    const start = bothKeep(newMatch());
    const s0 = structuredClone(start);
    s0.memory = 10;
    s0.players[0].battle.push(stackOf([card("s1", AGUMON, 0)], true));
    s0.players[0].battle.push(stackOf([card("s2", AGUMON, 0)], true));
    s0.players[0].hand.push(card("gar", GARURUMON, 0));

    const afterPlay = reduce(ctx, s0, { type: "playCard", cardId: "gar" }, 0).state;
    expect(afterPlay.pendingChoice).not.toBeNull();
    expect(afterPlay.pendingChoice!.options).toHaveLength(2);

    const choiceId = afterPlay.pendingChoice!.choiceId;
    const resolved = reduce(
      ctx,
      afterPlay,
      { type: "resolveChoice", choiceId, selection: ["s1"] },
      0,
    ).state;
    expect(resolved.pendingChoice).toBeNull();
    expect(resolved.players[0].battle.find((x) => x.id === "s1")!.suspended).toBe(false);
    expect(resolved.players[0].battle.find((x) => x.id === "s2")!.suspended).toBe(true);
  });

  it("rejeita outros comandos enquanto há escolha pendente", () => {
    const start = bothKeep(newMatch());
    const s0 = structuredClone(start);
    s0.memory = 10;
    s0.players[0].battle.push(stackOf([card("s1", AGUMON, 0)], true));
    s0.players[0].battle.push(stackOf([card("s2", AGUMON, 0)], true));
    s0.players[0].hand.push(card("gar", GARURUMON, 0));
    const afterPlay = reduce(ctx, s0, { type: "playCard", cardId: "gar" }, 0).state;
    expect(() => reduce(ctx, afterPlay, { type: "passTurn" }, 0)).toThrow(/escolha pendente/i);
  });
});

describe("[On Deletion]", () => {
  it("Leomon dá +2 de memória ao ser deletado (controlador ativo)", () => {
    const s = bothKeep(newMatch());
    s.players[0].battle.push(stackOf([card("leo", LEOMON, 0)]));
    const before = s.memory;
    deleteStack(s, s.players[0].battle[0]!, []);
    expect(s.memory).toBe(before + 2);
    expect(s.players[0].trash.map((c) => c.id)).toContain("leo");
  });

  it("Gomamon (herdado) dá +1 de memória ao deletar a pilha", () => {
    const s = bothKeep(newMatch());
    s.players[0].battle.push(stackOf([card("top", AGUMON, 0), card("goma", GOMAMON, 0)]));
    const before = s.memory;
    deleteStack(s, s.players[0].battle[0]!, []);
    expect(s.memory).toBe(before + 1);
  });
});

describe("[When Attacking] + fim de turno", () => {
  it("MetalGreymon ganha 3 de memória ao atacar e agenda perda no fim do turno", () => {
    const start = bothKeep(newMatch());
    const s0 = structuredClone(start);
    s0.memory = 0;
    s0.players[0].battle.push(stackOf([card("mg", METALGREYMON, 0)]));

    const s = reduce(ctx, s0, { type: "attack", attackerId: "mg", target: { kind: "security" } }, 0)
      .state;
    expect(s.memory).toBe(3);
    expect(s.delayedEndOfTurn).toHaveLength(1);
  });
});

describe("cobertura do registry", () => {
  it("não dispara para cartas vanilla", () => {
    const cmd: GameCommand = { type: "passTurn" };
    const s = bothKeep(newMatch());
    // Apenas garante que passar o turno com cartas vanilla não lança nada.
    expect(() => reduce(ctx, s, cmd, 0)).not.toThrow();
  });
});
