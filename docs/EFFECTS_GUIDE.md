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

## Forma de um efeito (esboço)

```ts
// effects/BT01/BT01-085.ts
import { defineEffect } from "../registry.js";

export default defineEffect("BT1-085", {
  onPlay(ctx) {
    // ex.: "Ao jogar: +1 de memória."
    ctx.gainMemory(1);
  },
  whenDigivolving(ctx) {
    // ex.: "Ao evoluir: descarte 1 da Security do oponente."
    ctx.opponent.trashSecurity(1);
  },
});
```

`ctx` é uma API restrita e determinística sobre o estado (sem acesso a I/O). Efeitos que
exigem decisão do jogador usam `ctx.choose(...)`, que pausa a resolução e dispara um
`promptChoice` no protocolo; a resposta retoma a continuação.

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
