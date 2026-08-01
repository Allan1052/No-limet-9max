"""
Gera um card visual com o conteúdo completo da tela de boas-vindas do app "Call ou Fold".
Padrão: fundo escuro, dourado, logo horizontal, textos do onboarding.
V2: sem glow pixelado, melhor distribuição, mais premium.
"""

from PIL import Image, ImageDraw, ImageFont

# === CONFIG ===
WIDTH = 1080
BG_COLOR = (10, 13, 10)  # #0a0d0a
GOLD = (230, 196, 84)
GOLD_DIM = (212, 175, 55)
WHITE_DIM = (200, 200, 190)
BUS_COLOR = (154, 154, 138)

# === LOGO ===
logo_path = "/home/ubuntu/upload/pasted_file_fa0At6_logohorizontal.png"

# === FONTES ===
FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf"
FONT_ITALIC = "/usr/share/fonts/truetype/noto/NotoSerif-Italic.ttf"
FONT_SEMIBOLD = "/usr/share/fonts/truetype/noto/NotoSerif-SemiBold.ttf"

# === TEXTO ===
TITLE = "O Sonho é Nosso. Degrau por Degrau."
SUBTITLE = "Feito por um recreativo, para recreativos."
STEP1 = "Eu sou um jogador recreativo — e criei este app porque preciso dele tanto quanto você. Em agosto de 2026 comecei esse projeto junto com vocês. Eu aprendo aqui, você aprende aqui. Vamos subir juntos."
STEP2 = "Aqui você joga contra bots reais. Suas cartas estão embaixo, e a decisão é toda sua."
STEP3 = "Errou? Tudo bem. O app te mostra a jogada certa na hora. É aqui que você evolui sem julgamentos."
STEP4 = "Sem dinheiro real. Apenas você e sua evolução. Vamos subir esse degrau?"
BUS = "Esse app foi feito no ônibus, caminho pro trabalho. Igual você, estou aprendendo tudo. No poker e aqui. Erros vão acontecer — mas igual na mesa, a gente evolui jogando."
CTA = "Começar a jogar"


def wrap_text(text, font, max_width, draw):
    words = text.split()
    lines = []
    current_line = ""
    for word in words:
        test = current_line + " " + word if current_line else word
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current_line = test
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)
    return lines


def text_height(text, font, max_width, draw):
    lines = wrap_text(text, font, max_width, draw)
    return len(lines) * 30


