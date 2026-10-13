#!/usr/bin/env python3
"""Regenerate the self-hosted font subsets after homepage copy changes.

The subsets cover printable ASCII plus every character in the built Chinese
and English homepages (`index.html`, `en/index.html`). Run `npm run build`
first, then pass the full upstream fonts:

  pip install fonttools brotli
  python3 scripts/subset-fonts.py WENKAI.ttf PLEX_SANS_SC.otf PLEX_MONO.ttf
  npm run build

Each run also stamps the font URLs in `assets/*.css` with a content hash
(`fonts/<name>.woff2?v=<hash>`), so browsers fetch the new subsets instead of a
cached copy. `--stamp` only refreshes those hashes without subsetting.

Upstream sources are pinned in README.md (Plex Sans SC: the ttf/unhinted file). The full fonts are not committed.
"""

import hashlib
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ("wenkai", "plex-sans-sc", "plex-mono")
HOMEPAGES = ("index.html", "en/index.html")
ASCII = {chr(c) for c in range(0x20, 0x7F)}


def homepage_text() -> set[str]:
    chars: set[str] = set()
    for name in HOMEPAGES:
        page = (ROOT / name).read_text(encoding="utf-8")
        page = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", page, flags=re.S)
        text = html.unescape(re.sub(r"<[^>]+>", " ", page))
        chars |= {c for c in text if not c.isspace()}
    return chars


def write_subset(source: str, target: str, chars: set[str]) -> None:
    from fontTools import subset

    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    font = subset.load_font(source, options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=[ord(c) for c in chars])
    subsetter.subset(font)
    out = ROOT / "assets/fonts" / target
    subset.save_font(font, str(out), options)
    print(f"{target}: {len(chars)} characters, {out.stat().st_size} bytes")


def stamp() -> None:
    """Point every CSS font URL at the current file contents."""
    versions = {
        name: hashlib.sha256((ROOT / f"assets/fonts/{name}.woff2").read_bytes()).hexdigest()[:12]
        for name in FONTS
    }
    for css in ("home.css", "site.css"):
        path = ROOT / "assets" / css
        text = path.read_text(encoding="utf-8")
        for name, version in versions.items():
            text = re.sub(rf"fonts/{re.escape(name)}\.woff2(\?v=[0-9a-f]*)?", f"fonts/{name}.woff2?v={version}", text)
        path.write_text(text, encoding="utf-8")
    print("Stamped font versions:", ", ".join(f"{k}={v}" for k, v in versions.items()))


def main() -> None:
    if sys.argv[1:] == ["--stamp"]:
        stamp()
        return
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    wenkai, plex_sans_sc, plex_mono = sys.argv[1:]
    chars = ASCII | homepage_text()
    write_subset(wenkai, "wenkai.woff2", chars)
    write_subset(plex_sans_sc, "plex-sans-sc.woff2", chars)
    write_subset(plex_mono, "plex-mono.woff2", ASCII)
    stamp()


if __name__ == "__main__":
    main()
