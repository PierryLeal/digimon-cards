# Protocolo de rede

Contrato WebSocket entre `apps/web` e `apps/server`. Tipos canônicos em
`@digimon/shared/protocol.ts`. Mensagens são JSON.

## Direções

- **`ClientMessage`** (cliente → servidor): autenticação, salas, matchmaking e `command`.
- **`ServerMessage`** (servidor → cliente): estado, eventos, prompts, erros.

## Autenticação (HTTP)

Antes do WebSocket, o cliente obtém um token via HTTP:

```
POST /auth/register  { email, password }  → { user, token }
POST /auth/login     { email, password }  → { user, token }
GET  /health                              → { status: "ok", uptime }
```

## Handshake (WS)

```
web → server : { type: "authenticate", token }
server → web : { type: "authenticated", userId }
```

## Sala / partida

```
web → server : { type: "createRoom" }
server → web : { type: "roomState", code, players }
web → server : { type: "joinRoom", code }
web → server : { type: "selectDeck", deck }
web → server : { type: "ready" }
server → web : { type: "matchStart", matchId, you }     // "you" = seu PlayerIndex
server → web : { type: "stateView", view }              // já filtrado para você
```

## Loop de jogo

```
web → server : { type: "command", command: GameCommand }
server → web : { type: "events", events: GameEvent[] }  // broadcast aos 2 jogadores
server → web : { type: "stateView", view }              // novo snapshot filtrado
```

### Reação / escolha

Quando um efeito exige decisão de um jogador:

```
server → web : { type: "promptChoice", choiceId, prompt, options, min, max }
web → server : { type: "command", command: { type: "resolveChoice", choiceId, selection } }
```

O oponente, nesse meio-tempo, recebe eventos indicando "aguardando" (UI).

## Comandos (`GameCommand`)

`mulligan`, `playCard`, `digivolve`, `hatchEgg`, `moveFromBreeding`, `attack`,
`activateEffect`, `resolveChoice`, `passTurn`.

## Eventos (`GameEvent`)

`matchStarted`, `phaseChanged`, `memoryChanged`, `cardMoved`, `cardDigivolved`,
`securityChecked`, `attackDeclared`, `cardDeleted`, `effectTriggered`, `gameOver`.

## Regras de segurança do protocolo

- O servidor **nunca** envia conteúdo de zonas ocultas do oponente (ver `HIDDEN_ZONES`).
  Em `cardMoved` para zonas ocultas do oponente, `cardId` é opaco e a definição não vai junto.
- Todo `command` é re-validado no servidor pelo engine. O cliente é "burro" por design.
- Mensagens são validadas na borda (Zod) antes de chegar ao engine (Fase 4).
