import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CardDatabase, parseCardSet } from "./loader.js";

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../data");

function loadBt01() {
  const raw = JSON.parse(readFileSync(resolve(dataDir, "bt01.json"), "utf8"));
  return parseCardSet(raw);
}

describe("base de cartas BT01 (dados reais importados)", () => {
  const file = loadBt01();
  const db = new CardDatabase().add(file.cards);

  it("valida pelo schema e tem 115 cartas únicas", () => {
    expect(file.set).toBe("BT01");
    expect(db.size).toBe(115);
  });

  it("tem a composição esperada por tipo", () => {
    const byKind = db.all().reduce<Record<string, number>>((acc, c) => {
      acc[c.kind] = (acc[c.kind] ?? 0) + 1;
      return acc;
    }, {});
    expect(byKind).toEqual({ "digi-egg": 8, digimon: 78, tamer: 5, option: 24 });
  });

  it("consulta uma carta conhecida (Agumon BT1-010)", () => {
    const agumon = db.require("BT1-010");
    expect(agumon.name).toBe("Agumon");
    expect(agumon.kind).toBe("digimon");
    expect(agumon.colors).toContain("red");
    expect(agumon.level).toBe(3);
    expect(agumon.dp).toBe(2000);
    expect(agumon.digivolveCosts[0]).toEqual({ color: "red", fromLevel: 2, cost: 0 });
  });

  it("todo Digimon tem ao menos um custo de evolução", () => {
    const semCusto = db.all().filter((c) => c.kind === "digimon" && c.digivolveCosts.length === 0);
    expect(semCusto.map((c) => c.number)).toEqual([]);
  });

  it("Digi-Eggs carregam efeito herdado, não efeito principal", () => {
    const eggs = db.all().filter((c) => c.kind === "digi-egg");
    expect(eggs.length).toBe(8);
    for (const egg of eggs) {
      expect(egg.effectText).toBeUndefined();
    }
  });

  it("efeitos de Security de Tamers/Options vão para securityEffectText", () => {
    const tai = db.require("BT1-085"); // Tamer
    expect(tai.securityEffectText).toMatch(/\[Security\]/);
    expect(tai.inheritedEffectText).toBeUndefined();
  });
});
