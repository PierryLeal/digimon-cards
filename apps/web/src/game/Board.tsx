import { useState } from "react";
import type {
  AttackTarget,
  CardView,
  GameEvent,
  MatchView,
  PlayerIndex,
  PlayerView,
  StackView,
} from "@digimon/shared";
import { useStore } from "../store.js";

type Mode =
  | { kind: "idle" }
  | { kind: "digivolve"; sourceId: string }
  | { kind: "attack"; attackerId: string };

export function Board({ view }: { view: MatchView }): JSX.Element {
  const { cards, sendCommand, log, error } = useStore();
  const [selectedHand, setSelectedHand] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [mulliganed, setMulliganed] = useState(false);
  const [choice, setChoice] = useState<string[]>([]);

  const me = view.you;
  const opp = (1 - me) as PlayerIndex;
  const myTurn = view.activePlayer === me && view.status === "playing" && !view.choice;

  const name = (number: string): string => cards[number]?.name ?? number;
  const dp = (number: string): number | undefined => cards[number]?.dp;

  const reset = (): void => {
    setSelectedHand(null);
    setMode({ kind: "idle" });
  };

  const play = (cardId: string): void => {
    sendCommand({ type: "playCard", cardId });
    reset();
  };
  const digivolve = (sourceId: string, targetId: string): void => {
    sendCommand({ type: "digivolve", sourceId, targetId });
    reset();
  };
  const attack = (attackerId: string, target: AttackTarget): void => {
    sendCommand({ type: "attack", attackerId, target });
    reset();
  };

  const onMyStackClick = (stack: StackView): void => {
    if (mode.kind === "digivolve") return digivolve(mode.sourceId, stack.id);
    if (myTurn && !stack.suspended) setMode({ kind: "attack", attackerId: stack.id });
  };
  const onOppStackClick = (stack: StackView): void => {
    if (mode.kind === "attack") attack(mode.attackerId, { kind: "digimon", cardId: stack.id });
  };
  const onOppSecurityClick = (): void => {
    if (mode.kind === "attack") attack(mode.attackerId, { kind: "security" });
  };

  const them = view.players[opp];
  const mine = view.players[me];

  return (
    <div className="board">
      <TopBar view={view} />
      {error && <p className="error banner">{error}</p>}

      {/* Oponente */}
      <section className="player-area opponent">
        <ZoneCounts p={them} label="Oponente" />
        <div className="rows">
          <Lane title="Criação">{them.breeding && <Stack s={them.breeding} name={name} dp={dp} />}</Lane>
          <Lane title="Batalha">
            {them.battle.map((s) => (
              <Stack
                key={s.id}
                s={s}
                name={name}
                dp={dp}
                onClick={() => onOppStackClick(s)}
                targetable={mode.kind === "attack"}
              />
            ))}
          </Lane>
          <button
            className={`security-zone ${mode.kind === "attack" ? "targetable" : ""}`}
            onClick={onOppSecurityClick}
            disabled={mode.kind !== "attack"}
          >
            🛡 Security ({them.securityCount})
          </button>
        </div>
      </section>

      {/* Centro: controles */}
      <section className="controls">
        {view.status === "mulligan" ? (
          <div className="mulligan">
            <span>Mão inicial — manter?</span>
            <button
              disabled={mulliganed}
              onClick={() => {
                sendCommand({ type: "mulligan", keep: true });
                setMulliganed(true);
              }}
            >
              Manter
            </button>
            <button
              disabled={mulliganed}
              onClick={() => {
                sendCommand({ type: "mulligan", keep: false });
                setMulliganed(true);
              }}
            >
              Trocar
            </button>
          </div>
        ) : (
          <div className="actions">
            <button disabled={!myTurn} onClick={() => sendCommand({ type: "hatchEgg" })}>
              Eclodir ovo
            </button>
            <button disabled={!myTurn} onClick={() => sendCommand({ type: "moveFromBreeding" })}>
              Mover da criação
            </button>
            <button disabled={!myTurn} onClick={() => sendCommand({ type: "passTurn" })}>
              Passar turno
            </button>
            {mode.kind !== "idle" && (
              <button className="cancel" onClick={reset}>
                Cancelar ({mode.kind})
              </button>
            )}
          </div>
        )}
        {view.status === "ended" && (
          <p className="result">
            {view.winner === me ? "🏆 Você venceu!" : "Derrota."}
          </p>
        )}
      </section>

      {/* Meu lado */}
      <section className="player-area mine">
        <div className="rows">
          <Lane title="Criação">
            {mine.breeding && (
              <Stack
                s={mine.breeding}
                name={name}
                dp={dp}
                onClick={() => mode.kind === "digivolve" && digivolve(mode.sourceId, mine.breeding!.id)}
                targetable={mode.kind === "digivolve"}
              />
            )}
          </Lane>
          <Lane title="Batalha">
            {mine.battle.map((s) => (
              <Stack
                key={s.id}
                s={s}
                name={name}
                dp={dp}
                onClick={() => onMyStackClick(s)}
                targetable={mode.kind === "digivolve" || (myTurn && !s.suspended)}
              />
            ))}
          </Lane>
          <div className="security-zone mine">🛡 Security ({mine.securityCount})</div>
        </div>
        <ZoneCounts p={mine} label="Você" />
        <Hand
          hand={mine.hand ?? []}
          name={name}
          dp={dp}
          selected={selectedHand}
          enabled={myTurn}
          onSelect={(id) => setSelectedHand((cur) => (cur === id ? null : id))}
          onPlay={play}
          onDigivolve={(id) => setMode({ kind: "digivolve", sourceId: id })}
        />
      </section>

      {/* Escolha pendente */}
      {view.choice && (
        <div className="modal">
          <div className="modal-body">
            <p>{view.choice.prompt}</p>
            {view.choice.options.map((o) => (
              <label key={o.id} className="option">
                <input
                  type="checkbox"
                  checked={choice.includes(o.id)}
                  onChange={(e) =>
                    setChoice((c) =>
                      e.target.checked ? [...c, o.id] : c.filter((x) => x !== o.id),
                    )
                  }
                />
                {name(o.label)} <span className="muted">{o.id}</span>
              </label>
            ))}
            <button
              disabled={choice.length < view.choice.min || choice.length > view.choice.max}
              onClick={() => {
                sendCommand({ type: "resolveChoice", choiceId: view.choice!.choiceId, selection: choice });
                setChoice([]);
              }}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      <Log log={log} />
    </div>
  );
}

function TopBar({ view }: { view: MatchView }): JSX.Element {
  const turnLabel = view.activePlayer === view.you ? "Seu turno" : "Turno do oponente";
  return (
    <header className="topbar">
      <span>Turno {view.turn}</span>
      <span>Fase: {view.phase}</span>
      <span className="memory">Memória: {view.memory}</span>
      <span className={view.activePlayer === view.you ? "you-turn" : ""}>{turnLabel}</span>
    </header>
  );
}

function ZoneCounts({ p, label }: { p: PlayerView; label: string }): JSX.Element {
  return (
    <div className="zone-counts">
      <strong>{label}</strong>
      <span>Mão: {p.handCount}</span>
      <span>Deck: {p.deckCount}</span>
      <span>Ovos: {p.eggDeckCount}</span>
      <span>Lixo: {p.trash.length}</span>
    </div>
  );
}

function Lane({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="lane">
      <span className="lane-title">{title}</span>
      <div className="lane-cards">{children}</div>
    </div>
  );
}

function Stack({
  s,
  name,
  dp,
  onClick,
  targetable,
}: {
  s: StackView;
  name: (n: string) => string;
  dp: (n: string) => number | undefined;
  onClick?: () => void;
  targetable?: boolean;
}): JSX.Element {
  const top = s.cards[0]!;
  return (
    <button
      className={`stack ${s.suspended ? "suspended" : ""} ${targetable ? "targetable" : ""}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="stack-name">{name(top.number)}</span>
      <span className="stack-dp">{dp(top.number) ?? "—"} DP</span>
      {s.cards.length > 1 && <span className="stack-depth">⛁ {s.cards.length}</span>}
      {s.suspended && <span className="tag">suspenso</span>}
    </button>
  );
}

function Hand({
  hand,
  name,
  dp,
  selected,
  enabled,
  onSelect,
  onPlay,
  onDigivolve,
}: {
  hand: CardView[];
  name: (n: string) => string;
  dp: (n: string) => number | undefined;
  selected: string | null;
  enabled: boolean;
  onSelect: (id: string) => void;
  onPlay: (id: string) => void;
  onDigivolve: (id: string) => void;
}): JSX.Element {
  return (
    <div className="hand">
      {hand.map((c) => (
        <div key={c.id} className={`hand-card ${selected === c.id ? "selected" : ""}`}>
          <button className="hand-face" onClick={() => onSelect(c.id)} disabled={!enabled}>
            <span>{name(c.number)}</span>
            <span className="muted">{dp(c.number) ? `${dp(c.number)} DP` : c.number}</span>
          </button>
          {selected === c.id && enabled && (
            <div className="hand-actions">
              <button onClick={() => onPlay(c.id)}>Jogar</button>
              <button onClick={() => onDigivolve(c.id)}>Evoluir</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Log({ log }: { log: GameEvent[] }): JSX.Element {
  return (
    <aside className="log">
      <strong>Log</strong>
      <ul>
        {log.slice(-12).map((e, i) => (
          <li key={i}>{e.type}</li>
        ))}
      </ul>
    </aside>
  );
}
