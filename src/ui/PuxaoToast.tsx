// ---------------------------------------------------------------------------
// O PUXÃO DE ORELHA na tela — aparece no fim da mão, fica alguns segundos, sai.
//
// 13/10/2026, pedido do Allan: *"oh, acorda, você tem que dar um start a mais."*
//
// Por que um toast e não um modal: o aviso chega ENTRE mãos, e o jogo tem que
// continuar. Um modal faria ele fechar a caixa toda vez e, em três avisos por
// torneio, viraria motivo para desligar a coisa.
//
// Ele NÃO diz a jogada. Diz a TENDÊNCIA, com os números que a sustentam. Quem
// diz a jogada é o coach, em outro lugar da tela.
// ---------------------------------------------------------------------------
import { useEffect } from "react";
import type { Puxao } from "../feedback/puxaoDeOrelha";
import "./puxaoToast.css";

/** Tempo na tela. É texto de duas linhas: menos que isso não dá pra ler. */
const SEGUNDOS = 9000;

export function PuxaoToast({
  puxao,
  onDismiss,
}: {
  puxao: Puxao | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!puxao) return;
    const id = setTimeout(onDismiss, SEGUNDOS);
    return () => clearTimeout(id);
  }, [puxao, onDismiss]);

  if (!puxao) return null;

  return (
    <div
      className={`puxao puxao-${puxao.tipo}`}
      role="status"
      aria-live="polite"
      onClick={onDismiss}
    >
      <span className="puxao-icone" aria-hidden="true">
        {puxao.tipo === "passivo" ? "⏰" : "✋"}
      </span>
      <div className="puxao-corpo">
        <div className="puxao-titulo">{puxao.titulo}</div>
        <div className="puxao-texto">{puxao.texto}</div>
      </div>
    </div>
  );
}
