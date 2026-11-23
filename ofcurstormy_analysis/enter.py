import asyncio
import os
from playwright.async_api import async_playwright

out_dir = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\ofcurstormy_analysis"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        await page.goto("https://ofcurstormy.vercel.app/", wait_until="domcontentloaded")
        await asyncio.sleep(2)
        
        # Click enter website button
        btn = await page.query_selector("button")
        if btn:
            print(f"Clicking button: {await btn.inner_text()}...")
            await btn.click()
            await asyncio.sleep(3)
            
        await page.screenshot(path=os.path.join(out_dir, "entered_hero.png"), timeout=10000)
        print("Saved entered_hero.png")
        
        canvases = await page.evaluate("""() => {
            return Array.from(document.querySelectorAll('canvas')).map(c => ({
                id: c.id,
                className: c.className,
                w: c.width,
                h: c.height
            }));
        }""")
        print("Canvases after enter:", canvases)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
