import { useEffect, useState } from "react";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080";

type Status = "connecting" | "online" | "offline";

/**
 * Tela inicial (Fase 0): apenas confirma a conexão WebSocket com o servidor
 * via ping/pong. O lobby, deckbuilder e o board chegam nas Fases 5–6.
 */
export function App(): JSX.Element {
  const [status, setStatus] = useState<Status>("connecting");

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => ws.send(JSON.stringify({ type: "ping" }));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string) as { type: string };
      if (msg.type === "pong") setStatus("online");
    };
    ws.onerror = () => setStatus("offline");
    ws.onclose = () => setStatus((s) => (s === "online" ? "offline" : s));
    return () => ws.close();
  }, []);

  return (
    <main className="shell">
      <h1>Digimon Cards Online</h1>
      <p className="tagline">Jogo de cartas em tempo real — fan-made / educacional</p>
      <p className="status" data-status={status}>
        Servidor: <strong>{statusLabel(status)}</strong>
      </p>
      <p className="phase">🚧 Fase 0 — Fundações</p>
    </main>
  );
}

function statusLabel(status: Status): string {
  switch (status) {
    case "connecting":
      return "conectando…";
    case "online":
      return "online ✅";
    case "offline":
      return "offline ❌ (rode `pnpm dev` no server)";
  }
}
