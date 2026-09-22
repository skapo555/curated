#!/usr/bin/env python3
"""Curated — content ingestion.

Reads each source's public feed (RSS / Atom / YouTube), fetches readable text
for new articles, and writes:

  data/index.json        everything from the last WINDOW_DAYS, metadata only
  data/items/<id>.json   one file per item: article body blocks or video details

Runs locally (python3 ingest/ingest.py) and on a schedule in GitHub Actions.
Polite by design: one fetch per article ever (cached), a real user agent,
no paywall circumvention, and sources that refuse automated readers are
simply marked unavailable.
"""
import hashlib, html, json, os, re, sys, time, warnings
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

warnings.filterwarnings("ignore")
try:
    import trafilatura
except ImportError:
    trafilatura = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
ITEMS_DIR = os.path.join(DATA, "items")
SOURCES_FILE = os.path.join(ROOT, "ingest", "sources.json")
WINDOW_DAYS = 30
MAX_PER_SOURCE = 60
FETCH_BUDGET = int(os.environ.get("FETCH_BUDGET", "120"))  # new article pages per run
UA = "Mozilla/5.0 (compatible; CuratedReader/0.1; personal reader prototype)"

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc": "http://purl.org/dc/elements/1.1/",
    "media": "http://search.yahoo.com/mrss/",
    "yt": "http://www.youtube.com/xml/schemas/2015",
}

TOPIC_RULES = {
    "defence": r"\b(defen[cs]e|military|navy|naval|army|air force|adf|aukus|submarine|missile|weapon|war\b|warfare|nato|deterren|nuclear|security|drone)",
    "geopolitics": r"\b(china|beijing|taiwan|indo-pacific|pacific|asean|indonesia|japan|india|korea|russia|ukraine|diplomac|alliance|sanction|geopolit|foreign polic|us-|washington|trump|xi jinping|southeast asia|middle east|iran|israel)",
    "economics": r"\b(econom|inflation|interest rate|rba\b|reserve bank|budget|gdp|trade|tariff|market|investment|productivity|tax|housing|wages?|employment|superannuation|dollar)",
    "australia": r"\b(australia|canberra|sydney|melbourne|brisbane|perth|adelaide|nsw|queensland|victoria|labor|coalition|albanese|dutton|aussie|australian)",
    "technology": r"\b(technolog|\bai\b|artificial intelligence|semiconductor|chip|cyber|software|platform|data|digital|internet|algorithm|quantum)",
    "science": r"\b(scien|climate|energy|solar|renewable|emission|research(ers)?|study finds|health|medic|species|space|physics|biolog)",
    "policy": r"\b(policy|reform|regulat|legislation|parliament|government|minister|senate|inquiry|ndis|medicare|welfare|migration|visa)",
}

def log(*a):
    print(*a, file=sys.stderr, flush=True)

def fetch(url, timeout=25, max_bytes=3_000_000):
    req = Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urlopen(req, timeout=timeout) as r:
        return r.read(max_bytes), r.headers.get("Content-Type", "")

def item_id(url):
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]

