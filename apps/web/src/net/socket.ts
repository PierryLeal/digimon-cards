import type { ClientMessage, GameCommand, ServerMessage } from "@digimon/shared";
import { WS_URL } from "./config.js";

/** Envelope tipado sobre o WebSocket do jogo. */
export class GameSocket {
  private ws: WebSocket;

  constructor(
    private readonly onMessage: (msg: ServerMessage) => void,
    private readonly onOpen?: () => void,
  ) {
    this.ws = new WebSocket(WS_URL);
    this.ws.onopen = () => this.onOpen?.();
    this.ws.onmessage = (ev) => this.onMessage(JSON.parse(ev.data as string) as ServerMessage);
  }

  private send(msg: ClientMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else this.ws.addEventListener("open", () => this.ws.send(JSON.stringify(msg)), { once: true });
  }

  authenticate(token: string): void {
    this.send({ type: "authenticate", token });
  }
  createRoom(): void {
    this.send({ type: "createRoom" });
  }
  joinRoom(code: string): void {
    this.send({ type: "joinRoom", code });
  }
  ready(): void {
    this.send({ type: "ready" });
  }
  command(command: GameCommand): void {
    this.send({ type: "command", command });
  }
  close(): void {
    this.ws.close();
  }
}
