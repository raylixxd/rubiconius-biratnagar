import http.server
import socketserver
import threading
import time
from playwright.sync_api import sync_playwright
import os

PORT = 9991
DIRECTORY = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\reverse_engineered_vault\41_ofcurstormy"
out_dir = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\ofcurstormy_analysis"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()
print(f"Serving local replica at http://127.0.0.1:{PORT}...")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(f"http://127.0.0.1:{PORT}", wait_until="domcontentloaded")
    
    print("Waiting 4.5s for loader to reach 100%...")
    time.sleep(5)
    
    # Check if Enter website button is now clickable
    btn = page.query_selector("button:has-text('Enter website')")
    if btn:
        print("Clicking 'Enter website' button...")
        btn.click()
        print("Clicked! Waiting 2s for transition...")
        time.sleep(2.5)
    else:
        print("Button not found directly, checking all buttons...")
        btns = page.query_selector_all("button")
        for b in btns:
            txt = b.inner_text().strip()
            print(f"Found button: '{txt}'")
            if "enter" in txt.lower():
                b.click()
                time.sleep(2.5)
                break
                
    # Capture hero screenshot after entering
    page.screenshot(path=os.path.join(out_dir, "replica_entered_hero.png"))
    print("Saved replica_entered_hero.png!")
    
    # Scroll down 1500px and capture
    page.mouse.wheel(0, 1200)
    time.sleep(1.5)
    page.screenshot(path=os.path.join(out_dir, "replica_scroll_1200.png"))
    print("Saved replica_scroll_1200.png!")
    
    # Scroll further down to projects
    page.mouse.wheel(0, 1800)
    time.sleep(1.5)
    page.screenshot(path=os.path.join(out_dir, "replica_scroll_3000.png"))
    print("Saved replica_scroll_3000.png!")
    
    browser.close()

httpd.shutdown()
print("Local replica verification complete!")
