// Gabumon — [On Play] Draw 1.
import { defineEffect } from "../registry.js";

export default defineEffect("BT1-029", {
  onPlay: (api) => api.draw(1),
});
