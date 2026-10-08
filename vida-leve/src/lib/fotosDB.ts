/**
 * Fotos de progresso — guardadas SÓ neste aparelho (IndexedDB), nunca vão para
 * a nuvem. A foto é reduzida (máx. 1280 px, JPEG) para não ocupar espaço.
 */
export interface FotoProgresso {
  id: string;
  data: string;
  blob: Blob;
  criado_em: string;
}

const BANCO = "vida-leve-fotos";
const LOJA = "fotos";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    if (typeof indexedDB === "undefined") return erro(new Error("Este navegador não permite guardar fotos."));
    const req = indexedDB.open(BANCO, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(LOJA, { keyPath: "id" });
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error ?? new Error("Não foi possível abrir o armazenamento de fotos."));
  });
}

async function transacao<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise((ok, erro) => {
    const req = fn(db.transaction(LOJA, modo).objectStore(LOJA));
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error ?? new Error("Erro no armazenamento de fotos."));
  });
}

export async function listarFotos(): Promise<FotoProgresso[]> {
  const todas = await transacao<FotoProgresso[]>("readonly", (s) => s.getAll() as IDBRequest<FotoProgresso[]>);
  return todas.sort((a, b) => a.data.localeCompare(b.data) || a.criado_em.localeCompare(b.criado_em));
}

export async function reduzirImagem(arquivo: Blob, max = 1280): Promise<Blob> {
  const bmp = await createImageBitmap(arquivo);
  const escala = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * escala);
  canvas.height = Math.round(bmp.height * escala);
  canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((ok, erro) =>
    canvas.toBlob((b) => (b ? ok(b) : erro(new Error("Não foi possível processar a foto."))), "image/jpeg", 0.82),
  );
}

export async function salvarFoto(arquivo: Blob, data: string): Promise<FotoProgresso> {
  const foto: FotoProgresso = {
    id: crypto.randomUUID(),
    data,
    blob: await reduzirImagem(arquivo),
    criado_em: new Date().toISOString(),
  };
  await transacao("readwrite", (s) => s.put(foto));
  return foto;
}

export async function apagarFoto(id: string): Promise<void> {
  await transacao("readwrite", (s) => s.delete(id));
}

export async function apagarTodasFotos(): Promise<void> {
  try {
    await transacao("readwrite", (s) => s.clear());
  } catch {
    /* sem banco de fotos: nada a apagar */
  }
}
