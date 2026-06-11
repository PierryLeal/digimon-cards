// Yokomon (Digi-Egg) — Inherited [When Attacking] +1000 DP.
import { defineEffect } from "../registry.js";

export default defineEffect("BT1-001", {
  dpModifier: ({ attacking }) => (attacking ? 1000 : 0),
});
