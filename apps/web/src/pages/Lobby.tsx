import { useState } from "react";
import { useStore } from "../store.js";

export function Lobby(): JSX.Element {
  const { createRoom, joinRoom, ready, roomCode, roomPlayers, userId, error } = useStore();
  const [code, setCode] = useState("");

  if (roomCode) {
    const full = roomPlayers.length >= 2;
    return (
      <div className="card-panel">
        <h2>Sala {roomCode}</h2>
        <p>Compartilhe o código com o oponente.</p>
        <ul className="players">
          {roomPlayers.map((p) => (
            <li key={p}>
              {p === userId ? "Você" : "Oponente"} <span className="muted">({p.slice(0, 6)})</span>
            </li>
          ))}
          {!full && <li className="muted">aguardando oponente…</li>}
        </ul>
        <button onClick={ready} disabled={!full}>
          Pronto
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card-panel">
      <h2>Lobby</h2>
      <button onClick={createRoom}>Criar sala</button>
      <div className="join">
        <input
          placeholder="código da sala"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button onClick={() => joinRoom(code)} disabled={!code.trim()}>
          Entrar
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
