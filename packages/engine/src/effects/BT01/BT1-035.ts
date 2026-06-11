// Leomon — [On Deletion] Gain 2 memory.
import { defineEffect } from "../registry.js";

export default defineEffect("BT1-035", {
  onDeletion: (api) => api.gainMemory(2),
});
