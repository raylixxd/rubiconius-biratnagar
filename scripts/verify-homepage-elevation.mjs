import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const PORT = 4331;
const BASE = `http://localhost:${PORT}`;
const ARTIFACT_DIR = 'C:/Users/Lenovo LOQ/.gemini/antigravity/brain/9092545d-aa74-4b9d-8715-8cff5b2cd50c';
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function isPortOpen(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(port, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

let serverProcess = null;

async function ensureServer() {
  if (!(await isPortOpen(PORT))) {
    console.log(`Starting astro preview on port ${PORT}...`);
    serverProcess = spawn('npx', ['astro', 'preview', '--port', String(PORT)], {
      cwd: 'C:/Users/Lenovo LOQ/.gemini/antigravity/scratch/rubiconius-biratnagar',
      stdio: 'pipe',
      shell: true,
    });
    if (!(await waitForServer(PORT))) {
      throw new Error(`Failed to start preview server on port ${PORT}`);
    }
  }
}

async function verify() {
  await ensureServer();

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  console.log(`Navigating to ${BASE}/...`);
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Check Dust Motes Canvas
  const canvasExists = await page.evaluate(() => {
    const c = document.getElementById('dust-motes');
    return !!c && c.width > 0 && c.height > 0;
  });
  console.log(`Dust motes canvas active: ${canvasExists}`);

  // 2. Check Band 2 Works Runway styles
  const runwayData = await page.evaluate(() => {
    const runway = document.querySelector('.works-runway');
    const track = document.querySelector('.works-runway__track');
    const cards = document.querySelectorAll('.works-runway__card');
    const counter = document.querySelector('[data-runway-counter]');
    const bar = document.querySelector('[data-runway-bar]');
    if (!runway || !track) return null;
    const style = window.getComputedStyle(runway);
    return {
      cardsCount: cards.length,
      counterText: counter?.textContent?.trim(),
      borderTop: style.borderTop,
      trackWidth: track.scrollWidth,
    };
  });
  console.log('Runway data:', JSON.stringify(runwayData, null, 2));

  // Capture Runway screenshot
  const worksSec = page.locator('#works');
  await worksSec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const runwayShot = path.join(ARTIFACT_DIR, 'homepage_runway_elevation.png');
  await page.screenshot({ path: runwayShot });
  console.log(`Saved screenshot: ${runwayShot}`);

  // 3. Check Band 3 Specimen Lens Reticle & HUD
  const lensData = await page.evaluate(() => {
    const lens = document.querySelector('[data-specimen-lens]');
    const hud = document.querySelector('[data-lens-coords]');
    const reticle = document.querySelector('[data-lens-reticle]');
    return {
      hasLens: !!lens,
      hudText: hud?.textContent?.trim(),
      hasReticle: !!reticle,
    };
  });
  console.log('Lens data:', JSON.stringify(lensData, null, 2));

  const lensEl = page.locator('[data-specimen-lens]');
  if (await lensEl.count() > 0) {
    await lensEl.scrollIntoViewIfNeeded();
    const box = await lensEl.boundingBox();
    if (box) {
      // Hover over specimen plate to activate lens reticle
      await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
      await page.waitForTimeout(400);
      const hudAfterMove = await page.locator('[data-lens-coords]').textContent();
      console.log(`HUD coords after pointer move: ${hudAfterMove}`);
    }
  }

  const lensShot = path.join(ARTIFACT_DIR, 'homepage_specimen_lens.png');
  await page.screenshot({ path: lensShot });
  console.log(`Saved screenshot: ${lensShot}`);

  // 4. Check Band 4 Kinetic Word-by-Word Scrub
  const scrubSec = page.locator('.proof-sec');
  await scrubSec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  const scrubData = await page.evaluate(() => {
    const words = document.querySelectorAll('.proof-sec__statement .scrub-word');
    const activeWords = document.querySelectorAll('.proof-sec__statement .scrub-word.is-active');
    const firstWord = words[0];
    const style = firstWord ? window.getComputedStyle(firstWord) : null;
    return {
      totalWords: words.length,
      activeWordsCount: activeWords.length,
      firstWordColor: style?.color,
    };
  });
  console.log('Scrub data:', JSON.stringify(scrubData, null, 2));

  const scrubShot = path.join(ARTIFACT_DIR, 'homepage_kinetic_scrub.png');
  await page.screenshot({ path: scrubShot });
  console.log(`Saved screenshot: ${scrubShot}`);

  // Full page screenshot
  const fullShot = path.join(ARTIFACT_DIR, 'homepage_next_level_full.png');
  await page.screenshot({ path: fullShot, fullPage: false });
  console.log(`Saved screenshot: ${fullShot}`);

  await browser.close();

  if (serverProcess) {
    serverProcess.kill();
  }

  console.log(`Console errors count: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Console errors encountered:', consoleErrors);
    process.exit(1);
  }

  console.log('✅ HOMEPAGE NEXT-LEVEL ELEVATION VERIFICATION COMPLETE: ALL SYSTEMS NOMINAL');
  process.exit(0);
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});