def strip_html(s):
    s = re.sub(r"<script.*?</script>|<style.*?</style>", " ", s or "", flags=re.S | re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()

def parse_date(s):
    if not s:
        return None
    s = s.strip()
    try:
        return parsedate_to_datetime(s).astimezone(timezone.utc)
    except Exception:
        pass
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return None

def text(el, path, ns=None):
    n = el.find(path, ns or NS) if path else el
    return (n.text or "").strip() if n is not None and n.text else ""

# ---------------------------------------------------------------- feeds
def parse_feed(xml_bytes):
    """Yield dicts: url, title, summary, content, author, published, image, yt_id."""
    root = ET.fromstring(xml_bytes)
    tag = root.tag.lower()
    if tag.endswith("feed"):  # Atom (The Conversation, YouTube)
        for e in root.findall("atom:entry", NS):
            link = ""
            for l in e.findall("atom:link", NS):
                if l.get("rel", "alternate") == "alternate":
                    link = l.get("href", ""); break
            yt = text(e, "yt:videoId")
            if yt and not link:
                link = "https://www.youtube.com/watch?v=" + yt
            media = e.find("media:group", NS)
            summary = text(e, "atom:summary")
            if media is not None and not summary:
                summary = text(media, "media:description")
            thumb = ""
            if media is not None:
                t = media.find("media:thumbnail", NS)
                if t is not None: thumb = t.get("url", "")
            yield {
                "url": link, "title": text(e, "atom:title"),
                "summary": summary, "content": text(e, "atom:content"),
                "author": text(e, "atom:author/atom:name"),
                "published": parse_date(text(e, "atom:published") or text(e, "atom:updated")),
                "image": thumb, "yt_id": yt,
            }
    else:  # RSS 2.0
        for it in root.iter("item"):
            enc = it.find("enclosure")
            img = enc.get("url", "") if enc is not None and (enc.get("type", "") or "").startswith("image") else ""
            mc = it.find("media:content", NS)
            if not img and mc is not None: img = mc.get("url", "")
            mt = it.find("media:thumbnail", NS)
            if not img and mt is not None: img = mt.get("url", "")
            yield {
                "url": text(it, "link"), "title": text(it, "title"),
                "summary": text(it, "description"), "content": text(it, "content:encoded"),
                "author": text(it, "dc:creator") or text(it, "author"),
                "published": parse_date(text(it, "pubDate") or text(it, "dc:date")),
                "image": img, "yt_id": "",
            }

# ---------------------------------------------------------------- articles
def blocks_from_xml(xml_str):
    """trafilatura's XML output -> [{t:'p'|'h2'|'quote', text}]"""
    out = []
    try:
        root = ET.fromstring(xml_str)
    except ET.ParseError:
        return out
    main = root.find(".//main")
    if main is None: return out
    for el in main.iter():
        t = el.tag.lower()
        txt = re.sub(r"\s+", " ", "".join(el.itertext())).strip()
        if not txt: continue
        if t == "head" and len(txt) < 140: out.append({"t": "h2", "text": txt})
        elif t == "quote" and len(txt) < 400: out.append({"t": "quote", "text": txt})
        elif t == "p" and len(txt) > 1: out.append({"t": "p", "text": txt})
        elif t == "list":
            for li in el.findall("item"):
                s = re.sub(r"\s+", " ", "".join(li.itertext())).strip()
                if s: out.append({"t": "p", "text": "• " + s})
    return out

def blocks_from_html_fallback(html_str):
    body = re.search(r"<article.*?</article>", html_str, flags=re.S | re.I)
    src = body.group(0) if body else html_str
    out = []
    for m in re.finditer(r"<(h2|h3|p|blockquote)[^>]*>(.*?)</\1>", src, flags=re.S | re.I):
        tag, inner = m.group(1).lower(), strip_html(m.group(2))
        if len(inner) < 2: continue
        out.append({"t": "h2" if tag in ("h2", "h3") else "quote" if tag == "blockquote" else "p", "text": inner})
    return out

def og_image(html_str):
    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', html_str, flags=re.I) or \
        re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html_str, flags=re.I)
    return html.unescape(m.group(1)) if m else ""

STOP_HEADINGS = re.compile(r"^(newsletters?|related( articles| stories| content)?|subscribe|sign up|read more|more from|you may (also )?like|recommended|share|comments?|tags|footnotes?|references|about the author|latest|most (read|popular)|explore|support us)\b", re.I)
BOILERPLATE = re.compile(r"^(read more|subscribe|sign up|follow us|share this|advertisement|related:|tags:|you may unsubscribe|the informer|this article was originally|republish|photo:|image:|credit:|©|copyright|all rights reserved|listen to|download the app)", re.I)

def words_in(blocks):
    return sum(len(b["text"].split()) for b in blocks)

SHARE_PREFIX = re.compile(r"^(listen|copy link|share|print|email|save)(\s+(listen|copy link|share|print|email|save))*\s+", re.I)
CAPTION = re.compile(r"\((?:[^()]*\b(?:getty|unsplash|aap|reuters|afp|ap photo|flickr|wikimedia|shutterstock|supplied|epa|bloomberg)\b[^()]*)\)\s*$", re.I)
RELATED_STUB = re.compile(r"\b\d{1,2} (january|february|march|april|may|june|july|august|september|october|november|december) 20\d\d\b", re.I)
NAV_PARA = re.compile(r"^(topics|research|interactives|events|people|support us|home|menu|search)(\s+\w+){0,12}$", re.I)

def tidy(blocks):
    out, skipping, long_paras = [], False, 0
    seen_body = False
    for b in blocks:
        t = SHARE_PREFIX.sub("", b["text"]).strip()
        t = re.sub(r"\s*\(opens in (a )?new (window|tab)\)", "", t, flags=re.I)
        if not t: continue
        if b["t"] == "p" and CAPTION.search(t) and len(t) < 200: continue
        if b["t"] == "h2":
            skipping = bool(STOP_HEADINGS.match(t))
            if skipping and seen_body: break        # furniture after the article: done
            if skipping: continue                    # furniture before the article: skip section
        if skipping:
            if len(t) > 300 and b["t"] == "p": skipping = False   # real prose resumes
            else: continue
        if BOILERPLATE.match(t) or NAV_PARA.match(t): continue
        if b["t"] == "p" and len(t) < 25 and not seen_body: continue  # captions/kickers before the text starts
        if b["t"] == "p" and len(t) > 200:
            long_paras += 1; seen_body = long_paras >= 2
        out.append({"t": b["t"], "text": t})
    while out and (out[-1]["t"] != "p" or (RELATED_STUB.search(out[-1]["text"]) and len(out[-1]["text"]) < 400)): out.pop()
    return out

def best_blocks(html_str, url=None):
    cands = []
    if trafilatura:
        try:
            x = trafilatura.extract(html_str, url=url, output_format="xml", include_comments=False, favor_recall=True)
            if x: cands.append(tidy(blocks_from_xml(x)))
        except Exception: pass
    cands.append(tidy(blocks_from_html_fallback(html_str)))
    cands = [c for c in cands if c]
    if not cands: return []
    # trafilatura is cleaner, so prefer it unless it clearly missed the body
    if len(cands) == 2 and words_in(cands[0]) >= max(150, 0.5 * words_in(cands[1])): return cands[0]
    return max(cands, key=words_in)

def extract_article(url, feed_content, fetch_page=True):
    """Returns (blocks, image, ok). Prefers full text shipped in the feed."""
    blocks, image = [], ""
    if feed_content and len(strip_html(feed_content)) > 1500:
        blocks = best_blocks(feed_content)
    page = None
    if fetch_page and (words_in(blocks) < 150 or not image):
        try:
            page, _ = fetch(url)
            page = page.decode("utf-8", "ignore")
        except (URLError, HTTPError, TimeoutError, ValueError) as e:
            log("   ! page fetch failed:", url, e)
    if page:
        image = og_image(page)
        if words_in(blocks) < 150:
            pb = best_blocks(page, url)
            if words_in(pb) > words_in(blocks): blocks = pb
    return blocks, image, words_in(blocks) >= 120

# ---------------------------------------------------------------- video
PROMO = re.compile(r"https?://|www\.|patreon|membership|sponsor|% off|discount|promo|use code|coupon|merch|▶|✔|✅|subscribe|follow me|twitter|instagram|tiktok|newsletter|affiliate|if you want to support|support (us|the channel|the show|my work)|join as a member|contribute|every bit helps|like and share|watch, like|betterhelp|nordvpn|squarespace|brilliant\.org|ground news", re.I)

def clean_description(desc):
    """YouTube descriptions open with sponsor reads and end with link lists;
    keep the sentences that describe the video."""
    keep = []
    for line in (desc or "").splitlines():
        t = line.strip()
        if not t or PROMO.search(t) or re.match(r"^\(?\d{1,2}:\d{2}", t): continue
        if len(t) < 20 and keep: break  # section labels after the blurb
        keep.append(t)
    text = " ".join(keep)
    # drop a leading sponsor sentence that slipped through ("Head to ... for 10% off")
    text = re.sub(r"^[^.!?]*\b(off your first|free trial|first month)\b[^.!?]*[.!?]\s*", "", text, flags=re.I)
    return text[:700].rsplit(" ", 1)[0] + ("…" if len(text) > 700 else "") if len(text) > 700 else text

def parse_chapters(desc):
    chapters = []
    for line in (desc or "").splitlines():
        m = re.match(r"^\s*\(?((?:\d{1,2}:)?\d{1,2}:\d{2})\)?\s*[-–—:]?\s*(.+?)\s*$", line)
        if m:
            parts = [int(p) for p in m.group(1).split(":")]
            secs = parts[0] * 60 + parts[1] if len(parts) == 2 else parts[0] * 3600 + parts[1] * 60 + parts[2]
            chapters.append([secs, m.group(2)[:80]])
    return chapters if len(chapters) >= 2 else []

def video_details(yt_id):
    try:
        req = Request("https://www.youtube.com/watch?v=" + yt_id + "&hl=en", headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
            "Accept-Language": "en-AU,en;q=0.9", "Cookie": "CONSENT=YES+cb; SOCS=CAI"})
        with urlopen(req, timeout=25) as r: page = r.read(2_500_000)
        page = page.decode("utf-8", "ignore")
    except Exception as e:
        log("   ! youtube fetch failed:", yt_id, e); return 0
    m = re.search(r'"lengthSeconds":"(\d+)"', page)
    return int(m.group(1)) if m else 0

