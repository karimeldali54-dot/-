#!/usr/bin/env python3
"""Launcher icons from the site favicon (the pharaoh card)."""
from pathlib import Path
from PIL import Image

src = Path("/workspace/public/favicon.png")
res = Path("/workspace/android/app/src/main/res")
sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

image = Image.open(src).convert("RGB")
for folder, size in sizes.items():
    scale = max(size / image.width, size / image.height)
    resized = image.resize((int(image.width * scale), int(image.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - size) // 2
    top = (resized.height - size) // 2
    icon = resized.crop((left, top, left + size, top + size))
    out = res / folder
    out.mkdir(parents=True, exist_ok=True)
    for name in ("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"):
        icon.save(out / name, "PNG")

print("android icons written")
