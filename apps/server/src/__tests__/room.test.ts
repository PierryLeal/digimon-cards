import { describe, expect, it } from "vitest";
import { AuthService } from "../auth.js";
import { RoomManager, RoomError } from "../room.js";

describe("AuthService", () => {
  it("registra, autentica por token e faz login", () => {
    const auth = new AuthService();
    const { user, token } = auth.register("Ash@example.com", "pa55");
    expect(auth.authenticate(token)?.id).toBe(user.id);

    const relog = auth.login("ash@example.com", "pa55");
    expect(relog.user.id).toBe(user.id);
  });

  it("rejeita senha errada e email duplicado", () => {
    const auth = new AuthService();
    auth.register("a@b.com", "secret");
    expect(() => auth.login("a@b.com", "wrong")).toThrow(/inválidas/i);
    expect(() => auth.register("a@b.com", "x")).toThrow(/cadastrado/i);
  });
});

describe("GameRoom + RoomManager", () => {
  function startedRoom() {
    const rooms = new RoomManager();
    const { room } = rooms.create("alice");
    rooms.join(room.code, "bob");
    room.setReady(0);
    const started = room.setReady(1);
    expect(started).toBe(true);
    return room;
  }

  it("não permite um terceiro jogador na sala", () => {
    const rooms = new RoomManager();
    const { room } = rooms.create("alice");
    rooms.join(room.code, "bob");
    expect(() => room.join("carol")).toThrow(RoomError);
  });

  it("a view esconde a informação oculta do oponente", () => {
    const room = startedRoom();
    const view = room.viewFor(0)!;
    expect(view.you).toBe(0);
    expect(view.players[0].hand).toBeDefined(); // minha mão é visível
    expect(view.players[1].hand).toBeUndefined(); // a do oponente não
    // Security nunca é exposta (só contagem); nem o deck.
    expect(view.players[0].securityCount).toBe(5);
    expect(view.players[1].securityCount).toBe(5);
    expect(view.players[1].deckCount).toBeGreaterThan(0);
    const oppKeys = Object.keys(view.players[1]);
    expect(oppKeys).not.toContain("security"); // conteúdo da security nunca trafega
    expect(oppKeys).not.toContain("deck");
  });

  it("processa mulligan e uma jogada, atualizando as views", () => {
    const room = startedRoom();
    room.command(0, { type: "mulligan", keep: true });
    room.command(1, { type: "mulligan", keep: true });

    const view = room.viewFor(0)!;
    expect(view.status).toBe("playing");
    expect(view.activePlayer).toBe(0);

    const cardId = view.players[0].hand![0]!.id;
    const events = room.command(0, { type: "playCard", cardId });
    expect(events.length).toBeGreaterThan(0);

    // O oponente vê o estado atualizado, mas a mão dele continua oculta para mim.
    expect(room.viewFor(1)!.players[0].hand).toBeUndefined();
  });
});
