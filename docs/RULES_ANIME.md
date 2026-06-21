# Regras — modo Anime (homebrew)

Ruleset simples inspirado no anime e no _Digital Monster Card Game (Hyper Colosseum)_,
combinado com o conceito "Digimon protege o Tamer" (do Digital Card Battle / DCG moderno).
É a direção atual do projeto — substitui as regras oficiais complexas (ver
[GAME_RULES.md](GAME_RULES.md), agora histórico).

## Objetivo

Cada jogador tem um **Tamer** com **HP** (padrão **5**). Reduza o HP do Tamer inimigo a
**0** para vencer. Os Digimon em campo **protegem** o Tamer: só dá para atacar o Tamer
direto se o oponente **não tiver Digimon** no campo (ou via efeito especial).

## Componentes

- **Deck:** ~30 cartas (Digimon + cartas de efeito/Option + X-Antibody/Fusão).
- **Mão:** começa com 5 cartas.
- **Tamer HP:** 5.
- **Campo:** seus Digimon em jogo (cada um é uma pilha de evolução).

## Estágios e poder (DP)

`rookie → champion → ultimate → mega` (e formas especiais: Armor, X-Antibody, Fusão).
Cada Digimon tem um **DP** (poder de batalha) que cresce com o estágio.

## Turno

1. **Compra:** compre 1 carta (o 1º jogador não compra no 1º turno).
2. **Ações principais (em qualquer ordem):**
   - **Jogar Digimon:** coloque um Digimon **rookie** da mão no campo.
   - **Digivolver:** se você tem na mão a **evolução** de um Digimon seu (a carta cujo
     "evolui-de" inclui o Digimon em campo), coloque-a por cima. Fica mais forte e herda
     a base. **Fusão** exige a carta de Fusão; **X-Antibody** exige a carta X-Antibody.
   - **Atacar:** um Digimon seu ataca. Escolha um **Digimon inimigo** (compara DP — o de
     menor DP é deletado; empate deleta os dois) **ou**, se o oponente não tem Digimon,
     ataque o **Tamer** dele (−1 HP). Atacar deixa o Digimon **cansado** (não ataca de novo
     neste turno).
   - **Usar efeito/Option:** ativa habilidades das cartas.
3. **Fim do turno:** passa a vez (Digimon descansam e podem atacar no próximo turno).

## Batalha

Compara-se o **DP** dos Digimon. Menor DP é deletado; empate deleta ambos. Efeitos e
cartas de evolução por baixo podem dar bônus de DP ou habilidades.

## Cartas especiais (planejado)

- **X-Antibody:** carta-item que permite a um Digimon evoluir para sua forma **X**.
- **Fusão (Jogress):** carta que funde dois Digimon numa forma superior.
- **Vida/Recuperação:** carta de efeito que cura HP do Tamer.
- **Option/Efeito:** efeitos pontuais (buff, dano direto, etc.).

## Diferenças vs. regras oficiais (o que saiu)

Sem **medidor de memória**, sem **pilha de Security** como condição de vitória, sem fases
Unsuspend/Breeding. Mais simples e direto, como no anime.

> A base de cartas vem do **digi-api.com** (linhas de digivolução, imagens, habilidades).
> Implementação por etapas: dados → motor → servidor → cliente.
