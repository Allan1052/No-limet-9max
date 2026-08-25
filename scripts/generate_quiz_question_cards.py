from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
import math

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "instagram" / "quizzes"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1350
GOLD = "#d9b34a"
GOLD_BRIGHT = "#f0d77b"
GOLD_DARK = "#72571e"
CREAM = "#f2eee1"
MUTED = "#b8b39e"
GREEN = "#0d2a1c"
GREEN_DEEP = "#06150e"
BLACK = "#070907"
RED = "#b83a34"
SUIT_SYMBOLS = {"c": "♣", "d": "♦", "h": "♥", "s": "♠"}
SUIT_COLORS = {"c": "#17191a", "d": RED, "h": RED, "s": "#17191a"}

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
SERIF = FONT_DIR / "DejaVuSerif.ttf"
SERIF_BOLD = FONT_DIR / "DejaVuSerif-Bold.ttf"
SANS = FONT_DIR / "DejaVuSans.ttf"
SANS_BOLD = FONT_DIR / "DejaVuSans-Bold.ttf"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def fit_font(text: str, max_width: int, max_size: int, min_size: int = 18, bold: bool = True) -> ImageFont.FreeTypeFont:
    path = SERIF_BOLD if bold else SERIF
    for size in range(max_size, min_size - 1, -1):
        f = font(path, size)
        if f.getbbox(text)[2] <= max_width:
            return f
    return font(path, min_size)


def wrap(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and draw.textbbox((0, 0), candidate, font=f)[2] > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def centered(draw: ImageDraw.ImageDraw, text: str, y: int, f: ImageFont.FreeTypeFont, fill: str, spacing: int = 0) -> int:
    box = draw.textbbox((0, 0), text, font=f)
    x = (W - (box[2] - box[0])) // 2
    draw.text((x, y), text, font=f, fill=fill, spacing=spacing)
    return box[2] - box[0]


def draw_round_panel(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], title: str, lines: list[str], accent: str = GOLD) -> None:
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=18, fill="#07140e", outline=accent, width=3)
    draw.rounded_rectangle((x0 + 10, y0 + 10, x1 - 10, y1 - 10), radius=12, outline="#4c3b16", width=1)
    draw.text((x0 + 28, y0 + 23), title, font=font(SANS_BOLD, 22), fill=accent)
    draw.line((x0 + 28, y0 + 64, x1 - 28, y0 + 64), fill=GOLD_DARK, width=2)
    y = y0 + 88
    for i, line in enumerate(lines):
        size = 26 if i == 0 else 20
        f = font(SERIF_BOLD if i == 0 else SANS_BOLD, size)
        color = CREAM if i == 0 else (GOLD_BRIGHT if i == 1 else MUTED)
        max_w = x1 - x0 - 56
        for subline in wrap(draw, line, f, max_w):
            draw.text((x0 + 28, y), subline, font=f, fill=color)
            y += size + 8
        y += 2


def pip_positions(n: int) -> list[tuple[float, float]]:
    rows = {
        2: [(0.5, 0.25), (0.5, 0.75)],
        3: [(0.5, 0.20), (0.5, 0.50), (0.5, 0.80)],
        4: [(0.32, 0.24), (0.68, 0.24), (0.32, 0.76), (0.68, 0.76)],
        5: [(0.32, 0.22), (0.68, 0.22), (0.5, 0.50), (0.32, 0.78), (0.68, 0.78)],
        6: [(0.32, 0.19), (0.68, 0.19), (0.32, 0.50), (0.68, 0.50), (0.32, 0.81), (0.68, 0.81)],
        7: [(0.32, 0.16), (0.68, 0.16), (0.32, 0.35), (0.68, 0.35), (0.5, 0.50), (0.32, 0.84), (0.68, 0.84)],
        8: [(0.32, 0.15), (0.68, 0.15), (0.32, 0.36), (0.68, 0.36), (0.32, 0.64), (0.68, 0.64), (0.32, 0.85), (0.68, 0.85)],
        9: [(0.32, 0.14), (0.68, 0.14), (0.32, 0.34), (0.68, 0.34), (0.5, 0.50), (0.32, 0.66), (0.68, 0.66), (0.32, 0.86), (0.68, 0.86)],
        10: [(0.32, 0.13), (0.68, 0.13), (0.32, 0.30), (0.68, 0.30), (0.32, 0.50), (0.68, 0.50), (0.32, 0.70), (0.68, 0.70), (0.32, 0.87), (0.68, 0.87)],
    }
    return rows[n]


