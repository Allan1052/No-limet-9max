"""
Série de 3 cards com a mesma temática visual, frases diferentes sobre sonhos de recreativos.
Todos destacam 'Plante aqui a primeira semente' como CTA principal.
Layout: 3:4 (1080x1440) - formato Instagram feed.
"""

from PIL import Image, ImageDraw, ImageFont

WIDTH = 1080
HEIGHT = 1440  # 3:4
BG_COLOR = (8, 11, 8)

logo_monogram_path = "/home/ubuntu/upload/4965452e-71bd-408e-b0b1-0d2b3f990259.jpg"

FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf"
FONT_ITALIC = "/usr/share/fonts/truetype/noto/NotoSerif-Italic.ttf"
FONT_SEMIBOLD = "/usr/share/fonts/truetype/noto/NotoSerif-SemiBold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf"

BRAND_TEXT = "CALL OU FOLD"
BRAND_SLOGAN = "AQUI É POSSÍVEL"

# As 3 imagens da série
IMAGES = [
    "/home/ubuntu/no-limet-9max/serie-card1-semente.png",
    "/home/ubuntu/no-limet-9max/serie-card2-equipe.png",
    "/home/ubuntu/no-limet-9max/serie-card3-mesafinal.png",
]

# Frases diferentes para cada card da série
CARDS = [
    {
        "phrase": "Todo recreativo já sentou\nna mesa e pensou:\n\"E se hoje fosse o dia?\"",
        "sub": "Ninguém nasce profissional.\nTodo mundo planta a primeira semente.",
        "tagline": "Plante aqui a primeira semente"
    },
    {
        "phrase": "Todo recreativo já sonhou\nem entrar pra um time\nque joga no mais alto nível.",
        "sub": "O primeiro passo é sentar\nno lugar certo pra aprender.",
        "tagline": "Plante aqui a primeira semente"
    },
    {
        "phrase": "Todo recreativo já imaginou\no momento em que faz\no move perfeito no Sunday Million.",
        "sub": "A mesa final começa com\numa única decisão certa.",
        "tagline": "Plante aqui a primeira semente"
    },
]


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


