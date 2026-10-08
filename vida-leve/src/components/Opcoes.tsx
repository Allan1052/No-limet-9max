interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
  detalhe?: string;
}

interface Props<T extends string> {
  nome: string;
  opcoes: readonly Opcao<T>[];
  valor: T;
  onChange: (v: T) => void;
  colunas?: 1 | 2 | 3;
}

/** Grupo de botões selecionáveis (substitui <select>, melhor no celular). */
export function Opcoes<T extends string>({ nome, opcoes, valor, onChange, colunas = 2 }: Props<T>) {
  const grid = colunas === 1 ? "grid-cols-1" : colunas === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div role="radiogroup" aria-label={nome} className={`grid gap-2 ${grid}`}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(o.valor)}
            className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
              ativo
                ? "border-marca-500 bg-marca-50 font-semibold text-marca-700 ring-2 ring-marca-100"
                : "border-slate-200 bg-superficie text-slate-700 hover:border-slate-300"
            }`}
          >
            {o.rotulo}
            {o.detalhe && <span className="mt-0.5 block text-xs font-normal text-slate-500">{o.detalhe}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SimNao({ nome, valor, onChange }: { nome: string; valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <Opcoes
      nome={nome}
      colunas={2}
      valor={valor ? "sim" : "nao"}
      onChange={(v) => onChange(v === "sim")}
      opcoes={[
        { valor: "sim", rotulo: "Sim" },
        { valor: "nao", rotulo: "Não" },
      ]}
    />
  );
}
