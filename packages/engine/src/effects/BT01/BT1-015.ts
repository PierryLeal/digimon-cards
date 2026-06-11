// Greymon — Inherited [Your Turn] +2000 DP.
import { defineEffect } from "../registry.js";

export default defineEffect("BT1-015", {
  dpModifier: ({ isYourTurn }) => (isYourTurn ? 2000 : 0),
});
