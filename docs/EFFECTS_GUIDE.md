# Guia de efeitos de cartas

A parte mais cara do projeto é o efeito de cada carta. Para manter o core estável e os
efeitos escaláveis, **cada carta com efeito vira um arquivo** que registra handlers nos
hooks do engine, identificado pelo número da carta.

> Estrutura final (implementada na Fase 3). Aqui fica o desenho que vamos seguir.

## Estrutura

```
packages/engine/src/effects/
  registry.ts          # mapa número → definição de efeito
  hooks.ts             # tipos dos hooks/gatilhos
  BT01/
    BT01-085.ts        # um arquivo por carta com efeito
    ...
```

## Hooks (gatilhos do DCG)

| Hook              | Quando dispara                                            |
| ----------------- | -------------------------------------------------------- |
| `onPlay`          | ao ser jogada da mão                                      |
| `whenDigivolving` | ao evoluir (a partir desta carta)                         |
| `whenAttacking`   | ao declarar ataque                                        |
| `onDeletion`      | quando esta carta é deletada                              |
| `securityEffect`  | quando revelada num security check                       |
| `endOfTurn`       | na fase End                                               |
| `inherited`       | efeito concedido pela pilha de evolução (carta de baixo)  |
| `continuous`      | efeito contínuo enquanto em jogo                          |

## Forma de um efeito (real)

Um arquivo por carta em `packages/engine/src/effects/BT01/`, registrado em `register.ts`:

```ts
// effects/BT01/BT1-029.ts — Gabumon [On Play] Draw 1.
import { defineEffect } from "../registry.js";

export default defineEffect("BT1-029", {
  onPlay: (api) => api.draw(1),
});
```

```ts
// effects/BT01/BT1-001.ts — Yokomon [When Attacking] +1000 DP (herdado).
export default defineEffect("BT1-001", {
  dpModifier: ({ attacking }) => (attacking ? 1000 : 0),
});
```

`api` (`EffectApi`) é uma interface restrita e determinística sobre o estado (sem I/O):

| Método | Uso |
| ------ | --- |
| `api.gainMemory(n)` | controlador ganha `n` de memória |
| `api.draw(n)` | controlador compra `n` cartas |
| `api.unsuspendOwn(n)` | desvira `n` Digimons seus (auto se houver 1 alvo) |
| `api.scheduleEndOfTurnMemory(d)` | agenda variação de memória no fim do turno |
| `api.owner` / `api.opponent` | índices dos jogadores |

Efeitos que exigem **escolha** definem um `pendingChoice` (via helpers como
`unsuspendOwn`): o engine pausa, o servidor envia `promptChoice` e o jogador responde com
`resolveChoice`. Veja `effects/api.ts` e `reducer.ts`.

## Cartas "vanilla"

Cartas sem efeito não precisam de arquivo — o registry retorna um handler vazio por padrão.

## Testes

Cada efeito tem um teste em `effects/BT01/__tests__/BT01-085.test.ts` que monta um estado
mínimo, aplica o gatilho e compara os eventos gerados (golden test). É assim que garantimos
que adicionar/alterar efeitos não quebra o core.

## Princípios

1. Um arquivo por carta — fácil de revisar e de paralelizar a implementação.
2. Efeitos só falam com `ctx` (nunca mutam o estado direto) → determinismo preservado.
3. Texto oficial (`effectText`) fica como comentário/checagem ao lado da lógica.
