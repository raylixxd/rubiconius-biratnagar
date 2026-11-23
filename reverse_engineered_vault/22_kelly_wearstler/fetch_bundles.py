import os
import sys
import json
import re
import urllib.request
import urllib.parse
from html.parser import HTMLParser

TARGET_URL = "https://www.kellywearstler.com/"
VAULT_DIR = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\22_kelly_wearstler"
BUNDLES_DIR = os.path.join(VAULT_DIR, "bundles")

os.makedirs(VAULT_DIR, exist_ok=True)
os.makedirs(BUNDLES_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

def fetch_url(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()

print(f"Fetching {TARGET_URL}...")
raw_html = fetch_url(TARGET_URL).decode('utf-8', errors='ignore')

index_path = os.path.join(VAULT_DIR, "index.html")
with open(index_path, "w", encoding="utf-8") as f:
    f.write(raw_html)
print(f"Saved index.html ({len(raw_html)} bytes)")

# Find stylesheets
css_links = re.findall(r'<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"\']+)["\']', raw_html, re.I)
css_links += re.findall(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']stylesheet["\']', raw_html, re.I)
# Also preload styles
preload_css = re.findall(r'<link[^>]+href=["\']([^"\']+\.css[^"\']*)["\'][^>]+as=["\']style["\']', raw_html, re.I)
css_links.extend(preload_css)

# Find scripts
js_links = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', raw_html, re.I)

# Deduplicate
css_links = list(dict.fromkeys(css_links))
js_links = list(dict.fromkeys(js_links))

print(f"Discovered {len(css_links)} CSS links and {len(js_links)} JS scripts.")

downloaded_css = []
for i, link in enumerate(css_links):
    full_url = urllib.parse.urljoin(TARGET_URL, link)
    filename = f"style_{i}_{os.path.basename(urllib.parse.urlparse(full_url).path)}"
    if not filename.endswith(".css"):
        filename += ".css"
    filepath = os.path.join(BUNDLES_DIR, filename)
    try:
        print(f"Downloading CSS: {full_url} -> {filename}")
        data = fetch_url(full_url)
        with open(filepath, "wb") as f:
            f.write(data)
        downloaded_css.append({"url": full_url, "file": filename, "size": len(data)})
    except Exception as e:
        print(f"Failed to download CSS {full_url}: {e}")

downloaded_js = []
for i, link in enumerate(js_links):
    full_url = urllib.parse.urljoin(TARGET_URL, link)
    filename = f"bundle_{i}_{os.path.basename(urllib.parse.urlparse(full_url).path)}"
    if not filename.endswith(".js"):
        filename += ".js"
    filepath = os.path.join(BUNDLES_DIR, filename)
    try:
        print(f"Downloading JS: {full_url} -> {filename}")
        data = fetch_url(full_url)
        with open(filepath, "wb") as f:
            f.write(data)
        downloaded_js.append({"url": full_url, "file": filename, "size": len(data)})
    except Exception as e:
        print(f"Failed to download JS {full_url}: {e}")

manifest = {
    "target": TARGET_URL,
    "html_bytes": len(raw_html),
    "css": downloaded_css,
    "js": downloaded_js
}

with open(os.path.join(VAULT_DIR, "crawl_manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2)

print("Crawl phase complete!")
