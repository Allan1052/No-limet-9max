// ---------------------------------------------------------------------------
// O PLANO DA SESSÃO na tela.
//
// 13/10/2026. O Allan joga uma vez por mês e quer *"fazer o lucro todo num
// único dia"*. A medição diz que isso não existe: o desvio padrão de UM torneio
// é 3,39 buy-ins contra lucro esperado de 0,046 — o ruído é 73× o sinal.
//
// Este card não dá sermão sobre isso. Ele faz três coisas e cala a boca:
//   1. ANTES: mostra a faixa normal de um dia desse tamanho.
//   2. DURANTE: conta os torneios e o acumulado, sem veredito nenhum.
//   3. DEPOIS: diz em que percentil o dia caiu, e se o acaso explica sozinho.
//
// O ponto pedagógico inteiro está no passo 3: tirar do resultado do dia o peso
// de veredito sobre o jogo dele.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import {
  MAIOR_SESSAO,
  MENOR_SESSAO,
  abrirSessao,
  carregarSessao,
  faixaDaSessao,
  fecharSessao,
  progressoDaSessao,
  vereditoDaSessao,
  type OndeCaiu,
  type Sessao,
} from "../train/sessao";
import "./sessaoCard.css";

const TAMANHOS = [5, 10, 20, 40];

/** Buy-ins com sinal, uma casa. */
function bi(n: number): string {
  const v = Math.round(n * 10) / 10;
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toString().replace(".", ",")}`;
}

const TITULO: Record<OndeCaiu, string> = {
  abaixo_de_tudo: "Dia muito ruim",
  ruim: "Dia ruim",
  normal: "Dia comum",
  bom: "Dia bom",
  acima_de_tudo: "Dia excepcional",
};

export function SessaoCard() {
  const [sessao, setSessao] = useState<Sessao | null>(() => carregarSessao());
  const [tamanho, setTamanho] = useState(10);

  // O contador anda enquanto ele joga, em outra tela.
  useEffect(() => {
    const refresh = () => setSessao(carregarSessao());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  // ---- 1. ANTES: o plano ----
  if (!sessao) {
    const f = faixaDaSessao(tamanho, "app");
    const real = faixaDaSessao(tamanho, "real");
    return (
      <section className="sessao panel">
        <div className="sessao-rot">O plano de hoje</div>
        <p className="sessao-texto">Quantos torneios você vai jogar nesta sessão?</p>
        <div className="sessao-tamanhos" role="group" aria-label="Tamanho da sessão">
          {TAMANHOS.map((n) => (
            <button
              key={n}
              type="button"
              className={`sessao-chip${tamanho === n ? " on" : ""}`}
              onClick={() => setTamanho(n)}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="sessao-faixa">
          <div className="sessao-faixa-rot">
            O que {tamanho} torneios costumam dar <span>(medido, em buy-ins)</span>
          </div>
          <div className="sessao-escala">
            <span className="sessao-ponta">{bi(f.p10)}</span>
            <div className="sessao-trilho">
              <div className="sessao-meio" />
              <div className="sessao-mediana" />
            </div>
            <span className="sessao-ponta">{bi(f.p90)}</span>
          </div>
          <p className="sessao-legenda">
            8 em cada 10 sessões caem entre <b>{bi(f.p10)}</b> e <b>{bi(f.p90)}</b> buy-ins.
            A sessão típica dá <b>{bi(f.p50)}</b>, e <b>{f.vermelho}%</b> delas terminam no
            vermelho.
          </p>
        </div>

        {/* O número do mundo real fica ao lado, porque é lá que está o dinheiro
            dele — e lá a mediana é negativa em QUALQUER tamanho de sessão. */}
        <p className="sessao-nota">
          No PokerStars, com o rake de ~10%, a mesma sessão dá <b>{bi(real.p50)}</b> na
          mediana e termina no vermelho <b>{real.vermelho}%</b> das vezes. Lá a sessão
          típica de um jogador ganhador é negativa <b>em qualquer tamanho</b> — o rake
          não deixa a mediana virar.
        </p>

        <button className="btn primary sessao-btn" onClick={() => setSessao(abrirSessao(tamanho))}>
          Abrir a sessão · {tamanho} torneios
        </button>
      </section>
    );
  }

  const p = progressoDaSessao(sessao);

  // ---- 2. DURANTE: sem veredito, só o contador ----
  if (!p.completa) {
    return (
      <section className="sessao panel">
        <div className="sessao-linha">
          <span className="sessao-rot">Sessão de hoje</span>
          <span className="sessao-contagem">
            <b>{p.jogados}</b> de {p.planejados}
          </span>
        </div>
        <div
          className="sessao-barra"
          role="progressbar"
          aria-valuenow={p.jogados}
          aria-valuemin={0}
          aria-valuemax={p.planejados}
        >
          <div className="sessao-barra-fill" style={{ width: `${p.pct}%` }} />
        </div>
        <p className="sessao-texto">
          Faltam <b>{p.faltam}</b>. O veredito vem no fim — no meio da sessão o número
          ainda é só ruído.
        </p>
        <button className="btn tiny sessao-btn" onClick={() => { fecharSessao(); setSessao(null); }}>
          Encerrar antes
        </button>
      </section>
    );
  }

  // ---- 3. DEPOIS: onde o dia caiu ----
  const v = vereditoDaSessao(p.jogados, p.resultado, "app");
  return (
    <section className={`sessao panel sessao-fim${v.dentroDoNormal ? "" : " sessao-fora"}`}>
      <div className="sessao-rot">Sessão encerrada · {p.jogados} torneios</div>
      <h3 className="sessao-titulo">
        {TITULO[v.onde]} · <span className={p.resultado >= 0 ? "sessao-pos" : "sessao-neg"}>{bi(p.resultado)} buy-ins</span>
      </h3>

      <p className="sessao-texto">
        {v.percentil !== undefined ? (
          <>
            Esse resultado fica no <b>percentil {v.percentil}</b> das sessões de{" "}
            {p.jogados} torneios — ou seja, cerca de <b>{100 - v.percentil}%</b> das
            sessões vão melhor que esta.
          </>
        ) : v.onde === "abaixo_de_tudo" ? (
          <>Esse resultado ficou <b>abaixo</b> dos 10% piores da faixa medida.</>
        ) : (
          <>Esse resultado ficou <b>acima</b> dos 10% melhores da faixa medida.</>
        )}
      </p>

      <div className="sessao-veredito">
        {v.dentroDoNormal ? (
          <>
            <b>O acaso explica esse dia sozinho.</b>
            Ele está dentro da faixa que {p.jogados} torneios produzem sem precisar que
            você tenha jogado melhor ou pior. Um dia não mede o seu jogo — o desvio
            padrão de um torneio é 73× o lucro que ele deveria dar.
          </>
        ) : (
          <>
            <b>Esse dia saiu da faixa comum.</b>
            Mesmo assim ele não mede o seu jogo: caudas acontecem, e com {p.jogados}{" "}
            torneios elas acontecem com frequência. O que mede o seu jogo são as
            decisões, não o saldo do dia.
          </>
        )}
      </div>

      <button className="btn primary sessao-btn" onClick={() => { fecharSessao(); setSessao(null); }}>
        Fechar a sessão
      </button>
    </section>
  );
}

export { MENOR_SESSAO, MAIOR_SESSAO };
