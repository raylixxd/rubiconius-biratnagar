import http.server
import socketserver
import threading
import time
from playwright.sync_api import sync_playwright

PORT = 9989
DIRECTORY = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\40_otto_objects"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(f"http://127.0.0.1:{PORT}")
    
    for i in range(12):
        time.sleep(1)
        loader_info = page.evaluate("""() => {
            const l = document.querySelector('.preloader');
            if (!l) return { exists: false };
            const cs = getComputedStyle(l);
            return {
                exists: true,
                opacity: cs.opacity,
                display: cs.display,
                visibility: cs.visibility,
                text: l.innerText.trim().replace(/\\n/g, ' ')
            };
        }""")
        print(f"Second {i+1}: {loader_info}")
        if not loader_info["exists"] or loader_info["opacity"] == "0" or loader_info["display"] == "none":
            print("Loader exit triggered!")
            break
            
    time.sleep(2)
    page.screenshot(path=r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\ottoobjects_analysis\local_replica_hero.png")
    
    # Scroll down 2000px and take screenshot
    page.mouse.wheel(0, 2000)
    time.sleep(2)
    page.screenshot(path=r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\ottoobjects_analysis\local_replica_scrolled.png")
    
    print("Done testing local replica!")
    browser.close()

httpd.shutdown()
