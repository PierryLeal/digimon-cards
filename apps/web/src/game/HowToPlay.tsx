import { useStore } from "../store.js";

/** Modal de tutorial (modo Anime). Abre na 1ª partida e pelo botão "Como jogar". */
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
          Cada jogador tem um <strong>Tamer com 5 de HP</strong>. Reduza o HP do Tamer inimigo
          a <strong>0</strong> para vencer. Seus Digimon <strong>protegem</strong> o seu Tamer.
        </p>

        <h3>DigiSoul (energia ⚡)</h3>
        <p>
          A cada turno você ganha mais <strong>DigiSoul</strong> (1 no 1º, 2 no 2º… até 8). Jogar e
          evoluir <strong>custam</strong> DigiSoul (mostrado na carta com ⚡). Escolha bem o que fazer.
        </p>

        <h3>No seu turno</h3>
        <ol>
          <li>
            <strong>Jogar:</strong> um Digimon <em>rookie</em> da mão (clique → <em>Jogar</em>, paga ⚡).
            Não ataca no turno em que entra.
          </li>
          <li>
            <strong>Evoluir:</strong> tendo a evolução da linha na mão, clique a carta → <em>Evoluir</em>
            → clique o Digimon em campo. Sobe de estágio (mais ⚔ e HP). 1 evolução por Digimon por turno.
          </li>
          <li>
            <strong>Atacar:</strong> clique seu Digimon ativo, escolha o <em>ataque</em> (alguns têm 2),
            e clique um <em>Digimon inimigo</em> ou o <em>Tamer</em> (só se não houver Digimon protegendo).
          </li>
          <li>
            <strong>Passar turno</strong> (compra 1 carta no início de cada turno).
          </li>
        </ol>

        <h3>Batalha (HP e dano)</h3>
        <p>
          Cada Digimon tem <strong>HP</strong> (barra embaixo da carta). O ataque causa dano = ⚔; o
          defensor <strong>revida</strong> com o ataque dele. Quando o dano acumulado atinge o HP, o
          Digimon é destruído. Alguns ataques têm efeito (ex.: <em>pierce</em> também fere o Tamer) e
          algumas cartas têm <strong>habilidades</strong> (✦) ao entrar/evoluir.
        </p>

        <h3>Atributos (vantagem)</h3>
        <p>
          Triângulo: <strong>Vaccine ▸ Virus ▸ Data ▸ Vaccine</strong>. Se o seu Digimon tem
          vantagem de atributo sobre o que está batalhando, ele ganha <strong>+2 DP</strong> na
          luta — então nem sempre vence quem tem o maior DP base.
        </p>

        <h3>Dicas</h3>
        <ul>
          <li>Cada Digimon evolui <strong>1 vez por turno</strong> (um estágio de cada vez).</li>
          <li>O <strong>DP</strong> aumenta ao evoluir (cada carta embaixo dá +1).</li>
          <li>Mantenha as <strong>Dicas</strong> ligadas (interruptor no topo) para orientações.</li>
        </ul>

        <button onClick={close}>Entendi, vamos jogar</button>
      </div>
    </div>
  );
}
