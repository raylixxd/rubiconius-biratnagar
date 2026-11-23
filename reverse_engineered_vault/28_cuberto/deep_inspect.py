import os
import re
import urllib.parse
import urllib.request

vault_dir = r'C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\28_cuberto'

# Let's inspect all files in vault_dir
files = os.listdir(vault_dir)

# Check for ES module imports in downloaded JS files
imported_chunks = set()
for f in files:
    if f.endswith('.js'):
        fpath = os.path.join(vault_dir, f)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
            text = fp.read()
            # find imports like import "..." or import(...) or from "..."
            imports = re.findall(r'(?:import|from)\s*[\'"]([^\'"]+)[\'"]', text)
            dyn_imports = re.findall(r'import\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)', text)
            for imp in imports + dyn_imports:
                if imp.endswith('.js') or '/_astro/' in imp:
                    imported_chunks.add(imp)

print("Found nested JS imports:", imported_chunks)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
for imp in imported_chunks:
    fname = os.path.basename(urllib.parse.urlparse(imp).path)
    out_name = f"script_imported_{fname}"
    out_path = os.path.join(vault_dir, out_name)
    if not os.path.exists(out_path):
        full_url = urllib.parse.urljoin('https://cuberto.com/_astro/', imp)
        try:
            print(f"Downloading nested chunk: {full_url}")
            req = urllib.request.Request(full_url, headers=headers)
            with urllib.request.urlopen(req) as resp:
                data = resp.read()
                with open(out_path, 'wb') as f_out:
                    f_out.write(data)
                print(f"  Saved {len(data)} bytes to {out_name}")
        except Exception as e:
            print(f"  Failed: {e}")

# Check fonts in CSS
fonts_found = set()
for f in os.listdir(vault_dir):
    if f.endswith('.css'):
        fpath = os.path.join(vault_dir, f)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
            text = fp.read()
            # find @font-face or url(...)
            font_urls = re.findall(r'url\s*\(\s*[\'"]?([^\'")]+)[\'"]?\s*\)', text)
            for fu in font_urls:
                if any(ext in fu for ext in ['.woff2', '.woff', '.ttf', '.otf']):
                    fonts_found.add(fu)

print("Found font URLs:", fonts_found)
