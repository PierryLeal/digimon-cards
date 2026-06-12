import { useState } from "react";
import type {
  AttackTarget,
  CardView,
  GameEvent,
  MatchView,
  PlayerIndex,
  StackView,
} from "@digimon/shared";
import { useStore } from "../store.js";
import { Card } from "./Card.js";
import { HowToPlay } from "./HowToPlay.js";

type Mode =
  | { kind: "idle" }
  | { kind: "digivolve"; sourceId: string }
  | { kind: "attack"; attackerId: string };

export function Board({ view }: { view: MatchView }): JSX.Element {
  const { cards, sendCommand, log, error, hints, toggleHints, openHowTo } = useStore();
  const [selectedHand, setSelectedHand] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [mulliganed, setMulliganed] = useState(false);
  const [choice, setChoice] = useState<string[]>([]);

  const me = view.you;
  const opp = (1 - me) as PlayerIndex;
  const myTurn = view.activePlayer === me && view.status === "playing" && !view.choice;

  const name = (n: string): string => cards[n]?.name ?? n;
  const dp = (n: string): number | undefined => cards[n]?.dp;

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
  const onMyStackClick = (s: StackView): void => {
    if (mode.kind === "digivolve") return digivolve(mode.sourceId, s.id);
    if (myTurn && !s.suspended) setMode({ kind: "attack", attackerId: s.id });
  };

  const them = view.players[opp];
  const mine = view.players[me];

  return (
    <div className="board">
      <TopBar
        view={view}
        hints={hints}
        onToggleHints={toggleHints}
        onHowTo={openHowTo}
      />
      <HowToPlay />
      {error && <p className="error banner">{error}</p>}

      <MemoryGauge view={view} />
      {hints && <HintBar text={hintFor(view, mode)} />}

      {/* Oponente */}
      <section className="player-area opponent">
        <div className="hand-zone opp">
          <span className="zone-tag">Mão do oponente ({them.handCount})</span>
          <FanOfBacks count={them.handCount} />
        </div>
        <div className="field">
          <Lane title="Criação">
            {them.breeding && <Card number={them.breeding.cards[0]!.number} name={name(them.breeding.cards[0]!.number)} dp={dp(them.breeding.cards[0]!.number)} suspended={them.breeding.suspended} depth={them.breeding.cards.length} />}
          </Lane>
          <Lane title="Batalha">
            {them.battle.map((s) => (
              <Card
                key={s.id}
                number={s.cards[0]!.number}
                name={name(s.cards[0]!.number)}
                dp={dp(s.cards[0]!.number)}
                suspended={s.suspended}
                depth={s.cards.length}
                targetable={mode.kind === "attack"}
                onClick={mode.kind === "attack" ? () => attack(mode.attackerId, { kind: "digimon", cardId: s.id }) : undefined}
              />
            ))}
          </Lane>
          <Pile label="Deck" count={them.deckCount} faceDown />
          <SecurityPile
            count={them.securityCount}
            targetable={mode.kind === "attack"}
            onClick={mode.kind === "attack" ? () => attack(mode.attackerId, { kind: "security" }) : undefined}
          />
          <TrashPile trash={them.trash} name={name} dp={dp} />
        </div>
      </section>

      {/* Centro */}
      <section className="controls">
        {view.status === "mulligan" ? (
          <div className="mulligan">
            <span>Mão inicial — manter?</span>
            <button disabled={mulliganed} onClick={() => { sendCommand({ type: "mulligan", keep: true }); setMulliganed(true); }}>Manter</button>
            <button disabled={mulliganed} onClick={() => { sendCommand({ type: "mulligan", keep: false }); setMulliganed(true); }}>Trocar</button>
          </div>
        ) : (
          <div className="actions">
            <button disabled={!myTurn} onClick={() => sendCommand({ type: "hatchEgg" })}>🥚 Eclodir ovo</button>
            <button disabled={!myTurn} onClick={() => sendCommand({ type: "moveFromBreeding" })}>⬆ Mover da criação</button>
            <button disabled={!myTurn} onClick={() => sendCommand({ type: "passTurn" })}>⟳ Passar turno</button>
            {mode.kind !== "idle" && <button className="cancel" onClick={reset}>✕ Cancelar</button>}
          </div>
        )}
        {view.status === "ended" && (
          <p className="result">{view.winner === me ? "🏆 Você venceu!" : "Derrota."}</p>
        )}
      </section>

      {/* Meu lado */}
      <section className="player-area mine">
        <div className="field">
          <Lane title="Criação">
            {mine.breeding && (
              <Card
                number={mine.breeding.cards[0]!.number}
                name={name(mine.breeding.cards[0]!.number)}
                dp={dp(mine.breeding.cards[0]!.number)}
                suspended={mine.breeding.suspended}
                depth={mine.breeding.cards.length}
                targetable={mode.kind === "digivolve"}
                onClick={mode.kind === "digivolve" ? () => digivolve(mode.sourceId, mine.breeding!.id) : undefined}
              />
            )}
          </Lane>
          <Lane title="Batalha">
            {mine.battle.map((s) => (
              <Card
                key={s.id}
                number={s.cards[0]!.number}
                name={name(s.cards[0]!.number)}
                dp={dp(s.cards[0]!.number)}
                suspended={s.suspended}
                depth={s.cards.length}
                targetable={mode.kind === "digivolve" || (myTurn && !s.suspended)}
                onClick={() => onMyStackClick(s)}
              />
            ))}
          </Lane>
          <Pile label="Deck" count={mine.deckCount} faceDown />
          <SecurityPile count={mine.securityCount} />
          <TrashPile trash={mine.trash} name={name} dp={dp} />
        </div>

        <div className="hand-zone">
          <span className="zone-tag">Sua mão ({mine.hand?.length ?? 0})</span>
          <div className="hand">
            {(mine.hand ?? []).map((c) => (
              <div key={c.id} className="hand-card">
                <Card
                  number={c.number}
                  name={name(c.number)}
                  dp={dp(c.number)}
                  size="lg"
                  selected={selectedHand === c.id}
                  onClick={myTurn ? () => setSelectedHand((cur) => (cur === c.id ? null : c.id)) : undefined}
                />
                {selectedHand === c.id && myTurn && (
                  <div className="hand-actions">
                    <button onClick={() => play(c.id)}>Jogar</button>
                    <button onClick={() => setMode({ kind: "digivolve", sourceId: c.id })}>Evoluir</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {view.choice && (
        <div className="modal">
          <div className="modal-body">
            <p>{view.choice.prompt}</p>
            {view.choice.options.map((o) => (
              <label key={o.id} className="option">
                <input
                  type="checkbox"
                  checked={choice.includes(o.id)}
                  onChange={(e) => setChoice((c) => (e.target.checked ? [...c, o.id] : c.filter((x) => x !== o.id)))}
                />
                {name(o.label)} <span className="muted">{o.id}</span>
              </label>
            ))}
            <button
              disabled={choice.length < view.choice.min || choice.length > view.choice.max}
              onClick={() => { sendCommand({ type: "resolveChoice", choiceId: view.choice!.choiceId, selection: choice }); setChoice([]); }}
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

function hintFor(view: MatchView, mode: Mode): string {
  if (view.choice) return "Há uma escolha a resolver — selecione no destaque e confirme.";
  if (view.status === "mulligan") return "Decida sua mão inicial: Manter ou Trocar.";
  if (view.status === "ended") return view.winner === view.you ? "Fim de jogo — você venceu! 🏆" : "Fim de jogo.";
  if (view.activePlayer !== view.you) return "Aguardando o oponente jogar…";
  if (mode.kind === "digivolve") return "Clique no Digimon (em jogo ou na criação) que vai evoluir.";
  if (mode.kind === "attack") return "Clique na 🛡 Security do oponente ou num Digimon suspenso para atacar.";
  return "Seu turno: clique uma carta para Jogar/Evoluir, ataque com um Digimon ativo, ou passe o turno.";
}

function TopBar({
  view,
  hints,
  onToggleHints,
  onHowTo,
}: {
  view: MatchView;
  hints: boolean;
  onToggleHints: () => void;
  onHowTo: () => void;
}): JSX.Element {
  return (
    <header className="topbar">
      <span>Turno {view.turn}</span>
      <span>Fase: {view.phase}</span>
      <span className={view.activePlayer === view.you ? "you-turn" : ""}>
        {view.activePlayer === view.you ? "● Seu turno" : "○ Turno do oponente"}
      </span>
      <span className="spacer" />
      <label className="switch">
        <input type="checkbox" checked={hints} onChange={onToggleHints} /> Dicas
      </label>
      <button className="ghost" onClick={onHowTo}>Como jogar</button>
    </header>
  );
}

function MemoryGauge({ view }: { view: MatchView }): JSX.Element {
  const myMem = view.activePlayer === view.you ? view.memory : -view.memory;
  const pct = ((myMem + 10) / 20) * 100;
  return (
    <div className="memory-gauge">
      <span className="mg-side">Oponente</span>
      <div className="mg-track">
        <div className="mg-center" />
        <div className="mg-marker" style={{ left: `${pct}%` }}>
          <span>{myMem > 0 ? `+${myMem}` : myMem}</span>
        </div>
      </div>
      <span className="mg-side right">Você</span>
    </div>
  );
}

function HintBar({ text }: { text: string }): JSX.Element {
  return <div className="hint-bar">💡 {text}</div>;
}

function Lane({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="lane">
      <span className="lane-title">{title}</span>
      <div className="lane-cards">{children}</div>
    </div>
  );
}

function FanOfBacks({ count }: { count: number }): JSX.Element {
  const shown = Math.min(count, 10);
  return (
    <div className="fan">
      {Array.from({ length: shown }, (_, i) => (
        <Card key={i} faceDown size="sm" />
      ))}
    </div>
  );
}

function Pile({ label, count, faceDown }: { label: string; count: number; faceDown?: boolean }): JSX.Element {
  return (
    <div className="pile">
      <Card faceDown={faceDown} size="sm" />
      <span className="pile-label">
        {label} {count}
      </span>
    </div>
  );
}

function SecurityPile({
  count,
  targetable,
  onClick,
}: {
  count: number;
  targetable?: boolean;
  onClick?: () => void;
}): JSX.Element {
  return (
    <div className={`pile security ${targetable ? "targetable" : ""}`} onClick={onClick}>
      <Card faceDown size="sm" targetable={targetable} onClick={onClick} />
      <span className="pile-label">🛡 {count}</span>
    </div>
  );
}

function TrashPile({
  trash,
  name,
  dp,
}: {
  trash: CardView[];
  name: (n: string) => string;
  dp: (n: string) => number | undefined;
}): JSX.Element {
  const top = trash[trash.length - 1];
  return (
    <div className="pile">
      {top ? <Card number={top.number} name={name(top.number)} dp={dp(top.number)} size="sm" /> : <Card faceDown size="sm" />}
      <span className="pile-label">🗑 {trash.length}</span>
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
