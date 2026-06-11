# Regras do Digimon Card Game (resumo codificado)

Resumo das regras oficiais que o engine implementa. Referência canônica: regulamento
oficial da Bandai. Aqui registramos o que o código assume e os casos de borda.

## Componentes

- **Deck principal:** 50 cartas (Digimon, Tamer, Option). Máx. 4 cópias por número.
- **Deck de Digi-Eggs:** até 5 cartas (Digi-Eggs / Lv.2).
- **Security:** 5 cartas no topo do deck, viradas para baixo, no início.
- **Mão inicial:** 5 cartas (com mulligan único: embaralhar e comprar 5 de novo).

## Zonas (ver `@digimon/shared/zones.ts`)

`deck`, `eggDeck`, `hand`, `security`, `breeding` (1 slot), `battle`, `trash`.
Ocultas ao oponente: `deck`, `eggDeck`, `hand`, `security`.

## Memória (coração do jogo)

- Medidor de **-10 a +10**, compartilhado, exibido do ponto de vista do jogador ativo.
- Jogar/evoluir custa memória. Quando a memória cruza para o lado do oponente (fica
  negativa para o ativo), o turno **passa** para o oponente, que recebe |memória| de início.
- Começa o jogo com a memória em 0; o jogador do 1º turno define quanto gasta.

## Fases do turno (ver `@digimon/shared/phases.ts`)

1. **Unsuspend** — ativa todas as suas cartas suspensas.
2. **Draw** — compra 1 (o jogador do 1º turno do jogo **não** compra).
3. **Breeding** — opcional: eclodir um Digi-Egg (se a criação está vazia), evoluir na
   criação, ou mover o Digimon da criação (Lv.3+) para a área de batalha.
4. **Main** — jogar Digimons/Tamers/Options, evoluir, atacar, ativar efeitos (gasta memória).
5. **End** — efeitos de "fim de turno"; passa o turno.

## Evolução (Digivolution)

- Coloca uma carta da mão por cima de um Digimon em jogo cujo nível/cor satisfaça um dos
  `digivolveCosts`, pagando o custo em memória.
- A carta de baixo entra na **pilha de evolução** (efeitos herdados/inherited).
- Evoluir **compra 1 carta** (regra padrão de digivolve).

## Batalha

- Digimon ativo ataca **Security** ou um Digimon suspenso do oponente.
- Atacar **suspende** o atacante.
- Em combate Digimon×Digimon, compara-se DP; o de DP menor (ou igual, ambos) é deletado.
- Ataque à Security: revela a carta do topo da Security e resolve:
  - Digimon de Security → batalha contra o atacante (sem suspender).
  - Option/Tamer com Security effect → resolve o efeito.
  - Sem Digimon que delete o atacante → o atacante "fura" e a carta de Security vai ao trash.

## Condições de vitória

- Oponente sofre um security check com **0 cartas** na Security e leva mais um ataque que
  passa → derrota. (Modelado como: dano com Security vazia.)
- Oponente precisa comprar de um **deck vazio** → derrota.

## Casos de borda a cobrir em testes

- Memória exatamente em 0 vs. cruzamento de lado.
- Mulligan único por jogador.
- Primeiro turno sem compra.
- Evolução a partir da área de criação vs. área de batalha.
- Multi-ataque / re-suspensão por efeitos (Fase 3).
- Resolução simultânea de gatilhos (ordem via stack — Fase 3).

## Implementação atual (Fase 2)

Já no engine (`packages/engine`), com testes:

- Setup (security 5, mão 5), mulligan único, 1º turno sem compra.
- Fases via `beginTurn`/`endTurn`; ações da criação permitidas dentro da Main.
- Memória do ponto de vista do ativo; gasto em jogar/evoluir. **Auto-passagem** quando
  fica negativa; o oponente começa com `max(0, -memória)`. Passar com memória positiva a
  descarta (oponente começa em 0).
- Evolução por cor/nível (`digivolveCosts`) com bônus de compra; enjoo de invocação.
- Batalha: ataque suspende o atacante; DP comparado; empate deleta ambos. Security check
  (Digimon batalha; Tamer/Option vão ao lixo — efeitos só na Fase 3).
- Vitória: atacar Security vazia; derrota por deck-out na compra.

Ainda **não** implementado (Fases seguintes): efeitos de carta e timing/stack, `<Security>`
e demais palavras-chave, bloqueio (`<Blocker>`), `<Rush>`, efeitos herdados.

> Este documento cresce junto com o engine. Cada regra implementada deve ter teste
> correspondente em `packages/engine/src/**/*.test.ts`.
