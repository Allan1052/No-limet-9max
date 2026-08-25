from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "public" / "instagram" / "quiz-padrao-bb-shove-15bb.png"
OUT = ROOT / "public" / "instagram" / "quizzes"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1440, 2560
CREAM = "#f4efe2"
GOLD = "#e7c65d"
GOLD_SOFT = "#d5af46"
MUTED = "#c1b99e"
GREEN = "#0a1a11"
RED = "#b63c36"
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
SERIF = FONT_DIR / "DejaVuSerif.ttf"
SERIF_BOLD = FONT_DIR / "DejaVuSerif-Bold.ttf"
SANS = FONT_DIR / "DejaVuSans.ttf"
SANS_BOLD = FONT_DIR / "DejaVuSans-Bold.ttf"
SUITS = {"c": ("♣", "#111515"), "d": ("♦", RED), "h": ("♥", RED), "s": ("♠", "#111515")}


def F(path: Path, size: int):
    return ImageFont.truetype(str(path), size)


def fit(draw: ImageDraw.ImageDraw, text: str, max_width: int, max_size: int, min_size: int, bold: bool = True):
    path = SERIF_BOLD if bold else SERIF
    for size in range(max_size, min_size - 1, -1):
        f = F(path, size)
        if draw.textbbox((0, 0), text, font=f)[2] <= max_width:
            return f
    return F(path, min_size)


