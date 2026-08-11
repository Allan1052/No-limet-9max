"""Converte PNGs grandes para WebP (qualidade 80) para reduzir tamanho do bundle."""
import os
from PIL import Image

DIST = "dist"
MAX_SIZE = 500 * 1024  # 500KB threshold for conversion

# Imagens que devem ser convertidas
TARGETS = [
    "cover.png",
    "banner.png",
    "selo_seguranca.png",
    "selo_seguranca_v2.png",
    "icon-192-v3.png",
    "icon-512-v3.png",
    "logo.png",
    "og.png",
    "app-preview.png",
]

converted = 0
total_before = 0
total_after = 0

for fname in TARGETS:
    src = os.path.join(DIST, fname)
    if not os.path.exists(src):
        print(f"[SKIP] {fname} não existe")
        continue

    before = os.path.getsize(src)
    if before < MAX_SIZE:
        print(f"[OK] {fname}: {before/1024:.0f}KB — já é pequeno, pulando")
        continue

    # Converter para WebP com qualidade 80
    webp_name = fname.replace(".png", ".webp")
    dst = os.path.join(DIST, webp_name)

    img = Image.open(src)
    img.save(dst, "WebP", quality=80)

    after = os.path.getsize(dst)
    reduction = (1 - after / before) * 100
    converted += 1
    total_before += before
    total_after += after
    print(f"[CONVERT] {fname}: {before/1024:.0f}KB → {after/1024:.0f}KB ({reduction:.0f}% menor)")

print(f"\nTotal convertido: {converted} imagens")
print(f"Antes: {total_before/1024/1024:.1f}MB | Depois: {total_after/1024/1024:.1f}MB")
print(f"Economia: {(total_before - total_after)/1024/1024:.1f}MB ({(1 - total_after/total_before)*100:.0f}%)")
