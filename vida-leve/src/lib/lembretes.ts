/**
 * Regras dos lembretes (funções puras — testáveis). Quem dispara a notificação
 * é o agendador em `lembretesRuntime.ts` e o service worker.
 */

export interface ConfigLembretes {
  agua: boolean;
  /** De quantas em quantas horas lembrar da água. */
  aguaIntervaloH: number;
  inicioH: number;
  fimH: number;
  checkin: boolean;
  /** 0 = domingo … 6 = sábado */
  diaCheckin: number;
  horaCheckin: number;
}

export const LEMBRETES_PADRAO: ConfigLembretes = {
  agua: true,
  aguaIntervaloH: 2,
  inicioH: 8,
  fimH: 21,
  checkin: true,
  diaCheckin: 1,
  horaCheckin: 8,
};

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

/** Chave do "horário" de lembrete de água (evita repetir no mesmo bloco). */
export function blocoAgua(agora: Date, c: ConfigLembretes): string | null {
  const h = agora.getHours();
  if (h < c.inicioH || h >= c.fimH) return null;
  const bloco = Math.floor((h - c.inicioH) / Math.max(1, c.aguaIntervaloH));
  return `${agora.toDateString()}#${bloco}`;
}

/**
 * Deve lembrar da água agora? Só se: ativado, dentro da janela, meta ainda não
 * batida, ninguém registrou água neste bloco e ainda não lembramos neste bloco.
 */
export function deveLembrarAgua(
  agora: Date,
  c: ConfigLembretes,
  totalHoje: number,
  meta: number,
  ultimoRegistro: Date | null,
  ultimoBlocoAvisado: string | null,
): string | null {
  if (!c.agua || totalHoje >= meta) return null;
  const bloco = blocoAgua(agora, c);
  if (!bloco || bloco === ultimoBlocoAvisado) return null;
  if (ultimoRegistro && agora.getTime() - ultimoRegistro.getTime() < c.aguaIntervaloH * 36e5) return null;
  // Não lembra logo no primeiro minuto do dia útil — dá 30 min de folga.
  if (agora.getHours() === c.inicioH && agora.getMinutes() < 30) return null;
  return bloco;
}

/** É dia/hora do check-in semanal e ainda não foi feito nos últimos 6 dias? */
export function deveLembrarCheckin(
  agora: Date,
  c: ConfigLembretes,
  ultimoCheckin: string | null,
  hojeISO: string,
  jaAvisadoHoje: boolean,
): boolean {
  if (!c.checkin || jaAvisadoHoje) return false;
  if (agora.getDay() !== c.diaCheckin || agora.getHours() < c.horaCheckin) return false;
  if (!ultimoCheckin) return true;
  const dias = Math.round((Date.parse(hojeISO) - Date.parse(ultimoCheckin)) / 864e5);
  return dias >= 6;
}

/** Faltam quantos dias para o próximo check-in (0 = hoje)? */
export function diasParaCheckin(agora: Date, diaCheckin: number): number {
  return (diaCheckin - agora.getDay() + 7) % 7;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Evento recorrente semanal (.ics) com alarme — lembrete que funciona mesmo com
 * o app fechado, pelo calendário do celular. Não depende de servidor.
 */
export function gerarICSCheckin(c: ConfigLembretes, agora: Date = new Date()): string {
  const dias = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
  const inicio = new Date(agora);
  inicio.setDate(inicio.getDate() + diasParaCheckin(agora, c.diaCheckin));
  const data = `${inicio.getFullYear()}${pad(inicio.getMonth() + 1)}${pad(inicio.getDate())}`;
  const carimbo = agora.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vida Leve//Check-in//PT-BR",
    "BEGIN:VEVENT",
    `UID:vida-leve-checkin-${data}@vidaleve`,
    `DTSTAMP:${carimbo}`,
    `DTSTART:${data}T${pad(c.horaCheckin)}0000`,
    "DURATION:PT10M",
    `RRULE:FREQ=WEEKLY;BYDAY=${dias[c.diaCheckin]}`,
    "SUMMARY:⚖️ Check-in de peso — Vida Leve",
    "DESCRIPTION:Pese-se em jejum\\, depois do banheiro\\, e registre no app para recalcular o plano.",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Hora do check-in de peso!",
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
