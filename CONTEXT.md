# Curated — context brief

*A hand-off document. Everything below is the state of a real, live product as of 23 September 2026, not a proposal.*

---

## 1. What it is

**Curated** is a calm, user-controlled reader. Mobile-first PWA, live at **https://thecurated.fyi**.

Its founding line is *"Decide less. Read more."* The product exists to remove the decision fatigue of a feed, not to maximise time-on-site. Concretely, that means:

- **No infinite scroll.** Today shows a finite set and then stops.
- **No engagement optimisation.** Nothing is ranked by popularity, virality, or what keeps you scrolling. There are no view counts, no trending, no "others also read".
- **No editorial dictation.** Curated only ever draws from sources the reader has explicitly chosen. Personalisation happens *within* that chosen universe, never outside it.
- **Editorial/premium design**, not app-like: serif body text (Newsreader), a display face (Fraunces), warm paper palette, generous measure.

The single most load-bearing principle, stated repeatedly by the owner: **the source list must reflect the reader's judgement, not the builder's.**

---

## 2. Current state — what actually exists and works

| | |
|---|---|
| Live URL | https://thecurated.fyi (GitHub Pages + Cloudflare DNS, HTTPS) |
| Repo | github.com/skapo555/curated (public) |
| Stack | Vanilla JS ES modules. **No framework, no build step, no npm.** |
| Backend | Supabase (Postgres + GoTrue magic-link auth), hand-rolled REST client — no Supabase SDK |
| Ingestion | Python + `trafilatura`, run by GitHub Actions every 30 minutes |
| Size | ~3,400 lines across JS/CSS/Python. 30 commits. |
| Library | 429 items / 30-day window, from **19 sources** |
| Recent volume | 302 pieces in the last 14 days, **196 of them "substantial"** |

**Hard environment constraints** (these have shaped every technical decision): the owner's Mac has **no Node, no npm, no Homebrew, Python 3.9 only**. Everything must run without a toolchain. `build.py` bundles the whole app into a single double-clickable `Curated.html` for local testing.

### Screens
Main nav: **Today · In the Know · All New · Saved · Sources**
Secondary: Notebook · Topics · Currently Reading · Archive · Settings

- **Today** — the finite daily selection (default 10, configurable 3/5/10/15)
- **In the Know** — shorter pieces, kept deliberately separate so they don't muddy the long-form. Grouped by day, each day opening with one image-led lead, then compact rows.
- **All New** — everything from followed sources, filterable
- **Sources** — grouped by region, follow/unfollow
- **Notebook** — notes taken while reading, each linked back to its article, exportable

---

## 3. The source list

19 sources, grouped by **where they look** rather than where they're published.

**Australia (6)** — The Interpreter (Lowy), The Strategist (ASPI), Inside Story, The Conversation *(business & economy section only)*, ABC News, The Monthly *(headlines only, paywalled)*

**India (3)** — Frontline (The Hindu), Gateway House, Observer Research Foundation

**Asia-Pacific (6)** — The Diplomat, Fulcrum (ISEAS Singapore), Devpolicy Blog (ANU), New Mandala (ANU), Asialink Insights (Melbourne), East Asia Forum *(currently blocked by Cloudflare)*

**Wider world (4)** — Foreign Affairs *(headlines only, paywalled)*, SBS World News, Caspian Report (YouTube), Perun (YouTube)

### Rules that govern this list

- **India coverage must be geopolitical** — BRICS, Modi–Xi, SCO, trade, India as a power. **Not** Indian domestic politics. This rules out most Indian mastheads and favours think tanks.
- **US only when the impact reaches beyond the US.** War on the Rocks was dropped for being too US-centric in approach.
- **Sources are judged on measured contribution, not reputation.** The test: sample ~5 articles, extract, count words. A source that can't mostly clear ~900 words doesn't go in, however well known.
- Explicitly rejected: Pearls and Irritations (quality bar), Grattan Institute, War on the Rocks.

