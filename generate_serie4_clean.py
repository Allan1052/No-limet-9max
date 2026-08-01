"""
Série 4 — 3 cards novos + capa do carrossel.
Formato carrossel Instagram: cada card como imagem separada 3:4 (1080x1440).
Abordagem limpa: imagem na metade superior com fade no topo, logo por cima, textos abaixo.
"""

from PIL import Image, ImageDraw, ImageFont

WIDTH = 1080
HEIGHT = 1440  # 3:4 carrossel Instagram
BG_COLOR = (8, 11, 8)

logo_monogram_path = "/home/ubuntu/upload/4965452e-71bd-408e-b0b1-0d2b3f990259.jpg"

FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf"
FONT_ITALIC = "/usr/share/fonts/truetype/noto/NotoSerif-Italic.ttf"

BRAND_TEXT = "CALL OU FOLD"
BRAND_SLOGAN = "AQUI É POSSÍVEL"

CARDS = [
    {
        "image": "/home/ubuntu/no-limet-9max/serie4-card4-torneio-vivo.png",
        "phrase": "Todo recreativo já parou\ndo lado de fora e ficou\nolhando o torneio de dentro.",
        "sub": "Um dia esse bilhete vira\no passaporte pra dentro.",
    },
    {
        "image": "/home/ubuntu/no-limet-9max/raw-card5-patrocinio.png",
        "phrase": "Todo recreativo já olhou pra\num pro patrocinado e pensou:\n\"Por que não eu?\"",
        "sub": "Todo patrocinado um dia\nfoi recreativo que não desistiu.",
    },
    {
        "image": "/home/ubuntu/no-limet-9max/raw-card6-degrau.png",
        "phrase": "Todo recreativo sabe que o\ncaminho até lá tem degraus.\nO importante é não parar de subir.",
        "sub": "Degrau por degrau. Mão por mão.\nA jornada é sua.",
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


def draw_brand_header(final, draw):
    """Logo monograma + marca no topo do card."""
    logo = Image.open(logo_monogram_path).convert("RGB")
    logo_size = 80
    logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
    mask = Image.new("L", (logo_size, logo_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([2, 2, logo_size - 3, logo_size - 3], fill=255)

    cy = 75
    draw.ellipse(
        [(WIDTH // 2 - 45, cy - 45), (WIDTH // 2 + 45, cy + 45)],
        fill=(30, 38, 25),
        outline=(212, 175, 55),
        width=3
    )
    final.paste(logo_resized, (WIDTH // 2 - logo_size // 2, cy - logo_size // 2), mask)

    draw = ImageDraw.Draw(final)
    brand_font = ImageFont.truetype(FONT_BOLD, 20)
    draw.text((WIDTH // 2, cy + 52), BRAND_TEXT, fill=(212, 175, 55), font=brand_font, anchor="mt")
    slogan_font = ImageFont.truetype(FONT_BOLD, 11)
    draw.text((WIDTH // 2, cy + 78), BRAND_SLOGAN, fill=(212, 175, 55), font=slogan_font, anchor="mt")


def create_card(img_path, card_data, output_path):
    # === 1. Carregar e redimensionar imagem ===
    art = Image.open(img_path).convert("RGB")
    # Crop do topo se necessário (remover logos da IA)
    crop_top = card_data.get("crop_top_px", 0)
    if crop_top > 0:
        art = art.crop((0, crop_top, art.width, art.height))
    ratio = WIDTH / art.width
    art_h = int(art.height * ratio)
    art = art.resize((WIDTH, art_h), Image.LANCZOS)

    # Limitar altura
    max_img_h = 650
    if art_h > max_img_h:
        art = art.crop((0, 0, WIDTH, max_img_h))
        art_h = max_img_h

    # === 2. Aplicar fade no topo e fundo ===
    fade_data = art.load()
    fade_top_px = 120  # pixels para fade in no topo
    fade_bottom_px = 80
    for y in range(art.height):
        for x in range(art.width):
            r, g, b = fade_data[x, y]
            if y < fade_top_px:
                factor = 1.0 - (y / fade_top_px)
                r = int(r * (1 - factor) + BG_COLOR[0] * factor)
                g = int(g * (1 - factor) + BG_COLOR[1] * factor)
                b = int(b * (1 - factor) + BG_COLOR[2] * factor)
            elif y > art.height - fade_bottom_px:
                factor = (y - (art.height - fade_bottom_px)) / fade_bottom_px
                r = int(r * (1 - factor) + BG_COLOR[0] * factor)
                g = int(g * (1 - factor) + BG_COLOR[1] * factor)
                b = int(b * (1 - factor) + BG_COLOR[2] * factor)
            fade_data[x, y] = (r, g, b)

    # === 3. Criar card ===
    final = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)

    # Posição da imagem: logo_space (170px) para header, depois a imagem
    header_h = 170
    final.paste(art, (0, header_h))

    # Overlay escuro no topo da imagem (para cobrir logo da IA)
    overlay = Image.new("RGBA", (WIDTH, fade_top_px + 10), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(overlay.height):
        alpha = int(200 * (y / overlay.height))
        od.line([(0, y), (WIDTH, y)], fill=(0, 0, 0, alpha))
    final.paste(overlay, (0, header_h), overlay)

    # === 4. Header (logo + marca) ===
    draw = ImageDraw.Draw(final)
    draw_brand_header(final, draw)

    # === 5. Textos ===
    text_start_y = header_h + art.height + 15
    draw = ImageDraw.Draw(final)

    # Linha separadora
    draw.line([(60, text_start_y), (WIDTH - 60, text_start_y)], fill=(212, 175, 55, 120), width=1)
    text_start_y += 20

    # Frase principal
    main_font = ImageFont.truetype(FONT_BOLD, 32)
    main_lines = wrap_text(card_data["phrase"], main_font, WIDTH - 120, draw)
    for line in main_lines:
        draw.text((WIDTH // 2, text_start_y), line, fill=(230, 196, 84), font=main_font, anchor="mt")
        text_start_y += 44

    text_start_y += 6

    # Sub-frase
    sub_font = ImageFont.truetype(FONT_ITALIC, 17)
    sub_lines = wrap_text(card_data["sub"], sub_font, WIDTH - 120, draw)
    for line in sub_lines:
        draw.text((WIDTH // 2, text_start_y), line, fill=(180, 180, 160), font=sub_font, anchor="mt")
        text_start_y += 25

    # === 6. CTA ===
    text_start_y += 15
    cta_text = "Plante aqui a primeira semente"
    cta_font = ImageFont.truetype(FONT_BOLD, 16)
    cta_bbox = draw.textbbox((0, 0), cta_text, font=cta_font)
    cta_tw = cta_bbox[2] - cta_bbox[0]
    cta_th = cta_bbox[3] - cta_bbox[1]
    pad_x, pad_y = 38, 13
    cta_w = cta_tw + pad_x * 2
    cta_h = cta_th + pad_y * 2
    cta_x = (WIDTH - cta_w) // 2

    cta_bg = Image.new("RGBA", (cta_w, cta_h), (0, 0, 0, 0))
    cta_draw = ImageDraw.Draw(cta_bg)
    cta_draw.rounded_rectangle(
        [0, 0, cta_w, cta_h], radius=8,
        fill=(30, 38, 25, 180),
        outline=(212, 175, 55, 200),
        width=2
    )
    final.paste(cta_bg, (cta_x, text_start_y), cta_bg)

    draw = ImageDraw.Draw(final)
    draw.text(
        (WIDTH // 2, text_start_y + pad_y),
        cta_text, fill=(230, 196, 84), font=cta_font, anchor="mt"
    )

    # === 7. Rodapé ===
    draw.text(
        (WIDTH // 2, HEIGHT - 40),
        "AQUI É POSSÍVEL",
        fill=(212, 175, 55, 80),
        font=ImageFont.truetype(FONT_BOLD, 12),
        anchor="mt"
    )

    final.save(output_path, "PNG", quality=95)
    print(f"Card salvo: {output_path}")


def create_carrossel_cover(output_path):
    final = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(final)

    # Logo grande
    logo = Image.open(logo_monogram_path).convert("RGB")
    logo_size = 150
    logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
    mask = Image.new("L", (logo_size, logo_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([2, 2, logo_size - 3, logo_size - 3], fill=255)

    cy = 350
    draw.ellipse(
        [(WIDTH // 2 - 85, cy - 85), (WIDTH // 2 + 85, cy + 85)],
        fill=(30, 38, 25),
        outline=(212, 175, 55),
        width=4
    )
    final.paste(logo_resized, (WIDTH // 2 - logo_size // 2, cy - logo_size // 2), mask)

    draw = ImageDraw.Draw(final)
    brand_font = ImageFont.truetype(FONT_BOLD, 30)
    draw.text((WIDTH // 2, cy + 100), BRAND_TEXT, fill=(212, 175, 55), font=brand_font, anchor="mt")
    slogan_font = ImageFont.truetype(FONT_BOLD, 15)
    draw.text((WIDTH // 2, cy + 138), BRAND_SLOGAN, fill=(212, 175, 55), font=slogan_font, anchor="mt")

    # Linha
    draw.line([(150, cy + 180), (WIDTH - 150, cy + 180)], fill=(212, 175, 55, 140), width=1)

    # Título série
    series_font = ImageFont.truetype(FONT_BOLD, 40)
    draw.text((WIDTH // 2, cy + 210), "SONHOS DO", fill=(230, 196, 84), font=series_font, anchor="mt")
    draw.text((WIDTH // 2, cy + 255), "RECREATIVO", fill=(230, 196, 84), font=series_font, anchor="mt")

    # Subtítulo
    sub_font = ImageFont.truetype(FONT_ITALIC, 20)
    for i, line in enumerate(["6 cards que todo jogador", "recreativo precisa ver."]):
        draw.text((WIDTH // 2, cy + 310 + i * 28), line, fill=(180, 180, 160), font=sub_font, anchor="mt")

    # CTA
    cta_y = cy + 390
    cta_text = "Plante aqui a primeira semente"
    cta_font = ImageFont.truetype(FONT_BOLD, 17)
    cta_bbox = draw.textbbox((0, 0), cta_text, font=cta_font)
    cta_tw = cta_bbox[2] - cta_bbox[0]
    cta_th = cta_bbox[3] - cta_bbox[1]
    pad_x, pad_y = 40, 14
    cta_w = cta_tw + pad_x * 2
    cta_h = cta_th + pad_y * 2
    cta_x = (WIDTH - cta_w) // 2

    cta_bg = Image.new("RGBA", (cta_w, cta_h), (0, 0, 0, 0))
    cta_draw = ImageDraw.Draw(cta_bg)
    cta_draw.rounded_rectangle(
        [0, 0, cta_w, cta_h], radius=8,
        fill=(30, 38, 25, 180),
        outline=(212, 175, 55, 200),
        width=2
    )
    final.paste(cta_bg, (cta_x, cta_y), cta_bg)

    draw = ImageDraw.Draw(final)
    draw.text(
        (WIDTH // 2, cta_y + pad_y),
        cta_text, fill=(230, 196, 84), font=cta_font, anchor="mt"
    )

    # Rodapé
    draw.text(
        (WIDTH // 2, HEIGHT - 50),
        "AQUI É POSSÍVEL",
        fill=(212, 175, 55, 80),
        font=ImageFont.truetype(FONT_BOLD, 13),
        anchor="mt"
    )

    final.save(output_path, "PNG", quality=95)
    print(f"Capa do carrossel salva: {output_path}")


if __name__ == "__main__":
    outputs = [
        "/home/ubuntu/no-limet-9max/serie4-card4-torneio.png",
        "/home/ubuntu/no-limet-9max/serie4-card5-patrocinio.png",
        "/home/ubuntu/no-limet-9max/serie4-card6-degrau.png",
    ]
    for i in range(len(CARDS)):
        create_card(CARDS[i]["image"], CARDS[i], outputs[i])

    create_carrossel_cover("/home/ubuntu/no-limet-9max/serie4-carrossel-capa.png")
    print(f"\nSérie 4 completa: 3 cards + capa do carrossel gerados!")
