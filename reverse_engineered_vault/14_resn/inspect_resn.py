import urllib.request
import re
import os

target_dir = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\14_resn"
base_url = "https://resn.co.nz"
prefix = "/20260721233115_1_0_a02666f"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def download(url_path, local_rel_path):
    full_url = base_url + url_path if url_path.startswith("/") else base_url + "/" + url_path
    local_path = os.path.join(target_dir, local_rel_path)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    print(f"Fetching {full_url} -> {local_path}")
    req = urllib.request.Request(full_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
            with open(local_path, "wb") as f:
                f.write(content)
            print(f"Saved {len(content)} bytes to {local_rel_path}")
            return content
    except Exception as e:
        print(f"Error fetching {full_url}: {e}")
        return None

# Fetch loader.js
loader_content = download(f"{prefix}/js/loader.js", "loader.js")
if loader_content:
    text = loader_content.decode('utf-8', errors='ignore')
    print("Loader text snippet (first 500 chars):")
    print(text[:500])