def create_card():
    # Primeiro renderizar em canvas grande para calcular altura
    canvas_h = 2400  # altura temporária
    img = Image.new("RGBA", (WIDTH, canvas_h), (*BG_COLOR, 255))
    draw = ImageDraw.Draw(img)

    # === LOGO HORIZONTAL (topo) ===
    logo = Image.open(logo_path).convert("RGBA")
    logo_target_w = int(WIDTH * 0.65)
    logo_ratio = logo_target_w / logo.width
    logo_h = int(logo.height * logo_ratio)
    logo_resized = logo.resize((logo_target_w, logo_h), Image.LANCZOS)
    # Remover fundo escuro
    logo_data = logo_resized.load()
    for y in range(logo_resized.height):
        for x in range(logo_resized.width):
            r, g, b, a = logo_data[x, y]
            if r < 40 and g < 40 and b < 35:
                logo_data[x, y] = (r, g, b, 0)

    logo_x = (WIDTH - logo_target_w) // 2
    logo_y = 80
    img.paste(logo_resized, (logo_x, logo_y), logo_resized)
    draw = ImageDraw.Draw(img)

    current_y = logo_y + logo_h + 30

    # Separador
    draw.line([(60, current_y), (WIDTH - 60, current_y)], fill=(*GOLD_DIM, 50), width=1)
    current_y += 35

    # === TÍTULO ===
    title_font = ImageFont.truetype(FONT_BOLD, 50)
    draw.text(
        (WIDTH // 2, current_y),
        TITLE,
        fill=GOLD,
        font=title_font,
        anchor="mt"
    )
    current_y += 65

    # === SUBTÍTULO ===
    subtitle_font = ImageFont.truetype(FONT_ITALIC, 27)
    draw.text(
        (WIDTH // 2, current_y),
        SUBTITLE,
        fill=GOLD_DIM,
        font=subtitle_font,
        anchor="mt"
    )
    current_y += 50

    # Separador
    draw.line([(120, current_y), (WIDTH - 120, current_y)], fill=(*GOLD_DIM, 60), width=1)
    current_y += 35

    # === PASSOS ===
    step_font = ImageFont.truetype(FONT_SEMIBOLD, 24)
    num_font = ImageFont.truetype(FONT_BOLD, 20)
    step_x = 45
    text_x = 90
    max_w = WIDTH - text_x - 45
    line_h = 30
    circle_size = 34

    steps = [
        ("1", STEP1),
        ("2", STEP2),
        ("3", STEP3),
        ("4", STEP4),
    ]

    for num, step_text in steps:
        # Círculo numerado
        cy_center = current_y + circle_size // 2
        draw.ellipse(
            [step_x + 3, current_y, step_x + 3 + circle_size, current_y + circle_size],
            outline=(*GOLD, 160),
            width=2
        )
        draw.text(
            (step_x + 3 + circle_size // 2, cy_center + 1),
            num,
            fill=GOLD,
            font=num_font,
            anchor="mm"
        )

        # Texto
        lines = wrap_text(step_text, step_font, max_w, draw)
        for line in lines:
            draw.text(
                (text_x, current_y + 5),
                line,
                fill=WHITE_DIM,
                font=step_font
            )
            current_y += line_h
        current_y += 16

    # === TEXTO DO ÔNIBUS ===
    current_y += 5
    draw.line([(80, current_y), (WIDTH - 80, current_y)], fill=(*BUS_COLOR, 40), width=1)
    current_y += 15

    bus_font = ImageFont.truetype(FONT_ITALIC, 21)
    bus_max_w = WIDTH - 90
    bus_lines = wrap_text(BUS, bus_font, bus_max_w, draw)
    for line in bus_lines:
        draw.text(
            (55, current_y),
            line,
            fill=BUS_COLOR,
            font=bus_font
        )
        current_y += 30

    # === CTA ===
    current_y += 30
    cta_font = ImageFont.truetype(FONT_BOLD, 28)
    cta_bbox = draw.textbbox((0, 0), CTA, font=cta_font)
    cta_text_w = cta_bbox[2] - cta_bbox[0]
    cta_text_h = cta_bbox[3] - cta_bbox[1]
    cta_w = cta_text_w + 120
    cta_h = cta_text_h + 40
    cta_x = (WIDTH - cta_w) // 2

    # Fundo do botão sutil
    draw.rounded_rectangle(
        [cta_x, current_y, cta_x + cta_w, current_y + cta_h],
        radius=10,
        outline=GOLD,
        width=2
    )
    # Calcular posição exata do texto
    text_left = cta_x + cta_w // 2 - cta_text_w // 2
    text_top = current_y + cta_h // 2 - cta_text_h // 2 + 2
    draw.text(
        (text_left, text_top),
        CTA,
        fill=GOLD,
        font=cta_font
    )

    # === "AQUI É POSSÍVEL" ===
    current_y += cta_h + 35
    draw.line([(160, current_y), (WIDTH - 160, current_y)], fill=(*GOLD_DIM, 60), width=1)
    current_y += 18
    final_font = ImageFont.truetype(FONT_BOLD, 16)
    draw.text(
        (WIDTH // 2, current_y),
        "AQUI É POSSÍVEL",
        fill=(*GOLD_DIM, 140),
        font=final_font,
        anchor="mt"
    )

    # Calcular altura do conteúdo e criar card 9:16 (1080x1920) com centralização
    content_bottom = current_y + 60
    content_height = content_bottom
    TARGET_HEIGHT = 1920

    # Criar canvas final 9:16 com fundo escuro
    final = Image.new("RGBA", (WIDTH, TARGET_HEIGHT), (*BG_COLOR, 255))
    # Colar conteúdo centralizado
    paste_y = (TARGET_HEIGHT - content_height) // 2
    final.paste(img.crop((0, 0, WIDTH, content_height)), (0, paste_y))

    # Salvar
    out_path = "/home/ubuntu/no-limet-9max/card-onboarding.png"
    final = final.convert("RGB")
    final.save(out_path, "PNG", quality=95)
    print(f"Card salvo: {out_path} ({WIDTH}x{TARGET_HEIGHT})")


if __name__ == "__main__":
    create_card()
