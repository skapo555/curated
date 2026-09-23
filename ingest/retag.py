#!/usr/bin/env python3
"""Recompute topics for everything already fetched, without re-downloading.

Run after changing TOPIC_RULES or topics_for():  python3 ingest/retag.py
"""
import json, os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ingest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
idx_path = os.path.join(ROOT, "data", "index.json")
index = json.load(open(idx_path))

changed = 0
counts = collections.Counter()
for item in index["items"]:
    detail_path = os.path.join(ROOT, "data", "items", item["id"] + ".json")
    body_text = ""
    if os.path.exists(detail_path):
        d = json.load(open(detail_path))
        if item["type"] == "video":
            body_text = d.get("description", "") or ""
        else:
            body_text = " ".join(b["text"] for b in (d.get("body") or [])[:4])
    new = ingest.topics_for(item["title"], item.get("dek", ""), body_text)
    if new != item.get("topics"): changed += 1
    item["topics"] = new
    for t in new: counts[t] += 1

json.dump(index, open(idx_path, "w"), ensure_ascii=False)
n = len(index["items"])
untagged = sum(1 for i in index["items"] if not i["topics"])
print(f"retagged {changed} of {n} items; {untagged} now have no topic ({100*untagged/n:.0f}%)")
for t, c in counts.most_common():
    print(f"   {t:12} {c:4}  {100*c/n:.0f}%")
