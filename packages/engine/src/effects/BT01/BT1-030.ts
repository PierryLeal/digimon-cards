// Gomamon — Inherited [On Deletion] Gain 1 memory.
import { defineEffect } from "../registry.js";

export default defineEffect("BT1-030", {
  onDeletion: (api) => api.gainMemory(1),
});
