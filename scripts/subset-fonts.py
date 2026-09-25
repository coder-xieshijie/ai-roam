#!/usr/bin/env python3
"""Regenerate the self-hosted font subsets after homepage copy changes.

The subsets cover printable ASCII plus every character in the built homepage
(`index.html`). Run `npm run build` first, then pass the full upstream fonts:

  pip install fonttools brotli
  python3 scripts/subset-fonts.py WENKAI.ttf PLEX_SANS_SC.otf PLEX_MONO.ttf

Upstream sources are pinned in README.md (Plex Sans SC: the ttf/unhinted file). The full fonts are not committed.
"""

import html
import re
import sys
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
ASCII = {chr(c) for c in range(0x20, 0x7F)}


def homepage_text() -> set[str]:
    page = (ROOT / "index.html").read_text(encoding="utf-8")
    page = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", page, flags=re.S)
    text = html.unescape(re.sub(r"<[^>]+>", " ", page))
    return {c for c in text if not c.isspace()}


def write_subset(source: str, target: str, chars: set[str]) -> None:
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


def main() -> None:
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    wenkai, plex_sans_sc, plex_mono = sys.argv[1:]
    chars = ASCII | homepage_text()
    write_subset(wenkai, "wenkai.woff2", chars)
    write_subset(plex_sans_sc, "plex-sans-sc.woff2", chars)
    write_subset(plex_mono, "plex-mono.woff2", ASCII)


if __name__ == "__main__":
    main()
