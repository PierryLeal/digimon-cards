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
  return createAnimeMatch({
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
  });
  return id;
}

describe("modo Anime — setup", () => {
  it("distribui mão inicial e HP do Tamer", () => {
    const s = newMatch();
    expect(s.players[0].hand).toHaveLength(5);
    expect(s.players[1].hand).toHaveLength(5);
    expect(s.players[0].hp).toBe(5);
    expect(s.status).toBe("playing");
  });
});

describe("modo Anime — jogar e digivolver", () => {
  it("joga um rookie; não pode atacar no mesmo turno", () => {
    let s = newMatch();
    const ag = handCard(s, 0, "agumon");
    s = reduce(ctx, s, { type: "playDigimon", cardId: ag }, 0).state;
    expect(s.players[0].field).toHaveLength(1);
    expect(() =>
      reduce(ctx, s, { type: "attack", attackerId: s.players[0].field[0]!.id, target: { kind: "tamer" } }, 0),
    ).toThrow(/enjoo|recém/i);
  });

  it("não joga champion direto em campo", () => {
    const s = newMatch();
    const gr = handCard(s, 0, "greymon");
    expect(() => reduce(ctx, s, { type: "playDigimon", cardId: gr }, 0)).toThrow(/rookie/i);
  });

  it("digivolve Agumon → Greymon (pilha cresce, DP sobe)", () => {
    let s = newMatch();
    const fs = fieldStack(s, 0, "agumon");
    const gr = handCard(s, 0, "greymon");
    s = reduce(ctx, s, { type: "digivolve", sourceId: gr, targetId: fs }, 0).state;
    const stack = s.players[0].field[0]!;
    expect(stack.cards).toHaveLength(2);
    expect(ctx.db.require(stack.cards[0]!.cardId).id).toBe("greymon");
  });

  it("rejeita digivolução ilegal (estágio não superior)", () => {
    const s = newMatch();
    const fs = fieldStack(s, 0, "greymon"); // champion
    const ag = handCard(s, 0, "agumon"); // rookie não evolui sobre champion
    expect(() => reduce(ctx, s, { type: "digivolve", sourceId: ag, targetId: fs }, 0)).toThrow(
      /não evolui|illegal/i,
    );
  });
});

describe("modo Anime — ataque e escudo do Tamer", () => {
  it("não ataca o Tamer enquanto houver Digimon protegendo", () => {
    const s = newMatch();
    const atk = fieldStack(s, 0, "greymon");
    fieldStack(s, 1, "agumon"); // escudo do oponente
    expect(() =>
      reduce(ctx, s, { type: "attack", attackerId: atk, target: { kind: "tamer" } }, 0),
    ).toThrow(/protegido|shield/i);
  });

  it("ataca o Tamer direto quando o campo inimigo está vazio", () => {
    let s = newMatch();
    const atk = fieldStack(s, 0, "agumon");
    s = reduce(ctx, s, { type: "attack", attackerId: atk, target: { kind: "tamer" } }, 0).state;
    expect(s.players[1].hp).toBe(4);
  });

  it("batalha entre Digimon: o de menor DP é deletado", () => {
    let s = newMatch();
    const strong = fieldStack(s, 0, "greymon"); // DP 5
    const weak = fieldStack(s, 1, "agumon"); // DP 3
    s = reduce(ctx, s, { type: "attack", attackerId: strong, target: { kind: "digimon", stackId: weak } }, 0).state;
    expect(s.players[1].field).toHaveLength(0); // fraco deletado
    expect(s.players[0].field).toHaveLength(1); // forte sobrevive
  });

  it("vitória ao zerar o HP do Tamer inimigo", () => {
    let s = newMatch();
    s.players[1].hp = 1;
    const atk = fieldStack(s, 0, "agumon");
    s = reduce(ctx, s, { type: "attack", attackerId: atk, target: { kind: "tamer" } }, 0).state;
    expect(s.status).toBe("ended");
    expect(s.winner).toBe(0);
  });
});

describe("modo Anime — turnos", () => {
  it("passar o turno faz o oponente comprar e vira a vez", () => {
    let s = newMatch();
    s = reduce(ctx, s, { type: "endTurn" }, 0).state;
    expect(s.activePlayer).toBe(1);
    expect(s.turn).toBe(2);
    expect(s.players[1].hand).toHaveLength(6); // comprou no início do turno
  });
});
