import type { AnaliseRitmo } from "./adaptive";
import { calcularIMC, IMC_MIN_DEFICIT } from "./calculations";
import type { Profile } from "./types";

export interface AlertaSaude {
  id: string;
  tipo: "info" | "alerta" | "perigo";
  texto: string;
}

/**
 * Avisos de segurança. O app é educativo: quando emagrecer sozinho não é
 * indicado, ele avisa com clareza em vez de esconder num rodapé.
 */
export function alertasDeSaude(p: Profile, ritmo?: AnaliseRitmo | null): AlertaSaude[] {
  const out: AlertaSaude[] = [];
  const imc = calcularIMC(p.peso_atual, p.altura_cm);

  if (p.condicao_saude) {
    out.push({
      id: "condicao",
      tipo: "perigo",
      texto:
        "Você indicou uma condição de saúde. Mostre estas metas ao seu médico ou nutricionista antes de seguir — principalmente a proteína (1,8 g/kg), que não é indicada para quem tem doença nos rins.",
    });
  }
  if (p.gestante_lactante) {
    out.push({
      id: "gestante",
      tipo: "info",
      texto: "Plano em manutenção: na gestação e na amamentação o foco é hábito e hidratação, sem déficit. Siga as orientações do seu pré-natal.",
    });
  }
  if (imc < IMC_MIN_DEFICIT) {
    out.push({
      id: "imc_baixo",
      tipo: "alerta",
      texto: "Seu IMC está abaixo de 18,5. O app não propõe perda de peso nesse caso — se quiser mudar o corpo, procure um profissional.",
    });
  }
  if (imc >= 40) {
    out.push({
      id: "imc_alto",
      tipo: "info",
      texto: "Com IMC acima de 40, o acompanhamento de um médico faz muita diferença. Use o app como apoio do dia a dia.",
    });
  }
  if (ritmo?.status === "rapido") {
    out.push({
      id: "ritmo_rapido",
      tipo: "alerta",
      texto: "Você está perdendo peso rápido demais (mais de 1% por semana). Coma o suficiente — o app já aumentou um pouco suas calorias.",
    });
  }
  return out;
}
