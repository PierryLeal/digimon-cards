import { useStore } from "./store.js";
import { Auth } from "./pages/Auth.js";
import { Lobby } from "./pages/Lobby.js";
import { Board } from "./game/Board.js";

export function App(): JSX.Element {
  const screen = useStore((s) => s.screen);
  const view = useStore((s) => s.view);

  if (screen === "auth") return <Auth />;
  if (screen === "lobby") return <Lobby />;
  if (screen === "match" && view) return <Board view={view} />;
  return (
    <div className="card-panel">
      <p>Carregando partida…</p>
    </div>
  );
}
