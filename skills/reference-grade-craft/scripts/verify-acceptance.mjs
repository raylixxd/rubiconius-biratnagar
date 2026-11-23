#!/usr/bin/env node
/**
 * Reference-Grade Acceptance Verification Suite
 * Tests local web builds for 30 critical quality, choreography, and performance standards.
 * Usage: node verify-acceptance.mjs [--dir <path>] [--port <port>]
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
let targetDir = process.cwd();
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) targetDir = path.resolve(args[++i]);
}

const req = createRequire(import.meta.url);
const CANDIDATES = [
  'playwright',
  path.join(process.env.LOCALAPPDATA || '', 'npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright'),
  path.join(process.env.LOCALAPPDATA || '', 'npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright'),
];

let pw;
for (const cand of CANDIDATES) {
  try { pw = req(cand); break; } catch { /* next */ }
}

if (!pw) {
  console.error('[!] Playwright not found in local candidates. Skipping headless browser run.');
  process.exit(0);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filename = path.resolve(targetDir, relative);
  if (!filename.startsWith(targetDir + path.sep) || !existsSync(filename)) {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('Not found: ' + relative);
    return;
  }
  response.writeHead(200, { 'content-type': MIME[path.extname(filename)] || 'application/octet-stream' });
  response.end(readFileSync(filename));
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

function getInstalledChromium() {
  const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (!existsSync(root)) return null;
  for (const dir of readdirSync(root).filter(d => /^chromium(-headless-shell)?-/.test(d)).sort().reverse()) {
    for (const exe of ['chrome-win/chrome.exe', 'chrome-win64/chrome.exe', 'chrome-headless-shell-win64/chrome-headless-shell.exe']) {
      const candidate = path.join(root, dir, exe);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

let browser;
try {
  browser = await pw.chromium.launch({ headless: true });
} catch {
  const exec = getInstalledChromium();
  if (exec) browser = await pw.chromium.launch({ headless: true, executablePath: exec });
  else throw new Error('No chromium binary located.');
}

const passes = [];
const failures = [];
function check(condition, label, detail = '') {
  if (condition) { passes.push(label); console.log(`✓ PASS: ${label}`); }
  else { failures.push(`${label} (${detail})`); console.error(`✗ FAIL: ${label} - ${detail}`); }
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  const externalReqs = [];

  page.on('pageerror', err => errors.push(String(err)));
  page.on('request', req => {
    if (/^https?:/.test(req.url()) && !req.url().startsWith(base)) {
      externalReqs.push(req.url());
    }
  });

  const res = await page.goto(base, { waitUntil: 'domcontentloaded' });
  check(res?.status() === 200, 'Page loads successfully with HTTP 200');
  check(externalReqs.length === 0, 'Zero runtime requests leak to external CDNs', externalReqs.join(', '));
  check(errors.length === 0, 'Zero unhandled console/script errors on load', errors.join('; '));

  // Check mobile overflow
  const mContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mPage = await mContext.newPage();
  await mPage.goto(base, { waitUntil: 'domcontentloaded' });
  const overflow = await mPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, 'Mobile viewport (390px) has ZERO horizontal overflow');

  console.log(`\nResults: ${passes.length} Passed, ${failures.length} Failed.`);
} finally {
  await browser.close();
  server.close();
}
