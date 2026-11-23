from bs4 import BeautifulSoup

p = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\ofcurstormy_analysis\page.html"
with open(p, "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), "html.parser")

for el in soup.find_all(True):
    txt = el.get_text().strip()
    if txt.lower() == "enter website":
        print(f"Tag: <{el.name}> Class: {el.get('class')} Id: {el.get('id')} Parent: <{el.parent.name} class='{el.parent.get('class')}'>")
