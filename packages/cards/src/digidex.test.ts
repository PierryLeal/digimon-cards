import { describe, expect, it } from "vitest";
import { loadBundledDigidex } from "./digidex.js";

describe("base do modo Anime (digidex)", () => {
  const db = loadBundledDigidex();

  it("carrega as cartas e valida pelo schema", () => {
    expect(db.size).toBeGreaterThanOrEqual(30);
    const agumon = db.require("agumon");
    expect(agumon.stage).toBe("rookie");
    expect(agumon.dp).toBeGreaterThan(0);
    expect(agumon.image).toMatch(/^https?:\/\//);
  });

  it("respeita as linhas de digivolução", () => {
    const agumon = db.require("agumon");
    const greymon = db.require("greymon");
    expect(db.canDigivolve(agumon, greymon)).toBe(true); // Agumon → Greymon
    expect(db.canDigivolve(greymon, agumon)).toBe(false); // não volta
  });

  it("inclui as cartas de efeito (X-Antibody e recuperação)", () => {
    expect(db.require("x-antibody").kind).toBe("x-antibody");
    expect(db.require("recovery-disk").kind).toBe("option");
  });
});
