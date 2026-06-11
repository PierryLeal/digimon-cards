/**
 * Ponto de entrada do servidor de jogo.
 *
 * Fase 0: HTTP de health check + WebSocket que responde a ping/authenticate.
 * As salas, matchmaking, autenticação e o loop de partida chegam na Fase 4.
 */

import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "@digimon/shared";
import { config } from "./config.js";

const http = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: http });

function send(ws: WebSocket, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      send(ws, { type: "error", code: "bad-json", message: "Mensagem inválida." });
      return;
    }

    switch (msg.type) {
      case "ping":
        send(ws, { type: "pong" });
        break;
      case "authenticate":
        // Validação real do token chega na Fase 4.
        send(ws, { type: "authenticated", userId: "guest" });
        break;
      default:
        send(ws, {
          type: "error",
          code: "not-implemented",
          message: `Mensagem "${msg.type}" ainda não suportada (Fase 4).`,
        });
    }
  });
});

http.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] ouvindo em http://localhost:${config.port} (ws + /health)`);
});
