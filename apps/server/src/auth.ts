/**
 * Autenticação simples em memória (register/login/sessão).
 *
 * Hash de senha com scrypt (node:crypto, sem dependências nativas). Sessões por token
 * aleatório. Persistência em memória — trocável por Postgres na integração com Docker.
 */

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

export interface User {
  id: string;
  email: string;
}

interface StoredUser extends User {
  salt: string;
  hash: string;
}

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

export class AuthService {
  private readonly byEmail = new Map<string, StoredUser>();
  private readonly byId = new Map<string, StoredUser>();
  private readonly sessions = new Map<string, string>(); // token → userId

  register(email: string, password: string): { user: User; token: string } {
    const key = email.trim().toLowerCase();
    if (!key || !password) throw new AuthError("invalid-input", "Email e senha são obrigatórios.");
    if (this.byEmail.has(key)) throw new AuthError("email-taken", "Email já cadastrado.");

    const salt = randomBytes(16).toString("hex");
    const user: StoredUser = { id: randomUUID(), email: key, salt, hash: hashPassword(password, salt) };
    this.byEmail.set(key, user);
    this.byId.set(user.id, user);
    return { user: { id: user.id, email: user.email }, token: this.issue(user.id) };
  }

  login(email: string, password: string): { user: User; token: string } {
    const user = this.byEmail.get(email.trim().toLowerCase());
    if (!user) throw new AuthError("invalid-credentials", "Credenciais inválidas.");
    const candidate = hashPassword(password, user.salt);
    const ok =
      candidate.length === user.hash.length &&
      timingSafeEqual(Buffer.from(candidate), Buffer.from(user.hash));
    if (!ok) throw new AuthError("invalid-credentials", "Credenciais inválidas.");
    return { user: { id: user.id, email: user.email }, token: this.issue(user.id) };
  }

  authenticate(token: string): User | null {
    const userId = this.sessions.get(token);
    if (!userId) return null;
    const user = this.byId.get(userId);
    return user ? { id: user.id, email: user.email } : null;
  }

  private issue(userId: string): string {
    const token = randomUUID();
    this.sessions.set(token, userId);
    return token;
  }
}
