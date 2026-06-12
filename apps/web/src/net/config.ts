export const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080";
export const API_URL = import.meta.env.VITE_API_URL ?? WS_URL.replace(/^ws/, "http");
