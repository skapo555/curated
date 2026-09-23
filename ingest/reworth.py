#!/usr/bin/env python3
"""Recompute `worth` for everything already fetched, without re-downloading."""
import json, os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ingest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
idx = os.path.join(ROOT, "data", "index.json")
index = json.load(open(idx))
c = collections.Counter()
for item in index["items"]:
    item["worth"] = ingest.worth_for(None, item)
    c[item["worth"]] += 1
json.dump(index, open(idx, "w"), ensure_ascii=False)
print("worth now:", dict(sorted(c.items())))
