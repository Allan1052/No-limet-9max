import { describe, it, expect } from "vitest";
import { buildPixPayload, crc16, PIX_COPIA_E_COLA, PIX_KEY } from "./pix";

describe("pix — Copia e Cola (EMV/BR Code)", () => {
  it("CRC16 confere com o corpo do payload", () => {
    const body = PIX_COPIA_E_COLA.slice(0, -4);
    const tail = PIX_COPIA_E_COLA.slice(-4);
    expect(crc16(body)).toBe(tail);
  });

  it("tem a estrutura mínima do Pix estático", () => {
    expect(PIX_COPIA_E_COLA.startsWith("000201")).toBe(true);
    expect(PIX_COPIA_E_COLA).toContain("0014br.gov.bcb.pix");
    expect(PIX_COPIA_E_COLA).toContain(PIX_KEY);
    expect(PIX_COPIA_E_COLA).toContain("5303986"); // moeda BRL
    expect(PIX_COPIA_E_COLA).toContain("5802BR"); // país
    expect(PIX_COPIA_E_COLA.slice(-8, -4)).toBe("6304"); // id+len do CRC
  });

  it("tira acento e corta o nome no limite do padrão (25)", () => {
    const p = buildPixPayload({ key: "x@y.com", name: "José da Silva Ção Muito Longo Nome", city: "São Paulo" });
    // nome normalizado não pode ter acento nem passar de 25 chars
    const idx = p.indexOf("59");
    // acha o campo 59 (nome) e lê o tamanho
    const at = p.indexOf("5802BR") + "5802BR".length;
    const nameLen = Number(p.slice(at + 2, at + 4));
    expect(nameLen).toBeLessThanOrEqual(25);
    void idx;
    expect(/[À-ÿ]/.test(p)).toBe(false);
  });

  it("com valor fixo inclui o campo 54", () => {
    const p = buildPixPayload({ key: "x@y.com", name: "Fulano", city: "Juatuba", amount: 10 });
    expect(p).toContain("540510.00");
  });
});
