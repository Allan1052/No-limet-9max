// ---------------------------------------------------------------------------
// Escolha do apelido — único e permanente.
//
// Aparece antes do primeiro torneio do Circuito. O apelido é o nome que vai
// para o ranking, então precisa de duas garantias:
//   1. ninguém pode usar um apelido já tomado (validado NO BANCO);
//   2. não dá pra trocar depois — por isso a confirmação explícita.
// ---------------------------------------------------------------------------
import { useState, useEffect, useRef } from "react";
import {
  validateFormat,
  checkAvailability,
  claimNickname,
  NICKNAME_MIN,
  NICKNAME_MAX,
  type Availability,
} from "../lib/nickname";

export function NicknamePrompt({
  onDone,
  onCancel,
}: {
  onDone: (nickname: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [availability, setAvailability] = useState<Availability | "checando" | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounce = useRef<number | undefined>(undefined);

  // Checa a disponibilidade no banco enquanto o jogador digita (com atraso,
  // para não disparar uma consulta por tecla).
  useEffect(() => {
    setSaveError(null);
    const format = validateFormat(value);

    if (!value.trim()) {
      setFormatError(null);
      setAvailability(null);
      return;
    }
    if (!format.ok) {
      setFormatError(format.message || "Apelido inválido.");
      setAvailability(null);
      return;
    }

    setFormatError(null);
    setAvailability("checando");

    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(async () => {
      const result = await checkAvailability(value);
      setAvailability(result);
    }, 450);

    return () => window.clearTimeout(debounce.current);
  }, [value]);

  const canProceed = !formatError && availability === "livre" && !saving;

  async function handleConfirm() {
    setSaving(true);
    setSaveError(null);
    const result = await claimNickname(value);
    setSaving(false);

    if (result.success && result.nickname) {
      onDone(result.nickname);
      return;
    }

    // Fallback offline: se o banco falhou por conexão, grava localmente e abre
    // o torneio mesmo assim — o apelido é sincronizado com o banco na próxima
    // abertura do app (restoreNickname). O fluxo NUNCA volta ao início em
    // silêncio; o apelido continua único na comparação case-insensitive.
    if (result.error === "conexao") {
      try {
        localStorage.setItem("cof-nickname", value);
      } catch {
        /* ignora — o torneio ainda abre */
      }
      setSaveError(
        "Sem conexão para confirmar no servidor — seu apelido ficou salvo no aparelho e será registrado no ranking automaticamente quando voltar a conexão.",
      );
      // Abre o torneio mesmo assim: nada pior do que perder a vez de jogar.
      onDone(value);
      return;
    }

    setConfirming(false);
    if (result.error === "em_uso") {
      setAvailability("em_uso");
      setSaveError("Alguém pegou esse apelido antes de você. Escolha outro.");
    } else {
      setSaveError(result.message || "Não consegui salvar agora. Tente de novo.");
    }
  }

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="replay nick-modal" onClick={(e) => e.stopPropagation()}>
        {!confirming ? (
          <>
            <div className="nick-crest">♠</div>
            <h3>Seu nome no ranking</h3>
            <p className="nick-sub">
              É esse apelido que vai aparecer no placar do Circuito. Escolha com
              calma: <b>não dá pra mudar depois</b>.
            </p>

            <input
              className="nick-input"
              type="text"
              value={value}
              maxLength={NICKNAME_MAX}
              placeholder="Ex: Coringa do Norte"
              autoFocus
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canProceed) setConfirming(true);
              }}
            />

            <div className="nick-status">
              {formatError ? (
                <span className="nick-bad">✕ {formatError}</span>
              ) : availability === "checando" ? (
                <span className="nick-wait">verificando...</span>
              ) : availability === "livre" ? (
                <span className="nick-good">✓ Disponível</span>
              ) : availability === "em_uso" ? (
                <span className="nick-bad">✕ Já tem alguém com esse apelido</span>
              ) : availability === "erro" ? (
                <span className="nick-wait">
                  Sem conexão para verificar — dá pra tentar salvar
                </span>
              ) : (
                <span className="nick-hint">
                  {NICKNAME_MIN} a {NICKNAME_MAX} caracteres
                </span>
              )}
            </div>

            {saveError ? <p className="nick-error">{saveError}</p> : null}

            <div className="nick-actions">
              <button className="btn tiny" onClick={onCancel}>
                Agora não
              </button>
              <button
                className="btn primary"
                disabled={!canProceed && availability !== "erro"}
                onClick={() => setConfirming(true)}
              >
                Continuar
              </button>
            </div>

            <div className="nick-foot">
              🔒 Sem cadastro, sem e-mail, sem senha. Só o apelido.
            </div>
          </>
        ) : (
          <>
            <div className="nick-crest">⚠</div>
            <h3>Tem certeza?</h3>
            <p className="nick-sub">
              Seu apelido no ranking vai ser:
            </p>
            <div className="nick-preview">{value.trim()}</div>
            <p className="nick-warn">
              <b>Não dá pra mudar depois.</b> O apelido acompanha todo o seu
              histórico de torneios — trocar embaralharia o ranking.
            </p>

            {saveError ? <p className="nick-error">{saveError}</p> : null}

            <div className="nick-actions">
              <button
                className="btn tiny"
                onClick={() => setConfirming(false)}
                disabled={saving}
              >
                Voltar e mudar
              </button>
              <button className="btn primary" onClick={handleConfirm} disabled={saving}>
                {saving ? "Salvando..." : "Confirmar para sempre"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