# ---------------------------------------------------------------- scoring
def topics_for(source, title, summary):
    hay = (title + " " + summary).lower()
    found = [t for t, rx in TOPIC_RULES.items() if re.search(rx, hay)]
    for t in source.get("topics", []):
        if t not in found: found.append(t)
    return found[:4] or ["policy"]

def worth_for(source, item):
    w = 3 + int(source.get("weight", 0))
    if item["type"] == "article":
        if item["readMinutes"] >= 12: w += 1
        if item["readMinutes"] <= 2: w -= 1
    else:
        if item.get("durationSec", 0) >= 20 * 60: w += 1
    return max(1, min(5, w))

def norm(t):
    return re.sub(r"[^a-z0-9]+", " ", (t or "").lower()).strip()

def dedupe(blocks, title, summary):
    """Drop leading blocks that repeat the headline/standfirst, and any later
    paragraph that duplicates an earlier one (sites' pull-quotes)."""
    heads = {norm(title), norm(strip_html(summary))}
    while blocks and (norm(blocks[0]["text"]) in heads or (blocks[0]["t"] == "h2" and norm(blocks[0]["text"]) == norm(title))):
        blocks.pop(0)
    seen, out = set(), []
    for b in blocks:
        k = norm(b["text"])
        if k in seen and len(k) > 40: continue
        seen.add(k); out.append(b)
    return out

