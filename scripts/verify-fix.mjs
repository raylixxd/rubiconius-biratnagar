import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const PORT = 4333;
const BASE = `http://localhost:${PORT}`;
const ARTIFACT_DIR = 'C:/Users/Lenovo LOQ/.gemini/antigravity/brain/9092545d-aa74-4b9d-8715-8cff5b2cd50c';

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

async function run() {
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

  // Test 1: Capture loader animation
  console.log('Navigating to test loader...');
  const navPromise = page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400); // Wait 400ms into loader animation
  const loaderShot = path.join(ARTIFACT_DIR, 'loader_animation_active.png');
  await page.screenshot({ path: loaderShot });
  console.log(`Saved loader screenshot: ${loaderShot}`);

  await navPromise;
  await page.waitForTimeout(1600); // Wait for loader exit

  // Test 2: Check works section
  const worksSec = page.locator('#works');
  await worksSec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  const worksData = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.work-card'));
    return cards.map((card, i) => {
      const media = card.querySelector('.work-card__media');
      const img = card.querySelector('img');
      const rect = media?.getBoundingClientRect();
      const style = media ? window.getComputedStyle(media) : null;
      return {
        cardIndex: i,
        width: rect?.width,
        height: rect?.height,
        top: rect?.top,
        imgSrc: img?.src,
        hasGl: media?.hasAttribute('data-gl'),
        isGlReady: media?.classList.contains('is-gl-ready'),
      };
    });
  });
  console.log('Works cards telemetry:', JSON.stringify(worksData, null, 2));

  const worksShot = path.join(ARTIFACT_DIR, 'works_section_fixed.png');
  await page.screenshot({ path: worksShot });
  console.log(`Saved works section fixed screenshot: ${worksShot}`);

  await browser.close();
  if (serverProcess) serverProcess.kill();
  console.log('Verification completed successfully!');
}

run().catch((e) => {
  console.error(e);
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});
