// ---------------------------------------------------------------------------
// Exportação de Reel estático para Instagram — 100% no navegador.
// Recebe um PNG já renderizado pelo gerador visual, codifica 12s de vídeo H.264
// e monta um MP4 compatível com o fluxo de Reel. Não altera dados da mão.
// ---------------------------------------------------------------------------

const REEL_WIDTH = 1080;
const REEL_HEIGHT = 1920;
const REEL_FPS = 30;

interface WebCodecsGlobals {
  VideoEncoder?: typeof VideoEncoder;
  VideoFrame?: typeof VideoFrame;
}

function hasMp4EncodingSupport(): boolean {
  const globals = globalThis as typeof globalThis & WebCodecsGlobals;
  return typeof globals.VideoEncoder !== "undefined" && typeof globals.VideoFrame !== "undefined";
}

function imageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível preparar o card para o Reel."));
    };
    img.src = url;
  });
}

/**
 * Codifica um card PNG parado em um Reel MP4 vertical.
 * O áudio fica ausente de propósito: a música em alta deve ser adicionada no
 * Instagram, onde o catálogo e as licenças da plataforma estão disponíveis.
 */
export async function staticCardToMp4(card: Blob, durationSeconds = 12): Promise<Blob> {
  if (!hasMp4EncodingSupport()) {
    throw new Error("Seu navegador não oferece exportação MP4. Atualize o Chrome ou baixe o PNG e monte o Reel pelo Instagram.");
  }

  const [{ Muxer, ArrayBufferTarget }, img] = await Promise.all([
    import("mp4-muxer"),
    imageFromBlob(card),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = REEL_WIDTH;
  canvas.height = REEL_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar o canvas do Reel.");
  ctx.drawImage(img, 0, 0, REEL_WIDTH, REEL_HEIGHT);

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: "avc",
      width: REEL_WIDTH,
      height: REEL_HEIGHT,
      frameRate: REEL_FPS,
    },
    fastStart: "in-memory",
  });

  const globals = globalThis as typeof globalThis & Required<WebCodecsGlobals>;
  const codec = "avc1.42001f";
  const support = await globals.VideoEncoder.isConfigSupported({
    codec,
    width: REEL_WIDTH,
    height: REEL_HEIGHT,
    bitrate: 2_500_000,
    framerate: REEL_FPS,
  });
  if (!support.supported) {
    throw new Error("O navegador não conseguiu codificar este Reel em H.264. Baixe o PNG e monte o Reel pelo Instagram.");
  }

  let encodeError: Error | null = null;
  const encoder = new globals.VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encodeError = error instanceof Error ? error : new Error("Falha ao codificar o Reel.");
    },
  });
  encoder.configure({
    codec,
    width: REEL_WIDTH,
    height: REEL_HEIGHT,
    bitrate: 2_500_000,
    framerate: REEL_FPS,
    latencyMode: "quality",
  });

  const totalFrames = Math.max(1, Math.round(durationSeconds * REEL_FPS));
  const frameDuration = Math.round(1_000_000 / REEL_FPS);
  for (let i = 0; i < totalFrames; i += 1) {
    const frame = new globals.VideoFrame(canvas, {
      timestamp: i * frameDuration,
      duration: frameDuration,
    });
    encoder.encode(frame, { keyFrame: i === 0 });
    frame.close();
  }

  await encoder.flush();
  encoder.close();
  if (encodeError) throw encodeError;
  muxer.finalize();

  return new Blob([target.buffer], { type: "video/mp4" });
}

async function staticCardToRecorder(card: Blob, durationSeconds: number): Promise<StaticReelResult> {
  const img = await imageFromBlob(card);
  const canvas = document.createElement("canvas");
  canvas.width = REEL_WIDTH;
  canvas.height = REEL_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar o canvas do Reel.");
  ctx.drawImage(img, 0, 0, REEL_WIDTH, REEL_HEIGHT);

  const stream = canvas.captureStream?.(REEL_FPS);
  if (!stream || typeof MediaRecorder === "undefined") {
    throw new Error("Seu navegador não oferece exportação de Reel. Baixe o PNG e monte o Reel pelo Instagram.");
  }

  const mimeType = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) {
    throw new Error("Seu navegador não oferece um formato de vídeo compatível. Baixe o PNG e monte o Reel pelo Instagram.");
  }

  return new Promise((resolve, reject) => {
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
    const stopTimer = window.setTimeout(() => recorder.stop(), Math.max(1, durationSeconds) * 1000);
    let animationFrame = 0;
    const repaint = () => {
      // CanvasCaptureMediaStream só emite frames quando o canvas é redesenhado.
      // O card continua visualmente parado, mas o arquivo recebe 30 fps reais.
      ctx.drawImage(img, 0, 0, REEL_WIDTH, REEL_HEIGHT);
      animationFrame = window.requestAnimationFrame(repaint);
    };
    repaint();
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      window.clearTimeout(stopTimer);
      window.cancelAnimationFrame(animationFrame);
      stream.getTracks().forEach((track) => track.stop());
      reject(new Error("Falha ao gravar o Reel no navegador."));
    };
    recorder.onstop = () => {
      window.clearTimeout(stopTimer);
      window.cancelAnimationFrame(animationFrame);
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: mimeType });
      const isMp4 = mimeType.startsWith("video/mp4");
      resolve({ blob, extension: isMp4 ? "mp4" : "webm", mimeType });
    };
    recorder.start(250);
  });
}

export interface StaticReelResult {
  blob: Blob;
  extension: "mp4" | "webm";
  mimeType: string;
}

/**
 * Escolhe MP4 H.264 via WebCodecs ou MediaRecorder quando disponível; caso
 * contrário, grava WebM como fallback honesto. O card continua sempre com 12s.
 */
export async function staticCardToReel(card: Blob, durationSeconds = 12): Promise<StaticReelResult> {
  if (hasMp4EncodingSupport()) {
    try {
      const blob = await staticCardToMp4(card, durationSeconds);
      return { blob, extension: "mp4", mimeType: "video/mp4" };
    } catch {
      // Alguns Chromium expõem WebCodecs, mas não têm encoder H.264 instalado.
    }
  }
  return staticCardToRecorder(card, durationSeconds);
}

export const STATIC_REEL_DURATION_SECONDS = 12;
export const STATIC_REEL_SIZE = { width: REEL_WIDTH, height: REEL_HEIGHT };
