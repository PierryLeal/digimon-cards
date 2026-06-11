# Roadmap

Marcos por fase. Cada fase termina com um entregável verificável.

## ✅ Fase 0 — Fundações
Monorepo (pnpm + Turborepo), tsconfig/lint/prettier, Vitest, Docker Compose (Postgres +
Redis), CI, scaffolding de todos os pacotes/apps e docs.
**Entregável:** `pnpm install && pnpm dev` sobe server (ws + /health) e web (status online).

## ✅ Fase 1 — Pipeline de cartas
`tools/card-importer` baixa BT01 da digimoncard.io (match por prefixo `BT1-`), deduplica
artes alternativas, normaliza para o schema e grava `packages/cards/data/bt01.json`
(validado por Zod). 115 cartas: 8 Digi-Eggs, 78 Digimon, 5 Tamers, 24 Options.
**Entregável:** base BT01 tipada e validada, carregável pelo `CardDatabase` (com testes).

## ✅ Fase 2 — Core do engine (sem efeitos)
Reducer puro e determinístico (`reduce(ctx, state, command, player)`), estado/zonas,
setup + mulligan, fases (Unsuspend→Draw→Breeding→Main→End), memória + passagem de turno,
jogar/evoluir/eclodir/mover-da-criação/atacar, security check e condições de vitória
(security vazia + deck-out). Cartas vanilla.
**Entregável:** partida completa simulada por testes unitários (14 testes no engine). ✅

Simplificações documentadas (a refinar adiante): ações da criação são permitidas dentro
da fase Main; passar o turno com memória positiva a descarta (oponente começa em 0).

## ⬜ Fase 3 — Engine de efeitos + BT01 completo
Stack de efeitos, hooks (On Play, When Digivolving, When Attacking, On Deletion, Security,
End of Turn), `promptChoice`, registry por carta. Todos os efeitos de BT01.
**Entregável:** decks reais de BT01 jogáveis ponta a ponta (via testes/simulação).

## ⬜ Fase 4 — Servidor de tempo real
ws + salas + loop de partida + views filtradas; auth (cadastro/login JWT); persistência de
matches/eventos em Postgres; estado ativo em Redis; reconexão.
**Entregável:** dois clientes jogam uma partida real pela rede, sem vazar info oculta.

## ⬜ Fase 5 — Cliente web (board)
Tabuleiro com zonas, drag & drop, animações, log de ações, prompts de reação, indicadores
de turno e memória.
**Entregável:** jogar uma partida completa pelo navegador.

## ⬜ Fase 6 — Lobby, contas e deckbuilder
Telas de login/registro, perfil, salas por código + matchmaking, construtor de decks com
validação de regras (50+5, máx. 4 cópias, etc.).

## ⬜ Fase 7 — Robustez & deploy
Espectador, replay, timeout/desconexão, testes e2e (Playwright), Docker de produção, deploy.

## Próximos sets
Após BT01 estável, replicar o fluxo da Fase 3 para BT02+, ST decks, etc. — cada um é só
mais dados + novos arquivos de efeito.
