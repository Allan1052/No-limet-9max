// ---------------------------------------------------------------------------
// LEITOR DE ZIP MÍNIMO — sem dependência externa.
//
// O GGPoker (e às vezes o PokerStars) entrega o histórico de mãos DENTRO de um
// arquivo .zip. O usuário baixa, não consegue "abrir" o zip direto (tenta Word,
// bloco de notas…) e desiste ou tem que copiar mão por mão. Aqui a gente abre o
// zip pra ele: lê os .txt de dentro e devolve o texto pronto pra análise.
//
// Usa o DecompressionStream nativo do navegador (deflate-raw) para os arquivos
// comprimidos — nada de biblioteca de terceiros. Lê o Diretório Central (fim do
// arquivo), que é a fonte autoritativa de tamanhos e offsets (assim funciona
// mesmo com "data descriptor").
// ---------------------------------------------------------------------------

/** Os 2 primeiros bytes de todo zip são "PK" (0x50 0x4B). */
export function looksLikeZip(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 4) return false;
  const b = new Uint8Array(buf, 0, 4);
  return b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x01 || b[2] === 0x05 || b[2] === 0x07);
}

interface ZipEntry {
  name: string;
  method: number; // 0 = stored, 8 = deflate
  compSize: number;
  localOffset: number;
}

/** Localiza o End Of Central Directory e devolve o offset do Diretório Central. */
function findCentralDirectory(dv: DataView): { offset: number; count: number } | null {
  const EOCD_SIG = 0x06054b50;
  // O EOCD fica no fim; varre de trás pra frente (comentário pode ter até 65535).
  const len = dv.byteLength;
  const minPos = Math.max(0, len - 22 - 65535);
  for (let i = len - 22; i >= minPos; i--) {
    if (dv.getUint32(i, true) === EOCD_SIG) {
      const count = dv.getUint16(i + 10, true);
      const offset = dv.getUint32(i + 16, true);
      return { offset, count };
    }
  }
  return null;
}

/** Lê as entradas do Diretório Central. */
function readEntries(dv: DataView, cd: { offset: number; count: number }): ZipEntry[] {
  const CEN_SIG = 0x02014b50;
  const entries: ZipEntry[] = [];
  let p = cd.offset;
  const dec = new TextDecoder("utf-8");
  for (let n = 0; n < cd.count; n++) {
    if (dv.getUint32(p, true) !== CEN_SIG) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOffset = dv.getUint32(p + 42, true);
    const nameBytes = new Uint8Array(dv.buffer, dv.byteOffset + p + 46, nameLen);
    const name = dec.decode(nameBytes);
    entries.push({ name, method, compSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Bytes de dados de uma entrada (a partir do cabeçalho LOCAL, que manda no offset). */
function entryData(dv: DataView, e: ZipEntry): Uint8Array {
  const LOC_SIG = 0x04034b50;
  const p = e.localOffset;
  if (dv.getUint32(p, true) !== LOC_SIG) throw new Error("cabeçalho local inválido");
  const nameLen = dv.getUint16(p + 26, true);
  const extraLen = dv.getUint16(p + 28, true);
  const dataStart = p + 30 + nameLen + extraLen;
  return new Uint8Array(dv.buffer, dv.byteOffset + dataStart, e.compSize);
}

/** Infla bytes deflate-raw usando o DecompressionStream nativo. */
async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Seu navegador não descompacta zip aqui — extraia o .txt e cole/anexe.");
  }
  // Copia pra um ArrayBuffer "puro" (evita problemas de view compartilhada).
  const copy = data.slice();
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([copy]).stream().pipeThrough(ds);
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

/** Decodifica bytes como texto, com fallback windows-1252 (acentos do PokerStars). */
function decodeText(bytes: Uint8Array): string {
  const asUtf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return asUtf8.includes("�") ? new TextDecoder("windows-1252").decode(bytes) : asUtf8;
}

/**
 * Abre um .zip e devolve o TEXTO CONCATENADO de todos os .txt de dentro (o que
 * o parser de mãos espera). Ignora pastas, __MACOSX e arquivos que não são .txt.
 * Se não houver .txt mas houver um único arquivo, usa esse (fallback tolerante).
 */
export async function unzipTextFiles(buf: ArrayBuffer): Promise<string> {
  const dv = new DataView(buf);
  const cd = findCentralDirectory(dv);
  if (!cd) throw new Error("zip ilegível (diretório central não encontrado)");
  const entries = readEntries(dv, cd).filter(
    (e) => !e.name.endsWith("/") && !e.name.startsWith("__MACOSX"),
  );
  if (entries.length === 0) throw new Error("zip vazio");

  const txts = entries.filter((e) => /\.txt$/i.test(e.name));
  const chosen = txts.length > 0 ? txts : entries; // fallback: qualquer arquivo

  const parts: string[] = [];
  for (const e of chosen) {
    const raw = entryData(dv, e);
    const bytes = e.method === 0 ? raw : await inflateRaw(raw);
    parts.push(decodeText(bytes));
  }
  return parts.join("\n\n");
}
