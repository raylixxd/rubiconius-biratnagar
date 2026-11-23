import asyncio
import os
import json
from playwright.async_api import async_playwright

out_dir = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\ottoobjects_analysis"
os.makedirs(out_dir, exist_ok=True)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        
        all_requests = []
        page.on("request", lambda r: all_requests.append({
            "url": r.url,
            "resource_type": r.resource_type,
            "method": r.method
        }))
        
        print("Navigating to https://ottoobjects.com/ ...")
        await page.goto("https://ottoobjects.com/", wait_until="networkidle", timeout=60000)
        
        # Check preloader
        for i in range(20):
            status = await page.evaluate("""() => {
                const loader = document.querySelector('.preloader');
                if (!loader) return { exists: false, visible: false, text: '' };
                const style = getComputedStyle(loader);
                return {
                    exists: true,
                    visible: style.display !== 'none' && style.opacity !== '0' && style.visibility !== 'hidden',
                    text: loader.innerText
                };
            }""")
            print(f"Waiting loader {i}s: {status}")
            if not status["visible"]:
                print("Loader finished!")
                break
            await asyncio.sleep(1)
            
        await asyncio.sleep(2)
        await page.screenshot(path=os.path.join(out_dir, "01_loaded_hero.png"))
        print("Saved 01_loaded_hero.png")
        
        # Capture scroll progression
        for step, scroll_y in enumerate([1000, 2500, 5000, 8000, 12000, 15000], start=2):
            await page.mouse.wheel(0, 1500)
            await asyncio.sleep(1.5)
            await page.screenshot(path=os.path.join(out_dir, f"{step:02d}_scroll_{scroll_y}.png"))
            print(f"Saved {step:02d}_scroll_{scroll_y}.png")
            
        with open(os.path.join(out_dir, "network_requests.json"), "w", encoding="utf-8") as f:
            json.dump(all_requests, f, indent=2)
            
        print("Crawl complete!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