def centered(draw: ImageDraw.ImageDraw, text: str, y: int, f, fill: str):
    box = draw.textbbox((0, 0), text, font=f)
    draw.text(((W - (box[2] - box[0])) // 2, y), text, font=f, fill=fill)


def wrap(draw: ImageDraw.ImageDraw, text: str, f, max_width: int):
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        test = f"{cur} {word}".strip()
        if cur and draw.textbbox((0, 0), test, font=f)[2] > max_width:
            lines.append(cur)
            cur = word
        else:
            cur = test
    if cur:
        lines.append(cur)
    return lines


def fill_region(img: Image.Image, box: tuple[int, int, int, int], color: str):
    # Cover variable copy with a clean color field. Blurring the old text creates
    # ghost lettering around the new copy, so the standard template uses clean
    # inpainting blocks instead.
    ImageDraw.Draw(img).rectangle(box, fill=color)


def draw_panel(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], title: str, lines: list[str], highlight: int = 1):
    x0, y0, x1, y1 = box
    # Preserve the outer frame from the approved base; only restore the inner ledger.
    draw.text((x0 + 34, y0 + 24), title, font=F(SANS_BOLD, 28), fill=GOLD)
    draw.line((x0 + 34, y0 + 72, x1 - 34, y0 + 72), fill="#71571f", width=2)
    y = y0 + 105
    for i, line in enumerate(lines):
        size = 35 if i == 0 else 27
        f = F(SERIF_BOLD if i == 0 else SANS_BOLD, size)
        color = CREAM if i == 0 else (GOLD if i == highlight else MUTED)
        for part in wrap(draw, line, f, x1 - x0 - 68):
            draw.text((x0 + 34, y), part, font=f, fill=color)
            y += size + 12
        y += 3


def pips(n: int) -> list[tuple[float, float]]:
    return {
        2: [(0.35, .25), (.65, .75)],
        3: [(0.35, .20), (.5, .5), (.65, .80)],
        4: [(0.33, .23), (.67, .23), (.33, .77), (.67, .77)],
        5: [(0.33, .20), (.67, .20), (.5, .5), (.33, .80), (.67, .80)],
        6: [(0.33, .18), (.67, .18), (.33, .5), (.67, .5), (.33, .82), (.67, .82)],
        7: [(0.33, .15), (.67, .15), (.33, .34), (.67, .34), (.5, .5), (.33, .84), (.67, .84)],
        8: [(0.33, .14), (.67, .14), (.33, .35), (.67, .35), (.33, .65), (.67, .65), (.33, .86), (.67, .86)],
        9: [(0.33, .13), (.67, .13), (.33, .32), (.67, .32), (.5, .5), (.33, .68), (.67, .68), (.33, .87), (.67, .87)],
        10: [(0.33, .12), (.67, .12), (.33, .28), (.67, .28), (.33, .50), (.67, .50), (.33, .72), (.67, .72), (.33, .88), (.67, .88)],
    }[n]


def draw_card(img: Image.Image, x: int, y: int, rank: str, suit: str, w: int = 365, h: int = 535):
    draw = ImageDraw.Draw(img)
    symbol, color = SUITS[suit]
    # Shadow and physical card body, aligned to the approved A♠7♠ composition.
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x + 14, y + 18, x + w + 14, y + h + 18), radius=22, fill=(0, 0, 0, 165))
    shadow = shadow.filter(ImageFilter.GaussianBlur(15))
    img.alpha_composite(shadow)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=22, fill="#fbfaf4", outline="#b7963e", width=5)
    draw.rounded_rectangle((x + 10, y + 10, x + w - 10, y + h - 10), radius=16, outline="#d4cdb9", width=2)
    rank_font = F(SERIF_BOLD, 68)
    suit_font = F(SERIF_BOLD, 54)
    draw.text((x + 26, y + 20), rank, font=rank_font, fill=color)
    draw.text((x + 32, y + 88), symbol, font=suit_font, fill=color)
    if rank.isdigit():
        for px, py in pips(int(rank)):
            draw.text((x + int(w * px), y + int(h * py)), symbol, font=F(SERIF_BOLD, 52), fill=color, anchor="mm")
    elif rank == "A":
        draw.text((x + w // 2, y + h // 2 + 15), symbol, font=F(SERIF_BOLD, 148), fill=color, anchor="mm")
    else:
        draw.text((x + w // 2, y + h // 2 - 30), rank, font=F(SERIF_BOLD, 128), fill=color, anchor="mm")
        draw.text((x + w // 2, y + h // 2 + 90), symbol, font=F(SERIF_BOLD, 60), fill=color, anchor="mm")
    draw.text((x + w - 30, y + h - 108), symbol, font=suit_font, fill=color, anchor="ra")
    draw.text((x + w - 28, y + h - 20), rank, font=rank_font, fill=color, anchor="rb")


@dataclass(frozen=True)
class Quiz:
    number: int
    cards: tuple[str, str]
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


def parse_card(code: str) -> tuple[str, str]:
    return code[0], code[1]


def render(q: Quiz) -> Path:
    base = Image.open(BASE).convert("RGBA")
    draw = ImageDraw.Draw(base)

    # Same approved template, with masks only over the variable content zones.
    # The header, HUD ornaments, panel frames, chips and footer remain literally from A♠7♠.
    fill_region(base, (80, 320, 1360, 700), "#08170f")
    fill_region(base, (72, 760, 455, 1480), "#07150e")
    fill_region(base, (985, 760, 1370, 1480), "#07150e")
    fill_region(base, (270, 1530, 1170, 2205), "#0a2115")
    fill_region(base, (180, 2180, 1260, 2320), "#07150e")

    # Main variable copy; the header/logo, frame, HUD lines, chips and footer remain from A♠7♠.
    centered(draw, "QUIZ DE 10 SEGUNDOS", 350, F(SANS_BOLD, 28), GOLD)
    title_font = fit(draw, q.title, 1260, 72, 44, True)
    centered(draw, q.title, 415, title_font, CREAM)
    subtitle_font = fit(draw, q.subtitle, 1120, 38, 25, False)
    centered(draw, q.subtitle, 525, subtitle_font, GOLD_BRIGHT if False else GOLD_SOFT)
    draw.line((108, 655, W - 108, 655), fill="#8b6f27", width=2)

    # Rebuild the same two tall side modules as the approved card.
    draw_panel(draw, (82, 770, 448, 1460), "CENÁRIO", q.scenario, 1)
    draw_panel(draw, (995, 770, 1362, 1460), "PERGUNTA", q.question, 1)

    centered(draw, "MÃO PARA ANALISAR", 1518, F(SANS_BOLD, 27), GOLD)
    draw.line((110, 1532, 390, 1532), fill="#896c26", width=2)
    draw.line((1050, 1532, 1330, 1532), fill="#896c26", width=2)

    c1_rank, c1_suit = parse_card(q.cards[0])
    c2_rank, c2_suit = parse_card(q.cards[1])
    card_w, card_h, gap = 370, 540, 44
    left = (W - (card_w * 2 + gap)) // 2
    draw_card(base, left, 1590, c1_rank, c1_suit, card_w, card_h)
    draw_card(base, left + card_w + gap, 1590, c2_rank, c2_suit, card_w, card_h)

    cta = f"COMENTA: {q.decision} ANTES DA RESPOSTA"
    cta_font = fit(draw, cta, 1050, 32, 22, True)
    # Preserve the approved CTA frame and replace only its text.
    centered(draw, cta, 2248, cta_font, CREAM)

    path = OUT / f"quiz-{q.number:02d}-{q.answer.lower().replace(' ', '-').replace('/', '-')}.png"
    base.convert("RGB").save(path, quality=96, optimize=True)
    return path


comments = [
    "# Comentários pós-resposta — Quizzes Call ou Fold",
    "",
    "As imagens da série são apenas a pergunta. Publique a resposta nos comentários depois da participação do público.",
    "",
]
for q in QUIZZES:
    comments += [
        f"## Card {q.number:02d} — {q.title}",
        f"**Resposta:** {q.answer}.",
        f"**Explicação:** {q.explanation}",
        f"**Erro comum:** {q.mistake}",
        "",
    ]
(ROOT / "docs" / "quiz-comments-10-spots-standard.md").write_text("\n".join(comments) + "\n", encoding="utf-8")

if __name__ == "__main__":
    for quiz in QUIZZES:
        print(render(quiz))
