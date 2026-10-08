import { Leaf, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../store/useAppStore";

export function AuthScreen() {
  const iniciar = useAppStore((s) => s.iniciar);
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setCarregando(true);
    setAviso(null);
    const { data, error } =
      modo === "entrar"
        ? await supabase.auth.signInWithPassword({ email, password: senha })
        : await supabase.auth.signUp({ email, password: senha });
    setCarregando(false);
    if (error) {
      setAviso({ tipo: "erro", texto: error.message });
      return;
    }
    if (modo === "criar" && !data.session) {
      setAviso({ tipo: "ok", texto: "Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre." });
      setModo("entrar");
      return;
    }
    await iniciar();
  };

  return (
    <div className="pt-seguro mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 pb-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 inline-flex rounded-3xl bg-marca-600 p-4 text-white shadow-lg shadow-marca-600/30">
          <Leaf className="h-9 w-9" />
        </div>
        <h1 className="text-3xl font-bold">Vida Leve</h1>
        <p className="mt-2 text-slate-500">Pequenos hábitos, metas que se ajustam a você.</p>
      </div>

      <form onSubmit={enviar} className="cartao space-y-4">
        <div>
          <label htmlFor="email" className="rotulo">
            E-mail
          </label>
          <input id="email" type="email" required autoComplete="email" className="campo" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="senha" className="rotulo">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            required
            minLength={6}
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            className="campo"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        {aviso && (
          <p className={`rounded-xl px-3 py-2 text-sm ${aviso.tipo === "erro" ? "bg-red-50 text-red-700" : "bg-marca-50 text-marca-700"}`}>
            {aviso.texto}
          </p>
        )}
        <button type="submit" className="botao-primario w-full" disabled={carregando}>
          {carregando && <Loader2 className="h-5 w-5 animate-spin" />}
          {modo === "entrar" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button
        type="button"
        className="mt-5 text-sm font-medium text-marca-700"
        onClick={() => {
          setModo(modo === "entrar" ? "criar" : "entrar");
          setAviso(null);
        }}
      >
        {modo === "entrar" ? "Ainda não tem conta? Criar agora" : "Já tenho conta — entrar"}
      </button>
    </div>
  );
}