Two large aggregator lists were reviewed on 23 Sept 2026 — Feedspot's top-100 (726 feeds) and a 82,643-feed country-by-country YAML. **Neither yielded a single source that cleared the bar.** Both optimise for volume and local news; Curated's bar is length and analysis. Measured medians from the most promising candidates: Rappler 463 words, Tempo 461, The Mandarin 167, Korea Herald Opinion 783, Malaysiakini 846 (and paywalled). The bar is 900.

---

## 4. How selection works

### Scoring at ingest — `worth`, 0–5

Deliberately **carries no opinion about which publications are better**. It judges *format*, not publisher:

- `0` — rolling live-blogs and "as it happened" updates (detected by title pattern)
- `1` — under 2 minutes
- `2` — 2–4 minutes, or headlines-only paywalled items
- `3` — **4+ minutes ≈ 900 words. This is the "substantial" threshold.**
- `4` — 9+ minutes
- `5` — 16+ minutes

Video uses duration: 12 / 25 / 45 minutes for 3 / 4 / 5.

Current distribution across 429 items: `1:7, 2:136, 3:239, 4:34, 5:13`.

**Why 900 words and not longer:** an earlier, stricter bar (6 minutes) meant ASPI scored substantial only 15% of the time and Lowy 2%. Those outlets argue a full case in 900 words — concision is not the opposite of substance. Lowering it took ASPI to 70%, Lowy to 50%, and the library from 4.2 to 9.4 substantial pieces per day.

### Selection for Today — tiered passes

A single day only holds ~8 substantial pieces across the whole source list, so "ten from today" is structurally impossible. Rather than lowering quality to fill the page, the selector reaches back in **time**:

```
substantial within 24h → 48h → 72h → 7 days → 14 days
→ only then, anything ≥2 within 48h
```

On top of that:
- **Rotation penalty** of −2.5 for anything previously surfaced
- **Variety cap** — at most `ceil(n/6)` pieces per source
- **Video cap** — at most `round(n/5)`
- Affinity boosts from what the reader finishes and thumbs up (within their own sources only)

### `spaceOutSources`
No source may appear more than twice consecutively anywhere in a feed. Items only ever move *later*, never earlier, so chronology holds. This was added because In the Know's first six rows were all ABC News.

---

## 5. Decisions already made (don't re-litigate these)

- **The "Three-Choice Rule" was relaxed.** Originally Today showed exactly 3. Now configurable 3/5/10/15, default **10**. The owner asked for this directly.
- **No thumbs-down.** Only thumbs-up. Negative signal was judged corrosive to the calm.
- **Notes are a hovering drawer**, accessible from anywhere, each note linked to its article, exportable.
- **Short pieces get their own section** (In the Know) rather than being excluded or mixed in.
- **Topics are hidden** from main nav for now.
- **Sources have no default topics.** Inheriting topics from the source caused a Canadian article to be filed under Australia; source-level defaults were removed entirely. Topics are scored per-item from title (×3), dek (×2), body (×1).
- **Paywalled sources are included as headlines-only**, never circumvented. No paywall bypassing, one fetch per article ever, real user agent, sources that refuse automated readers are simply marked unavailable.
- **First-run source picker.** A new device is shown a picker before anything else and follows **nothing** until it chooses. Previously all 19 were pre-followed, which contradicted the core principle.
- **Images are upgraded at ingest.** Publishers' `og:image` is sized for social cards (ABC 862px, The Diplomat 600px, The Monthly 480px) against ~1125px needed on a phone. Per-publisher rules now request larger renders of the same photo for similar bytes. The Diplomat's bare original is 1.8MB, so it's deliberately capped at the 1892px variant instead.

---

## 6. Sync and accounts

- **Local-first.** Everything works with no account; state lives in `localStorage` under `curated.state.v2`.
- Every user-owned value carries a **per-field change timestamp**, so two devices merge without a server arbitrating. 17 merge-rule tests, all passing.
- Sign-in is **magic link only, no passwords**. Signups are **invite-only** (allowlist table + trigger on `auth.users`) while it's being built.
- Row-level security on all user tables, explicit grants to `authenticated` only.
- Not end-to-end encrypted — a deliberate choice, "most websites operate this way".

