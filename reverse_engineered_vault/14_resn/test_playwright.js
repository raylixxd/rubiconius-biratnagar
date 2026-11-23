const { chromium } = require('C:/Users/Lenovo LOQ/AppData/Roaming/npm/node_modules/playwright');

(async () => {
    try {
        const browser = await chromium.launch({ headless: true });
        console.log("Playwright chromium launched successfully!");
        const page = await browser.newPage();
        await page.goto('https://example.com');
        console.log("Title:", await page.title());
        await browser.close();
    } catch (e) {
        console.error("Playwright launch error:", e);
    }
})();
