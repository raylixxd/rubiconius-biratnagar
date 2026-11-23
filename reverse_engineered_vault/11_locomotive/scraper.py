import os
import re
import json
import urllib.request
import urllib.parse
from bs4 import BeautifulSoup

TARGET_URL = "https://locomotive.ca/en"
BASE_DIR = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\11_locomotive"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def fetch_url(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()

def main():
    os.makedirs(BASE_DIR, exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "css"), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "js"), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "assets"), exist_ok=True)

    print(f"Fetching {TARGET_URL}...")
    html_content = fetch_url(TARGET_URL)
    html_path = os.path.join(BASE_DIR, "index.html")
    with open(html_path, "wb") as f:
        f.write(html_content)
    print(f"Saved index.html ({len(html_content)} bytes)")

    soup = BeautifulSoup(html_content, "html.parser")

    # Find stylesheets
    css_files = []
    for link in soup.find_all("link", rel=lambda r: r and "stylesheet" in r):
        href = link.get("href")
        if href:
            full_url = urllib.parse.urljoin(TARGET_URL, href)
            css_files.append((href, full_url))

    # Also check preload as style
    for link in soup.find_all("link", rel="preload"):
        if link.get("as") == "style" and link.get("href"):
            href = link.get("href")
            full_url = urllib.parse.urljoin(TARGET_URL, href)
            if (href, full_url) not in css_files:
                css_files.append((href, full_url))

    print(f"Found {len(css_files)} CSS files:")
    saved_css = []
    for href, full_url in css_files:
        filename = os.path.basename(urllib.parse.urlparse(full_url).path)
        if not filename.endswith(".css"):
            filename += ".css"
        save_path = os.path.join(BASE_DIR, "css", filename)
        try:
            print(f"Downloading CSS: {full_url} -> {filename}")
            content = fetch_url(full_url)
            with open(save_path, "wb") as f:
                f.write(content)
            saved_css.append({"url": full_url, "file": f"css/{filename}", "size": len(content)})
        except Exception as e:
            print(f"Error fetching {full_url}: {e}")

    # Find JS scripts
    js_files = []
    for script in soup.find_all("script"):
        src = script.get("src")
        if src:
            full_url = urllib.parse.urljoin(TARGET_URL, src)
            js_files.append((src, full_url))
        
    for link in soup.find_all("link", rel=lambda r: r and ("modulepreload" in r or "preload" in r)):
        if link.get("as") == "script" or "modulepreload" in (link.get("rel") or []):
            href = link.get("href")
            if href:
                full_url = urllib.parse.urljoin(TARGET_URL, href)
                if (href, full_url) not in js_files:
                    js_files.append((href, full_url))

    print(f"Found {len(js_files)} JS scripts:")
    saved_js = []
    for src, full_url in js_files:
        filename = os.path.basename(urllib.parse.urlparse(full_url).path)
        if not filename.endswith(".js"):
            filename += ".js"
        save_path = os.path.join(BASE_DIR, "js", filename)
        try:
            print(f"Downloading JS: {full_url} -> {filename}")
            content = fetch_url(full_url)
            with open(save_path, "wb") as f:
                f.write(content)
            saved_js.append({"url": full_url, "file": f"js/{filename}", "size": len(content)})
        except Exception as e:
            print(f"Error fetching {full_url}: {e}")

    print("Initial fetch completed.")

if __name__ == "__main__":
    main()
