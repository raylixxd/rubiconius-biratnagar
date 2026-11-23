import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const SITES = [
  {
    id: 'rubiconius',
    name: 'Rubiconius Architectural Atelier',
    city: 'Biratnagar & Dharan',
    dir: 'C:/Users/Lenovo LOQ/.gemini/antigravity/scratch/rubiconius-biratnagar/dist',
  },
  {
    id: 'design-square',
    name: 'Design Square Pvt Ltd',
    city: 'Kathmandu Valley',
    dir: 'C:/Users/Lenovo LOQ/.gemini/antigravity/scratch/client-sites/design-square-pvt-ltd/dist',
  },
  {
    id: 'euro-interior-trade',
    name: 'Euro Interior Trade',
    city: 'Putalisadak, Kathmandu',
    dir: 'C:/Users/Lenovo LOQ/.gemini/antigravity/scratch/client-sites/euro-interior-trade/dist',
  },
  {
    id: 'sk-construction',
    name: 'SK Construction & Design',
    city: 'Western Nepal (Pokhara / Butwal)',
    dir: 'C:/Users/Lenovo LOQ/.gemini/antigravity/scratch/client-sites/sk-construction-and-design/dist',
  },
  {
    id: 'sunkoshi-furniture',
    name: 'Sunkoshi Furniture House',
    city: 'Biratnagar, Eastern Nepal',
    dir: 'C:/Users/Lenovo LOQ/.gemini/antigravity/scratch/client-sites/sunkoshi-furniture-house/dist',
  },
  {
    id: 'vogue-interiors',
    name: 'Vogue Interiors Nepal',
    city: 'Itahari, Eastern Nepal',
    dir: 'C:/Users/Lenovo LOQ/.gemini/antigravity/scratch/client-sites/vogue-interiors-nepal/dist',
  },
];

const OUT_DIR = 'C:/Users/Lenovo LOQ/.gemini/antigravity/brain/9092545d-aa74-4b9d-8715-8cff5b2cd50c/client_previews';
fs.mkdirSync(OUT_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.json': 'application/json',
};

function createStaticServer(root, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(new URL(req.url || '/', `http://localhost:${port}`).pathname);
      if (reqPath.endsWith('/')) reqPath += 'index.html';
      let filePath = path.join(root, reqPath);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(root, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME[ext] || 'application/octet-stream';

      try {
        const stream = fs.createReadStream(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        stream.pipe(res);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, () => resolve(server));
  });
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  let port = 5400;

  for (const s of SITES) {
    if (!fs.existsSync(s.dir)) {
      console.log(`Skipping ${s.id}, dir does not exist: ${s.dir}`);
      continue;
    }

    port++;
    console.log(`Serving ${s.name} on port ${port}...`);
    const server = await createStaticServer(s.dir, port);

    try {
      await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      // Hero screenshot
      const heroPath = path.join(OUT_DIR, `${s.id}_hero.png`);
      await page.screenshot({ path: heroPath });
      console.log(`Saved hero: ${heroPath}`);

      // Scroll to works section
      const worksSec = page.locator('#works');
      if (await worksSec.count() > 0) {
        await worksSec.scrollIntoViewIfNeeded();
        await page.waitForTimeout(600);
        const worksPath = path.join(OUT_DIR, `${s.id}_works.png`);
        await page.screenshot({ path: worksPath });
        console.log(`Saved works: ${worksPath}`);
      }
    } catch (e) {
      console.error(`Error capturing ${s.id}:`, e);
    } finally {
      server.close();
    }
  }

  await browser.close();
  console.log('All client website previews captured successfully!');
}

run().catch(console.error);
