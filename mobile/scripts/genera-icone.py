r"""Genera le icone di FVG Monitor (PWA + base per le app native).

Uso (Windows):  py mobile\scripts\genera-icone.py
Uso (Mac):      python3 mobile/scripts/genera-icone.py
Richiede Pillow (pip install pillow).

Disegno: sfondo "Adriatico notturno" (#0E2529), linee di livello
(isobare) come la texture firma del sito, una linea "monitor" nel
colore cool (#5FB3A3) e il punto caldo (#CD7554). Il soggetto resta
dentro l'80% centrale, così sopravvive alle maschere di Android
(adaptive icon) e iOS.

Scrive:
  public/icons/icon-192.png, icon-512.png, icon-maskable-512.png,
  apple-touch-icon.png (180), favicon-32.png
  mobile/assets/icon-only.png (1024), icon-foreground.png (1024,
  trasparente), icon-background.png (1024), splash.png e
  splash-dark.png (2732) — input per `npx capacitor-assets generate`.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
BG = (14, 37, 41)
LINE = (39, 75, 80)
COOL = (95, 179, 163)
WARM = (205, 117, 84)
SS = 4  # supersampling


def disegna_soggetto(size: int, sfondo: bool) -> Image.Image:
    S = size * SS
    img = Image.new("RGBA", (S, S), BG + (255,) if sfondo else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = S / 2

    # isobare: archi concentrici tenui
    if sfondo:
        for i, r in enumerate((0.20, 0.27, 0.34)):
            rr = S * r
            d.ellipse((c - rr, c - rr, c + rr, c + rr), outline=LINE + (255,), width=int(S * 0.012))

    # linea "monitor" (tracciato a impulso)
    w = int(S * 0.045)
    y0 = c + S * 0.02
    punti = [
        (c - S * 0.30, y0),
        (c - S * 0.12, y0),
        (c - S * 0.05, y0 - S * 0.17),
        (c + S * 0.04, y0 + S * 0.13),
        (c + S * 0.10, y0),
        (c + S * 0.30, y0),
    ]
    d.line(punti, fill=COOL + (255,), width=w, joint="curve")
    for x, y in (punti[0], punti[-1]):
        d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=COOL + (255,))

    # punto caldo in alto a destra (come il "pulse-dot" dell'header)
    r = S * 0.045
    px, py = c + S * 0.21, c - S * 0.19
    d.ellipse((px - r, py - r, px + r, py + r), fill=WARM + (255,))

    return img.resize((size, size), Image.LANCZOS)


def salva(img: Image.Image, path: Path, rgb: bool = True) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    (img.convert("RGB") if rgb else img).save(path, optimize=True)
    print("scritto", path.relative_to(ROOT))


def splash(size: int) -> Image.Image:
    canvas = Image.new("RGB", (size, size), BG)
    logo = disegna_soggetto(int(size * 0.28), sfondo=False)
    off = (size - logo.width) // 2
    canvas.paste(logo, (off, off), logo)
    return canvas


def main() -> None:
    pub = ROOT / "public" / "icons"
    master = disegna_soggetto(1024, sfondo=True)
    for nome, px in (("icon-192.png", 192), ("icon-512.png", 512),
                     ("apple-touch-icon.png", 180), ("favicon-32.png", 32)):
        salva(master.resize((px, px), Image.LANCZOS), pub / nome)
    # maskable: soggetto più piccolo, dentro la safe zone (cerchio 80%)
    mask = Image.new("RGBA", (512, 512), BG + (255,))
    sogg = disegna_soggetto(1024, sfondo=True).resize((420, 420), Image.LANCZOS)
    mask.paste(sogg, (46, 46))
    salva(mask, pub / "icon-maskable-512.png")

    assets = ROOT / "mobile" / "assets"
    salva(master, assets / "icon-only.png")
    salva(disegna_soggetto(1024, sfondo=False), assets / "icon-foreground.png", rgb=False)
    salva(Image.new("RGB", (1024, 1024), BG), assets / "icon-background.png")
    salva(splash(2732), assets / "splash.png")
    salva(splash(2732), assets / "splash-dark.png")


if __name__ == "__main__":
    main()
