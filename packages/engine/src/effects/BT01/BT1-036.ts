// Garurumon — [On Play] Unsuspend 1 of your Digimon.
import { defineEffect } from "../registry.js";

export default defineEffect("BT1-036", {
  onPlay: (api) => api.unsuspendOwn(1),
});
