# Curated — prototype

**Decide less. Read more.** A calm, user-controlled reader for the sources you trust.

This is the first visual prototype: a mobile-first PWA built with plain HTML, CSS and JavaScript — no build step, no backend, no accounts. All content is realistic mock data (`js/data.js`); all state (progress, saves, notes, reactions, follows, settings) lives in `localStorage`.

## Run it

Any static file server works. From this folder:

```bash
python3 -m http.server 8745
```

Live at **https://thecurated.fyi**. For local work: http://localhost:8745 — or, on your iPhone on the same Wi‑Fi, `http://<your-mac's-ip>:8745`, and use Share → **Add to Home Screen** to install it as a standalone app.

## What's in the loop

- **Today** — Continue Reading/Watching above exactly three recommendations, then *See all new content →*.
- **Article / Video** — typography-first reader with scroll-tracked progress, auto/ask/manual completion, Save, 👍/👎, a floating notes drawer (minimisable, quote-from-selection, thinking prompts), link to the publisher. Video has a simulated player with chapters.
- **All New** — the full chronological feed with Article/Video/Source/Topic filters.
- **Topics · Saved · Sources · Currently Reading · Archive · Settings.**

## Structure

```
index.html            app shell
css/styles.css        design system (light + dark, phone → tablet → desktop)
js/data.js            mock sources, topics, items and article bodies
js/store.js           localStorage state + "Three Worth Your Time" selection
js/app.js             router, screens, reader, video player
manifest.webmanifest  PWA manifest
sw.js                 minimal app-shell service worker
icons/                app icon (SVG + PNG for iOS)
```

## How the three are chosen

From fresh, followed, unstarted, unsaved items only. Score = editorial weight + freshness + 👍/👎 topic and source affinity + what you finish, with a small day-seeded jitter so the trio is stable through the day. Then enforce variety: no repeated source, at most one video, prefer distinct topics. Each pick shows a one-line *why*.

Nothing outside your followed sources is ever recommended.
