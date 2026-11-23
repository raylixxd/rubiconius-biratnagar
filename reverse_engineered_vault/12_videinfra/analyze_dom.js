const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.resolve('C:/Users/Lenovo LOQ/.gemini/antigravity/scratch/reverse_engineered_vault/12_videinfra');
const html = fs.readFileSync(path.join(TARGET_DIR, 'index.html'), 'utf8');

console.log('HTML size:', html.length);

// Extract title, meta tags, fonts, open graph
const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
console.log('Title:', titleMatch ? titleMatch[1] : 'None');

// Find font declarations in HTML or CSS
const fontMatches = html.match(/font-family:[^;"]+/gi) || [];
console.log('Inline font families found:', Array.from(new Set(fontMatches)));

// Check external fonts linked
const fontLinks = html.match(/<link[^>]+fonts[^>]+>/gi) || [];
console.log('Font links:', fontLinks);

// Check canvas or WebGL elements
const canvasMatches = html.match(/<canvas\b[^>]*>/gi) || [];
console.log('Canvas elements:', canvasMatches);

// Check main container and layout sections
const sections = [];
const sectionRegex = /<(section|div|main|header|footer|nav)\b([^>]*(?:id|class)=["'][^"']+["'][^>]*)>/gi;
let m;
while ((m = sectionRegex.exec(html)) !== null) {
  const tag = m[1];
  const attrs = m[2];
  const classM = attrs.match(/class=["']([^"']+)["']/i);
  const idM = attrs.match(/id=["']([^"']+)["']/i);
  if (classM || idM) {
    sections.push({ tag, class: classM ? classM[1] : null, id: idM ? idM[1] : null });
  }
}
console.log(`Total structured elements with class/id: ${sections.length}`);
console.log('First 25 structural elements:');
console.log(sections.slice(0, 25));

// Check video/audio/svg tags
const videoCount = (html.match(/<video\b/gi) || []).length;
const audioCount = (html.match(/<audio\b/gi) || []).length;
const svgCount = (html.match(/<svg\b/gi) || []).length;
const imgCount = (html.match(/<img\b/gi) || []).length;
console.log(`Media elements: videos=${videoCount}, audios=${audioCount}, svgs=${svgCount}, imgs=${imgCount}`);

// Inspect inline scripts
for (let i = 0; i <= 8; i++) {
  const p = path.join(TARGET_DIR, 'js', `inline_${i}.js`);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    console.log(`\n--- inline_${i}.js (${content.length} chars) ---`);
    console.log(content.slice(0, 300));
  }
}
