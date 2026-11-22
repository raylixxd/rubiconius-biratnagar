import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4321';
const OUT_DIR = path.resolve('.shots/showroom-qa');
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = {
  passed: true,
  checks: [],
  errors: [],
  screenshots: [],
};

function assertCheck(name, ok, detail = '') {
  results.checks.push({ name, ok: !!ok, detail });
  if (!ok) {
    results.passed = false;
    console.error(`[FAIL] ${name}: ${detail}`);
  } else {
    console.log(`[PASS] ${name}${detail ? ` (${detail})` : ''}`);
  }
}

async function waitForShowroomReady(page) {
  await page.waitForFunction(
    () => Boolean(window.__showroomDebug && window.__showroomDebug.getState().ready),
    undefined,
    { timeout: 25000 }
  );
  // Give two animation frames for settled paint
  await page.waitForTimeout(350);
}

async function run() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist'],
  });

  try {
    // =========================================================================
    // 1. DESKTOP (1440x900) FULL SHOWROOM & VISUAL QA
    // =========================================================================
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();

    const consoleErrors = [];
    const failedReqs = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('requestfailed', (req) => {
      const reason = req.failure()?.errorText || '';
      if (reason === 'net::ERR_ABORTED') return;
      failedReqs.push(`${req.url()} (${reason})`);
    });

    // Check Homepage Navbar + Hero CTA + Inline 3D Showroom Walk first
    const homeRes = await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    assertCheck('Homepage HTTP 200', homeRes?.status() === 200, `status=${homeRes?.status()}`);
    await page.waitForTimeout(1400);

    const heroChecks = await page.evaluate(() => {
      const navShowroom = document.querySelector('.site-nav__links a[href="/showroom/"]');
      const heroCta = document.querySelector('[data-hero-showroom-cta]');
      const inlineSection = document.querySelector('#showroom-inline');
      return {
        hasNav: Boolean(navShowroom),
        hasHeroCta: Boolean(heroCta),
        hasInline: Boolean(inlineSection),
      };
    });
    assertCheck('Homepage top nav includes Showroom link', heroChecks.hasNav);
    assertCheck('Homepage Hero includes Walk 3D Showroom CTA', heroChecks.hasHeroCta);
    assertCheck('Homepage includes inline #showroom-inline 3D section', heroChecks.hasInline);

    const heroShot = path.join(OUT_DIR, '10-home-hero.png');
    await page.screenshot({ path: heroShot });
    results.screenshots.push(heroShot);

    // Jump into inline 3D Showroom section on Homepage & verify GPU handoff + scroll progression
    await page.evaluate(() => {
      const sec = document.querySelector('#showroom-inline');
      sec?.scrollIntoView({ behavior: 'instant' });
    });
    await waitForShowroomReady(page);
    await page.waitForTimeout(550);

    const inlineEntry = await page.evaluate(() => {
      const st = window.__showroomDebug.getState();
      const glVis = getComputedStyle(document.querySelector('.gl-canvas')).visibility;
      const bar = document.querySelector('.showroom-inline-bar');
      const header = document.querySelector('.site-header');
      return {
        mode: st.mode,
        ready: st.ready,
        visible: st.visible,
        glPaused: glVis === 'hidden',
        barTop: bar?.getBoundingClientRect().top ?? 0,
        headerBottom: header?.getBoundingClientRect().bottom ?? 0,
      };
    });
    assertCheck('Inline 3D Showroom renders & pauses global OGL', inlineEntry.mode === 'inline' && inlineEntry.ready && inlineEntry.glPaused);
    assertCheck('Site header does not collide with inline top bar', inlineEntry.barTop >= inlineEntry.headerBottom - 4, `barTop=${Math.round(inlineEntry.barTop)}, headerBottom=${Math.round(inlineEntry.headerBottom)}`);

    const inlineShot1 = path.join(OUT_DIR, '11-home-inline-3d-entry.png');
    await page.screenshot({ path: inlineShot1 });
    results.screenshots.push(inlineShot1);

    // Scroll inline 3D showroom to Sal & Malachite (u=0.5)
    await page.evaluate(() => window.__showroomDebug.jumpTo(0.5, true));
    await page.waitForTimeout(500);
    const inlineShot2 = path.join(OUT_DIR, '12-home-inline-3d-sal.png');
    await page.screenshot({ path: inlineShot2 });
    results.screenshots.push(inlineShot2);

    // Scroll past inline showroom to footer and verify global OGL resumes cleanly
    await page.evaluate(() => {
      document.querySelector('.site-footer')?.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(450);
    const oglResumed = await page.evaluate(() => getComputedStyle(document.querySelector('.gl-canvas')).visibility !== 'hidden');
    assertCheck('Global OGL resumes cleanly after scrolling past inline showroom', oglResumed);

    // Click Fullscreen CTA via Astro ClientRouter to enter /showroom/
    await page.evaluate(() => document.querySelector('#showroom-inline')?.scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(250);
    await page.locator('[data-enter-showroom]').click();
    await page.waitForURL('**/showroom/**');
    await waitForShowroomReady(page);
    await page.waitForTimeout(900);

    // Verify OGL canvas hidden and exactly 1 showroom WebGL canvas mounted
    const initialDom = await page.evaluate(() => {
      const canvases = document.querySelectorAll('[data-showroom-canvas] canvas');
      const glCanvas = document.querySelector('.gl-canvas');
      const glVis = glCanvas ? getComputedStyle(glCanvas).display : 'none';
      const headerEl = document.querySelector('.site-header');
      const footerEl = document.querySelector('.site-footer');
      const brand = document.querySelector('.showroom-brand');
      const chapter = document.querySelector('.showroom-chapter');
      const exitBtn = document.querySelector('.showroom-exit');
      const hint = document.querySelector('[data-showroom-hint]');
      const dbg = window.__showroomDebug.getState();
      return {
        canvasCount: canvases.length,
        glHidden: glVis === 'none',
        headerHidden: !headerEl || getComputedStyle(headerEl).display === 'none',
        footerHidden: !footerEl || getComputedStyle(footerEl).display === 'none',
        brandFont: brand ? getComputedStyle(brand).fontFamily : '',
        uiFont: chapter ? getComputedStyle(chapter).fontFamily : '',
        exitBg: exitBtn ? getComputedStyle(exitBtn).backgroundColor : '',
        hintText: hint?.textContent?.trim() || '',
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        dbg,
      };
    });

    assertCheck('Single showroom WebGL canvas', initialDom.canvasCount === 1, `count=${initialDom.canvasCount}`);
    assertCheck('Global OGL canvas paused/hidden on /showroom/', initialDom.glHidden);
    assertCheck('Immersive layout hides site header & footer', initialDom.headerHidden && initialDom.footerHidden);
    assertCheck('HUD uses Boska display font', /Boska/i.test(initialDom.brandFont), initialDom.brandFont);
    assertCheck('HUD uses Switzer UI font', /Switzer/i.test(initialDom.uiFont), initialDom.uiFont);
    assertCheck('Desktop hint copy exact', initialDom.hintText === 'Scroll to walk · Drag to look', initialDom.hintText);
    assertCheck('DPR capped <= 2', initialDom.dbg.dpr <= 2, `dpr=${initialDom.dbg.dpr}`);
    assertCheck('Desktop 0px horizontal overflow', initialDom.overflowX <= 0, `overflow=${initialDom.overflowX}`);
    assertCheck('Audio muted by default', initialDom.dbg.audio.enabled === false && !initialDom.dbg.audio.ambientActive);

    // Screenshot all 5 waypoints and confirm camera moves through space
    const stops = [0, 0.25, 0.5, 0.75, 1.0];
    const camPositions = [];
    for (let i = 0; i < stops.length; i++) {
      const u = stops[i];
      await page.evaluate((target) => window.__showroomDebug.jumpTo(target, true), u);
      await page.waitForTimeout(450);
      const st = await page.evaluate(() => window.__showroomDebug.getState());
      camPositions.push(st.cam);
      const shot = path.join(OUT_DIR, `0${i + 1}-desktop-u${String(Math.round(u * 100)).padStart(3, '0')}.png`);
      await page.screenshot({ path: shot });
      results.screenshots.push(shot);
    }

    let allMoved = true;
    for (let i = 1; i < camPositions.length; i++) {
      const a = camPositions[i - 1];
      const b = camPositions[i];
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      if (dist < 0.5) allMoved = false;
    }
    assertCheck('Camera moves smoothly across all 5 waypoints', allMoved, JSON.stringify(camPositions));

    // Chapter click check: click chapter 03 (Sal & Malachite, u = 0.5)
    await page.locator('[data-chapter-btn="sal"]').click();
    await page
      .waitForFunction(() => Math.abs(window.__showroomDebug.getState().u - 0.5) < 0.03, { timeout: 7000 })
      .catch(() => {});
    const chState = await page.evaluate(() => window.__showroomDebug.getState());
    assertCheck('Chapter 03 click glides to u≈0.50', Math.abs(chState.u - 0.5) < 0.03, `u=${chState.u.toFixed(3)}`);

    // Verify hint dismissed after interaction
    const hintDismissed = await page.evaluate(() =>
      document.querySelector('[data-showroom-hint]')?.classList.contains('is-dismissed')
    );
    assertCheck('Scroll hint auto-fades after first interaction', hintDismissed);

    // Open ST-02 pin drawer & verify links + computed styles
    const pinBtn = page.locator('[data-showroom-pin="sal"] button');
    await pinBtn.click();
    await page.waitForTimeout(850);
    const drawerCheck = await page.evaluate(() => {
      const d = document.querySelector('[data-showroom-drawer]');
      const panel = d?.querySelector('.showroom-drawer__panel');
      const studyA = d?.querySelector('[data-sdrawer-study]');
      const waA = d?.querySelector('[data-sdrawer-inquire]');
      return {
        open: d && !d.hidden && d.classList.contains('is-open'),
        bg: panel ? getComputedStyle(panel).backgroundColor : '',
        studyHref: studyA?.getAttribute('href') || '',
        waHref: waA?.getAttribute('href') || '',
      };
    });
    assertCheck('Pin opens architectural drawer', drawerCheck.open, `study=${drawerCheck.studyHref}`);
    assertCheck('Drawer study link points to /works/sal-kota-penthouse/', drawerCheck.studyHref === '/works/sal-kota-penthouse/');
    assertCheck('Drawer has WhatsApp finish inquiry link', drawerCheck.waHref.startsWith('https://wa.me/9779812353149'));
    const drawerShot = path.join(OUT_DIR, '06-desktop-drawer.png');
    await page.screenshot({ path: drawerShot });
    results.screenshots.push(drawerShot);

    // Close drawer via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    const drawerClosed = await page.evaluate(() => document.querySelector('[data-showroom-drawer]')?.hidden);
    assertCheck('Escape closes drawer cleanly', drawerClosed);

    // Toggle Sound on & verify ambient nodes created
    await page.locator('[data-showroom-sound]').click();
    await page.waitForTimeout(250);
    const audioOn = await page.evaluate(() => window.__showroomDebug.getState().audio);
    assertCheck('Sound toggle activates ambient room tone', audioOn.enabled && audioOn.ambientActive, JSON.stringify(audioOn));
    await page.locator('[data-showroom-sound]').click();

    // Lifecycle Stress Test: 10 Home <-> Showroom ClientRouter Swaps
    let lifecycleClean = true;
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-showroom-exit]').click();
      await page.waitForURL(`${BASE}/`);
      await page.waitForTimeout(450);
      const onHome = await page.evaluate(() => ({
        showroomClass: document.documentElement.classList.contains('is-showroom'),
        mode: window.__showroomDebug?.getState().mode ?? null,
        inlineCanvases: document.querySelectorAll('#showroom-inline [data-showroom-canvas] canvas').length,
        glVis: getComputedStyle(document.querySelector('.gl-canvas')).visibility,
      }));
      if (onHome.showroomClass || onHome.mode !== 'inline' || onHome.inlineCanvases > 1 || onHome.glVis === 'hidden') lifecycleClean = false;

      await page.evaluate(() => document.querySelector('#showroom-inline')?.scrollIntoView({ behavior: 'instant' }));
      await page.waitForTimeout(250);
      await page.locator('[data-enter-showroom]').click();
      await page.waitForURL('**/showroom/**');
      await waitForShowroomReady(page);
      const onShow = await page.evaluate(() => document.querySelectorAll('[data-showroom-canvas] canvas').length);
      if (onShow !== 1) lifecycleClean = false;
    }
    assertCheck('10 ClientRouter Home <-> Showroom swaps leak 0 canvases & restore OGL', lifecycleClean);

    // Dev ?debug=1 Waypoint Helper Test
    await page.goto(`${BASE}/showroom/?debug=1`, { waitUntil: 'networkidle' });
    await waitForShowroomReady(page);
    const debugCheck = await page.evaluate(() => {
      const st = window.__showroomDebug.getState();
      const logged = window.__showroomDebug.logWaypoint();
      return { debugFly: st.debugFly, logged };
    });
    assertCheck('?debug=1 activates fly helper & logs cam/target', debugCheck.debugFly && Array.isArray(debugCheck.logged?.cam));

    assertCheck('Zero console errors on desktop', consoleErrors.length === 0, consoleErrors.join(' | '));
    assertCheck('Zero failed network requests', failedReqs.length === 0, failedReqs.join(' | '));
    await ctx.close();

    // =========================================================================
    // 2. MOBILE (390x844, Touch) REFLOW & OVERFLOW QA
    // =========================================================================
    const mCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    });
    const mPage = await mCtx.newPage();
    const mErrors = [];
    mPage.on('pageerror', (e) => mErrors.push(String(e)));

    await mPage.goto(`${BASE}/showroom/`, { waitUntil: 'networkidle' });
    await waitForShowroomReady(mPage);
    await mPage.waitForTimeout(900);

    const mobileInfo = await mPage.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      hintText: document.querySelector('[data-showroom-hint]')?.textContent?.trim() || '',
    }));
    assertCheck('Mobile 390x844 0px horizontal overflow', mobileInfo.overflowX <= 0, `overflow=${mobileInfo.overflowX}`);
    assertCheck('Mobile hint copy exact', mobileInfo.hintText === 'Swipe to walk', mobileInfo.hintText);
    const mShot1 = path.join(OUT_DIR, '07-mobile-entry.png');
    await mPage.screenshot({ path: mShot1 });
    results.screenshots.push(mShot1);

    await mPage.evaluate(() => window.__showroomDebug.jumpTo(0.25, true));
    await mPage.waitForTimeout(450);
    const mShot2 = path.join(OUT_DIR, '08-mobile-st01.png');
    await mPage.screenshot({ path: mShot2 });
    results.screenshots.push(mShot2);

    // Mobile Homepage Inline 3D Showroom Walk Check
    await mPage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await mPage.waitForTimeout(900);
    await mPage.evaluate(() => {
      document.querySelector('#showroom-inline')?.scrollIntoView({ behavior: 'instant' });
    });
    await waitForShowroomReady(mPage);
    await mPage.waitForTimeout(550);
    const mobileHomeInfo = await mPage.evaluate(() => {
      const st = window.__showroomDebug.getState();
      return {
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        mode: st.mode,
        ready: st.ready,
      };
    });
    assertCheck('Mobile homepage 0px horizontal overflow', mobileHomeInfo.overflowX <= 0, `overflow=${mobileHomeInfo.overflowX}`);
    assertCheck('Mobile homepage inline 3D renders cleanly', mobileHomeInfo.mode === 'inline' && mobileHomeInfo.ready);
    const mShot3 = path.join(OUT_DIR, '13-mobile-home-inline-3d.png');
    await mPage.screenshot({ path: mShot3 });
    results.screenshots.push(mShot3);

    assertCheck('Zero runtime errors on mobile', mErrors.length === 0, mErrors.join(' | '));
    await mCtx.close();

    // =========================================================================
    // 3. PREFERS-REDUCED-MOTION ACCESSIBILITY FALLBACK
    // =========================================================================
    const rmCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    });
    const rmPage = await rmCtx.newPage();
    await rmPage.goto(`${BASE}/showroom/`, { waitUntil: 'networkidle' });
    await rmPage.waitForTimeout(600);
    const rmVisible = await rmPage.locator('.showroom-fallback').isVisible();
    assertCheck('prefers-reduced-motion renders readable unpinned directory', rmVisible);
    const rmShot = path.join(OUT_DIR, '09-reduced-motion.png');
    await rmPage.screenshot({ path: rmShot });
    results.screenshots.push(rmShot);
    await rmCtx.close();
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(OUT_DIR, 'qa-report.json'), JSON.stringify(results, null, 2));
  console.log(`\nQA COMPLETE: ${results.passed ? 'ALL PASSED' : 'FAILURES DETECTED'}`);
  if (!results.passed) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
