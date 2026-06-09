#!/usr/bin/env python
"""optimize-portraits.py — web-optimize the full-res render masters for the dossier gallery.

Reads portraits/renders/<id>.png (full-res masters, gitignored) and writes
portraits/web/<id>.jpg (downscaled + recompressed, ~6 MB total, committed). Run with a
Python that has Pillow, e.g. the ComfyUI portable interpreter:
  & "E:\\AI-Models\\ComfyUI_windows_portable\\python_embeded\\python.exe" optimize-portraits.py
"""
import glob
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "portraits", "renders")
DST = os.path.join(HERE, "portraits", "web")
WIDTH = 640        # plenty for gallery tiles (~150px) and the detail portrait (~190px), retina-safe
QUALITY = 85

os.makedirs(DST, exist_ok=True)
total = 0
count = 0
for f in sorted(glob.glob(os.path.join(SRC, "*.png"))):
    im = Image.open(f).convert("RGB")
    if im.width > WIDTH:
        h = round(im.height * WIDTH / im.width)
        im = im.resize((WIDTH, h), Image.LANCZOS)
    out = os.path.join(DST, os.path.splitext(os.path.basename(f))[0] + ".jpg")
    im.save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    total += os.path.getsize(out)
    count += 1
print(f"{count} portraits -> portraits/web/  ({total / 1024 / 1024:.1f} MB, width {WIDTH}, q{QUALITY})")
