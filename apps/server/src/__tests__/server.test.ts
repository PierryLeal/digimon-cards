import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import type { ServerMessage } from "@digimon/shared";
import { startServer, type RunningServer } from "../index.js";

let server: RunningServer;
let base: string;

beforeAll(async () => {
  server = await startServer(0); // porta efêmera
  base = `http://localhost:${server.port}`;
});

afterAll(async () => {
  await server.close();
});

/** Aguarda a próxima mensagem do servidor de um tipo específico. */
function waitFor(ws: WebSocket, type: ServerMessage["type"]): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout aguardando ${type}`)), 4000);
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString()) as ServerMessage;
      if (msg.type === type) {
        clearTimeout(timer);
        resolve(msg);
      }
    });
  });
}

describe("servidor HTTP + WebSocket", () => {
  it("health responde ok", async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  it("registra via HTTP, autentica via WS e cria sala", async () => {
    const reg = await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "player@dgm.com", password: "secret123" }),
    });
    expect(reg.status).toBe(200);
    const { token } = (await reg.json()) as { token: string };
    expect(token).toBeTruthy();

    const ws = new WebSocket(`ws://localhost:${server.port}`);
    await new Promise((r) => ws.on("open", r));

    ws.send(JSON.stringify({ type: "authenticate", token }));
    const authed = await waitFor(ws, "authenticated");
    expect(authed.type).toBe("authenticated");

    ws.send(JSON.stringify({ type: "createRoom" }));
    const room = (await waitFor(ws, "roomState")) as Extract<ServerMessage, { type: "roomState" }>;
    expect(room.code).toMatch(/^[0-9A-F]{6}$/);
    expect(room.players).toContain(
      (authed as Extract<ServerMessage, { type: "authenticated" }>).userId,
    );

    ws.close();
  });

  it("rejeita ações sem autenticação", async () => {
    const ws = new WebSocket(`ws://localhost:${server.port}`);
    await new Promise((r) => ws.on("open", r));
    ws.send(JSON.stringify({ type: "createRoom" }));
    const err = (await waitFor(ws, "error")) as Extract<ServerMessage, { type: "error" }>;
    expect(err.code).toBe("unauthorized");
    ws.close();
  });
});
