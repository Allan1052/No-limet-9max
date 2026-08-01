"""
Versão Stories (9:16) do card impactante split-screen.
Layout: imagem ocupa ~65% vertical, logo no topo, frase embaixo.
"""

from PIL import Image, ImageDraw, ImageFont

WIDTH = 1080
HEIGHT = 1920  # 9:16 Stories
BG_COLOR = (8, 11, 8)

logo_monogram_path = "/home/ubuntu/upload/4965452e-71bd-408e-b0b1-0d2b3f990259.jpg"

FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf"
FONT_ITALIC = "/usr/share/fonts/truetype/noto/NotoSerif-Italic.ttf"
FONT_SEMIBOLD = "/usr/share/fonts/truetype/noto/NotoSerif-SemiBold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf"

MAIN_PHRASE = "Qual recreativo nunca sonhou\nem conquistar um bracelete."
SUB_PHRASE = "Que atire a primeira pedra."
BRAND_TEXT = "CALL OU FOLD"
BRAND_SLOGAN = "AQUI É POSSÍVEL"

img_path = "/home/ubuntu/no-limet-9max/card-impatante-v1.png"


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


def create_stories_card():
    # === IMAGEM PRINCIPAL ===
    art = Image.open(img_path).convert("RGB")
    ratio = WIDTH / art.width
    art_h = int(art.height * ratio)
    art = art.resize((WIDTH, art_h), Image.LANCZOS)

    # Para Stories, usar mais imagem (~65%)
    max_img_h = int(HEIGHT * 0.65)
    if art_h > max_img_h:
        # Manter o split-screen completo
        art = art.crop((0, 0, WIDTH, max_img_h))
        art_h = max_img_h

    # Fade out na parte inferior
    fade_h = 120
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
    logo_space = 220
    final.paste(art, (0, logo_space))

    # === LOGO ===
    logo = Image.open(logo_monogram_path).convert("RGB")
    logo_size = 100
    logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
    mask = Image.new("L", (logo_size, logo_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([2, 2, logo_size - 3, logo_size - 3], fill=255)

    circle_y_center = 110
    draw = ImageDraw.Draw(final)
    draw.ellipse(
        [(WIDTH // 2 - 55, circle_y_center - 55),
         (WIDTH // 2 + 55, circle_y_center + 55)],
        fill=(30, 38, 25)
    )
    draw.ellipse(
        [(WIDTH // 2 - 55, circle_y_center - 55),
         (WIDTH // 2 + 55, circle_y_center + 55)],
        outline=(212, 175, 55),
        width=3
    )
    final.paste(logo_resized, (WIDTH // 2 - logo_size // 2, circle_y_center - logo_size // 2), mask)

    # === NOME DA MARCA ===
    draw = ImageDraw.Draw(final)
    brand_font = ImageFont.truetype(FONT_BOLD, 22)
    brand_y = circle_y_center + 68
    draw.text(
        (WIDTH // 2, brand_y),
        BRAND_TEXT,
        fill=(212, 175, 55),
        font=brand_font,
        anchor="mt"
    )
    slogan_font = ImageFont.truetype(FONT_BOLD, 13)
    draw.text(
        (WIDTH // 2, brand_y + 30),
        BRAND_SLOGAN,
        fill=(212, 175, 55),
        font=slogan_font,
        anchor="mt"
    )

    # === FRASE IMPACTANTE ===
    text_area_y = logo_space + art.height - 40

    # Linha separadora dourada
    draw.line(
        [(60, text_area_y), (WIDTH - 60, text_area_y)],
        fill=(212, 175, 55, 140),
        width=1
    )
    text_area_y += 35

    # Frase principal
    main_font = ImageFont.truetype(FONT_BOLD, 42)
    main_lines = wrap_text(MAIN_PHRASE, main_font, WIDTH - 120, draw)
    line_h = 55
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
    text_area_y += 15
    sub_font = ImageFont.truetype(FONT_ITALIC, 26)
    draw.text(
        (WIDTH // 2, text_area_y),
        SUB_PHRASE,
        fill=(180, 180, 160),
        font=sub_font,
        anchor="mt"
    )

    # CTA - "Plante aqui a primeira semente"
    text_area_y += 60
    draw.line(
        [(100, text_area_y), (WIDTH - 100, text_area_y)],
        fill=(212, 175, 55, 100),
        width=1
    )
    text_area_y += 25
    cta_font = ImageFont.truetype(FONT_BOLD, 18)
    draw.text(
        (WIDTH // 2, text_area_y),
        "Plante aqui a primeira semente",
        fill=(212, 175, 55, 180),
        font=cta_font,
        anchor="mt"
    )

    # === RODAPÉ ===
    footer_y = HEIGHT - 80
    footer_font = ImageFont.truetype(FONT_BOLD, 13)
    draw.text(
        (WIDTH // 2, footer_y),
        "AQUI É POSSÍVEL",
        fill=(212, 175, 55, 100),
        font=footer_font,
        anchor="mt"
    )

    # Salvar
    out_path = "/home/ubuntu/no-limet-9max/card-stories-impactante.png"
    final.save(out_path, "PNG", quality=95)
    print(f"Card Stories salvo: {out_path} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    create_stories_card()
