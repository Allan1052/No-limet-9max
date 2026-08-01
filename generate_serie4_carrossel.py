"""
Série 4 — 3 cards novos + capa do carrossel.
Formato carrossel Instagram: cada card como imagem separada 3:4 (1080x1440).
Frases focadas em novos sonhos: torneio ao vivo, patrocínio, degrau por degrau.
Todos destacam 'Plante aqui a primeira semente'.
"""

from PIL import Image, ImageDraw, ImageFont

WIDTH = 1080
HEIGHT = 1440  # 3:4 carrossel Instagram
BG_COLOR = (8, 11, 8)

logo_monogram_path = "/home/ubuntu/upload/4965452e-71bd-408e-b0b1-0d2b3f990259.jpg"

FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf"
FONT_ITALIC = "/usr/share/fonts/truetype/noto/NotoSerif-Italic.ttf"
FONT_SEMIBOLD = "/usr/share/fonts/truetype/noto/NotoSerif-SemiBold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf"

BRAND_TEXT = "CALL OU FOLD"
BRAND_SLOGAN = "AQUI É POSSÍVEL"

# Imagens e frases
CARDS = [
    {
        "image": "/home/ubuntu/no-limet-9max/serie4-card4-torneio-vivo.png",
        "phrase": "Todo recreativo já parou\ndo lado de fora e ficou\nolhando o torneio de dentro.",
        "sub": "Um dia esse bilhete vira\no passaporte pra dentro.",
        "tagline": "Plante aqui a primeira semente",
        "fade_top": 0.20
    },
    {
        "image": "/home/ubuntu/no-limet-9max/serie4-card5-patrocinio.png",
        "phrase": "Todo recreativo já olhou pra\num pro patrocinado e pensou:\n\"Por que não eu?\"",
        "sub": "Todo patrocinado um dia\nfoi recreativo que não desistiu.",
        "tagline": "Plante aqui a primeira semente",
        "fade_top": 0.20,
        "crop_top": 0
    },
    {
        "image": "/home/ubuntu/no-limet-9max/serie4-card6-degrau.png",
        "phrase": "Todo recreativo sabe que o\ncaminho até lá tem degraus.\nO importante é não parar de subir.",
        "sub": "Degrau por degrau. Mão por mão.\nA jornada é sua.",
        "tagline": "Plante aqui a primeira semente",
        "fade_top": 0.28
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


def draw_logo(final, draw):
    """Desenha logo monograma + nome da marca no topo."""
    logo = Image.open(logo_monogram_path).convert("RGB")
    logo_size = 85
    logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
    mask = Image.new("L", (logo_size, logo_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([2, 2, logo_size - 3, logo_size - 3], fill=255)

    circle_y_center = 85
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

    draw = ImageDraw.Draw(final)
    brand_font = ImageFont.truetype(FONT_BOLD, 22)
    brand_y = circle_y_center + 58
    draw.text((WIDTH // 2, brand_y), BRAND_TEXT, fill=(212, 175, 55), font=brand_font, anchor="mt")
    slogan_font = ImageFont.truetype(FONT_BOLD, 12)
    draw.text((WIDTH // 2, brand_y + 28), BRAND_SLOGAN, fill=(212, 175, 55), font=slogan_font, anchor="mt")


def create_card(img_path, card_data, output_path):
    # === IMAGEM PRINCIPAL ===
    art = Image.open(img_path).convert("RGB")

    # Crop agressivo do topo se necessário (para remover logos da IA)
    crop_top_pct = card_data.get("crop_top", 0)
    if crop_top_pct > 0:
        crop_top = int(art.height * crop_top_pct)
        art = art.crop((0, crop_top, art.width, art.height))

    ratio = WIDTH / art.width
    art_h = int(art.height * ratio)
    art = art.resize((WIDTH, art_h), Image.LANCZOS)

    # Limitar altura da imagem
    max_img_h = int(HEIGHT * 0.70)
    if art_h > max_img_h:
        art = art.crop((0, 0, WIDTH, max_img_h))
        art_h = max_img_h

    # Fade in no topo (cobrir logo da IA) e fade out no fundo
    fade_data = art.load()
    fade_top = int(art.height * card_data.get("fade_top", 0.28))
    fade_h_bottom = 100
    for y in range(art.height):
        for x in range(art.width):
            r, g, b = fade_data[x, y]
            if y < fade_top:
                # Fade in: mais escuro no topo
                fade_factor = 1.0 - (y / fade_top)
                r = int(r * (1 - fade_factor) + BG_COLOR[0] * fade_factor)
                g = int(g * (1 - fade_factor) + BG_COLOR[1] * fade_factor)
                b = int(b * (1 - fade_factor) + BG_COLOR[2] * fade_factor)
            elif y > art.height - fade_h_bottom:
                # Fade out no fundo
                fade_factor = (y - (art.height - fade_h_bottom)) / fade_h_bottom
                r = int(r * (1 - fade_factor) + BG_COLOR[0] * fade_factor)
                g = int(g * (1 - fade_factor) + BG_COLOR[1] * fade_factor)
                b = int(b * (1 - fade_factor) + BG_COLOR[2] * fade_factor)
            fade_data[x, y] = (r, g, b)

    # === CARD ===
    final = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    logo_space = 180
    final.paste(art, (0, logo_space))

    # Cobrir o topo da imagem com gradiente escuro para esconder logos da IA
    overlay = Image.new("RGBA", (WIDTH, logo_space + 10), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    # Gradiente de transparente para BG_COLOR
    for y in range(overlay.height):
        alpha = int(255 * (y / overlay.height))
        overlay_draw.rectangle([(0, y), (WIDTH, y)], fill=(0, 0, 0, alpha))
    final.paste(overlay, (0, 0), overlay)

    # Desenhar logo por cima
    draw = ImageDraw.Draw(final)
    draw_logo(final, draw)
    draw = ImageDraw.Draw(final)

    # === FRASE ===
    # Posicionar a linha separadora no final da imagem, mas com mínimo
    text_area_y = max(logo_space + art.height - 55, int(HEIGHT * 0.55))
    draw.line([(60, text_area_y), (WIDTH - 60, text_area_y)], fill=(212, 175, 55, 140), width=1)
    text_area_y += 25

    main_font = ImageFont.truetype(FONT_BOLD, 34)
    main_lines = wrap_text(card_data["phrase"], main_font, WIDTH - 100, draw)
    line_h = 46
    for line in main_lines:
        draw.text((WIDTH // 2, text_area_y), line, fill=(230, 196, 84), font=main_font, anchor="mt")
        text_area_y += line_h

    text_area_y += 8
    sub_font = ImageFont.truetype(FONT_ITALIC, 18)
    sub_lines = wrap_text(card_data["sub"], sub_font, WIDTH - 100, draw)
    for line in sub_lines:
        draw.text((WIDTH // 2, text_area_y), line, fill=(180, 180, 160), font=sub_font, anchor="mt")
        text_area_y += 26

    # === CTA ===
    text_area_y += 15
    cta_font = ImageFont.truetype(FONT_BOLD, 16)
    cta_bbox = draw.textbbox((0, 0), card_data["tagline"], font=cta_font)
    cta_text_w = cta_bbox[2] - cta_bbox[0]
    cta_text_h = cta_bbox[3] - cta_bbox[1]
    cta_padding_x = 40
    cta_padding_y = 14
    cta_w = cta_text_w + cta_padding_x * 2
    cta_h = cta_text_h + cta_padding_y * 2
    cta_x = (WIDTH - cta_w) // 2

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

    text_left = cta_x + cta_w // 2 - cta_text_w // 2
    text_top = text_area_y + cta_h // 2 - cta_text_h // 2 + 2
    draw = ImageDraw.Draw(final)
    draw.text((text_left, text_top), card_data["tagline"], fill=(230, 196, 84), font=cta_font)

    # === RODAPÉ ===
    footer_y = HEIGHT - 45
    footer_font = ImageFont.truetype(FONT_BOLD, 12)
    draw.text((WIDTH // 2, footer_y), "AQUI É POSSÍVEL", fill=(212, 175, 55, 100), font=footer_font, anchor="mt")

    final.save(output_path, "PNG", quality=95)
    print(f"Card salvo: {output_path} ({WIDTH}x{HEIGHT})")


def create_carrossel_cover(output_path):
    """Cria a capa do carrossel — slide de abertura com título da série."""
    final = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(final)

    # Fundo com gradiente sutil
    for y in range(HEIGHT):
        for x in range(0, WIDTH, 50):
            r = BG_COLOR[0] + int(5 * (1 - abs(y - HEIGHT // 2) / (HEIGHT // 2)))
            draw.rectangle([x, y, x + 50, y + 1], fill=(r, BG_COLOR[1], BG_COLOR[2]))

    # Logo grande no centro
    logo = Image.open(logo_monogram_path).convert("RGB")
    logo_size = 160
    logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
    mask = Image.new("L", (logo_size, logo_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([2, 2, logo_size - 3, logo_size - 3], fill=255)

    draw.ellipse(
        [(WIDTH // 2 - 90, 280), (WIDTH // 2 + 90, 460)],
        fill=(30, 38, 25),
        outline=(212, 175, 55),
        width=4
    )
    final.paste(logo_resized, (WIDTH // 2 - logo_size // 2, 290), mask)

    # Nome da marca
    draw = ImageDraw.Draw(final)
    brand_font = ImageFont.truetype(FONT_BOLD, 32)
    draw.text((WIDTH // 2, 480), BRAND_TEXT, fill=(212, 175, 55), font=brand_font, anchor="mt")
    slogan_font = ImageFont.truetype(FONT_BOLD, 16)
    draw.text((WIDTH // 2, 520), BRAND_SLOGAN, fill=(212, 175, 55), font=slogan_font, anchor="mt")

    # Linha decorativa
    draw.line([(150, 560), (WIDTH - 150, 560)], fill=(212, 175, 55, 160), width=1)

    # Título da série
    series_font = ImageFont.truetype(FONT_BOLD, 42)
    draw.text((WIDTH // 2, 600), "SONHOS DO", fill=(230, 196, 84), font=series_font, anchor="mt")
    draw.text((WIDTH // 2, 650), "RECREATIVO", fill=(230, 196, 84), font=series_font, anchor="mt")

    # Subtítulo
    subtitle_font = ImageFont.truetype(FONT_ITALIC, 22)
    subtitle_lines = ["6 cards que todo jogador", "recreativo precisa ver."]
    sub_y = 720
    for sub_line in subtitle_lines:
        draw.text((WIDTH // 2, sub_y), sub_line, fill=(180, 180, 160), font=subtitle_font, anchor="mt")
        sub_y += 30

    # CTA
    cta_y = 830
    cta_font = ImageFont.truetype(FONT_BOLD, 18)
    cta_text = "Plante aqui a primeira semente"
    cta_bbox = draw.textbbox((0, 0), cta_text, font=cta_font)
    cta_text_w = cta_bbox[2] - cta_bbox[0]
    cta_text_h = cta_bbox[3] - cta_bbox[1]
    cta_w = cta_text_w + 80
    cta_h = cta_text_h + 28
    cta_x = (WIDTH - cta_w) // 2

    cta_box = Image.new("RGBA", (cta_w, cta_h), (30, 38, 25, 200))
    cta_box_draw = ImageDraw.Draw(cta_box)
    cta_box_draw.rounded_rectangle(
        [0, 0, cta_w, cta_h],
        radius=8,
        fill=(30, 38, 25, 200),
        outline=(212, 175, 55, 220),
        width=2
    )
    final.paste(cta_box, (cta_x, cta_y), cta_box)

    text_left = cta_x + cta_w // 2 - cta_text_w // 2
    text_top = cta_y + cta_h // 2 - cta_text_h // 2 + 2
    draw = ImageDraw.Draw(final)
    draw.text((text_left, text_top), cta_text, fill=(230, 196, 84), font=cta_font)

    # Rodapé
    draw.text(
        (WIDTH // 2, HEIGHT - 60),
        "AQUI É POSSÍVEL",
        fill=(212, 175, 55, 100),
        font=ImageFont.truetype(FONT_BOLD, 13),
        anchor="mt"
    )

    final.save(output_path, "PNG", quality=95)
    print(f"Capa do carrossel salva: {output_path} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    outputs = [
        "/home/ubuntu/no-limet-9max/serie4-card4-torneio.png",
        "/home/ubuntu/no-limet-9max/serie4-card5-patrocinio.png",
        "/home/ubuntu/no-limet-9max/serie4-card6-degrau.png",
    ]
    for i in range(len(CARDS)):
        create_card(CARDS[i]["image"], CARDS[i], outputs[i])

    # Capa do carrossel
    create_carrossel_cover("/home/ubuntu/no-limet-9max/serie4-carrossel-capa.png")

    print(f"\nSérie 4 completa: 3 cards + capa do carrossel gerados!")
