#!/usr/bin/env python
"""Regenerate Caster Companion's theme art (see docs/decisions.md D14).

    python tools/art/gen_art.py background   # SDXL-Turbo, needs a CUDA GPU (~1 min)
    python tools/art/gen_art.py buttons      # pure PIL, no GPU

Needs a Python env with torch (CUDA), diffusers and Pillow. The owner's machine
already has one: ../godot/wasp-smasher/tools/.venv (SDXL-Turbo cached there).

Writes into assets/images/. Outputs are committed; this script is the recipe.
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "assets" / "images"

# "moonlit_forest", seed 22: the style the owner picked from the round-2 mockups.
BG_PROMPT = (
    "cel shaded cartoon illustration, thick clean outlines, vibrant saturated colors, "
    "card game background art, no text, no people, "
    "spooky blue violet forest at night, gnarled twisted trees, huge glowing full moon, "
    "falling green leaves, glowing eyes in the dark"
)
BG_SEED = 22
DRAFT_SIZE = (512, 896)
FINAL_SIZE = (832, 1456)
# img2img strength for the upscale pass: 0.35 sharpens linework but keeps the
# picked composition; 0.5 started redrawing trees.
UPSCALE_STRENGTH = 0.35

# Theme colours, mirrored from src/theme/tokens.ts.
INK = (14, 12, 24)
RING = (238, 238, 242)
DISC_HI = (96, 80, 190)
DISC_LO = (40, 30, 100)
MOONLIGHT = (150, 225, 255)


def background():
    import torch
    from diffusers import AutoPipelineForImage2Image, AutoPipelineForText2Image

    model = "stabilityai/sdxl-turbo"
    kw = dict(torch_dtype=torch.float16, variant="fp16", use_safetensors=True)
    t2i = AutoPipelineForText2Image.from_pretrained(model, **kw).to("cuda")
    t2i.set_progress_bar_config(disable=True)
    w, h = DRAFT_SIZE
    draft = t2i(prompt=BG_PROMPT, width=w, height=h, num_inference_steps=4, guidance_scale=0.0,
                generator=torch.Generator("cuda").manual_seed(BG_SEED)).images[0]

    i2i = AutoPipelineForImage2Image.from_pipe(t2i)
    i2i.vae.enable_tiling()
    final = i2i(prompt=BG_PROMPT, image=draft.resize(FINAL_SIZE, Image.LANCZOS), strength=UPSCALE_STRENGTH,
                num_inference_steps=6, guidance_scale=0.0,
                generator=torch.Generator("cuda").manual_seed(BG_SEED)).images[0]

    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / "bg-moonlit-forest.jpg"
    final.save(path, quality=85, optimize=True, progressive=True)
    print("wrote", path, "%.0f KB" % (path.stat().st_size / 1024))


def roundel(size=256):
    """Cartoon disc: ink outline, white ring, indigo disc lit from top-left, gloss."""
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = size / 256
    d.ellipse([4 * s, 4 * s, size - 4 * s, size - 4 * s], fill=INK)
    d.ellipse([18 * s, 18 * s, size - 18 * s, size - 18 * s], fill=RING)
    d.ellipse([34 * s, 34 * s, size - 34 * s, size - 34 * s], fill=INK)
    for i in range(40):
        t = i / 39
        r = (38 + i * 1.6) * s
        off = i * 0.6 * s
        col = tuple(int(DISC_LO[k] + (DISC_HI[k] - DISC_LO[k]) * t) for k in range(3))
        d.ellipse([r - off, r - off, size - r - off * 0.2, size - r - off * 0.2], fill=col)
    gloss = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(gloss).ellipse([70 * s, 50 * s, 150 * s, 100 * s], fill=(255, 255, 255, 90))
    im.alpha_composite(gloss.filter(ImageFilter.GaussianBlur(6 * s)))
    return im


def glyph(im, kind, color=MOONLIGHT):
    size = im.width
    s = size / 256
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = size / 2

    def draw(col, grow):
        if kind == "restart":
            r = size * 0.18
            d.arc([c - r, c - r, c + r, c + r], start=-55, end=235, fill=col, width=int((16 + grow) * s))
            a = math.radians(-55)
            x, y = c + r * math.cos(a), c + r * math.sin(a)
            g = grow * 0.8
            d.polygon([(x + (24 + g) * s, y - 6 * s), (x - (16 + g) * s, y - (22 + g) * s),
                       (x - 2 * s, y + (26 + g) * s)], fill=col)
        elif kind == "menu":
            for dy in (-34, 0, 34):
                d.rounded_rectangle([c - (44 + grow / 2) * s, c + (dy - 7 - grow / 2) * s,
                                     c + (44 + grow / 2) * s, c + (dy + 7 + grow / 2) * s],
                                    radius=8 * s, fill=col)

    draw(INK, 10)  # thick cartoon outline
    draw(color, 0)
    out = im.copy()
    out.alpha_composite(layer)
    return out


def buttons():
    OUT.mkdir(parents=True, exist_ok=True)
    # 256 px = 4x a 64 dp button, enough for xxxhdpi.
    for kind in ("restart", "menu"):
        path = OUT / f"btn-{kind}.png"
        glyph(roundel(256), kind).save(path, optimize=True)
        print("wrote", path)


if __name__ == "__main__":
    targets = sys.argv[1:] or ["buttons"]
    for t in targets:
        {"background": background, "buttons": buttons}[t]()
