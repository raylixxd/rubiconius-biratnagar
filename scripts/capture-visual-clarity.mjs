import { chromium } from 'playwright';
import path from 'node:path';

const outDir = 'C:/Users/Lenovo LOQ/.gemini/antigravity/brain/9b22d9ce-b783-415e-afb2-2d6d7846f822';

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
  
  // 1. Desktop 1440x900
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto('https://rubiconius-biratnagar.vercel.app', { waitUntil: 'networkidle' });
  await desktop.waitForTimeout(2200); // allow monogram intro reveal to complete
  
  await desktop.screenshot({ path: path.join(outDir, 'clarity_desktop_hero.png'), fullPage: false });
  
  const worksSection = desktop.locator('#works');
  if (await worksSection.count() > 0) {
    await worksSection.scrollIntoViewIfNeeded();
    await desktop.waitForTimeout(800);
    await desktop.screenshot({ path: path.join(outDir, 'clarity_desktop_works.png'), fullPage: false });
  }

  // 2. Mobile 390x844
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.goto('https://rubiconius-biratnagar.vercel.app', { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(2200);
  await mobile.screenshot({ path: path.join(outDir, 'clarity_mobile_hero.png'), fullPage: false });

  const mobileWorks = mobile.locator('#works');
  if (await mobileWorks.count() > 0) {
    await mobileWorks.scrollIntoViewIfNeeded();
    await mobile.waitForTimeout(800);
    await mobile.screenshot({ path: path.join(outDir, 'clarity_mobile_works.png'), fullPage: false });
  }

  // Extract rendered image natural dimensions and display properties
  const imgStats = await desktop.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.currentSrc.split('/').pop(),
      alt: img.alt,
      displayWidth: img.clientWidth,
      displayHeight: img.clientHeight,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete
    }));
  });

  console.log(JSON.stringify(imgStats, null, 2));

  await browser.close();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