---

## 7. Agreed but not yet built

In priority order:

1. **Lock the whole site behind sign-in.** It is currently fully public — anyone with the link can read it.
2. **Move sources into Postgres** — `feeds`, `subscriptions`, `items` tables replacing the static `data/index.json`.
3. **Ingest reads its feed list from the database** and writes items back. *(Requires the owner to add a Supabase service key as a GitHub Actions secret himself.)*
4. **"Add a source" by pasting a URL**, with feed autodiscovery. Validated design: a pending row picked up by the scheduled job, avoiding Edge Functions.
5. The current 19 sources become a one-tap **suggested starter list**, not a default.

The stated goal, in the owner's words: *"I want the website to become unique to each person. I want them to be able to add their own sources. I don't want to dictate those sources."*

A **sitemap ingestion adapter** already exists for publishers with no RSS at all (ORF and Asialink arrived this way), including a persistent ledger of URLs already examined so an article that ages out of the window is never re-fetched.

---

## 8. The live open question — what this is *for*

This is where the owner currently wants help, and it is a genuine strategic question, not a technical one.

The founding line — *"Decide less. Read more."* — is a statement about **form**: calm, finite, user-controlled. What's missing is the **editorial** proposition. Two candidates were considered:

**(a) "Articles that deserve a read."** Weak, because the *sources have already done this filtering*. Lowy and ASPI don't publish filler. Everything in the library already cleared a 900-word analysis bar. A score ranking 175 already-good pieces isn't curation.

**(b) "News people aren't paying attention to."** Attractive, but **not computable from this library**. Measurement: across 175 substantial pieces in 10 days, only 13 proper nouns appeared in 4+ sources — and all were generic geography (China, Asia, India, Pacific), not stories. **85% of proper nouns appear in exactly one source.** These are analysis outlets that don't cover the same events, so there's no internal signal of what's *over*-attended to define "under-attended" against. Building it would require external attention data (Trends, news-volume APIs, social signals) — which drags the product into exactly the engagement-metric world it exists to reject.

**(c) Short stories / fiction** was raised as an alternative. Copyright is genuinely prohibitive for contemporary work (per-author licensing); public domain (pre-1929) is free and legal. But the real objection is that it's a different website that discards every source judgement made so far.

### What the data suggests the answer actually is

Two things Curated does that its sources cannot do for themselves:

**1. It makes 19 unequal publications behave like one.** Publication rates range from The Diplomat at 4.4 pieces/day to New Mandala at 0.1 — **44:1**. 61% of all output comes from the six loudest sources. In any chronological reader, the quiet specialists are invisible. The variety caps, rotation penalty, `spaceOutSources` and tiered passes all exist to fight precisely this. *That fight is the product* — a think tank publishing once a fortnight gets the same footing as a daily.

**2. It has an unnamed vantage point.** Of 196 substantial pieces in the last fortnight: **90 Australia, 72 Asia-Pacific, 23 India, 11 wider world.** 94% is the world read from Australia and Asia rather than from Washington or London. Nearly all English-language aggregation carries an unexamined US centre of gravity; this doesn't. That is a real editorial position already encoded in the source list — it simply isn't written anywhere on the site.

A viable framing: *"The Indo-Pacific, read from here."*

### The one version of (b) that *is* buildable

Not "the world isn't paying attention" — unknowable — but **"the good piece from the source *you've* been ignoring."** That data exists per-reader: what was opened, skipped, and which of the reader's own sources go untouched. It needs no external dependency, and it fits the brief because it works *against* the reader's drift rather than feeding it.

---

## 9. Tone and working style notes

- The owner iterates visually and gives direct feedback ("it feels busy", "it's mundane, no pics, lots of text"). Design critique is expected and acted on.
- Claims should be **measured, not asserted**. Every source decision in this project came with word counts; every image decision came with pixel measurements. "I checked and here are the numbers" is the expected standard.
- This is his **first website**. It matters to him. He has said so.
