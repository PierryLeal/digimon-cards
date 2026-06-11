/**
 * Normaliza uma carta bruta da digimoncard.io para o nosso CardDefinition.
 */

import type {
  CardColor,
  CardDefinition,
  CardKind,
  CardLevel,
  DigivolveCost,
} from "@digimon/shared";
import type { RawCard } from "./api.js";

const COLOR_MAP: Record<string, CardColor> = {
  red: "red",
  blue: "blue",
  yellow: "yellow",
  green: "green",
  black: "black",
  white: "white",
  purple: "purple",
};

const KIND_MAP: Record<string, CardKind> = {
  "digi-egg": "digi-egg",
  digimon: "digimon",
  tamer: "tamer",
  option: "option",
};

function toColor(raw: string | null): CardColor | null {
  if (!raw) return null;
  return COLOR_MAP[raw.trim().toLowerCase()] ?? null;
}

function isCardLevel(n: number | null): n is CardLevel {
  return n !== null && n >= 2 && n <= 7;
}

/** Limpa texto de efeito: normaliza espaços (\s já cobre NBSP) e remove sobras. */
function cleanText(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/**
 * Constrói o custo de evolução primário a partir dos campos estruturados da API.
 * Alguns cards do BT01 vêm com `evolution_color`/`evolution_level` ausentes apesar de
 * terem `evolution_cost`; nesses casos usamos fallback (cor da carta, nível-1).
 */
function buildDigivolveCosts(
  raw: RawCard,
  cardLevel: CardLevel | undefined,
  fallbackColor: CardColor | null,
): DigivolveCost[] {
  if (raw.evolution_cost === null) return [];
  const color = toColor(raw.evolution_color) ?? fallbackColor;
  let fromLevel: CardLevel | null = isCardLevel(raw.evolution_level) ? raw.evolution_level : null;
  if (fromLevel === null && cardLevel !== undefined) {
    const derived = cardLevel - 1;
    fromLevel = isCardLevel(derived) ? derived : null;
  }
  if (!color || fromLevel === null) return [];
  return [{ color, fromLevel, cost: raw.evolution_cost }];
}

/**
 * Roteia o `source_effect` da API para o campo correto:
 * Digimons/Digi-Eggs têm efeito herdado; Tamers/Options trazem aqui o efeito de Security.
 */
function routeSecondaryEffect(
  raw: RawCard,
): { inheritedEffectText?: string; securityEffectText?: string } {
  const text = cleanText(raw.source_effect);
  if (!text) return {};
  if (/^security effect/i.test(text)) return { securityEffectText: text };
  return { inheritedEffectText: text };
}

export function normalizeCard(raw: RawCard, set: string): CardDefinition {
  const kind = KIND_MAP[raw.type.trim().toLowerCase()];
  if (!kind) throw new Error(`Tipo de carta desconhecido "${raw.type}" em ${raw.id}`);

  const colors = dedupe([toColor(raw.color), toColor(raw.color2)].filter((c): c is CardColor => c !== null));
  if (colors.length === 0) {
    throw new Error(`Carta sem cor reconhecida: ${raw.id} (${raw.color}/${raw.color2})`);
  }

  const types = dedupe(
    [raw.digi_type, raw.digi_type2, raw.digi_type3, raw.digi_type4]
      .map((t) => t?.trim())
      .filter((t): t is string => !!t),
  );

  const forms = dedupe([raw.form, raw.stage].map((f) => f?.trim()).filter((f): f is string => !!f));

  const level = isCardLevel(raw.level) ? raw.level : undefined;
  const mainEffect = cleanText(raw.main_effect);
  const secondary = routeSecondaryEffect(raw);

  // Digi-Eggs só concedem efeito herdado: o texto principal É o efeito herdado.
  const isEgg = kind === "digi-egg";

  return {
    number: raw.id,
    name: raw.name.trim(),
    kind,
    colors,
    level,
    dp: raw.dp ?? undefined,
    playCost: raw.play_cost ?? undefined,
    digivolveCosts: buildDigivolveCosts(raw, level, colors[0] ?? null),
    attribute: raw.attribute?.trim() || undefined,
    types,
    forms,
    effectText: isEgg ? undefined : mainEffect,
    inheritedEffectText: isEgg ? mainEffect : secondary.inheritedEffectText,
    securityEffectText: secondary.securityEffectText,
    set,
    rarity: raw.rarity?.trim().toUpperCase() || undefined,
    imageRef: `https://images.digimoncard.io/images/cards/${raw.id}.jpg`,
  };
}

/**
 * Deduplica entradas por número (a API repete cartas por arte/raridade alternativa)
 * e normaliza. Mantém a primeira ocorrência de cada número, em ordem crescente de id.
 */
export function normalizeSet(rawCards: RawCard[], set: string, idPattern: RegExp): CardDefinition[] {
  const byNumber = new Map<string, RawCard>();
  for (const raw of rawCards) {
    if (!idPattern.test(raw.id)) continue; // descarta números de outros sets capturados pelo prefixo
    if (!byNumber.has(raw.id)) byNumber.set(raw.id, raw);
  }
  return [...byNumber.values()]
    .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }))
    .map((raw) => normalizeCard(raw, set));
}
