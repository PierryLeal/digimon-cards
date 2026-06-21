import { describe, expect, it } from "vitest";
import { loadBundledDigidex } from "@digimon/cards";
import type { PlayerIndex } from "@digimon/shared";
import { createAnimeMatch, reduce, type AnimeContext } from "./engine.js";
import type { AnimeState } from "./state.js";

const ctx: AnimeContext = { db: loadBundledDigidex() };

function repeat(slug: string, n: number): string[] {
  return Array.from({ length: n }, () => slug);
}

function newMatch(): AnimeState {
  return createAnimeMatch(ctx, {
    matchId: "m",
    seed: 7,
    firstPlayer: 0,
    players: [
      { id: "a", deck: repeat("agumon", 30) },
      { id: "b", deck: repeat("agumon", 30) },
    ],
  }).state;
}

let idc = 1000;
function handCard(state: AnimeState, owner: PlayerIndex, cardId: string): string {
  const id = `inj${idc++}`;
  state.players[owner].hand.push({ id, cardId, owner });
  return id;
}
function fieldStack(
  state: AnimeState,
  owner: PlayerIndex,
  cardId: string,
  opts: { tired?: boolean; playedThisTurn?: boolean } = {},
): string {
  const id = `fs${idc++}`;
  state.players[owner].field.push({
    id,
    cards: [{ id, cardId, owner }],
    tired: opts.tired ?? false,
    playedThisTurn: opts.playedThisTurn ?? false,
    digivolvedThisTurn: false,
    damage: 0,
  });
  return id;
}
/** Dá DigiSoul para o jogador ativo (testes que injetam estado). */
function giveSoul(state: AnimeState, owner: PlayerIndex, n = 8): void {
  state.players[owner].digiSoul = n;
  state.players[owner].digiSoulMax = n;
}

describe("modo Anime — setup e energia", () => {
  it("mão 5, HP 5, primeiro jogador com 1 DigiSoul", () => {
    const s = newMatch();
    expect(s.players[0].hand).toHaveLength(5);
    expect(s.players[0].hp).toBe(5);
    expect(s.players[0].digiSoul).toBe(1);
    expect(s.players[1].digiSoul).toBe(0);
  });

  it("jogar custa DigiSoul (não dá pra jogar 2 rookies com 1 de energia)", () => {
    let s = newMatch();
    const a1 = handCard(s, 0, "agumon");
    const a2 = handCard(s, 0, "agumon");
    s = reduce(ctx, s, { type: "playDigimon", cardId: a1 }, 0).state; // custa 1 → sobra 0
    expect(s.players[0].digiSoul).toBe(0);
    expect(() => reduce(ctx, s, { type: "playDigimon", cardId: a2 }, 0)).toThrow(/DigiSoul/i);
  });

  it("passar o turno aumenta o teto de DigiSoul e recarrega", () => {
    let s = newMatch();
    s = reduce(ctx, s, { type: "endTurn" }, 0).state; // turno do jogador 1
    expect(s.players[1].digiSoul).toBe(1);
    s = reduce(ctx, s, { type: "endTurn" }, 1).state; // volta pro 0
    expect(s.players[0].digiSoulMax).toBe(2);
    expect(s.players[0].digiSoul).toBe(2);
  });
});

describe("modo Anime — jogar e digivolver", () => {
  it("rookie recém-jogado não ataca neste turno", () => {
    let s = newMatch();
    const ag = handCard(s, 0, "agumon");
    s = reduce(ctx, s, { type: "playDigimon", cardId: ag }, 0).state;
    expect(() =>
      reduce(ctx, s, { type: "attack", attackerId: s.players[0].field[0]!.id, target: { kind: "tamer" } }, 0),
    ).toThrow(/enjoo|recém/i);
  });

  it("não joga champion direto", () => {
    const s = newMatch();
    const gr = handCard(s, 0, "greymon");
    expect(() => reduce(ctx, s, { type: "playDigimon", cardId: gr }, 0)).toThrow(/rookie/i);
  });

  it("digivolve Agumon → Greymon (paga custo, pilha cresce)", () => {
    let s = newMatch();
    giveSoul(s, 0);
    const fs = fieldStack(s, 0, "agumon");
    const gr = handCard(s, 0, "greymon");
    s = reduce(ctx, s, { type: "digivolve", sourceId: gr, targetId: fs }, 0).state;
    expect(s.players[0].field[0]!.cards).toHaveLength(2);
    expect(ctx.db.require(s.players[0].field[0]!.cards[0]!.cardId).id).toBe("greymon");
  });

  it("só 1 digivolução por Digimon por turno", () => {
    let s = newMatch();
    giveSoul(s, 0);
    const fs = fieldStack(s, 0, "agumon");
    const gr = handCard(s, 0, "greymon");
    s = reduce(ctx, s, { type: "digivolve", sourceId: gr, targetId: fs }, 0).state;
    const mg = handCard(s, 0, "metalgreymon");
    expect(() => reduce(ctx, s, { type: "digivolve", sourceId: mg, targetId: fs }, 0)).toThrow(
      /já evoluiu|1 por turno/i,
    );
  });

  it("habilidade onDigivolve (WarGreymon compra 1)", () => {
    let s = newMatch();
    giveSoul(s, 0);
    const fs = fieldStack(s, 0, "metalgreymon");
    const wg = handCard(s, 0, "wargreymon");
    const deckBefore = s.players[0].deck.length;
    s = reduce(ctx, s, { type: "digivolve", sourceId: wg, targetId: fs }, 0).state;
    expect(s.players[0].deck.length).toBe(deckBefore - 1); // comprou 1
  });
});

