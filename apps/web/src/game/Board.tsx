import { useState } from "react";
import type { AnimeAttackTarget, AnimeMatchView, AnimePlayerView, AnimeStackView, PlayerIndex } from "@digimon/shared";
import { useStore } from "../store.js";
import { Card } from "./Card.js";
import { HowToPlay } from "./HowToPlay.js";

type Mode =
  | { kind: "idle" }
  | { kind: "digivolve"; sourceId: string }
  | { kind: "attack"; attackerId: string };

export function Board({ view }: { view: AnimeMatchView }): JSX.Element {
  const { cards, sendCommand, error, hints, toggleHints, openHowTo } = useStore();
  const [selectedHand, setSelectedHand] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "idle" });

  const me = view.you;
  const opp = (1 - me) as PlayerIndex;
  const myTurn = view.activePlayer === me && view.status === "playing";

  const nameOf = (cardId: string): string => cards[cardId]?.name ?? cardId;
  const imageOf = (cardId: string): string | undefined => cards[cardId]?.image;
  const stageOf = (cardId: string): string | undefined => cards[cardId]?.stage;
  const stackDp = (s: AnimeStackView): number => (cards[s.cards[0]!.cardId]?.dp ?? 0) + (s.cards.length - 1);
  const canAttackWith = (s: AnimeStackView): boolean => myTurn && !s.tired && !s.playedThisTurn;

  const reset = (): void => {
    setSelectedHand(null);
    setMode({ kind: "idle" });
  };
  const cmd = (c: Parameters<typeof sendCommand>[0]): void => {
    sendCommand(c);
    reset();
  };
  const attack = (attackerId: string, target: AnimeAttackTarget): void => cmd({ type: "attack", attackerId, target });

  const them = view.players[opp];
  const mine = view.players[me];

  return (
    <div className="board">
      <header className="topbar">
        <span>Turno {view.turn}</span>
        <span className={myTurn ? "you-turn" : ""}>{myTurn ? "● Seu turno" : "○ Turno do oponente"}</span>
        <span className="spacer" />
        <label className="switch">
          <input type="checkbox" checked={hints} onChange={toggleHints} /> Dicas
        </label>
        <button className="ghost" onClick={openHowTo}>Como jogar</button>
      </header>
      <HowToPlay />
      {error && <p className="error banner">{error}</p>}
      {hints && <div className="hint-bar">💡 {hintFor(view, mode, myTurn)}</div>}

      {/* Oponente */}
      <section className="player-area opponent">
        <div className="tamer-row">
          <TamerHp
            label="Tamer inimigo"
            hp={them.hp}
            targetable={mode.kind === "attack"}
            onClick={mode.kind === "attack" ? () => attack(mode.attackerId, { kind: "tamer" }) : undefined}
          />
          <FieldCounts p={them} />
        </div>
        <Lane title="Campo do oponente">
          {them.field.map((s) => (
            <Card
              key={s.id}
              image={imageOf(s.cards[0]!.cardId)}
              name={nameOf(s.cards[0]!.cardId)}
              dp={stackDp(s)}
              depth={s.cards.length}
              suspended={s.tired}
              targetable={mode.kind === "attack"}
              onClick={mode.kind === "attack" ? () => attack(mode.attackerId, { kind: "digimon", stackId: s.id }) : undefined}
            />
          ))}
          {them.field.length === 0 && <span className="empty">— sem Digimon —</span>}
        </Lane>
      </section>

      {/* Centro */}
      <section className="controls">
        <button disabled={!myTurn} onClick={() => cmd({ type: "endTurn" })}>⟳ Passar turno</button>
        {mode.kind !== "idle" && <button className="cancel" onClick={reset}>✕ Cancelar</button>}
        {view.status === "ended" && (
          <p className="result">{view.winner === me ? "🏆 Você venceu!" : "Derrota."}</p>
        )}
      </section>

      {/* Meu lado */}
      <section className="player-area mine">
        <Lane title="Seu campo">
          {mine.field.map((s) => {
            const targetable = mode.kind === "digivolve" || canAttackWith(s);
            return (
              <Card
                key={s.id}
                image={imageOf(s.cards[0]!.cardId)}
                name={nameOf(s.cards[0]!.cardId)}
                dp={stackDp(s)}
                depth={s.cards.length}
                suspended={s.tired || s.playedThisTurn}
                targetable={targetable}
                onClick={() => {
                  if (mode.kind === "digivolve") cmd({ type: "digivolve", sourceId: mode.sourceId, targetId: s.id });
                  else if (canAttackWith(s)) setMode({ kind: "attack", attackerId: s.id });
                }}
              />
            );
          })}
          {mine.field.length === 0 && <span className="empty">— jogue um rookie da mão —</span>}
        </Lane>
        <div className="tamer-row">
          <TamerHp label="Seu Tamer" hp={mine.hp} mine />
          <FieldCounts p={mine} />
        </div>

        <div className="hand-zone">
          <span className="zone-tag">Sua mão ({mine.hand?.length ?? 0})</span>
          <div className="hand">
            {(mine.hand ?? []).map((c) => (
              <div key={c.id} className="hand-card">
                <Card
                  image={imageOf(c.cardId)}
                  name={nameOf(c.cardId)}
                  dp={cards[c.cardId]?.dp}
                  size="lg"
                  selected={selectedHand === c.id}
                  onClick={myTurn ? () => setSelectedHand((cur) => (cur === c.id ? null : c.id)) : undefined}
                />
                {selectedHand === c.id && myTurn && (
                  <div className="hand-actions">
                    {stageOf(c.cardId) === "rookie" && (
                      <button onClick={() => cmd({ type: "playDigimon", cardId: c.id })}>Jogar</button>
                    )}
                    <button onClick={() => setMode({ kind: "digivolve", sourceId: c.id })}>Evoluir</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function hintFor(view: AnimeMatchView, mode: Mode, myTurn: boolean): string {
  if (view.status === "ended") return view.winner === view.you ? "Fim de jogo — você venceu! 🏆" : "Fim de jogo.";
  if (!myTurn) return "Aguardando o oponente jogar…";
  if (mode.kind === "digivolve") return "Clique no SEU Digimon em campo que vai receber a evolução.";
  if (mode.kind === "attack")
    return "Clique num Digimon inimigo para batalhar, ou no Tamer dele (só dá se não houver Digimon protegendo).";
  return "Seu turno: jogue um rookie, evolua um Digimon, ataque com um Digimon ativo, ou passe o turno.";
}

function TamerHp({
  label,
  hp,
  mine,
  targetable,
  onClick,
}: {
  label: string;
  hp: number;
  mine?: boolean;
  targetable?: boolean;
  onClick?: () => void;
}): JSX.Element {
  return (
    <button
      className={`tamer ${mine ? "mine" : ""} ${targetable ? "targetable" : ""}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="tamer-label">{label}</span>
      <span className="tamer-hp">{"❤".repeat(Math.max(0, hp))} <em>{hp} HP</em></span>
    </button>
  );
}

function FieldCounts({ p }: { p: AnimePlayerView }): JSX.Element {
  return (
    <div className="zone-counts">
      <span>Mão: {p.handCount}</span>
      <span>Deck: {p.deckCount}</span>
      <span>Lixo: {p.trashCount}</span>
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
