import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';

const PORT = 4328;
const BASE = `http://localhost:${PORT}`;
const ROUTES = [
  '/',
  '/works/',
  '/works/heritage-panelled-gallery/',
  '/practice/',
  '/showroom/',
];

function isPortOpen(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
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
  const open = await isPortOpen(PORT);
  if (!open) {
    console.log(`Starting astro preview on port ${PORT}...`);
    serverProcess = spawn('npx', ['astro', 'preview', '--port', String(PORT)], {
      stdio: 'pipe',
      shell: true,
    });
    const ready = await waitForServer(PORT);
    if (!ready) {
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
  } catch (e) {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox'],
    });
  }

  let totalFailures = 0;
  function report(name, pass, detail = '') {
    const status = pass ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${name}${detail ? ` — ${detail}` : ''}`);
    if (!pass) totalFailures++;
  }

  const viewports = [
    { name: 'Desktop (1440x900)', width: 1440, height: 900 },
    { name: 'Mobile (390x844)', width: 390, height: 844 },
  ];

  try {
    for (const vp of viewports) {
      console.log(`\n--- Testing Viewport: ${vp.name} ---`);
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: vp.width < 768 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15' : undefined,
      });
      const page = await ctx.newPage();

      const pageErrors = [];
      const consoleErrors = [];

      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      for (const route of ROUTES) {
        pageErrors.length = 0;
        consoleErrors.length = 0;

        const res = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(600);

        const status = res?.status() ?? 0;
        report(`${vp.name} HTTP 200: ${route}`, status === 200, `status=${status}`);

        const overflow = await page.evaluate(() => {
          const sw = document.documentElement.scrollWidth;
          const iw = window.innerWidth;
          return { hasOverflow: sw > iw, sw, iw };
        });

        report(`${vp.name} Zero Overflow: ${route}`, !overflow.hasOverflow, `${overflow.sw}px <= ${overflow.iw}px`);

        const filteredConsoleErrors = consoleErrors.filter((e) => !e.includes('favicon.ico'));
        report(
          `${vp.name} Zero Page/Console Errors: ${route}`,
          pageErrors.length === 0 && filteredConsoleErrors.length === 0,
          pageErrors.length
            ? `pageErrors: ${pageErrors.join('; ')}`
            : filteredConsoleErrors.length
              ? `console: ${filteredConsoleErrors.join('; ')}`
              : 'clean'
        );
      }

      await ctx.close();
    }
  } finally {
    await browser.close();
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }

  console.log(`\n==========================================`);
  if (totalFailures === 0) {
    console.log(`ALL VERIFICATION CHECKS PASSED (0 failures)`);
    process.exit(0);
  } else {
    console.error(`VERIFICATION FAILED (${totalFailures} failures)`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  if (serverProcess) serverProcess.kill('SIGTERM');
  process.exit(1);
});
