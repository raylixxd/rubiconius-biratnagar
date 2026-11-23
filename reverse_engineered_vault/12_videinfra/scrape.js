const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.resolve('C:/Users/Lenovo LOQ/.gemini/antigravity/scratch/reverse_engineered_vault/12_videinfra');
const BASE_URL = 'https://videinfra.com';

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function resolveUrl(href, base = BASE_URL) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

async function run() {
  console.log(`Fetching ${BASE_URL}...`);
  const html = await fetchText(BASE_URL);
  fs.writeFileSync(path.join(TARGET_DIR, 'index.html'), html, 'utf8');
  console.log(`Saved index.html (${html.length} bytes)`);

  // Extract scripts
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const linkRegex = /<link\b([^>]*)>/gi;

  const scripts = [];
  const styles = [];
  const preloads = [];

  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const attrs = match[1];
    const inlineContent = match[2];
    const srcMatch = /src=["']([^"']+)["']/i.exec(attrs);
    if (srcMatch) {
      scripts.push({ src: srcMatch[1], url: resolveUrl(srcMatch[1]) });
    } else if (inlineContent.trim()) {
      scripts.push({ inline: inlineContent.trim() });
    }
  }

  while ((match = linkRegex.exec(html)) !== null) {
    const attrs = match[1];
    const hrefMatch = /href=["']([^"']+)["']/i.exec(attrs);
    const relMatch = /rel=["']([^"']+)["']/i.exec(attrs);
    const asMatch = /as=["']([^"']+)["']/i.exec(attrs);
    if (hrefMatch) {
      const rel = relMatch ? relMatch[1].toLowerCase() : '';
      const href = hrefMatch[1];
      const url = resolveUrl(href);
      if (rel.includes('stylesheet')) {
        styles.push({ href, url });
      } else if (rel.includes('preload')) {
        preloads.push({ href, url, as: asMatch ? asMatch[1] : '' });
      }
    }
  }

  console.log(`Found ${scripts.length} scripts, ${styles.length} styles, ${preloads.length} preloads`);

  // Create subdirs
  fs.mkdirSync(path.join(TARGET_DIR, 'js'), { recursive: true });
  fs.mkdirSync(path.join(TARGET_DIR, 'css'), { recursive: true });
  fs.mkdirSync(path.join(TARGET_DIR, 'assets'), { recursive: true });

  // Download styles
  for (let i = 0; i < styles.length; i++) {
    const s = styles[i];
    if (!s.url) continue;
    try {
      console.log(`Downloading CSS [${i + 1}/${styles.length}]: ${s.url}`);
      const cssContent = await fetchText(s.url);
      const filename = path.basename(new URL(s.url).pathname) || `style_${i}.css`;
      fs.writeFileSync(path.join(TARGET_DIR, 'css', filename), cssContent, 'utf8');
      s.localPath = `css/${filename}`;
    } catch (err) {
      console.error(`Failed to download ${s.url}:`, err.message);
    }
  }

  // Download scripts
  for (let i = 0; i < scripts.length; i++) {
    const s = scripts[i];
    if (s.url) {
      try {
        console.log(`Downloading JS [${i + 1}/${scripts.length}]: ${s.url}`);
        const jsContent = await fetchText(s.url);
        const filename = path.basename(new URL(s.url).pathname) || `bundle_${i}.js`;
        fs.writeFileSync(path.join(TARGET_DIR, 'js', filename), jsContent, 'utf8');
        s.localPath = `js/${filename}`;
      } catch (err) {
        console.error(`Failed to download ${s.url}:`, err.message);
      }
    } else if (s.inline) {
      const filename = `inline_${i}.js`;
      fs.writeFileSync(path.join(TARGET_DIR, 'js', filename), s.inline, 'utf8');
      s.localPath = `js/${filename}`;
    }
  }

  // Also check .well-known/agent-skills/index.json
  try {
    const agentSkills = await fetchText(resolveUrl('/.well-known/agent-skills/index.json'));
    fs.writeFileSync(path.join(TARGET_DIR, 'agent-skills.json'), agentSkills, 'utf8');
    console.log('Saved agent-skills.json');
  } catch (e) {
    console.log('No agent skills file:', e.message);
  }

  console.log('Initial scrape complete!');
}

run().catch(console.error);
