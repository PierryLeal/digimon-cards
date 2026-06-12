import type { CardDefinition } from "@digimon/shared";
import { API_URL } from "./config.js";

export interface AuthResult {
  user: { id: string; email: string };
  token: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { code?: string; message?: string };
  if (!res.ok) throw new Error(data.message ?? "Erro de autenticação.");
  return data;
}

export const register = (email: string, password: string): Promise<AuthResult> =>
  postJson<AuthResult>("/auth/register", { email, password });

export const login = (email: string, password: string): Promise<AuthResult> =>
  postJson<AuthResult>("/auth/login", { email, password });

export async function fetchCards(): Promise<CardDefinition[]> {
  const res = await fetch(`${API_URL}/cards`);
  if (!res.ok) throw new Error("Falha ao carregar cartas.");
  return (await res.json()) as CardDefinition[];
}