def dek_from(summary, blocks):
    s = strip_html(summary)
    if 40 <= len(s) <= 260: return s
    if len(s) > 260: return s[:250].rsplit(" ", 1)[0] + "…"
    for b in blocks:
        if b["t"] == "p" and 60 <= len(b["text"]) <= 320: return b["text"]
    return s

# ---------------------------------------------------------------- main
def main():
    os.makedirs(ITEMS_DIR, exist_ok=True)
    with open(SOURCES_FILE) as f: sources = json.load(f)
    old_index = {}
    idx_path = os.path.join(DATA, "index.json")
    if os.path.exists(idx_path):
        with open(idx_path) as f:
            old_index = {i["id"]: i for i in json.load(f).get("items", [])}

    cutoff = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)
    items, fetched, source_status = [], 0, {}

    for src in sources:
        if src.get("unavailable"):
            source_status[src["id"]] = "unavailable"; continue
        log(f"• {src['name']}")
        entries = None
        for attempt in (1, 2):
            try:
                raw, _ = fetch(src["feed"]); entries = list(parse_feed(raw)); break
            except Exception as e:
                log(f"   ! feed failed (attempt {attempt}):", e); time.sleep(3)
        if entries is None:
            # keep what we already know about this source rather than dropping it for a run
            carried = [i for i in old_index.values() if i["sourceId"] == src["id"] and os.path.exists(os.path.join(ITEMS_DIR, i["id"] + ".json"))]
            items.extend(carried); source_status[src["id"]] = "error"
            log(f"   ~ carried over {len(carried)} known items"); continue
        source_status[src["id"]] = "ok"
        count = 0
        for e in entries:
            if not e["url"] or not e["title"]: continue
            pub = e["published"] or datetime.now(timezone.utc)
            if pub < cutoff: continue
            iid = item_id(e["url"])
            is_video = src["type"] == "youtube"
            existing = old_index.get(iid)
            item_file = os.path.join(ITEMS_DIR, iid + ".json")
            if existing and os.path.exists(item_file):
                items.append(existing); count += 1; continue
            if fetched >= FETCH_BUDGET:
                continue  # picked up next run
            fetched += 1
            title = html.unescape(e["title"]).strip()
            if is_video:
                dur = video_details(e["yt_id"])
                # hqdefault is 4:3 with black bars; hq720 is a true 16:9 frame
                if e["image"] and "/hqdefault.jpg" in e["image"]:
                    e["image"] = e["image"].replace("/hqdefault.jpg", "/hq720.jpg")
                desc = e["summary"] or ""
                detail = {"id": iid, "type": "video", "description": clean_description(desc), "chapters": parse_chapters(desc), "transcript": None}
                item = {
                    "id": iid, "type": "video", "sourceId": src["id"], "title": title,
                    "dek": (clean_description(desc).split(". ")[0] or title)[:220], "author": None,
                    "publishedAt": pub.isoformat(), "durationSec": dur,
                    "topics": topics_for(src, title, desc), "image": e["image"], "url": e["url"], "youtubeId": e["yt_id"],
                }
                log(f"   + video {title[:60]} ({dur}s)")
            else:
                if src.get("metadataOnly"):
                    blocks, ok, image = [], False, e["image"]
                    if not image:
                        try:
                            pg, _ = fetch(e["url"]); image = og_image(pg.decode("utf-8", "ignore"))
                        except Exception: pass
                else:
                    blocks, image, ok = extract_article(e["url"], e["content"] or e["summary"])
                    blocks = dedupe(blocks, title, e["summary"]); ok = words_in(blocks) >= 120
                words = sum(len(b["text"].split()) for b in blocks)
                item = {
                    "id": iid, "type": "article", "sourceId": src["id"], "title": title,
                    "dek": dek_from(e["summary"], blocks), "author": strip_html(e["author"])[:80] or None,
                    "publishedAt": pub.isoformat(), "readMinutes": max(1, round(words / 230)) if ok else 0,
                    "topics": topics_for(src, title, e["summary"]), "image": image or e["image"], "url": e["url"],
                    "hasBody": ok,
                }
                detail = {"id": iid, "type": "article", "body": blocks if ok else []}
                log(f"   + {title[:60]} ({words} words)" if ok else f"   ~ {title[:60]} (metadata only)")
                time.sleep(0.4)  # be gentle with publishers
            item["worth"] = worth_for(src, item)
            with open(item_file, "w") as f: json.dump(detail, f, ensure_ascii=False)
            items.append(item); count += 1
            if count >= MAX_PER_SOURCE: break

    items.sort(key=lambda i: i["publishedAt"], reverse=True)
    keep = {i["id"] for i in items}
    for fn in os.listdir(ITEMS_DIR):  # prune aged-out bodies
        if fn.endswith(".json") and fn[:-5] not in keep:
            os.remove(os.path.join(ITEMS_DIR, fn))

    index = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "windowDays": WINDOW_DAYS,
        "sources": [{k: s[k] for k in ("id", "name", "type", "tagline", "home", "unavailable", "metadataOnly") if k in s} | {"status": source_status.get(s["id"], "ok")} for s in sources],
        "items": items,
    }
    with open(idx_path, "w") as f: json.dump(index, f, ensure_ascii=False)
    log(f"\n{len(items)} items, {fetched} fetched this run, {len(sources)} sources → data/index.json")

if __name__ == "__main__":
    main()
