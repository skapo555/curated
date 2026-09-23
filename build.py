#!/usr/bin/env python3
"""Bundle the modular source into a single double-clickable Curated.html."""
import re, pathlib, base64

root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text()
css = (root / 'css/styles.css').read_text()
data = (root / 'js/data.js').read_text()
store = (root / 'js/store.js').read_text()
auth = (root / 'js/auth.js').read_text()
sync = (root / 'js/sync.js').read_text()
app = (root / 'js/app.js').read_text()

def strip_modules(src):
    src = re.sub(r"^import .*?;\n", "", src, flags=re.M)
    src = re.sub(r"^export (const|function|let)", r"\1", src, flags=re.M)
    return src

# Everything store.js exports becomes a member of `S`, which app.js already uses.
exports = re.findall(r"^export (?:const|function|let) (\w+)", store, flags=re.M)
store_js = strip_modules(store) + "\nconst S = { " + ", ".join(exports) + " };\n"
data_js = strip_modules(data)
app_js = strip_modules(app)

auth_exports = re.findall(r"^export (?:const|function|let|async function) (\w+)", auth, flags=re.M)
sync_exports = re.findall(r"^export (?:const|function|let|async function) (\w+)", sync, flags=re.M)
auth_js = strip_modules(auth).replace("export async function", "async function") + "\nconst A = { " + ", ".join(auth_exports) + " };\n"
sync_js = strip_modules(sync).replace("export async function", "async function") + "\nconst Sync = { " + ", ".join(sync_exports) + " };\n"

js = "(() => {\n'use strict';\n" + data_js + "\n" + store_js + "\n" + auth_js + "\n" + sync_js + "\n" + app_js + "\n})();"

icon = base64.b64encode((root / 'icons/icon-180.png').read_bytes()).decode()
svg = base64.b64encode((root / 'icons/icon.svg').read_bytes()).decode()

html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', '')
html = html.replace('href="icons/icon.svg"', f'href="data:image/svg+xml;base64,{svg}"')
html = html.replace('href="icons/icon-180.png"', f'href="data:image/png;base64,{icon}"')
html = html.replace('<link rel="stylesheet" href="css/styles.css">', '<style>\n' + css + '\n</style>')
index_path = root / 'data/index.json'
inline_index = ('<script>window.__CURATED_INDEX__ = ' + index_path.read_text() + ';</script>\n') if index_path.exists() else ''
html = html.replace('<script type="module" src="js/app.js"></script>', inline_index + '<script>\n' + js + '\n</script>')

out = root.parent / 'Curated.html'
out.write_text(html)
print(f'wrote {out} ({out.stat().st_size // 1024} KB)')
