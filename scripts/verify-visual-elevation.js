import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const stripCssComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

const tokensCss = stripCssComments(read('src/styles/tokens.css'));
const showroomCss = stripCssComments(read('src/styles/showroom.css'));
const siteCss = stripCssComments(read('src/styles/site.css'));
const scrollTs = read('src/engine/scroll.ts');
const setupTs = read('src/motion/setup.ts');

const failures = [];
const check = (name, cond, detail) => {
  if (!cond) failures.push(`${name}: ${detail}`);
};

// 1. Radius & 44px touch targets
check('radius-token', /--radius:\s*0px\s*;/.test(tokensCss), 'tokens.css must lock --radius: 0px');
check('radius-no-4px-999px', !/border-radius:\s*(?:4px|999px)\s*;/.test(showroomCss), 'showroom.css still contains 4px or 999px border-radius');
check('radius-pin-50', /\.showroom-pin__ring[\s\S]*?border-radius:\s*50%/.test(showroomCss) && /\.showroom-pin__dot[\s\S]*?border-radius:\s*50%/.test(showroomCss), 'circular pin markers must keep border-radius: 50%');
check('mobile-touch-44', /@media\s*\(max-width:\s*767px\),\s*\(pointer:\s*coarse\)[\s\S]*?min-height:\s*44px/.test(showroomCss), 'missing >= 44px coarse/mobile touch-target rule');

// 2. 12-column works-grid spread & clean 1023px tablet breakpoint
check('works-12-col', /@media\s*\(min-width:\s*1024px\)[\s\S]*?\.works-grid[\s\S]*?repeat\(12,\s*minmax\(0,\s*1fr\)\)/.test(siteCss), 'missing 12-col @media (min-width: 1024px) .works-grid');
check('works-plates', /\.works-grid\s*>\s*\.work-card:nth-child\(1\)[\s\S]*?grid-column:\s*1\s*\/\s*8/.test(siteCss) && /\.works-grid\s*>\s*\.work-card:nth-child\(2\)[\s\S]*?grid-column:\s*8\s*\/\s*13/.test(siteCss) && /\.works-grid\s*>\s*\.work-card:nth-child\(3\)[\s\S]*?grid-column:\s*3\s*\/\s*11/.test(siteCss), 'missing 12-col plate spans');
check('works-no-1024-clash', !/@media\s*\(max-width:\s*1024px\)/.test(siteCss), 'site.css @media (max-width: 1024px) clashes with min-width: 1024px; must be 1023px');

// 3. 2-octave grain & desktop-gated blend
check('grain-active', /\.showroom-atmosphere__grain[\s\S]*?display:\s*block/.test(showroomCss) && showroomCss.includes("numOctaves='2'") && showroomCss.includes("viewBox='0 0 200 200'"), 'showroom grain missing display:block or 2-octave 200x200 tile');
check('grain-desktop-blend', /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)[\s\S]*?mix-blend-mode:\s*overlay/.test(showroomCss) && /html\.is-showroom\s+body::before\s*\{\s*display:\s*none;\s*\}/.test(siteCss), 'grain blend must be desktop-gated and showroom body::before suppressed');

