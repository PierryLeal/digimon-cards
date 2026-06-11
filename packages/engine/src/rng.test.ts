import { describe, expect, it } from "vitest";
import { createRng, shuffle } from "./rng.js";

describe("rng determinístico", () => {
  it("produz a mesma sequência para a mesma semente", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it("int respeita o limite superior exclusivo", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
  });

  it("shuffle é determinístico e preserva os elementos", () => {
    const deck = Array.from({ length: 50 }, (_, i) => i);
    const s1 = shuffle(deck, createRng(123));
    const s2 = shuffle(deck, createRng(123));
    expect(s1).toEqual(s2);
    expect([...s1].sort((x, y) => x - y)).toEqual(deck);
  });
});
