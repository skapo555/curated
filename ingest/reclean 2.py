#!/usr/bin/env python3
"""Re-apply the body filters to articles already stored, without re-fetching.

Publishers add house ads mid-article and the patterns that catch them get
sharper over time. This sweeps the existing library with the current rules
rather than re-downloading a month of pages.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ingest import PROMO_PITCH, PROMO_PARA, PROMO_ANY, is_nav, ITEMS_DIR, DATA

def clean(blocks):
    out, dropped = [], 0
    for b in blocks:
        t = (b.get("text") or "").strip()
        if b.get("t") == "p" and t and (
            (len(t) < 400 and PROMO_PITCH.search(t)) or PROMO_PARA.match(t) or PROMO_ANY.search(t)
        ):
            if out and out[-1]["t"] != "p":
                out.pop(); dropped += 1          # its heading goes too
            dropped += 1
            continue
        out.append(b)
    # never leave a heading dangling at the end
    while out and out[-1]["t"] != "p":
        out.pop(); dropped += 1
    return out, dropped

def main():
    total_files = total_blocks = 0
    words_before = words_after = 0
    for fn in sorted(os.listdir(ITEMS_DIR)):
        if not fn.endswith(".json"): continue
        path = os.path.join(ITEMS_DIR, fn)
        with open(path) as f: d = json.load(f)
        body = d.get("body")
        if not body: continue
        before = sum(len(b.get("text", "").split()) for b in body)
        new, dropped = clean(body)
        if not dropped: continue
        after = sum(len(b.get("text", "").split()) for b in new)
        d["body"] = new
        with open(path, "w") as f: json.dump(d, f, ensure_ascii=False)
        total_files += 1; total_blocks += dropped
        words_before += before; words_after += after
    print(f"cleaned {total_files} items, removed {total_blocks} blocks "
          f"({words_before - words_after} words)")
    print("run reworth.py next if any item changed length tier")

if __name__ == "__main__":
    main()
