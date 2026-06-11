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
  /** Estado interno atual — serialize-o para retomar a sequência exatamente onde parou. */
  getState(): number;
}

/**
 * Cria um RNG mulberry32 a partir de um estado interno (use a semente na 1ª vez e,
 * depois, `getState()` para persistir/retomar de forma determinística).
 */
export function createRng(state: number): Rng {
  let s = state >>> 0;
  const next = (): number => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
    getState: () => s >>> 0,
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
