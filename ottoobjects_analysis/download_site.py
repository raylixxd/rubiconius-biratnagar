import urllib.request
import os
import json

target_dir = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\40_otto_objects"
os.makedirs(target_dir, exist_ok=True)

with open(r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\ottoobjects_analysis\network_requests.json", "r") as f:
    reqs = json.load(f)

urls = set()
for r in reqs:
    u = r["url"]
    if u.startswith("https://ottoobjects.com/"):
        urls.add(u)

# Also ensure all critical data files are included
critical_files = [
    "data/vase-turn.json",
    "data/vase-spin.json",
    "data/vase-tophoto.json",
    "data/vase-toiso.json",
    "data/vase-dims.json",
    "data/chair-turn.json",
    "data/chair-spin.json",
    "data/table-turn.json",
    "data/table-spin.json"
]
for cf in critical_files:
    urls.add(f"https://ottoobjects.com/{cf}")

print(f"Downloading {len(urls)} assets to {target_dir}...")

downloaded = 0
for u in sorted(urls):
    rel_path = u.replace("https://ottoobjects.com/", "")
    if not rel_path or rel_path.endswith("/"):
        local_file = os.path.join(target_dir, "index.html")
    else:
        # Strip query parameters from local filename
        clean_rel = rel_path.split("?")[0]
        local_file = os.path.join(target_dir, clean_rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(local_file), exist_ok=True)
    
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
            with open(local_file, "wb") as out_f:
                out_f.write(content)
        downloaded += 1
        print(f"[{downloaded}/{len(urls)}] {clean_rel if rel_path else 'index.html'} ({len(content)/1024:.1f} KB)")
    except Exception as e:
        print(f"Skipped {u}: {e}")

print(f"Finished downloading {downloaded} files successfully!")
