import { useState } from "react";

export interface CardProps {
  image?: string;
  faceDown?: boolean;
  name?: string;
  dp?: number;
  cost?: number;
  maxHp?: number;
  damage?: number;
  suspended?: boolean;
  depth?: number;
  selected?: boolean;
  targetable?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

/** Carta visual: arte real quando virada para cima, ou verso quando face-down. */
export function Card(props: CardProps): JSX.Element {
  const [imgError, setImgError] = useState(false);
  const size = props.size ?? "md";
  const cls = [
    "gcard",
    size,
    props.suspended ? "suspended" : "",
    props.targetable ? "targetable" : "",
    props.selected ? "selected" : "",
    props.onClick ? "clickable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (props.faceDown || !props.image) {
    return <div className={`${cls} back`} onClick={props.onClick} aria-label="carta virada" />;
  }

  return (
    <div className={cls} onClick={props.onClick} title={props.name}>
      {!imgError ? (
        <img
          src={props.image}
          alt={props.name ?? ""}
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="gcard-fallback">
          <span className="fb-name">{props.name}</span>
          {typeof props.dp === "number" && <span className="fb-dp">{props.dp} DP</span>}
        </div>
      )}
      {typeof props.dp === "number" && <span className="dp-badge">⚔{props.dp}</span>}
      {typeof props.cost === "number" && <span className="cost-badge">⚡{props.cost}</span>}
      {props.depth && props.depth > 1 ? <span className="depth-badge">⛁{props.depth}</span> : null}
      {props.suspended && <span className="susp-badge">⟳</span>}
      {typeof props.maxHp === "number" && props.maxHp > 0 && (
        <span className="hp-bar" title={`${props.maxHp - (props.damage ?? 0)}/${props.maxHp} HP`}>
          <span
            className="hp-fill"
            style={{ width: `${Math.max(0, ((props.maxHp - (props.damage ?? 0)) / props.maxHp) * 100)}%` }}
          />
        </span>
      )}
    </div>
  );
}
