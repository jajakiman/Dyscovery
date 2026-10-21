"""Rebuild logo assets from the owner's raster references (Python, OpenCV, NumPy, Pillow)."""
from pathlib import Path
import xml.etree.ElementTree as ET
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent
DEST = ROOT.parents[1] / 'public' / 'brand'
BLUE, APRICOT = '#24476A', '#F2B880'


def trace(filename, top, bottom, origin, scale):
    image = cv2.imread(str(ROOT / filename))
    if image is None:
        raise FileNotFoundError(filename)
    mask = cv2.inRange(image, (0, 0, 0), (180, 150, 140))
    mask[:top] = 0
    mask[bottom:] = 0
    mask[:, :930] = 0
    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    paths = []
    for contour in contours:
        if cv2.contourArea(contour) < 12:
            continue
        p = cv2.approxPolyDP(contour, 0.8, True).reshape(-1, 2).astype(float)
        p = (p - origin) * scale
        start = (p[-1] + p[0]) / 2
        d = f'M {start[0]:.2f} {start[1]:.2f}'
        for i, control in enumerate(p):
            end = (control + p[(i+1) % len(p)]) / 2
            d += f' Q {control[0]:.2f} {control[1]:.2f} {end[0]:.2f} {end[1]:.2f}'
        paths.append(d + ' Z')
    return ' '.join(paths)


def path(d, color):
    return f'<path fill="{color}" fill-rule="evenodd" d="{d}"/>'


def svg(title, box, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" role="img" aria-labelledby="title"><title id="title">{title}</title>{body}</svg>\n'


def verify():
    files = list(DEST.glob('*.svg'))
    assert len(files) >= 9
    for file in files:
        tree = ET.parse(file)
        tags = {node.tag.split('}')[-1] for node in tree.iter()}
        assert tags <= {'svg', 'title', 'g', 'path'}, (file, tags)
        assert 'path' in tags
        for node in tree.iter():
            assert not any(key.lower().startswith('on') or 'href' in key for key in node.attrib)
    print(f'CHECK PASS: {len(files)} SVGs, valid XML, paths only, no fonts/rasters/scripts/external resources.')


if __name__ == '__main__':
    import sys
    if '--check' in sys.argv:
        verify()
        raise SystemExit
    DEST.mkdir(parents=True, exist_ok=True)
    outer = 'M 38 16 H 107 C 186 16 236 56 236 128 C 236 200 186 240 107 240 H 38 C 24 240 20 229 20 215 V 41 C 20 27 27 16 38 16 Z'
    hole = 'M 74 207 C 83 184 121 177 168 177 C 175 177 178 174 178 167 V 90 L 143 55 C 108 57 74 66 74 88 Z'
    fold = 'M 143 55 L 178 90 H 155 C 147 90 143 86 143 78 Z'
    word = trace('Dyscovery-logo.jpg', 640, 940, np.array([956, 565]), 224/406)
    tagline = trace('Dyscovery-tagline.jpg', 945, 1050, np.array([956, 956]), 224/406)
    def symbol(color=BLUE, accent=APRICOT):
        return path(outer + ' ' + hole, color) + path(fold, accent)
    def horizontal(color=BLUE, accent=APRICOT):
        return symbol(color, accent) + '<g transform="translate(286 16)">' + path(word, color) + '</g>'
    assets = {
        'logo-symbol.svg': ('0 0 256 256', symbol()),
        'logo-horizontal.svg': ('0 0 1040 256', horizontal()),
        'logo-wordmark.svg': ('-8 48 748 160', path(word, BLUE)),
        'logo-stacked.svg': ('0 0 768 456', '<g transform="translate(256 0)">'+symbol()+'</g><g transform="translate(20 256)">'+path(word, BLUE)+'</g>'),
        'logo-with-tagline.svg': ('0 0 1040 304', horizontal()+'<g transform="translate(286 241)">'+path(tagline, '#202C38')+'</g>'),
        'logo-horizontal-white.svg': ('0 0 1040 256', horizontal('#FFFFFF', '#FFFFFF')),
        'logo-horizontal-black.svg': ('0 0 1040 256', horizontal('#000000', '#000000')),
        'logo-symbol-white.svg': ('0 0 256 256', symbol('#FFFFFF', '#FFFFFF')),
        'favicon.svg': ('0 0 256 256', symbol(BLUE, BLUE)),
    }
    for name, (box, body) in assets.items():
        target = DEST / name
        if target.exists() and '--replace-generated' not in sys.argv:
            raise FileExistsError(f'Refusing to overwrite: {target}')
        target.write_text(svg('Dyscovery', box, body), encoding='utf-8')
    verify()