def draw_card(base: Image.Image, xy: tuple[int, int], rank: str, suit: str, size: tuple[int, int] = (210, 295)) -> None:
    x, y = xy
    w, h = size
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.rounded_rectangle((x + 9, y + 13, x + w + 9, y + h + 13), radius=18, fill=(0, 0, 0, 150))
    layer = layer.filter(ImageFilter.GaussianBlur(10))
    base.alpha_composite(layer)
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=18, fill="#fbfaf5", outline="#b99535", width=4)
    draw.rounded_rectangle((x + 7, y + 7, x + w - 7, y + h - 7), radius=13, outline="#d9d3c1", width=2)
    color = SUIT_COLORS[suit]
    symbol = SUIT_SYMBOLS[suit]
    rank_f = font(SERIF_BOLD, 52)
    suit_f = font(SERIF_BOLD, 40)
    draw.text((x + 20, y + 13), rank, font=rank_f, fill=color)
    draw.text((x + 23, y + 65), symbol, font=suit_f, fill=color)
    if rank.isdigit():
        for px, py in pip_positions(int(rank)):
            draw.text((x + int(w * px), y + int(h * py)), symbol, font=font(SERIF_BOLD, 42), fill=color, anchor="mm")
    elif rank == "A":
        draw.text((x + w // 2, y + h // 2 + 15), symbol, font=font(SERIF_BOLD, 118), fill=color, anchor="mm")
    else:
        draw.text((x + w // 2, y + h // 2 - 12), rank, font=font(SERIF_BOLD, 100), fill=color, anchor="mm")
        draw.text((x + w // 2, y + h // 2 + 70), symbol, font=font(SERIF_BOLD, 48), fill=color, anchor="mm")
    # Índice inferior mantido na mesma orientação para leitura rápida em redes sociais.
    draw.text((x + w - 22, y + h - 78), symbol, font=suit_f, fill=color, anchor="ra")
    draw.text((x + w - 20, y + h - 15), rank, font=rank_f, fill=color, anchor="rb")


def draw_chip(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill="#12261b", outline="#c29e3c", width=4)
    draw.ellipse((cx - r + 10, cy - r + 10, cx + r - 10, cy + r - 10), outline="#746025", width=3)
    for i in range(8):
        a = i * math.pi / 4
        x1 = cx + int(math.cos(a) * (r - 6))
        y1 = cy + int(math.sin(a) * (r - 6))
        x2 = cx + int(math.cos(a) * (r - 17))
        y2 = cy + int(math.sin(a) * (r - 17))
        draw.line((x1, y1, x2, y2), fill="#d9b34a", width=5)
    draw.text((cx, cy), "CF", font=font(SERIF_BOLD, max(14, r // 3)), fill=GOLD_BRIGHT, anchor="mm")


def base_canvas() -> Image.Image:
    img = Image.new("RGBA", (W, H), BLACK)
    px = img.load()
    for y in range(H):
        for x in range(W):
            # Verde mais vivo no centro, quase preto nas bordas.
            dx = (x - W / 2) / W
            dy = (y - H * 0.53) / H
            glow = max(0.0, 1.0 - math.sqrt(dx * dx + dy * dy) * 1.45)
            px[x, y] = (int(5 + 8 * glow), int(12 + 31 * glow), int(8 + 20 * glow), 255)
    draw = ImageDraw.Draw(img)
    # Rede HUD discreta, sem competir com texto ou cartas.
    for i in range(12):
        x = 35 + i * 92
        draw.line((x, 170, x + 180, 50), fill=(100, 86, 32, 48), width=1)
        draw.ellipse((x - 3, 168, x + 3, 174), fill=(220, 183, 70, 120))
    for y in (410, 780, 1110):
        draw.line((35, y, W - 35, y), fill=(121, 99, 37, 45), width=1)
    draw.rounded_rectangle((24, 24, W - 24, H - 24), radius=24, outline="#7f6426", width=3)
    draw.rounded_rectangle((34, 34, W - 34, H - 34), radius=18, outline="#2e3b27", width=1)
    return img


@dataclass(frozen=True)
class Quiz:
    number: int
    cards: tuple[str, ...]
    title: str
    subtitle: str
    scenario: list[str]
    question: list[str]
    decision: str
    answer: str
    explanation: str
    mistake: str


QUIZZES = [
    Quiz(1, ("9s", "7s"), "9♠ 7♠ NO UTG", "Você abre ou joga fora?", ["MTT", "40 BB", "VOCÊ: UTG", "INÍCIO"], ["ABRE OU FOLD?", "PENSE ANTES DE TOCAR"], "ABRE OU FOLD?", "FOLD", "Conector bonito, mas de posição inicial fica fora da range.", "Abrir só porque é conectado e suited."),
    Quiz(2, ("9s", "7s"), "9♠ 7♠ NO BOTÃO", "Você abre ou joga fora?", ["MTT", "40 BB", "VOCÊ: BOTÃO", "POSIÇÃO FINAL"], ["ABRE OU FOLD?", "A POSIÇÃO PAGA"], "ABRE OU FOLD?", "ABRE", "No botão, o 97s entra na abertura: posição é o que faz a mão jogar bem.", "Foldar uma mão jogável só porque é baixa."),
    Quiz(3, ("6s", "5s"), "6♠ 5♠ DEFENDENDO", "UTG abriu. Você está no meio.", ["MTT", "40 BB", "UTG ABRIU", "VOCÊ: MP"], ["CALL OU FOLD?", "RANGE FORTE À FRENTE"], "CALL OU FOLD?", "FOLD", "Contra uma abertura de UTG, 65s fica fora da defesa padrão do MP.", "Pagar só para tentar flopar sequência ou flush."),
    Quiz(4, ("Ts", "9s"), "T♠ 9♠ NO CUTOFF", "Você abre ou joga fora?", ["MTT", "40 BB", "VOCÊ: CO", "POSIÇÃO BOA"], ["ABRE OU FOLD?", "MÃO JOGÁVEL"], "ABRE OU FOLD?", "ABRE", "T9s entra na abertura do cutoff e joga bem em posição.", "Foldar uma mão jogável sem necessidade."),
    Quiz(5, ("7s", "8s"), "7♠ 8♠ CONTRA 3-BET", "Você abriu. O BB voltou por cima.", ["MTT", "50 BB", "VOCÊ: BOTÃO", "BB DEU 3-BET"], ["CALL OU FOLD?", "PREÇO IMPORTA"], "CALL OU FOLD?", "FOLD", "Conector suited não paga qualquer preço contra um range de re-raise.", "Pagar apenas porque é conectado e suited."),
    Quiz(6, ("Ad", "4c"), "A♦ 4♣ NO UTG", "Você abre ou joga fora?", ["MTT", "30 BB", "VOCÊ: UTG", "INÍCIO"], ["ABRE OU FOLD?", "ÁS FRACO OFF"], "ABRE OU FOLD?", "FOLD", "Um Ás fraco e off-suit de posição inicial sofre contra Áses melhores.", "Abrir automaticamente porque tem um Ás."),
    Quiz(7, ("As", "Js"), "A♠ J♠ POR CIMA DOS LIMPERS", "Três jogadores só completaram.", ["MTT", "40 BB", "3 LIMPERS", "VOCÊ: CO"], ["ISO OU LIMPA?", "COBRE QUEM ENTROU"], "ISO OU LIMPA?", "ABRE GRANDE", "Com a melhor mão e posição, aumentar isola e evita um pote barato multiway.", "Limpar junto e desperdiçar a iniciativa."),
    Quiz(8, ("Js", "5s"), "J♠ 5♠ NO UTG", "Você abre ou joga fora?", ["MTT", "30 BB", "VOCÊ: UTG", "INÍCIO"], ["ABRE OU FOLD?", "SUITED NÃO É TUDO"], "ABRE OU FOLD?", "FOLD", "J5s é desconectado e fraco para abrir de posição inicial.", "Entrar automaticamente porque é suited."),
    Quiz(9, ("Ks", "9s"), "K♠ 9♠ CURTO", "Com 10 BB, você empurra?", ["MTT", "10 BB", "VOCÊ: CO", "STACK CURTO"], ["SHOVE OU FOLD?", "PUSH / FOLD"], "SHOVE OU FOLD?", "SHOVE", "Com 10 BB, a abertura vira uma decisão de push/fold; K9s do CO empurra.", "Esperar demais por uma mão perfeita."),
    Quiz(10, ("Kc", "Qd"), "K♣ Q♦ CONTRA 3-BET", "Você abriu. O botão voltou por cima.", ["MTT", "50 BB", "VOCÊ: CO", "BTN DEU 3-BET"], ["CALL / 4-BET / FOLD?", "DOMINAÇÃO IMPORTA"], "CALL / 4-BET / FOLD?", "FOLD", "KQo fica dominado e fora de posição contra o range de 3-bet do botão.", "Pagar porque KQ parece uma mão bonita."),
]


def render_quiz(q: Quiz) -> Path:
    img = base_canvas()
    draw = ImageDraw.Draw(img)

    # Cabeçalho: logo oficial e assinatura humana.
    logo_path = ROOT / "public" / "logo.png"
    logo = Image.open(logo_path).convert("RGBA")
    logo.thumbnail((300, 88), Image.Resampling.LANCZOS)
    img.alpha_composite(logo, (48, 52))
    draw.text((W - 48, 62), "ESTUDO • MTT • DECISÃO", font=font(SANS_BOLD, 22), fill=GOLD_BRIGHT, anchor="ra")
    draw.text((W - 48, 98), "feito por um recreativo", font=font(SANS, 20), fill=CREAM, anchor="ra")

    draw.text((W // 2, 198), f"QUIZ {q.number:02d} • 10 SEGUNDOS", font=font(SANS_BOLD, 22), fill=GOLD, anchor="mm")
    title_f = fit_font(q.title, W - 110, 54, 32, True)
    draw.text((W // 2, 245), q.title, font=title_f, fill=CREAM, anchor="ma")
    subtitle_f = fit_font(q.subtitle, W - 160, 28, 20, False)
    draw.text((W // 2, 320), q.subtitle, font=subtitle_f, fill=GOLD_BRIGHT, anchor="ma")
    draw.line((70, 386, W - 70, 386), fill=GOLD_DARK, width=2)

    draw_round_panel(draw, (58, 430, 500, 700), "CENÁRIO", q.scenario)
    draw_round_panel(draw, (580, 430, 1022, 700), "PERGUNTA", q.question)

    draw.text((W // 2, 758), "MÃO PARA ANALISAR", font=font(SANS_BOLD, 22), fill=GOLD_BRIGHT, anchor="mm")
    draw.line((78, 758, 285, 758), fill=GOLD_DARK, width=2)
    draw.line((795, 758, 1002, 758), fill=GOLD_DARK, width=2)

    card_w, card_h = 225, 315
    gap = 38
    total = card_w * 2 + gap
    left = (W - total) // 2
    for idx, card in enumerate(q.cards):
        draw_card(img, (left + idx * (card_w + gap), 805), card[0], card[1], (card_w, card_h))

    draw_chip(draw, 95, 1102, 46)
    draw_chip(draw, W - 95, 1102, 46)
    cta = f"COMENTA: {q.decision} ANTES DA RESPOSTA"
    cta_f = fit_font(cta, W - 220, 25, 17, True)
    draw.rounded_rectangle((95, 1150, W - 95, 1210), radius=18, fill="#0c1c13", outline=GOLD, width=3)
    draw.text((W // 2, 1180), cta, font=cta_f, fill=CREAM, anchor="mm")

    draw.rounded_rectangle((48, 1250, W - 48, 1310), radius=14, fill="#08130d", outline="#5f4b1d", width=2)
    draw.text((70, 1280), "UMA MÃO POR VEZ • SÓ ESTUDO", font=font(SANS_BOLD, 17), fill=MUTED, anchor="lm")
    draw.text((W - 70, 1280), "calloufold.com.br", font=font(SANS_BOLD, 18), fill=GOLD_BRIGHT, anchor="rm")

    path = OUT / f"quiz-{q.number:02d}-{q.answer.lower().replace(' ', '-').replace('/', '-')}.png"
    img.convert("RGB").save(path, quality=96, optimize=True)
    return path


comment_lines: list[str] = [
    "# Pacote de comentários — Quizzes Call ou Fold",
    "",
    "As imagens da série mostram apenas a pergunta. As respostas abaixo são para publicar nos comentários depois da participação do público.",
    "",
]
for q in QUIZZES:
    comment_lines.extend([
        f"## Card {q.number:02d} — {q.title}",
        f"**Resposta:** {q.answer}.",
        f"**Explicação:** {q.explanation}",
        f"**Erro comum:** {q.mistake}",
        "",
    ])
(ROOT / "docs" / "quiz-comments-10-spots.md").write_text("\n".join(comment_lines) + "\n", encoding="utf-8")

if __name__ == "__main__":
    for quiz in QUIZZES:
        print(render_quiz(quiz))