def create_card(img_path, card_data, output_path):
    # === IMAGEM PRINCIPAL ===
    art = Image.open(img_path).convert("RGB")
    ratio = WIDTH / art.width
    art_h = int(art.height * ratio)
    art = art.resize((WIDTH, art_h), Image.LANCZOS)

    # Limitar a imagem a ~70% da altura do card
    max_img_h = int(HEIGHT * 0.70)
    if art_h > max_img_h:
        art = art.crop((0, 0, WIDTH, max_img_h))
        art_h = max_img_h

    # Fade out na parte inferior da imagem
    fade_h = 100
    fade_data = art.load()
    for y in range(art.height - fade_h, art.height):
        fade_factor = (y - (art.height - fade_h)) / fade_h
        for x in range(art.width):
            r, g, b = fade_data[x, y]
            r = int(r * (1 - fade_factor) + BG_COLOR[0] * fade_factor)
            g = int(g * (1 - fade_factor) + BG_COLOR[1] * fade_factor)
            b = int(b * (1 - fade_factor) + BG_COLOR[2] * fade_factor)
            fade_data[x, y] = (r, g, b)

    # === CARD FINAL ===
    final = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)

    # Logo space no topo
    logo_space = 170
    final.paste(art, (0, logo_space))

    # === LOGO ===
    logo = Image.open(logo_monogram_path).convert("RGB")
    logo_size = 85
    logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
    mask = Image.new("L", (logo_size, logo_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([2, 2, logo_size - 3, logo_size - 3], fill=255)

    circle_y_center = 85
    draw = ImageDraw.Draw(final)
    draw.ellipse(
        [(WIDTH // 2 - 48, circle_y_center - 48),
         (WIDTH // 2 + 48, circle_y_center + 48)],
        fill=(30, 38, 25)
    )
    draw.ellipse(
        [(WIDTH // 2 - 48, circle_y_center - 48),
         (WIDTH // 2 + 48, circle_y_center + 48)],
        outline=(212, 175, 55),
        width=3
    )
    final.paste(logo_resized, (WIDTH // 2 - logo_size // 2, circle_y_center - logo_size // 2), mask)

    # === NOME DA MARCA ===
    draw = ImageDraw.Draw(final)
    brand_font = ImageFont.truetype(FONT_BOLD, 22)
    brand_y = circle_y_center + 58
    draw.text(
        (WIDTH // 2, brand_y),
        BRAND_TEXT,
        fill=(212, 175, 55),
        font=brand_font,
        anchor="mt"
    )
    slogan_font = ImageFont.truetype(FONT_BOLD, 12)
    draw.text(
        (WIDTH // 2, brand_y + 28),
        BRAND_SLOGAN,
        fill=(212, 175, 55),
        font=slogan_font,
        anchor="mt"
    )

    # === FRASE IMPACTANTE ===
    text_area_y = logo_space + art.height - 55

    # Linha separadora dourada
    draw.line(
        [(60, text_area_y), (WIDTH - 60, text_area_y)],
        fill=(212, 175, 55, 140),
        width=1
    )
    text_area_y += 25

    # Frase principal
    main_font = ImageFont.truetype(FONT_BOLD, 34)
    main_lines = wrap_text(card_data["phrase"], main_font, WIDTH - 100, draw)
    line_h = 46
    for line in main_lines:
        draw.text(
            (WIDTH // 2, text_area_y),
            line,
            fill=(230, 196, 84),
            font=main_font,
            anchor="mt"
        )
        text_area_y += line_h

    # Sub-frase
    text_area_y += 8
    sub_font = ImageFont.truetype(FONT_ITALIC, 18)
    sub_lines = wrap_text(card_data["sub"], sub_font, WIDTH - 100, draw)
    for line in sub_lines:
        draw.text(
            (WIDTH // 2, text_area_y),
            line,
            fill=(180, 180, 160),
            font=sub_font,
            anchor="mt"
        )
        text_area_y += 26

    # === CTA "PLANTE AQUI A PRIMEIRA SEMENTE" EM DESTAQUE ===
    text_area_y += 15
    # Caixa dourada com borda
    cta_font = ImageFont.truetype(FONT_BOLD, 16)
    cta_bbox = draw.textbbox((0, 0), card_data["tagline"], font=cta_font)
    cta_text_w = cta_bbox[2] - cta_bbox[0]
    cta_text_h = cta_bbox[3] - cta_bbox[1]
    cta_padding_x = 40
    cta_padding_y = 14
    cta_w = cta_text_w + cta_padding_x * 2
    cta_h = cta_text_h + cta_padding_y * 2
    cta_x = (WIDTH - cta_w) // 2

    # Fundo da caixa com leve transparência
    cta_box = Image.new("RGBA", (cta_w, cta_h), (30, 38, 25, 200))
    cta_box_draw = ImageDraw.Draw(cta_box)
    cta_box_draw.rounded_rectangle(
        [0, 0, cta_w, cta_h],
        radius=8,
        fill=(30, 38, 25, 200),
        outline=(212, 175, 55, 220),
        width=2
    )
    final.paste(cta_box, (cta_x, text_area_y), cta_box)

    # Texto do CTA
    text_left = cta_x + cta_w // 2 - cta_text_w // 2
    text_top = text_area_y + cta_h // 2 - cta_text_h // 2 + 2
    draw = ImageDraw.Draw(final)
    draw.text(
        (text_left, text_top),
        card_data["tagline"],
        fill=(230, 196, 84),
        font=cta_font
    )

    # === RODAPÉ ===
    footer_y = HEIGHT - 45
    footer_font = ImageFont.truetype(FONT_BOLD, 12)
    draw.text(
        (WIDTH // 2, footer_y),
        "AQUI É POSSÍVEL",
        fill=(212, 175, 55, 100),
        font=footer_font,
        anchor="mt"
    )

    # Salvar
    final.save(output_path, "PNG", quality=95)
    print(f"Card salvo: {output_path} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    outputs = [
        "/home/ubuntu/no-limet-9max/serie-final-card1.png",
        "/home/ubuntu/no-limet-9max/serie-final-card2.png",
        "/home/ubuntu/no-limet-9max/serie-final-card3.png",
    ]
    for i, (img, data) in enumerate(zip(IMAGES, CARDS)):
        create_card(img, data, outputs[i])
    print(f"\nSérie completa: 3 cards gerados!")
