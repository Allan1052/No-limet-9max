import { describe, expect, it } from "vitest";
import { LEMBRETES_PADRAO as C, blocoAgua, deveLembrarAgua, deveLembrarCheckin, diasParaCheckin, gerarICSCheckin } from "./lembretes";

// 08/10/2026 é quinta-feira.
const em = (h: number, m = 0, dia = 8) => new Date(2026, 9, dia, h, m);

describe("lembrete de água", () => {
  it("fora da janela (antes das 8h ou depois das 21h) não lembra", () => {
    expect(blocoAgua(em(7), C)).toBeNull();
    expect(blocoAgua(em(21), C)).toBeNull();
  });

  it("lembra uma vez por bloco de 2h", () => {
    const b = deveLembrarAgua(em(10, 5), C, 500, 3000, null, null);
    expect(b).not.toBeNull();
    expect(deveLembrarAgua(em(11, 30), C, 500, 3000, null, b)).toBeNull();
    expect(deveLembrarAgua(em(12, 5), C, 500, 3000, null, b)).not.toBeNull();
  });

  it("não lembra se a meta já foi batida ou se bebeu há pouco", () => {
    expect(deveLembrarAgua(em(10), C, 3000, 3000, null, null)).toBeNull();
    expect(deveLembrarAgua(em(10), C, 500, 3000, em(9, 30), null)).toBeNull();
  });

  it("respeita o desligado", () => {
    expect(deveLembrarAgua(em(10), { ...C, agua: false }, 0, 3000, null, null)).toBeNull();
  });
});

describe("lembrete de check-in", () => {
  it("só no dia escolhido, após a hora, e se não pesou nos últimos 6 dias", () => {
    const quinta = { ...C, diaCheckin: 4 };
    expect(deveLembrarCheckin(em(9), quinta, "2026-10-01", "2026-10-08", false)).toBe(true);
    expect(deveLembrarCheckin(em(7), quinta, "2026-10-01", "2026-10-08", false)).toBe(false);
    expect(deveLembrarCheckin(em(9), quinta, "2026-10-06", "2026-10-08", false)).toBe(false);
    expect(deveLembrarCheckin(em(9), quinta, "2026-10-01", "2026-10-08", true)).toBe(false);
    expect(deveLembrarCheckin(em(9), C, null, "2026-10-08", false)).toBe(false); // segunda ≠ quinta
  });

  it("dias até o próximo check-in", () => {
    expect(diasParaCheckin(em(9), 4)).toBe(0);
    expect(diasParaCheckin(em(9), 1)).toBe(4);
  });

  it("gera calendário semanal com alarme", () => {
    const ics = gerarICSCheckin(C, em(9));
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO");
    expect(ics).toContain("DTSTART:20261012T080000");
    expect(ics).toContain("BEGIN:VALARM");
  });
});
