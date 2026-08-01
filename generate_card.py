from PIL import Image, ImageDraw, ImageFont
import qrcode

# ── Dimensões do card (formato WhatsApp: 1080x1080) ──
W, H = 1080, 1080

# ── Cores da marca ──
BG_DARK = "#0d0f0d"
GOLD = "#d4af37"
GOLD_LIGHT = "#e8d06b"
GOLD_DARK = "#8a7020"
WHITE = "#e8e6dc"
GRAY = "#9a988c"

# ── Criar imagem com gradiente de fundo ──
card = Image.new("RGB", (W, H), BG_DARK)
draw = ImageDraw.Draw(card)

# Gradiente vertical sutil
for y in range(H):
    ratio = y / H
    r = int(13 + (8 * ratio))
    g = int(15 + (10 * ratio))
    b = int(13 + (8 * ratio))
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# ── Borda dourada dupla ──
border = 10
draw.rectangle([0, 0, W-1, H-1], outline=GOLD, width=border)
draw.rectangle([border+4, border+4, W-border-5, H-border-5], outline=GOLD_DARK, width=2)

# ── Carregar fontes ──
FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoSerifDisplay-Bold.ttf"
FONT_ITALIC = "/usr/share/fonts/truetype/noto/NotoSerif-Italic.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf"

try:
    font_title = ImageFont.truetype(FONT_BOLD, 80)        # "Call" e "Fold"
    font_ou = ImageFont.truetype(FONT_ITALIC, 44)         # "ou" itálico
    font_desc = ImageFont.truetype(FONT_REGULAR, 24)      # descrição
    font_tagline = ImageFont.truetype(FONT_BOLD, 30)      # frase impacto
    font_qr_label = ImageFont.truetype(FONT_REGULAR, 20)  # label QR
    font_footer_caps = ImageFont.truetype(FONT_BOLD, 28)  # "AQUI É POSSÍVEL" em caps
except:
    font_title = ImageFont.load_default()
    font_ou = font_title
    font_desc = font_title
    font_tagline = font_title
    font_qr_label = font_title
    font_footer_caps = font_title

# ══════════════════════════════════════════════════════════════
#  PADRÃO HORIZONTAL DA MARCA: [LOGO CF] | [Call ou Fold]
#                                        [AQUI É POSSÍVEL]
# ══════════════════════════════════════════════════════════════

# ── Layout horizontal da marca (logo + linha + texto) ──
mark_y = 100

# Logo CF (esquerda)
logo_path = "/home/ubuntu/no-limet-9max/public/brand-logo-splash.png"
logo = Image.open(logo_path).convert("RGBA")
logo_size = 160
logo = logo.resize((logo_size, logo_size), Image.LANCZOS)
logo_x = 140
logo_y = mark_y
card.paste(logo, (logo_x, logo_y), logo)

# Linha vertical dourada (separador)
line_sep_x = logo_x + logo_size + 50
line_sep_top = mark_y + 20
line_sep_bottom = mark_y + logo_size - 20
draw.line([(line_sep_x, line_sep_top), (line_sep_x, line_sep_bottom)], fill=GOLD_DARK, width=2)

# "Call" (serif bold dourado grande)
call_x = line_sep_x + 60
call_y = mark_y + 15
text_call = "Call"
w_call = draw.textlength(text_call, font=font_title)
draw.text((call_x, call_y), text_call, fill=GOLD, font=font_title)

# "ou" (itálico menor, claro)
text_ou = "  ou  "
w_ou = draw.textlength(text_ou, font=font_ou)
draw.text((call_x + w_call, call_y + 22), text_ou, fill=WHITE, font=font_ou)

# "Fold" (serif bold dourado grande)
text_fold = "Fold"
w_fold = draw.textlength(text_fold, font=font_title)
draw.text((call_x + w_call + w_ou, call_y), text_fold, fill=GOLD, font=font_title)

# "AQUI É POSSÍVEL" (caps, dourado, abaixo do Call ou Fold)
footer_text = "A Q U I   É   P O S S Í V E L"
w_footer = draw.textlength(footer_text, font=font_footer_caps)
draw.text((call_x, call_y + 95), footer_text, fill=GOLD, font=font_footer_caps)

# ══════════════════════════════════════════════════════════════
#  CONTEÚDO DO CARD
# ══════════════════════════════════════════════════════════════

# ── Descrição ──
desc_text = "Simulador de poker gratuito para recreativos"
w_desc = draw.textlength(desc_text, font=font_desc)
draw.text(((W - w_desc) // 2, 310), desc_text, fill=GRAY, font=font_desc)

# ── Frase de impacto ──
tagline_text = "Desafie os amigos e vamos evoluir juntos"
w_tag = draw.textlength(tagline_text, font=font_tagline)
draw.text(((W - w_tag) // 2, 355), tagline_text, fill=GOLD, font=font_tagline)

# ── Linha divisória dourada ──
line_y = 420
line_w = 400
draw.line([((W - line_w)//2, line_y), ((W + line_w)//2, line_y)], fill=GOLD_DARK, width=2)

# ── QR Code ──
qr = qrcode.QRCode(
    version=None,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=10,
    border=2,
)
qr.add_data("https://allan1052.github.io/No-limet-9max/")
qr.make(fit=True)
qr_img = qr.make_image(fill_color=GOLD, back_color=BG_DARK).convert("RGB")

qr_size = 340
qr_img = qr_img.resize((qr_size, qr_size), Image.LANCZOS)

qr_y = 460
qr_x = (W - qr_size) // 2
card.paste(qr_img, (qr_x, qr_y))

# ── Label abaixo do QR Code ──
qr_label = "Aponte a câmera para acessar"
w_ql = draw.textlength(qr_label, font=font_qr_label)
draw.text(((W - w_ql) // 2, qr_y + qr_size + 16), qr_label, fill=GRAY, font=font_qr_label)

# ── Salvar ──
output_path = "/home/ubuntu/no-limet-9max/card-whatsapp.png"
card.save(output_path, quality=95)
print(f"Card salvo em: {output_path}")
print(f"Dimensões: {W}x{H}")
