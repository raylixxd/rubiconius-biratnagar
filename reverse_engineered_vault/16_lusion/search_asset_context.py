import os
import re

base_dir = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\16_lusion"
js_file = os.path.join(base_dir, "hoisted.CUO_IjfL.js")
with open(js_file, "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

# Search for /assets/ occurrences with surrounding context
matches = [m.start() for m in re.finditer(r'/assets/', js)]
print(f"Found {len(matches)} occurrences of /assets/")
for idx in matches:
    start = max(0, idx - 100)
    end = min(len(js), idx + 200)
    print(f"--- Context at {idx} ---")
    print(js[start:end])
    print()