describe("modo Anime — batalha (HP, atributo, pierce)", () => {
  it("dano acumula: Agumon (3) não mata MetalGreymon (HP 9)", () => {
    let s = newMatch();
    const atk = fieldStack(s, 0, "agumon");
    const def = fieldStack(s, 1, "metalgreymon");
    s = reduce(ctx, s, { type: "attack", attackerId: atk, target: { kind: "digimon", stackId: def } }, 0).state;
    expect(s.players[1].field).toHaveLength(1);
    expect(s.players[1].field[0]!.damage).toBe(3);
  });

  it("Greymon (5) mata Agumon (HP 3) e sobrevive à retaliação", () => {
    let s = newMatch();
    const atk = fieldStack(s, 0, "greymon");
    const def = fieldStack(s, 1, "agumon");
    s = reduce(ctx, s, { type: "attack", attackerId: atk, target: { kind: "digimon", stackId: def } }, 0).state;
    expect(s.players[1].field).toHaveLength(0);
    expect(s.players[0].field).toHaveLength(1);
  });

  it("vantagem de atributo: Dorugamon (Data) vence Greymon (Vaccine)", () => {
    let s = newMatch();
    const atk = fieldStack(s, 0, "dorugamon");
    const def = fieldStack(s, 1, "greymon");
    s = reduce(ctx, s, { type: "attack", attackerId: atk, target: { kind: "digimon", stackId: def } }, 0).state;
    expect(s.players[1].field).toHaveLength(0); // Greymon deletado (5+2 ≥ 6 HP)
    expect(s.players[0].field).toHaveLength(1); // Dorugamon sobrevive (retaliação 5 < 6 HP)
  });

  it("ataque com pierce também fere o Tamer", () => {
    let s = newMatch();
    const atk = fieldStack(s, 0, "metalgreymon"); // Giga Destroyer = pierce
    const def = fieldStack(s, 1, "agumon");
    s = reduce(ctx, s, { type: "attack", attackerId: atk, target: { kind: "digimon", stackId: def }, attackIndex: 0 }, 0).state;
    expect(s.players[1].hp).toBe(4); // pierce: -1 no Tamer
    expect(s.players[1].field).toHaveLength(0); // Agumon deletado
  });
});

describe("modo Anime — Tamer e vitória", () => {
  it("não ataca o Tamer com Digimon protegendo", () => {
    const s = newMatch();
    const atk = fieldStack(s, 0, "greymon");
    fieldStack(s, 1, "agumon");
    expect(() => reduce(ctx, s, { type: "attack", attackerId: atk, target: { kind: "tamer" } }, 0)).toThrow(
      /protegido|shield/i,
    );
  });

  it("vence ao zerar o HP do Tamer", () => {
    let s = newMatch();
    s.players[1].hp = 1;
    const atk = fieldStack(s, 0, "agumon");
    s = reduce(ctx, s, { type: "attack", attackerId: atk, target: { kind: "tamer" } }, 0).state;
    expect(s.status).toBe("ended");
    expect(s.winner).toBe(0);
  });

  it("abertura justa: sempre há rookie na mão inicial", () => {
    for (let seed = 1; seed <= 15; seed++) {
      const s = createAnimeMatch(ctx, {
        matchId: "m",
        seed,
        firstPlayer: 0,
        players: [
          { id: "a", deck: ["agumon", ...repeat("greymon", 29)] },
          { id: "b", deck: ["agumon", ...repeat("greymon", 29)] },
        ],
      }).state;
      expect(s.players[0].hand.some((c) => ctx.db.get(c.cardId)?.stage === "rookie")).toBe(true);
    }
  });
});
