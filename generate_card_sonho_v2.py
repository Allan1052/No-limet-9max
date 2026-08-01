"""
Versão alternativa do card com a imagem da janela embaçada.
Mesmo layout, imagem diferente, mais emotiva e misteriosa.
"""

from PIL import Image, ImageDraw, ImageFont

WIDTH = 1080
HEIGHT = 1440
BG_COLOR = (8, 11, 8)

logo_monogram_path = "/home/ubuntu/upload/4965452e-71bd-408e-b0b1-0d2b3f990259.jpg"

FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf"
FONT_ITALIC = "/usr/share/fonts/truetype/noto/NotoSerif-Italic.ttf"
FONT_SEMIBOLD = "/usr/share/fonts/truetype/noto/NotoSerif-SemiBold.ttf"

MAIN_PHRASE = "Que todo recreativo sonhou\nem ter um bracelete."
SUB_PHRASE = "O caminho começa aqui. Degrau por degrau."
BRAND_TEXT = "CALL OU FOLD"
BRAND_SLOGAN = "AQUI É POSSÍVEL"

img_path = "/home/ubuntu/no-limet-9max/card-recreativo-onibus-window.png"


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
    # === IMAGEM PRINCIPAL ===
    art = Image.open(img_path).convert("RGB")
    ratio = WIDTH / art.width
    art_h = int(art.height * ratio)
    art = art.resize((WIDTH, art_h), Image.LANCZOS)

    max_img_h = int(HEIGHT * 0.72)
    if art_h > max_img_h:
        # Pegar a parte de cima (janela + cabeça)
        art = art.crop((0, 0, WIDTH, max_img_h))
        art_h = max_img_h

    # Fade out na parte inferior
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

    logo_space = 180
    final.paste(art, (0, logo_space))

    # === LOGO ===
    logo = Image.open(logo_monogram_path).convert("RGB")
    logo_size = 90
    logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
    mask = Image.new("L", (logo_size, logo_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([2, 2, logo_size - 3, logo_size - 3], fill=255)

    circle_y_center = 90
    draw = ImageDraw.Draw(final)
    draw.ellipse(
        [(WIDTH // 2 - 50, circle_y_center - 50),
         (WIDTH // 2 + 50, circle_y_center + 50)],
        fill=(30, 38, 25)
    )
    draw.ellipse(
        [(WIDTH // 2 - 50, circle_y_center - 50),
         (WIDTH // 2 + 50, circle_y_center + 50)],
        outline=(212, 175, 55),
        width=3
    )
    final.paste(logo_resized, (WIDTH // 2 - logo_size // 2, circle_y_center - logo_size // 2), mask)

    # === NOME DA MARCA ===
    draw = ImageDraw.Draw(final)
    brand_font = ImageFont.truetype(FONT_BOLD, 24)
    brand_y = circle_y_center + 62
    draw.text((WIDTH // 2, brand_y), BRAND_TEXT, fill=(212, 175, 55), font=brand_font, anchor="mt")

    slogan_font = ImageFont.truetype(FONT_BOLD, 14)
    draw.text((WIDTH // 2, brand_y + 32), BRAND_SLOGAN, fill=(212, 175, 55), font=slogan_font, anchor="mt")

    # === FRASE IMPACTANTE ===
    text_area_y = logo_space + art.height - 60

    draw.line([(80, text_area_y), (WIDTH - 80, text_area_y)], fill=(212, 175, 55, 120), width=1)
    text_area_y += 30

    main_font = ImageFont.truetype(FONT_BOLD, 38)
    main_lines = wrap_text(MAIN_PHRASE, main_font, WIDTH - 120, draw)
    line_h = 50
    for line in main_lines:
        draw.text((WIDTH // 2, text_area_y), line, fill=(230, 196, 84), font=main_font, anchor="mt")
        text_area_y += line_h

    text_area_y += 10
    sub_font = ImageFont.truetype(FONT_ITALIC, 20)
    draw.text((WIDTH // 2, text_area_y), SUB_PHRASE, fill=(180, 180, 160), font=sub_font, anchor="mt")

    # === RODAPÉ ===
    footer_y = HEIGHT - 50
    footer_font = ImageFont.truetype(FONT_BOLD, 13)
    draw.text((WIDTH // 2, footer_y), "AQUI É POSSÍVEL", fill=(212, 175, 55, 100), font=footer_font, anchor="mt")

    out_path = "/home/ubuntu/no-limet-9max/card-sonho-janela.png"
    final.save(out_path, "PNG", quality=95)
    print(f"Card salvo: {out_path} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    create_card()
