import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:4321';
const OUT = path.resolve('.shots/overhaul-qa');
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = ['/', '/practice/', '/works/munal-residence/', '/works/dharan-foothills-villa/', '/works/sal-kota-penthouse/', '/showroom/'];
const BANNED_RE = /\b(ST-0\d|MAT-0\d|3D-0\d|staging|placeholder|concept study)\b/i;
const COCKPIT_SEL = '.frame-cross, .hero-pins, .plate-hud, .arch-rails, .velocity-ribbon, .filmstrip-sec, #cursor';

let failures = 0;
function check(name, pass, detail = '') {
  const icon = pass ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${name}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failures++;
}

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });

try {
  // Desktop 1440x900
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);

    const audit = await page.evaluate((sel) => {
      const text = document.body.innerText || '';
      const cockpitCount = document.querySelectorAll(sel).length;
      const overflow = document.documentElement.scrollWidth > window.innerWidth;
      return { text, cockpitCount, overflow, sw: document.documentElement.scrollWidth, iw: window.innerWidth };
    }, COCKPIT_SEL);

    const bannedMatch = audit.text.match(BANNED_RE);
    check(`G2 Anti-staging (${route})`, !bannedMatch, bannedMatch ? `Found: ${bannedMatch[0]}` : 'clean');
    check(`G3 Cockpit purge (${route})`, audit.cockpitCount === 0, `count=${audit.cockpitCount}`);
    check(`G4 Desktop overflow (${route})`, !audit.overflow, `${audit.sw}/${audit.iw}`);
  }

  // Homepage detailed checks + screenshots
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, '01-desktop-hero.png') });

  const homeMetrics = await page.evaluate(() => {
    const heroImg = document.querySelector('.hero__plate-media img');
    const heroRect = heroImg?.getBoundingClientRect();
    const factNum = document.querySelector('.fact-cell__num');
    const footerPlinth = document.querySelector('.footer__plinth');
    const showroomTrack = document.querySelector('.showroom-inline-track');
    const header = document.querySelector('.site-header');

    let minFont = 999;
    let minFontEl = '';
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.classList.contains('sr-only')) continue;
      if (!el.textContent?.trim() || el.children.length > 0) continue;
      const fs = parseFloat(cs.fontSize);
      if (fs > 0 && fs < minFont) {
        minFont = fs;
        minFontEl = `${el.tagName}.${el.className} (${fs}px)`;
      }
    }
    return {
      heroTop: heroRect?.top ?? 9999,
      heroBottom: heroRect?.bottom ?? 9999,
      innerHeight: window.innerHeight,
      headerH: header?.getBoundingClientRect().height ?? 0,
      factFont: factNum ? getComputedStyle(factNum).fontFamily : '',
      footerBg: footerPlinth ? getComputedStyle(footerPlinth).backgroundColor : '',
      showroomBg: showroomTrack ? getComputedStyle(showroomTrack).backgroundColor : '',
      minFont,
      minFontEl,
      workCards: document.querySelectorAll('.work-card img').length,
    };
  });

  check('G5 Desktop hero image visible above fold', homeMetrics.heroTop < homeMetrics.innerHeight * 0.55 && homeMetrics.heroBottom <= homeMetrics.innerHeight + 80, `top=${Math.round(homeMetrics.heroTop)}, bottom=${Math.round(homeMetrics.heroBottom)}`);
  check('Header height <= 72px', homeMetrics.headerH <= 72, `${homeMetrics.headerH}px`);
  check('G6 Min font size >= 13px', homeMetrics.minFont >= 12.9, `min=${homeMetrics.minFont}px (${homeMetrics.minFontEl})`);
  check('G7 Fact num uses Switzer', homeMetrics.factFont.toLowerCase().includes('switzer'), homeMetrics.factFont);
  check('G7 Footer uses Smoked Timber rgb(35, 30, 26)', homeMetrics.footerBg === 'rgb(35, 30, 26)', homeMetrics.footerBg);
  check('G7 Showroom uses Smoked Timber rgb(35, 30, 26)', homeMetrics.showroomBg === 'rgb(35, 30, 26)', homeMetrics.showroomBg);
  check('Band 2 renders visible portfolio photos', homeMetrics.workCards === 3, `cards=${homeMetrics.workCards}`);

  // Scroll captures on desktop
  await page.locator('#works').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '02-desktop-works.png') });

  await page.locator('.atelier-band').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '03-desktop-materiality.png') });

  await page.locator('.showroom-bridge-wrap').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '04-desktop-apron.png') });

  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '05-desktop-footer.png') });
  await ctx.close();

  // Tablet & Mobile checks
  for (const vp of [
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'mobile-360', width: 360, height: 800 },
  ]) {
    const mctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.width < 768 });
    const mp = await mctx.newPage();
    await mp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await mp.waitForTimeout(700);
    await mp.screenshot({ path: path.join(OUT, `06-${vp.name}-hero.png`) });

    const m = await mp.evaluate(() => {
      const heroRect = document.querySelector('.hero__plate-media img')?.getBoundingClientRect();
      return {
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
        heroTop: heroRect?.top ?? 9999,
        heroBottom: heroRect?.bottom ?? 9999,
        ih: window.innerHeight,
      };
    });
    check(`G4 Zero overflow (${vp.name})`, m.sw <= m.iw, `${m.sw}/${m.iw}`);
    if (vp.width < 768) {
      check(`G5 Mobile hero image above fold (${vp.name})`, m.heroTop < m.ih * 0.55 && m.heroBottom <= m.ih, `top=${Math.round(m.heroTop)}, bottom=${Math.round(m.heroBottom)} / ${m.ih}`);
      await mp.locator('#works').scrollIntoViewIfNeeded();
      await mp.waitForTimeout(400);
      await mp.screenshot({ path: path.join(OUT, `07-${vp.name}-works.png`) });
    }
    await mctx.close();
  }
} finally {
  await browser.close();
}

console.log(failures === 0 ? '\nALL OVERHAUL GATES PASSED' : `\n${failures} GATE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
