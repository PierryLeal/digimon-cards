import { useStore } from "../store.js";

/** Modal de tutorial. Abre automaticamente na 1ª partida e pelo botão "Como jogar". */
export function HowToPlay(): JSX.Element | null {
  const open = useStore((s) => s.howToOpen);
  const close = useStore((s) => s.closeHowTo);
  if (!open) return null;

  return (
    <div className="modal" onClick={close}>
      <div className="modal-body howto" onClick={(e) => e.stopPropagation()}>
        <h2>Como jogar</h2>

        <h3>Objetivo</h3>
        <p>
          Cada jogador tem 5 cartas de <strong>Security</strong> (viradas para baixo). Ataque
          a Security do oponente para gastá-las; quando ele não tiver mais Security e levar
          um ataque, <strong>você vence</strong>.
        </p>

        <h3>Memória (o coração do jogo)</h3>
        <p>
          O medidor vai de <strong>−10 a +10</strong>. Jogar e evoluir custam memória. Quando
          ela cruza para o lado do oponente (fica negativa para você), seu turno acaba e o
          oponente começa com aquela memória. É assim que o turno passa.
        </p>

        <h3>No seu turno</h3>
        <ol>
          <li>
            <strong>Criação:</strong> "Eclodir ovo" → depois evolua o Digimon de baixo nível e
            "Mover da criação" para a área de batalha.
          </li>
          <li>
            <strong>Jogar:</strong> clique uma carta da mão → <em>Jogar</em> (paga memória).
          </li>
          <li>
            <strong>Evoluir:</strong> clique uma carta → <em>Evoluir</em> → clique o Digimon em
            jogo que vai evoluir (compra 1 carta de bônus).
          </li>
          <li>
            <strong>Atacar:</strong> clique seu Digimon <em>ativo</em> → clique a Security do
            oponente ou um Digimon <em>suspenso</em> dele. Atacar suspende seu Digimon.
          </li>
          <li>
            <strong>Passar turno</strong> quando quiser.
          </li>
        </ol>

        <h3>Batalha</h3>
        <p>
          Compara-se o <strong>DP</strong>. Quem tem menos é deletado (empate deleta os dois).
          Cartas de evolução embaixo da pilha podem dar bônus de DP e efeitos.
        </p>

        <p className="muted">
          Dica: deixe as <strong>Dicas</strong> ligadas (interruptor no topo) para orientações
          durante a partida.
        </p>

        <button onClick={close}>Entendi, vamos jogar</button>
      </div>
    </div>
  );
}
