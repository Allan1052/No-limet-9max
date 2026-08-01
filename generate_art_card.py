"""
Card artístico: imagem do homem no ônibus + textos do onboarding + logo da marca.
Layout: imagem ocupa parte superior, textos embaixo com fundo escuro, logo no rodapé.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter

# === CONFIG ===
WIDTH = 1080
HEIGHT = 1920  # 9:16
BG_COLOR = (10, 13, 10)
GOLD = (230, 196, 84)
GOLD_DIM = (212, 175, 55)
WHITE_DIM = (200, 200, 190)
BUS_COLOR = (154, 154, 138)

# === LOGO ===
logo_path = "/home/ubuntu/upload/pasted_file_fa0At6_logohorizontal.png"
art_image_path = "/home/ubuntu/no-limet-9max/card-art-homem-onibus.png"

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


def create_card():
    # === IMAGEM ARTÍSTICA (parte superior) ===
    art = Image.open(art_image_path).convert("RGB")
    # Redimensionar para caber na largura do card
    art_ratio = WIDTH / art.width
    art_h = int(art.height * art_ratio)
    art = art.resize((WIDTH, art_h), Image.LANCZOS)

    # Limitar altura da imagem a ~45% do card
    max_art_h = int(HEIGHT * 0.48)
    if art_h > max_art_h:
        art = art.crop((0, 0, WIDTH, max_art_h))
    else:
        art = art.crop((0, 0, WIDTH, art_h))

    # Fade out na parte inferior da imagem (transição para fundo escuro)
    fade_h = 80
    fade_data = art.load()
    for y in range(art.height - fade_h, art.height):
        fade_factor = (y - (art.height - fade_h)) / fade_h
        # Gradiente do escuro original para o fundo do card
        for x in range(art.width):
            r, g, b = fade_data[x, y]
            r = int(r * (1 - fade_factor) + BG_COLOR[0] * fade_factor)
            g = int(g * (1 - fade_factor) + BG_COLOR[1] * fade_factor)
            b = int(b * (1 - fade_factor) + BG_COLOR[2] * fade_factor)
            fade_data[x, y] = (r, g, b)

    # === CARD FINAL ===
    final = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    # Colar imagem artística no topo
    final.paste(art, (0, 0))

    draw = ImageDraw.Draw(final)

    # Logo horizontal logo abaixo da imagem
    logo = Image.open(logo_path).convert("RGBA")
    logo_target_w = int(WIDTH * 0.50)
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
    logo_y = art.height + 10
    final.paste(logo_resized, (logo_x, logo_y), logo_resized)
    draw = ImageDraw.Draw(final)

    current_y = logo_y + logo_h + 15

    # Separador sutil
    draw.line([(60, current_y), (WIDTH - 60, current_y)], fill=(*GOLD_DIM, 50), width=1)
    current_y += 25

    # === TÍTULO ===
    title_font = ImageFont.truetype(FONT_BOLD, 42)
    draw.text(
        (WIDTH // 2, current_y),
        TITLE,
        fill=GOLD,
        font=title_font,
        anchor="mt"
    )
    current_y += 55

    # === SUBTÍTULO ===
    subtitle_font = ImageFont.truetype(FONT_ITALIC, 23)
    draw.text(
        (WIDTH // 2, current_y),
        SUBTITLE,
        fill=GOLD_DIM,
        font=subtitle_font,
        anchor="mt"
    )
    current_y += 42

    # Separador
    draw.line([(120, current_y), (WIDTH - 120, current_y)], fill=(*GOLD_DIM, 60), width=1)
    current_y += 25

    # === PASSOS (texto menor para caber) ===
    step_font = ImageFont.truetype(FONT_SEMIBOLD, 20)
    num_font = ImageFont.truetype(FONT_BOLD, 18)
    step_x = 40
    text_x = 82
    max_w = WIDTH - text_x - 40
    line_h = 26
    circle_size = 30

    steps = [
        ("1", STEP1),
        ("2", STEP2),
        ("3", STEP3),
        ("4", STEP4),
    ]

    for num, step_text in steps:
        cy_center = current_y + circle_size // 2
        draw.ellipse(
            [step_x + 2, current_y, step_x + 2 + circle_size, current_y + circle_size],
            outline=(*GOLD, 140),
            width=2
        )
        draw.text(
            (step_x + 2 + circle_size // 2, cy_center),
            num,
            fill=GOLD,
            font=num_font,
            anchor="mm"
        )

        lines = wrap_text(step_text, step_font, max_w, draw)
        for line in lines:
            draw.text(
                (text_x, current_y + 4),
                line,
                fill=WHITE_DIM,
                font=step_font
            )
            current_y += line_h
        current_y += 12

    # === TEXTO DO ÔNIBUS ===
    current_y += 5
    draw.line([(80, current_y), (WIDTH - 80, current_y)], fill=(*BUS_COLOR, 40), width=1)
    current_y += 12

    bus_font = ImageFont.truetype(FONT_ITALIC, 18)
    bus_max_w = WIDTH - 80
    bus_lines = wrap_text(BUS, bus_font, bus_max_w, draw)
    for line in bus_lines:
        draw.text(
            (50, current_y),
            line,
            fill=BUS_COLOR,
            font=bus_font
        )
        current_y += 25

    # === CTA ===
    current_y += 20
    cta_font = ImageFont.truetype(FONT_BOLD, 24)
    cta_bbox = draw.textbbox((0, 0), CTA, font=cta_font)
    cta_text_w = cta_bbox[2] - cta_bbox[0]
    cta_text_h = cta_bbox[3] - cta_bbox[1]
    cta_w = cta_text_w + 100
    cta_h = cta_text_h + 36
    cta_x = (WIDTH - cta_w) // 2

    draw.rounded_rectangle(
        [cta_x, current_y, cta_x + cta_w, current_y + cta_h],
        radius=10,
        outline=GOLD,
        width=2
    )
    text_left = cta_x + cta_w // 2 - cta_text_w // 2
    text_top = current_y + cta_h // 2 - cta_text_h // 2 + 2
    draw.text(
        (text_left, text_top),
        CTA,
        fill=GOLD,
        font=cta_font
    )

    # === "AQUI É POSSÍVEL" ===
    current_y += cta_h + 25
    draw.line([(160, current_y), (WIDTH - 160, current_y)], fill=(*GOLD_DIM, 60), width=1)
    current_y += 15
    final_font = ImageFont.truetype(FONT_BOLD, 14)
    draw.text(
        (WIDTH // 2, current_y),
        "AQUI É POSSÍVEL",
        fill=(*GOLD_DIM, 130),
        font=final_font,
        anchor="mt"
    )

    # Salvar
    out_path = "/home/ubuntu/no-limet-9max/card-onboarding-artistico.png"
    final.save(out_path, "PNG", quality=95)
    print(f"Card artístico salvo: {out_path} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    create_card()
