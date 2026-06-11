/**
 * RNG determinístico e semeado. O servidor controla a semente, garantindo que
 * partidas sejam reproduzíveis (replay) e que o cliente não consiga prever o deck.
 *
 * Algoritmo: mulberry32 — rápido, determinístico, suficiente para embaralhar.
 */

export interface Rng {
  /** Próximo float em [0, 1). */
  next(): number;
  /** Inteiro em [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Semente atual (para serializar e retomar). */
  readonly seed: number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    seed,
    next,
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
  };
}

/** Embaralhamento Fisher–Yates determinístico. Retorna um novo array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const a = result[i]!;
    const b = result[j]!;
    result[i] = b;
    result[j] = a;
  }
  return result;
}
