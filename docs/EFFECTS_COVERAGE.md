# Cobertura de efeitos — BT01

Rastreia quais cartas do BT01 já têm efeito implementado no engine. Cartas **vanilla**
(sem texto de efeito) não precisam de arquivo. Veja [EFFECTS_GUIDE](EFFECTS_GUIDE.md).

- Total BT01: **115** cartas
- Com algum efeito (main/herdado/security): **94**
- Vanilla (nada a implementar): **21**

## Infra pronta (Fase 3a)

Sistema de efeitos com registry, hooks e API segura:

- Hooks: `onPlay`, `whenDigivolving`, `whenAttacking`, `onDeletion`, `endOfTurn`, `dpModifier`
- Modificadores contínuos de DP (próprios e herdados da pilha)
- Escolhas/reações via `pendingChoice` + comando `resolveChoice` (com auto-resolução quando
  há um único alvo)
- Efeitos agendados para o fim do turno (`scheduleEndOfTurnMemory`)

## Implementadas (piloto)

| Carta | Nome | Efeito | Padrão |
| ----- | ---- | ------ | ------ |
| BT1-001 | Yokomon | [When Attacking] +1000 DP | dpModifier |
| BT1-015 | Greymon | [Your Turn] +2000 DP | dpModifier |
| BT1-021 | MetalGreymon | [When Attacking] +3 mem / fim do turno −3 | whenAttacking + delayed |
| BT1-029 | Gabumon | [On Play] Draw 1 | onPlay |
| BT1-030 | Gomamon | [On Deletion] Gain 1 memory | onDeletion (herdado) |
| BT1-035 | Leomon | [On Deletion] Gain 2 memory | onDeletion |
| BT1-036 | Garurumon | [On Play] Unsuspend 1 of your Digimon | onPlay + escolha |

## Próximos padrões a suportar (para destravar o restante do BT01)

- **Keywords**: `<Blocker>`, `<Jamming>`, `<Piercing>`, `<Security A. +N>`, `<Rush>`,
  `<Draw N>` (estes exigem janelas de timing de combate — bloqueio etc.).
- **Alvos do oponente**: deletar/retornar/suspender Digimon do oponente (terminal-choice,
  já suportado pelo `pendingChoice`; falta adicionar as `PendingAction`).
- **Revelar/buscar no deck**: ex. Agumon [On Play] revela 5 e adiciona 1 Tamer.
- **Efeitos de Security** (`securityEffect`) e condicionais ("se você tem 5+ security").

> Conforme novos padrões entram, marcamos as cartas aqui e adicionamos um arquivo por carta
> em `packages/engine/src/effects/BT01/` com teste correspondente.
