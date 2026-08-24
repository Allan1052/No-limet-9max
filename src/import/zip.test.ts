import { describe, it, expect } from "vitest";
import { looksLikeZip, unzipTextFiles } from "./zip";

// Constrói um .zip mínimo em memória (sem lib) para provar a extração.
// method: 0 = stored (sem compressão), 8 = deflate-raw.
async function makeZip(files: { name: string; text: string; method: 0 | 8 }[]): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const crcTable = (() => {
    const t: number[] = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (b: Uint8Array) => {
    let c = 0xffffffff;
    for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const deflateRaw = async (b: Uint8Array) => {
    const cs = new CompressionStream("deflate-raw");
    const part = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    const stream = new Blob([part]).stream().pipeThrough(cs);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  };

  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const raw = enc.encode(f.text);
    const comp = f.method === 0 ? raw : await deflateRaw(raw);
    const crc = crc32(raw);

    const loc = new Uint8Array(30 + nameBytes.length + comp.length);
    const ldv = new DataView(loc.buffer);
    ldv.setUint32(0, 0x04034b50, true);
    ldv.setUint16(4, 20, true);
    ldv.setUint16(6, 0, true);
    ldv.setUint16(8, f.method, true);
    ldv.setUint32(14, crc, true);
    ldv.setUint32(18, comp.length, true);
    ldv.setUint32(22, raw.length, true);
    ldv.setUint16(26, nameBytes.length, true);
    ldv.setUint16(28, 0, true);
    loc.set(nameBytes, 30);
    loc.set(comp, 30 + nameBytes.length);

    const cen = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(cen.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(10, f.method, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, comp.length, true);
    cdv.setUint32(24, raw.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint32(42, offset, true);
    cen.set(nameBytes, 46);

    locals.push(loc);
    centrals.push(cen);
    offset += loc.length;
  }

  const cdStart = offset;
  const cdSize = centrals.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(8, files.length, true);
  edv.setUint16(10, files.length, true);
  edv.setUint32(12, cdSize, true);
  edv.setUint32(16, cdStart, true);

  const total = offset + cdSize + eocd.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const l of locals) { out.set(l, p); p += l.length; }
  for (const c of centrals) { out.set(c, p); p += c.length; }
  out.set(eocd, p);
  return out.buffer;
}

describe("leitor de zip do import", () => {
  it("reconhece a assinatura PK", async () => {
    const z = await makeZip([{ name: "a.txt", text: "oi", method: 0 }]);
    expect(looksLikeZip(z)).toBe(true);
    expect(looksLikeZip(new TextEncoder().encode("PokerStars Hand #1").buffer)).toBe(false);
  });

  it("extrai .txt armazenado (stored)", async () => {
    const z = await makeZip([{ name: "GG20240101.txt", text: "Poker Hand #1: linha um", method: 0 }]);
    const out = await unzipTextFiles(z);
    expect(out).toContain("Poker Hand #1: linha um");
  });

  it("extrai .txt comprimido (deflate)", async () => {
    const big = "Poker Hand #2: " + "abcde ".repeat(200);
    const z = await makeZip([{ name: "GG20240102.txt", text: big, method: 8 }]);
    const out = await unzipTextFiles(z);
    expect(out).toContain("Poker Hand #2:");
    expect(out).toContain("abcde abcde");
  });

  it("concatena vários .txt e ignora não-txt / __MACOSX", async () => {
    const z = await makeZip([
      { name: "h1.txt", text: "Hand A", method: 8 },
      { name: "__MACOSX/._h1.txt", text: "lixo", method: 0 },
      { name: "leia-me.pdf", text: "nada", method: 0 },
      { name: "h2.txt", text: "Hand B", method: 0 },
    ]);
    const out = await unzipTextFiles(z);
    expect(out).toContain("Hand A");
    expect(out).toContain("Hand B");
    expect(out).not.toContain("lixo");
  });
});
