import urllib.request
import urllib.parse
import os
import re
import json

VAULT_DIR = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\19_norm_architects"
os.makedirs(VAULT_DIR, exist_ok=True)

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

url = "https://normcph.com/"
req = urllib.request.Request(url, headers=headers)

try:
    print(f"Fetching {url}...")
    with urllib.request.urlopen(req, timeout=20) as response:
        html = response.read().decode('utf-8', errors='replace')
        status = response.status
        print(f"HTTP Status: {status}, HTML Length: {len(html)} bytes")
        
        index_path = os.path.join(VAULT_DIR, "index.html")
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Saved raw HTML to {index_path}")
        
        # Extract CSS links
        css_links = re.findall(r'<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"\']+)["\']', html, re.I)
        css_links += re.findall(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']stylesheet["\']', html, re.I)
        
        # Extract Script links
        js_links = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html, re.I)
        
        # Extract inline styles and fonts
        font_links = re.findall(r'href=["\']([^"\']*(?:woff2|woff|ttf|font)[^"\']*)["\']', html, re.I)
        
        # Extract images
        img_srcs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.I)
        img_data_srcs = re.findall(r'data-src=["\']([^"\']+)["\']', html, re.I)
        img_srcset = re.findall(r'srcset=["\']([^"\']+)["\']', html, re.I)
        
        print("\n--- Discovered Assets ---")
        print(f"CSS ({len(css_links)}):")
        for c in css_links:
            print("  CSS:", c)
            
        print(f"JS ({len(js_links)}):")
        for j in js_links:
            print("  JS:", j)
            
        print(f"Fonts ({len(font_links)}):")
        for fn in font_links:
            print("  Font:", fn)
            
        print(f"Images count: {len(img_srcs)} direct, {len(img_data_srcs)} data-src, {len(img_srcset)} srcset")

except Exception as e:
    print(f"Error fetching: {e}")