// 4. Seamless Oklab apron & brass datum
check('apron-oklab', !/#d8d0c3/i.test(siteCss) && !/\bin\s+oklab\b/i.test(siteCss) && siteCss.includes('var(--c-bg, #EFECE6)') && siteCss.includes('var(--c-dark-bg, #231E1A)'), 'apron must drop #D8D0C3, avoid bare in oklab, and anchor to --c-bg / --c-dark-bg');
check('apron-datum', /\.showroom-apron--top::after,\s*\.showroom-apron--bottom::before[\s\S]*?left:\s*var\(--gutter/.test(siteCss), 'missing inset brass datum rule on apron');

// 5. Living brass pins, AAA chips & swatches
check('pin-radar-brass', /@keyframes\s+pin-radar/.test(showroomCss) && /\.showroom-pin__ring::after[\s\S]*?var\(--c-dark-accent/.test(showroomCss), 'missing @keyframes pin-radar or warm brass ring');
check('pin-reduced-motion', /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.showroom-pin__ring::after[\s\S]*?animation:\s*none;\s*display:\s*none;/.test(showroomCss), 'missing reduced-motion guard for pin radar pulse');
check('pin-chip-aaa', /\.showroom-pin__chip[\s\S]*?color:\s*var\(--c-dark-fg/.test(showroomCss) && /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)[\s\S]*?backdrop-filter:\s*blur/.test(showroomCss), 'pin chip must pair dark surface with --c-dark-fg and desktop-gate backdrop-filter');
check('swatches-real-selector', /\.palette-ledger\s+\.swatch[\s\S]*?width:\s*18px;[\s\S]*?height:\s*18px;/.test(siteCss) && !siteCss.includes('palette-ledger__swatch') && !showroomCss.includes('palette-ledger__swatch'), 'swatches must target .palette-ledger .swatch (18px) in site.css');

// 6. Lenis & Phase 2 engine guardrails
check('lenis-safe', scrollTs.includes('smoothWheel: true') && !scrollTs.includes('syncTouch: true') && scrollTs.includes('prefersReducedMotion()') && scrollTs.includes('ScrollTrigger.update()'), 'scroll.ts failed Lenis safety guardrails');
check('phase2-guards', setupTs.includes('initPaletteSpecimenReveal') && setupTs.includes('initAtelierParallax') && setupTs.includes('scrub: true') && setupTs.includes('isTouch()') && setupTs.includes('prefersReducedMotion()'), 'setup.ts missing Phase 2 functions or touch/reduced-motion/scrub:true guards');

// 7. Boundary & live-selector check (zero .astro / gl / scroll edits + zero dead selectors)
const walkFiles = (dir, exts, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
};
const markupAndTs = walkFiles(path.join(root, 'src'), ['.astro', '.ts']).map((p) => fs.readFileSync(p, 'utf8')).join('\n');
const targetedSelectors = [
  'works-grid', 'work-card', 'work-card__media', 'work-card__meta',
  'palette-ledger', 'swatch', 'atelier-band__visual', 'showroom-apron',
  'showroom-pin__ring', 'showroom-pin__chip', 'showroom-inline-fs',
  'showroom-atmosphere__grain', 'specimen-hover-reveal',
];
const dead = targetedSelectors.filter((sel) => !markupAndTs.includes(sel));
check('live-selectors', dead.length === 0, `dead selectors missing in src/: ${dead.join(', ')}`);

if (fs.existsSync(path.join(root, '.git'))) {
  const changed = execSync('git diff --name-only', { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const forbidden = changed.filter((f) => f.endsWith('.astro') || f.startsWith('src/engine/gl/') || f === 'src/engine/scroll.ts');
  check('git-boundaries', forbidden.length === 0, `forbidden files modified: ${forbidden.join(', ')}`);
} else {
  const baseline = Math.min(
    fs.statSync(path.join(root, 'src/styles/showroom.css')).mtimeMs,
    fs.statSync(path.join(root, 'src/styles/site.css')).mtimeMs
  );
  const protectedFiles = walkFiles(path.join(root, 'src'), ['.astro']).concat(
    walkFiles(path.join(root, 'src/engine/gl'), ['.ts']),
    [path.join(root, 'src/engine/scroll.ts')]
  );
  const touched = protectedFiles.filter((p) => fs.statSync(p).mtimeMs >= baseline).map((p) => path.relative(root, p));
  check('mtime-boundaries', touched.length === 0, `protected files newer than CSS edits: ${touched.join(', ')}`);
}

if (failures.length) {
  console.error(`FAIL (${failures.length} check(s)):\n - ${failures.join('\n - ')}`);
  process.exit(1);
}
console.log('PASS: all visual elevation, selector, and boundary checks passed cleanly.');
