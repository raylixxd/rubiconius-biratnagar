import json
from bs4 import BeautifulSoup

p = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\40_otto_objects\index.html"
with open(p, "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), "html.parser")

print("Title:", soup.title.string if soup.title else "None")
elements = soup.find_all(["header", "section", "footer", "main", "nav", "canvas", "div"])
for el in elements:
    cls = " ".join(el.get("class", []))
    if any(k in cls for k in ["hero", "preloader", "room", "story", "collection", "gallery", "footer", "card", "nav", "canvas"]):
        print(f"<{el.name}> id='{el.get('id', '')}' class='{cls}'")
