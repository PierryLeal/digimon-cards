import { describe, expect, it } from "vitest";
import { AuthService } from "../auth.js";
import { RoomManager, RoomError } from "../room.js";

describe("AuthService", () => {
  it("registra, autentica por token e faz login", () => {
    const auth = new AuthService();
    const { user, token } = auth.register("Ash@example.com", "pa55");
    expect(auth.authenticate(token)?.id).toBe(user.id);
    expect(auth.login("ash@example.com", "pa55").user.id).toBe(user.id);
  });

  it("rejeita senha errada e email duplicado", () => {
    const auth = new AuthService();
    auth.register("a@b.com", "secret");
    expect(() => auth.login("a@b.com", "wrong")).toThrow(/inválidas/i);
    expect(() => auth.register("a@b.com", "x")).toThrow(/cadastrado/i);
  });
});

describe("GameRoom (modo Anime)", () => {
  function startedRoom() {
    const rooms = new RoomManager();
    const { room } = rooms.create("alice");
    rooms.join(room.code, "bob");
    room.setReady(0);
    expect(room.setReady(1)).toBe(true);
    return room;
  }

  it("não permite um terceiro jogador", () => {
    const rooms = new RoomManager();
    const { room } = rooms.create("alice");
    rooms.join(room.code, "bob");
    expect(() => room.join("carol")).toThrow(RoomError);
  });

  it("a view esconde a mão do oponente e mostra HP/campo", () => {
    const view = startedRoom().viewFor(0)!;
    expect(view.you).toBe(0);
    expect(view.players[0].hand).toBeDefined();
    expect(view.players[1].hand).toBeUndefined();
    expect(view.players[0].hp).toBe(5);
    expect(view.players[0].handCount).toBe(5);
    expect(view.players[1].field).toEqual([]);
  });

  it("passar o turno atualiza a view (vira a vez)", () => {
    const room = startedRoom();
    room.command(0, { type: "endTurn" });
    const view = room.viewFor(1)!;
    expect(view.activePlayer).toBe(1);
    expect(view.turn).toBe(2);
    // a mão do oponente (jogador 0) continua oculta para o jogador 1
    expect(view.players[0].hand).toBeUndefined();
  });
});
