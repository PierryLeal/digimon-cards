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

        <h3>No seu turno</h3>
        <ol>
          <li>
            <strong>Jogar:</strong> coloque um Digimon <em>rookie</em> da mão no campo (clique a
            carta → <em>Jogar</em>). Ele não ataca no turno em que entra.
          </li>
          <li>
            <strong>Evoluir:</strong> se você tem na mão a evolução da linha (ex.: Greymon para um
            Agumon em campo), clique a carta → <em>Evoluir</em> → clique o Digimon que vai evoluir.
            Ele fica mais forte (e ganha a base por baixo).
          </li>
          <li>
            <strong>Atacar:</strong> clique seu Digimon ativo → clique um <em>Digimon inimigo</em>
            (compara DP, o menor é destruído; empate destrói os dois) <em>ou</em> o <em>Tamer</em>
            inimigo — só dá para atingir o Tamer se ele <strong>não tiver Digimon</strong> protegendo.
          </li>
          <li>
            <strong>Passar turno</strong> quando quiser (você compra 1 carta no início de cada turno).
          </li>
        </ol>

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
