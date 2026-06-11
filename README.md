# Digimon Cards Online

Jogo de cartas online de **Digimon** em tempo real, usando as regras oficiais do
Digimon Card Game e cartas reais. Monorepo TypeScript com servidor autoritativo
(WebSocket), engine de regras puro compartilhado e cliente web em React.

> ⚖️ **Projeto fan-made / educacional.** Digimon e o Digimon Card Game são propriedade
> da Bandai. Este repositório **não** contém artes oficiais e **não** deve ser
> monetizado nem redistribuir material protegido. Apenas dados de cartas (texto/stats)
> importados de fonte pública são usados.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Engine:** TypeScript puro, determinístico, sem I/O (compartilhado client/server)
- **Servidor:** Node + WebSocket (autoritativo, modelo Comando→Evento)
- **Cliente:** React + Vite
- **Infra dev:** PostgreSQL + Redis (via Docker Compose)
- **Testes:** Vitest (engine) + Playwright (e2e, fases posteriores)

## Estrutura

```
packages/
  shared/   # tipos, enums DCG, protocolo de rede (Comandos/Eventos)
  engine/   # regras puras: estado, fases, memória, batalha, security, efeitos
  cards/    # base de cartas normalizada + schema + loader
apps/
  server/   # WebSocket, salas, matchmaking, auth, persistência
  web/      # interface do jogo (board, lobby, deckbuilder)
tools/
  card-importer/  # baixa e normaliza dados públicos das cartas
docs/       # arquitetura, regras, protocolo, roadmap, guia de efeitos
```

## Pré-requisitos

- **Node.js >= 20** (recomendado 22 — ver `.nvmrc`)
- **pnpm 9** (`corepack enable` já habilita)
- **Docker** (para Postgres + Redis locais) — opcional nas primeiras fases

## Começando

```bash
# 1. instalar dependências
pnpm install

# 2. (opcional) subir Postgres + Redis
docker compose up -d

# 3. copiar variáveis de ambiente
cp .env.example .env

# 4. rodar tudo em dev (server + web)
pnpm dev
```

Scripts úteis:

| Comando             | O que faz                                  |
| ------------------- | ------------------------------------------ |
| `pnpm dev`          | Sobe server + web em modo desenvolvimento  |
| `pnpm test`         | Roda os testes (engine etc.)               |
| `pnpm typecheck`    | Checagem de tipos em todo o monorepo        |
| `pnpm lint`         | ESLint                                     |
| `pnpm build`        | Build de todos os pacotes/apps             |
| `pnpm import:cards` | Importa os dados das cartas (BT01)         |

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Regras do jogo](docs/GAME_RULES.md)
- [Protocolo de rede](docs/PROTOCOL.md)
- [Roadmap](docs/ROADMAP.md)
- [Guia de efeitos de cartas](docs/EFFECTS_GUIDE.md)

## Status

🚧 **Fase 0 — Fundações.** Scaffolding do monorepo concluído. Próximo: pipeline de
importação de cartas (Fase 1).
