import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const PORT = 4329;
const BASE = `http://localhost:${PORT}`;
const ROUTES = ['/', '/works/', '/works/heritage-panelled-gallery/', '/practice/', '/showroom/'];
const ARTIFACT_DIR = 'C:/Users/Lenovo LOQ/.gemini/antigravity/brain/9092545d-aa74-4b9d-8715-8cff5b2cd50c/scratch';
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

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox'],
    });
  } catch {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox'],
    });
  }

  let totalFailures = 0;
  function report(name, pass, detail = '') {
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
    if (!pass) totalFailures++;
  }

  try {
    // 1. Desktop (1440x900) Suite
    const dCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const dPage = await dCtx.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    const consoleWarnings = [];
    dPage.on('pageerror', (err) => pageErrors.push(err.message));
    dPage.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
      if (msg.type() === 'warning') consoleWarnings.push(msg.text());
    });

    for (const route of ROUTES) {
      pageErrors.length = 0;
      consoleErrors.length = 0;
      const res = await dPage.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await dPage.waitForTimeout(1100);
      const status = res?.status() ?? 0;
      report(`Desktop HTTP 200: ${route}`, status === 200, `status=${status}`);

      const overflow = await dPage.evaluate(() => ({
        hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
      }));
      report(`Desktop Zero Overflow: ${route}`, !overflow.hasOverflow, `${overflow.sw} <= ${overflow.iw}`);

      if (route === '/') {
        const heroCounts = await dPage.evaluate(() => ({
          edgeTab: document.querySelectorAll('.edge-tab').length,
          metaTop: document.querySelectorAll('.cinema-hero__meta-top').length,
          ctas: document.querySelectorAll('.cinema-hero__ctas a, .cinema-hero__ctas button').length,
          pillTag: document.querySelectorAll('.hero-pill-tag').length,
          filmToggle: document.querySelectorAll('[data-hero-video-toggle]').length,
        }));
        report(
          'Simplified Hero Check',
          heroCounts.edgeTab === 0 &&
            heroCounts.metaTop === 0 &&
            heroCounts.ctas === 1 &&
            heroCounts.pillTag === 0 &&
            heroCounts.filmToggle === 0,
          JSON.stringify(heroCounts)
        );
        await dPage.waitForTimeout(1000);
        await dPage.screenshot({ path: path.join(ARTIFACT_DIR, 'qa-home-desktop.png') });
      }

      if (route === '/works/heritage-panelled-gallery/') {
        await dPage.evaluate(() => document.querySelector('[data-showcase-viewport]')?.scrollIntoView({ behavior: 'instant' }));
        await dPage.waitForTimeout(400);
        await dPage.evaluate(() => window.scrollBy(0, 260));
        await dPage.waitForTimeout(800);

        const glReady = await dPage.evaluate(() => ({
          glOn: document.documentElement.classList.contains('gl-on'),
          readyPlates: document.querySelectorAll('.showcase-plate__media.is-gl-ready').length,
        }));
        report('Showcase GL Ready', glReady.glOn && glReady.readyPlates >= 1, JSON.stringify(glReady));
        await dPage.screenshot({ path: path.join(ARTIFACT_DIR, 'qa-showcase-desktop.png') });

        const beforeY = await dPage.evaluate(() => window.scrollY);
        await dPage.locator('.showcase-plate').first().click();
        await dPage.waitForTimeout(950);

        const inspOpen = await dPage.evaluate(() => {
          const drawer = document.getElementById('consult-drawer');
          const insp = document.querySelector('[data-showcase-inspector]');
          return {
            glFront: document.getElementById('gl')?.classList.contains('gl--inspector') ?? false,
            dialogVisible: insp ? !insp.hasAttribute('hidden') : false,
            drawerAboveInspector:
              drawer && insp ? Number(getComputedStyle(drawer).zIndex) > Number(getComputedStyle(insp).zIndex) : false,
          };
        });
        report(
          'Fullscreen WebGL Inspector Open',
          inspOpen.glFront && inspOpen.dialogVisible && inspOpen.drawerAboveInspector,
          JSON.stringify(inspOpen)
        );
        await dPage.screenshot({ path: path.join(ARTIFACT_DIR, 'qa-inspector-desktop.png') });

        // Test opening WhatsApp drawer on top of inspector & closing cleanly
        await dPage.locator('[data-inspector-cta]').click();
        await dPage.waitForTimeout(450);
        const drawerOpen = await dPage.evaluate(() => !document.getElementById('consult-drawer')?.hidden);
        report('WhatsApp Drawer Above Inspector', drawerOpen);
        await dPage.keyboard.press('Escape');
        await dPage.waitForTimeout(450);
        await dPage.keyboard.press('Escape');
        await dPage.waitForTimeout(800);

        const afterClose = await dPage.evaluate(() => ({
          afterY: window.scrollY,
          glFront: document.getElementById('gl')?.classList.contains('gl--inspector') ?? false,
          dialogHidden: document.querySelector('[data-showcase-inspector]')?.hasAttribute('hidden') ?? false,
        }));
        const drift = Math.abs(afterClose.afterY - beforeY);
        report(
          'Inspector Close & 0px Scroll Drift',
          afterClose.dialogHidden && !afterClose.glFront && drift <= 1,
          `drift=${drift}px`
        );
      }

      const filteredConsole = consoleErrors.filter((e) => !e.includes('favicon.ico'));
      report(
        `Desktop Zero Errors: ${route}`,
        pageErrors.length === 0 && filteredConsole.length === 0,
        pageErrors.length ? pageErrors.join('; ') : filteredConsole.join('; ') || 'clean'
      );
    }

    // 2. Persistent OGL FLIP + 10-Navigation Stress Test (ClientRouter swaps)
    pageErrors.length = 0;
    consoleErrors.length = 0;
    consoleWarnings.length = 0;

    await dPage.goto(`${BASE}/works/`, { waitUntil: 'domcontentloaded' });
    await dPage.waitForTimeout(1000);
    await dPage.locator('a[data-transition="flip"][data-gl-flip="heritage-panelled-gallery"]').first().click();
    await dPage.waitForTimeout(1300);
    const flipLanded = dPage.url().includes('/works/heritage-panelled-gallery/');
    const notStuck = await dPage.evaluate(() => {
      const gl = document.getElementById('gl');
      return !gl?.classList.contains('gl--flip') && !gl?.classList.contains('gl--inspector');
    });
    report('Persistent OGL FLIP Morph Landed', flipLanded && notStuck, dPage.url());

    await dPage.goBack();
    await dPage.waitForTimeout(1100);

    const spaHrefs = [
      '/',
      '/works/',
      '/works/heritage-panelled-gallery/',
      '/practice/',
      '/showroom/',
      '/',
      '/works/',
      '/practice/',
      '/',
    ];
    for (const href of spaHrefs) {
      await dPage.locator(`a[href="${href}"]`).first().click();
      await dPage.waitForTimeout(900);
    }
    const ctxWarnings = consoleWarnings.filter((w) => /Too many active WebGL contexts/i.test(w));
    const finalErrors = pageErrors.length + consoleErrors.filter((e) => !e.includes('favicon.ico')).length;
    const cleanAfter10 = await dPage.evaluate(() => {
      const gl = document.getElementById('gl');
      return !gl?.classList.contains('gl--flip') && !gl?.classList.contains('gl--inspector');
    });
    report(
      '10-Navigation Stress Test (Zero Context Warnings)',
      ctxWarnings.length === 0 && finalErrors === 0 && cleanAfter10,
      `warnings=${ctxWarnings.length}, errors=${finalErrors}`
    );

    await dCtx.close();

    // 3. Mobile (390x844) Suite
    const mCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15',
    });
    const mPage = await mCtx.newPage();
    const mErrors = [];
    mPage.on('pageerror', (err) => mErrors.push(err.message));

    for (const route of ROUTES) {
      mErrors.length = 0;
      const res = await mPage.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await mPage.waitForTimeout(800);
      const status = res?.status() ?? 0;
      const overflow = await mPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      report(`Mobile Check: ${route}`, status === 200 && overflow && mErrors.length === 0, `status=${status}`);
      if (route === '/works/heritage-panelled-gallery/') {
        await mPage.evaluate(() => document.getElementById('case-showcase')?.scrollIntoView({ behavior: 'instant' }));
        await mPage.waitForTimeout(450);
        await mPage.screenshot({ path: path.join(ARTIFACT_DIR, 'qa-showcase-mobile.png') });
      }
    }
    await mCtx.close();
  } finally {
    await browser.close();
    if (serverProcess) serverProcess.kill('SIGTERM');
  }

  console.log(`\n==========================================`);
  if (totalFailures === 0) {
    console.log('ALL COMPLEX + HERO QA CHECKS PASSED (0 failures)');
    process.exit(0);
  } else {
    console.error(`QA FAILED (${totalFailures} failures)`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal QA error:', err);
  if (serverProcess) serverProcess.kill('SIGTERM');
  process.exit(1);
});
