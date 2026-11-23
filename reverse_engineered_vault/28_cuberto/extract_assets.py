import os
import re
import urllib.request
import urllib.parse

vault_dir = r'C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\28_cuberto'
html_path = os.path.join(vault_dir, 'index.html')

with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# find css
css_links = set(re.findall(r'href=["\']([^"\']+\.css[^"\']*)["\']', content, re.I))
# find js
js_links = set(re.findall(r'src=["\']([^"\']+\.js[^"\']*)["\']', content, re.I))

print("CSS Links:")
for c in sorted(css_links):
    print(" ", c)

print("\nJS Links:")
for j in sorted(js_links):
    print(" ", j)

# Download assets
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

def download_file(url, out_name):
    full_url = urllib.parse.urljoin('https://cuberto.com/', url)
    out_path = os.path.join(vault_dir, out_name)
    print(f"Downloading {full_url} -> {out_name}")
    try:
        req = urllib.request.Request(full_url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            with open(out_path, 'wb') as f_out:
                f_out.write(data)
        print(f"  Saved {len(data)} bytes")
    except Exception as e:
        print(f"  Error downloading {full_url}: {e}")

for idx, c in enumerate(sorted(css_links)):
    fname = os.path.basename(urllib.parse.urlparse(c).path) or f"style_{idx}.css"
    if not fname.endswith('.css'):
        fname += '.css'
    download_file(c, f"style_{fname}")

for idx, j in enumerate(sorted(js_links)):
    fname = os.path.basename(urllib.parse.urlparse(j).path) or f"bundle_{idx}.js"
    if not fname.endswith('.js'):
        fname += '.js'
    download_file(j, f"script_{fname}")
