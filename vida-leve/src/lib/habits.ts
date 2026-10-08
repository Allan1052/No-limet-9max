import type { NovoHabito, Rotina, RoutineHabit } from "./types";

/**
 * Gera as "Missões do Dia" a partir da rotina cadastrada. Regras simples e
 * explicáveis: cada missão nasce de uma resposta do questionário.
 */
export function gerarMissoes(rotina: Rotina): NovoHabito[] {
  const missoes: NovoHabito[] = [];

  switch (rotina.transporte) {
    case "onibus":
    case "metro":
      missoes.push({ tipo: "transporte", descricao_habito: "Descer 1 ponto antes e caminhar o resto do trajeto" });
      break;
    case "carro":
    case "moto":
      missoes.push({ tipo: "transporte", descricao_habito: "Estacionar mais longe da entrada (+5 min de caminhada)" });
      break;
    case "a_pe":
    case "bicicleta":
      missoes.push({ tipo: "transporte", descricao_habito: "Acelerar o ritmo nos últimos 5 minutos do trajeto" });
      break;
    case "home_office":
      missoes.push({ tipo: "transporte", descricao_habito: "Caminhar 10 minutos antes de começar o expediente" });
      break;
  }

  if (rotina.horas_sentado >= 6) {
    missoes.push({ tipo: "postura", descricao_habito: "Levantar e andar 5 minutos a cada hora sentado" });
  } else if (rotina.horas_sentado >= 3) {
    missoes.push({ tipo: "postura", descricao_habito: "Levantar e alongar a cada 90 minutos sentado" });
  }

  missoes.push(
    rotina.sobe_escadas
      ? { tipo: "movimento", descricao_habito: "Subir as escadas em ritmo acelerado pelo menos 2 vezes" }
      : { tipo: "movimento", descricao_habito: "Trocar o elevador pela escada em pelo menos 1 andar" },
  );

  missoes.push(
    rotina.pratica_atividade
      ? { tipo: "movimento", descricao_habito: "10 minutos pulando corda (ou intervalado) além do treino" }
      : { tipo: "movimento", descricao_habito: "15 minutos de caminhada rápida" },
  );

  missoes.push(
    { tipo: "hidratacao", descricao_habito: "Beber 1 copo de água logo ao acordar" },
    { tipo: "alimentacao", descricao_habito: "Incluir uma fonte de proteína em cada refeição" },
    { tipo: "sono", descricao_habito: "Desligar telas 30 minutos antes de dormir" },
  );

  return missoes;
}

/** Uma missão só conta como feita se foi concluída HOJE. */
export function estaConcluidaHoje(h: Pick<RoutineHabit, "concluido_hoje" | "data_conclusao">, hoje: string): boolean {
  return h.concluido_hoje && h.data_conclusao === hoje;
}
