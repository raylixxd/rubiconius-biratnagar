#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

/**
 * Client Site Zero-Leakage Validator
 * Scans compiled production artifacts for forbidden template strings.
 */

const UNIVERSAL_BANNED = [
  'Rubiconius',
  'rubiconius',
  'RUBICONIUS',
  'Riya Agrawal',
  'Riya',
  'riya-agrawal',
  '981-2353149',
  '9812353149',
  'rubiconius.com.np',
  'rubiconius-biratnagar.vercel.app',
  'msha.ke/rubiconius',
  'instagram.com/rubiconius_',
  'facebook.com/rubiconius',
  'rubiconius_pov',
  'rubiconius-hero',
  'rubiconius-vault'
];

const GEO_BANNED_BIRATNAGAR = [
  'Biratnagar',
  'biratnagar',
  'BIRATNAGAR',
  'Munal Path',
  'Kochakhaltol'
];

const GEO_BANNED_DHARAN = [
  'Dharan',
  'dharan',
  'DHARAN',
  'Gita Mandir Line'
];

const TEMPLATE_COMMISSIONS = [
  'fluted-master-suite',
  'Fluted Master Suite',
  'formal-drawing-room',
  'Formal Drawing Room',
  'heritage-panelled-gallery',
  'Heritage Panelled Gallery'
];

const TEXT_EXTS = new Set(['.html', '.js', '.css', '.json', '.svg', '.xml', '.txt']);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dist: '',
    profile: '',
    strict: true
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dist' && args[i + 1]) {
      options.dist = path.resolve(args[++i]);
    } else if (args[i] === '--profile' && args[i + 1]) {
      options.profile = path.resolve(args[++i]);
    } else if (args[i] === '--no-strict') {
      options.strict = false;
    }
  }
  return options;
}

function computeBannedList(profile) {
  const banned = new Set(UNIVERSAL_BANNED);

  if (profile) {
    const clientOffices = (profile.offices || []).map((o) => (o.city || '').toLowerCase());
    const clientText = `${profile.city || ''} ${profile.region || ''}`.toLowerCase();

    const isBiratnagar = clientOffices.includes('biratnagar') || clientText.includes('biratnagar');
    const isDharan = clientOffices.includes('dharan') || clientText.includes('dharan');

    if (!isBiratnagar) {
      GEO_BANNED_BIRATNAGAR.forEach((t) => banned.add(t));
    }
    if (!isDharan) {
      GEO_BANNED_DHARAN.forEach((t) => banned.add(t));
    }

    const activeSlugs = new Set((profile.commissions || []).map((c) => c.slug));
    const activeTitles = new Set((profile.commissions || []).map((c) => c.title));

    for (const item of TEMPLATE_COMMISSIONS) {
      if (!activeSlugs.has(item) && !activeTitles.has(item)) {
        banned.add(item);
      }
    }
  }

  return Array.from(banned);
}

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (TEXT_EXTS.has(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

function auditDist() {
  const opts = parseArgs();
  if (!opts.dist) {
    console.error('Error: --dist <path> is required');
    process.exit(1);
  }

  let profile = null;
  if (opts.profile && fs.existsSync(opts.profile)) {
    try {
      profile = JSON.parse(fs.readFileSync(opts.profile, 'utf-8'));
      console.log(`Loaded client profile: ${profile.name || profile.business_name} (${profile.city || 'Nepal'})`);
    } catch (err) {
      console.error(`Warning: Failed to parse profile JSON: ${err.message}`);
    }
  }

  const bannedTerms = computeBannedList(profile);
  console.log(`\n🔍 Scanning ${opts.dist}`);
  console.log(`Active banned term dictionary (${bannedTerms.length} terms):`);
  console.log(`[${bannedTerms.slice(0, 10).join(', ')}${bannedTerms.length > 10 ? '...' : ''}]\n`);

  const files = getAllFiles(opts.dist);
  console.log(`Found ${files.length} textual build artifacts to scan.\n`);

  let violations = [];

  for (const file of files) {
    const relPath = path.relative(opts.dist, file);
    const content = fs.readFileSync(file, 'utf-8');

    for (const term of bannedTerms) {
      let startIndex = 0;
      while ((startIndex = content.indexOf(term, startIndex)) !== -1) {
        // Calculate line and col
        const linesUpToMatch = content.slice(0, startIndex).split('\n');
        const line = linesUpToMatch.length;
        const col = linesUpToMatch[linesUpToMatch.length - 1].length + 1;

        const snippetStart = Math.max(0, startIndex - 40);
        const snippetEnd = Math.min(content.length, startIndex + term.length + 40);
        const snippet = content.slice(snippetStart, snippetEnd).replace(/\r?\n/g, ' ');

        violations.push({
          file: relPath,
          line,
          col,
          term,
          snippet: `...${snippet}...`
        });

        startIndex += term.length;
      }
    }
  }

  if (violations.length > 0) {
    console.error(`❌ ZERO-LEAKAGE AUDIT FAILED: ${violations.length} violations detected!\n`);
    for (const v of violations) {
      console.error(`[LEAK] ${v.file}:${v.line}:${v.col} - Found "${v.term}"`);
      console.error(`       Snippet: ${v.snippet}\n`);
    }
    process.exit(1);
  }

  console.log(`✅ ZERO-LEAKAGE AUDIT PASSED: 0 forbidden remnants found across all ${files.length} artifacts.`);
  process.exit(0);
}

auditDist();
