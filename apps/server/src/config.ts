/** Configuração do servidor a partir de variáveis de ambiente. */
export const config = {
  port: Number(process.env.SERVER_PORT ?? 8080),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
} as const;
