// MetalGreymon — [When Attacking] Gain 3 memory. At end of turn, lose 3 memory.
import { defineEffect } from "../registry.js";

export default defineEffect("BT1-021", {
  whenAttacking: (api) => {
    api.gainMemory(3);
    api.scheduleEndOfTurnMemory(-3);
  },
});
