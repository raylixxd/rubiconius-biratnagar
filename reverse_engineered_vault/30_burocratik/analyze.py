import os
import re
import json
import urllib.request
import urllib.parse
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
}

BASE_URL = 'https://burocratik.com/'
OUTPUT_DIR = r'C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\30_burocratik'
ASSETS_DIR = os.path.join(OUTPUT_DIR, 'assets')
os.makedirs(ASSETS_DIR, exist_ok=True)

def fetch_url(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()

print("Fetching index.html...")
html_bytes = fetch_url(BASE_URL)
with open(os.path.join(OUTPUT_DIR, 'index.html'), 'wb') as f:
    f.write(html_bytes)
print(f"Saved index.html ({len(html_bytes)} bytes)")

soup = BeautifulSoup(html_bytes, 'html.parser')

# Find stylesheets
stylesheets = []
for link in soup.find_all('link', rel=lambda x: x and 'stylesheet' in x.lower() if isinstance(x, str) else (isinstance(x, list) and any('stylesheet' in str(item).lower() for item in x))):
    href = link.get('href')
    if href:
        stylesheets.append(urllib.parse.urljoin(BASE_URL, href))

# Find scripts
scripts = []
for s in soup.find_all('script'):
    src = s.get('src')
    if src:
        scripts.append(urllib.parse.urljoin(BASE_URL, src))

print(f"Found {len(stylesheets)} stylesheets, {len(scripts)} scripts")

downloaded_css = []
for idx, s_url in enumerate(stylesheets):
    try:
        fname = f"style_{idx}_{os.path.basename(urllib.parse.urlparse(s_url).path) or 'style.css'}"
        if not fname.endswith('.css'):
            fname += '.css'
        dest = os.path.join(ASSETS_DIR, fname)
        print(f"Downloading CSS: {s_url} -> {fname}")
        content = fetch_url(s_url)
        with open(dest, 'wb') as f:
            f.write(content)
        downloaded_css.append((fname, s_url, content.decode('utf-8', errors='ignore')))
    except Exception as e:
        print(f"Error downloading CSS {s_url}: {e}")

downloaded_js = []
for idx, j_url in enumerate(scripts):
    try:
        fname = f"script_{idx}_{os.path.basename(urllib.parse.urlparse(j_url).path) or 'script.js'}"
        if not fname.endswith('.js'):
            fname += '.js'
        dest = os.path.join(ASSETS_DIR, fname)
        print(f"Downloading JS: {j_url} -> {fname}")
        content = fetch_url(j_url)
        with open(dest, 'wb') as f:
            f.write(content)
        downloaded_js.append((fname, j_url, content.decode('utf-8', errors='ignore')))
    except Exception as e:
        print(f"Error downloading JS {j_url}: {e}")

# Save manifest of fetched assets
manifest = {
    'url': BASE_URL,
    'stylesheets': stylesheets,
    'scripts': scripts,
    'downloaded_css': [c[0] for c in downloaded_css],
    'downloaded_js': [j[0] for j in downloaded_js]
}
with open(os.path.join(OUTPUT_DIR, 'manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)

print("Fetch completed successfully.")
