import os
import re
import urllib.request
import urllib.parse
from bs4 import BeautifulSoup
import json

TARGET_URL = "https://studiofreight.com/"
DEST_DIR = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\24_studio_freight"

os.makedirs(DEST_DIR, exist_ok=True)
os.makedirs(os.path.join(DEST_DIR, "css"), exist_ok=True)
os.makedirs(os.path.join(DEST_DIR, "js"), exist_ok=True)

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

print(f"Fetching {TARGET_URL}...")
req = urllib.request.Request(TARGET_URL, headers=headers)
with urllib.request.urlopen(req) as resp:
    html_content = resp.read().decode('utf-8', errors='ignore')

index_path = os.path.join(DEST_DIR, "index.html")
with open(index_path, "w", encoding="utf-8") as f:
    f.write(html_content)
print(f"Saved index.html ({len(html_content)} bytes)")

soup = BeautifulSoup(html_content, "html.parser")

css_links = []
for link in soup.find_all("link", rel=lambda r: r and "stylesheet" in r):
    href = link.get("href")
    if href:
        css_links.append(urllib.parse.urljoin(TARGET_URL, href))

# Also preload stylesheets or styles
for link in soup.find_all("link", rel="preload"):
    if link.get("as") == "style" and link.get("href"):
        css_links.append(urllib.parse.urljoin(TARGET_URL, link.get("href")))

script_links = []
for script in soup.find_all("script"):
    src = script.get("src")
    if src:
        script_links.append(urllib.parse.urljoin(TARGET_URL, src))

css_links = sorted(list(set(css_links)))
script_links = sorted(list(set(script_links)))

print(f"Found {len(css_links)} CSS links, {len(script_links)} JS scripts")

manifest = {
    "url": TARGET_URL,
    "css": [],
    "js": [],
    "next_data": None
}

# Check for __NEXT_DATA__
next_script = soup.find("script", id="__NEXT_DATA__")
if next_script and next_script.string:
    try:
        manifest["next_data"] = json.loads(next_script.string)
        print("Found __NEXT_DATA__ successfully")
    except Exception as e:
        print("Error parsing __NEXT_DATA__:", e)

for idx, url in enumerate(css_links):
    filename = os.path.basename(urllib.parse.urlparse(url).path) or f"style_{idx}.css"
    save_path = os.path.join(DEST_DIR, "css", filename)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
        with open(save_path, "wb") as f:
            f.write(content)
        manifest["css"].append({"url": url, "filename": filename, "size": len(content)})
        print(f"Downloaded CSS: {filename} ({len(content)} bytes)")
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")

for idx, url in enumerate(script_links):
    filename = os.path.basename(urllib.parse.urlparse(url).path) or f"script_{idx}.js"
    save_path = os.path.join(DEST_DIR, "js", filename)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
        with open(save_path, "wb") as f:
            f.write(content)
        manifest["js"].append({"url": url, "filename": filename, "size": len(content)})
        print(f"Downloaded JS: {filename} ({len(content)} bytes)")
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")

with open(os.path.join(DEST_DIR, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2)

print("Target fetch completed successfully.")
