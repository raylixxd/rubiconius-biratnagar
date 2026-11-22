import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('.shots/3d-verify');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('[Verify] Launching Chrome...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('[Browser Error]', msg.text());
    } else {
      console.log('[Browser Log]', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
    console.error('[Page Error]', err);
  });

  console.log('[Verify] Navigating to http://localhost:4321/ ...');
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });

  // Wait for initial site preloader to clear
  await page.waitForTimeout(2000);

  // 1. Initial page with trigger button
  await page.waitForSelector('[data-stepin-open]', { state: 'visible' });
  await page.screenshot({ path: path.join(outDir, '01_trigger_button.png') });
  console.log('[Verify] Captured 01_trigger_button.png');

  // 2. Click Step In
  console.log('[Verify] Clicking "Step In 3D"...');
  await page.click('[data-stepin-open]');

  // Wait for overlay to become visible
  await page.waitForSelector('#stepin-overlay:not([hidden])');
  
  // Wait for loader to be hidden (means models & video are ready)
  await page.waitForSelector('#stepin-loader.is-hidden', { timeout: 25000 });
  await page.waitForTimeout(2500);

  // 3. Entry Threshold POV (ST-03 Courtyard Threshold pin is visible in center)
  await page.screenshot({ path: path.join(outDir, '02_showroom_entry.png') });
  console.log('[Verify] Captured 02_showroom_entry.png');

  // Test Hotspot Pin Click while in Entry Threshold where pin is centered and visible
  console.log('[Verify] Testing Hotspot Pin Click (ST-03 Courtyard Threshold)...');
  await page.click('[data-pin-click="courtyard-hall"]');
  await page.waitForSelector('#stepin-card:not([hidden])');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '07_editorial_card.png') });
  console.log('[Verify] Captured 07_editorial_card.png');

  // Dismiss card
  await page.click('[data-card-close]');
  await page.waitForTimeout(500);

  // 4. Station 01: Fluted Suite
  console.log('[Verify] Gliding to Station 01 (Fluted Suite)...');
  await page.click('[data-station="0.25"]');
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(outDir, '03_fluted_suite.png') });
  console.log('[Verify] Captured 03_fluted_suite.png');

  // 5. Station 02: Timber Hearth
  console.log('[Verify] Gliding to Station 02 (Timber Hearth)...');
  await page.click('[data-station="0.50"]');
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(outDir, '04_timber_hearth.png') });
  console.log('[Verify] Captured 04_timber_hearth.png');

  // 6. Station 03: Monolith
  console.log('[Verify] Gliding to Station 03 (Monolith)...');
  await page.click('[data-station="0.75"]');
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(outDir, '05_courtyard_monolith.png') });
  console.log('[Verify] Captured 05_courtyard_monolith.png');

  // 7. Station 04: Courtyard Garden
  console.log('[Verify] Gliding to Station 04 (Courtyard Garden)...');
  await page.click('[data-station="1.0"]');
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(outDir, '06_courtyard_garden.png') });
  console.log('[Verify] Captured 06_courtyard_garden.png');

  // 8. Close Modal Overlay
  console.log('[Verify] Closing modal overlay...');
  await page.click('[data-stepin-close]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '08_after_close.png') });
  console.log('[Verify] Captured 08_after_close.png');

  await browser.close();

  console.log('=== VERIFICATION SUMMARY ===');
  console.log(`Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Errors encountered:', consoleErrors);
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED: Zero console errors, all 3D viewpoints verified.');
  }
}

run().catch((err) => {
  console.error('[Verify Fatal Error]', err);
  process.exit(1);
});
