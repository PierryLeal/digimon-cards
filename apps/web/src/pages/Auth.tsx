import { useState } from "react";
import { useStore } from "../store.js";

export function Auth(): JSX.Element {
  const { authenticate, error, busy } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    void authenticate(mode, email, password);
  };

  return (
    <div className="card-panel auth">
      <h1>Digimon Cards Online</h1>
      <div className="tabs">
        <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
          Entrar
        </button>
        <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
          Cadastrar
        </button>
      </div>
      <form onSubmit={submit}>
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={busy}>
          {mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
