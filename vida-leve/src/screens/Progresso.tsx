import { useState } from "react";
import { Conquistas } from "./progresso/Conquistas";
import { Fotos } from "./progresso/Fotos";
import { Medidas } from "./progresso/Medidas";
import { Peso } from "./progresso/Peso";

const SECOES = [
  { id: "peso", rotulo: "Peso" },
  { id: "medidas", rotulo: "Medidas" },
  { id: "fotos", rotulo: "Fotos" },
  { id: "conquistas", rotulo: "Conquistas" },
] as const;

type Secao = (typeof SECOES)[number]["id"];

export function Progresso() {
  const [secao, setSecao] = useState<Secao>("peso");
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Progresso</h1>
      </header>
      <div role="tablist" aria-label="Seções do progresso" className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1">
        {SECOES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={secao === s.id}
            onClick={() => setSecao(s.id)}
            className={`rounded-xl py-2 text-sm font-medium transition ${
              secao === s.id ? "bg-superficie text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {s.rotulo}
          </button>
        ))}
      </div>
      {secao === "peso" && <Peso />}
      {secao === "medidas" && <Medidas />}
      {secao === "fotos" && <Fotos />}
      {secao === "conquistas" && <Conquistas />}
    </div>
  );
}
