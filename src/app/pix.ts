// ---------------------------------------------------------------------------
// Pix "Copia e Cola" (BR Code / EMV MPM) para o APOIE SE QUISER.
//
// NÃO é cadeado: o app é e continua grátis. Isto só gera um código Pix estático
// (sem valor fixo — quem apoia escolhe quanto) que o app mostra como QR e como
// texto copiável. O dinheiro cai direto na conta do dono da chave; Pix pra
// pessoa física é gratuito, sem intermediário.
//
// Formato: campos TLV (id + tamanho + valor) + CRC16-CCITT no fim.
// ---------------------------------------------------------------------------

/** CRC16-CCITT (FALSE): polinômio 0x1021, init 0xFFFF — exigido pelo Pix. */
export function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Campo TLV: id (2) + tamanho (2, em caracteres) + valor. */
function tlv(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

/** Tira acentos e deixa só ASCII imprimível, corta no tamanho do padrão. */
function normalize(s: string, max: number): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, max);
}

export interface PixParams {
  key: string; // chave Pix (e-mail, telefone, CPF ou aleatória)
  name: string; // nome do recebedor (máx. 25 no padrão)
  city: string; // cidade do recebedor (máx. 15)
  txid?: string; // identificador; "***" para estático livre
  amount?: number; // valor fixo (opcional). Doação = sem valor (quem apoia escolhe)
  description?: string;
}

/** Monta o payload Pix "Copia e Cola" completo (com CRC16). */
export function buildPixPayload(o: PixParams): string {
  const gui =
    tlv("00", "br.gov.bcb.pix") +
    tlv("01", o.key.trim()) +
    (o.description ? tlv("02", normalize(o.description, 40)) : "");

  let p = "";
  p += tlv("00", "01"); // Payload Format Indicator
  p += tlv("26", gui); // Merchant Account Information — Pix
  p += tlv("52", "0000"); // Merchant Category Code
  p += tlv("53", "986"); // Moeda: BRL
  if (o.amount != null) p += tlv("54", o.amount.toFixed(2));
  p += tlv("58", "BR"); // País
  p += tlv("59", normalize(o.name, 25)); // Nome do recebedor
  p += tlv("60", normalize(o.city, 15)); // Cidade
  p += tlv("62", tlv("05", o.txid ?? "***")); // Additional Data — txid
  p += "6304"; // CRC (id + tamanho); o valor entra na frente
  return p + crc16(p);
}

// --- Dados do projeto (fornecidos pelo Allan) --------------------------------

/** Chave Pix do projeto. */
export const PIX_KEY = "calloufold.sonho@gmail.com";
/** Nome completo, para exibir na tela (o QR usa uma versão sem acento e curta). */
export const PIX_DISPLAY_NAME = "Allan Jefferson Guimarães Lamas";
export const PIX_CITY = "Juatuba - MG";

/** Código Pix "Copia e Cola" estático do projeto (sem valor fixo). */
export const PIX_COPIA_E_COLA = buildPixPayload({
  key: PIX_KEY,
  name: "Allan Guimaraes Lamas",
  city: "Juatuba",
});
