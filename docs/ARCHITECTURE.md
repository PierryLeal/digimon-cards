# Arquitetura

## Visão geral

```
┌─────────────┐        WebSocket         ┌──────────────────────────┐
│  apps/web   │  ───── comandos ──────►  │       apps/server         │
│  (React)    │  ◄──── eventos/view ───  │   (autoritativo, Node)    │
└─────────────┘                          │                          │
                                         │  ┌────────────────────┐  │
                                         │  │  @digimon/engine   │  │
                                         │  │  reduce(state,cmd) │  │
                                         │  └────────────────────┘  │
                                         │   Postgres + Redis        │
                                         └──────────────────────────┘
```

O **servidor é autoritativo**: detém o estado canônico da partida. O cliente nunca
decide regras — apenas envia intenções (comandos) e renderiza o que o servidor confirma.

## Princípios

1. **Engine puro e determinístico.** `@digimon/engine` não faz I/O. Assinatura central:
   `reduce(state, command, rng) => { state, events } | RuleError`. Toda aleatoriedade vem
   de um RNG semeado (`rng.ts`). Isso dá testes determinísticos, replay e reconexão.

2. **Comando → Evento (event sourcing).** Cada comando válido gera uma lista de eventos
   atômicos. O log de eventos é a fonte da verdade para replay/espectador e é persistido.

3. **Informação oculta filtrada por jogador.** Mão, deck, eggDeck e security do oponente
   nunca trafegam. O servidor monta uma `stateView` distinta para cada jogador. As zonas
   ocultas estão marcadas em `@digimon/shared` (`HIDDEN_ZONES`).

4. **Efeitos isolados.** O core de regras é estável; cada efeito de carta é um handler
   separado registrado por número de carta (ver [EFFECTS_GUIDE](EFFECTS_GUIDE.md)).

## Camadas

| Pacote                 | Responsabilidade                                            | I/O? |
| ---------------------- | ----------------------------------------------------------- | ---- |
| `@digimon/shared`      | Tipos, enums DCG, protocolo de rede (Comandos/Eventos)      | não  |
| `@digimon/cards`       | Schema + base de cartas normalizada + índice de consulta    | não  |
| `@digimon/engine`      | Estado, fases, memória, batalha, security, stack de efeitos | não  |
| `apps/server`          | WebSocket, salas, matchmaking, auth, persistência           | sim  |
| `apps/web`             | UI: lobby, deckbuilder, board, animações                    | sim  |
| `tools/card-importer`  | Baixa/normaliza dados públicos de cartas                    | sim  |

## Fluxo de uma jogada (tempo real)

1. Jogador **A** faz uma ação → `web` envia `{ type: "command", command }`.
2. `server` chama `reduce(state, command, rng)`.
   - Inválido → responde `error` só para A.
   - Válido → atualiza estado, persiste eventos.
3. `server` faz **broadcast** dos eventos + `stateView` filtrada para A e B.
4. Se um efeito exige reação, `server` envia `promptChoice` ao jogador que decide; o outro
   vê "aguardando oponente". A resposta volta como comando `resolveChoice` e o ciclo segue.

## Estado da partida

Vive em memória no processo dono da sala e é espelhado em Redis (para reconexão e para
escalar várias instâncias via pub/sub). Ao fim da partida, o log de eventos vai para o
Postgres (`match_events`) junto do resultado (`match_history`).

## Por que WebSocket custom (e não Colyseus)

Card games têm muita **informação oculta** e janelas de prioridade complexas. Um modelo
explícito de Comando→Evento com view filtrada por jogador dá controle total sobre o que
cada lado enxerga e facilita replay/testes — mais valioso aqui do que a sincronização
automática de estado de um framework genérico.
