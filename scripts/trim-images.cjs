const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'src', 'assets');
const files = [
  'real-dining-hall.jpg',
  'real-living-room.jpg',
  'real-master-bedroom.jpg',
  'real-wood-study.jpg',
  'real-lounge-vignette.jpg'
];

async function run() {
  for (const f of files) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) {
      const orig = await sharp(p).metadata();
      const buf = await sharp(p).trim({ threshold: 25 }).jpeg({ quality: 96 }).toBuffer();
      const meta = await sharp(buf).metadata();
      fs.writeFileSync(p, buf);
      console.log(`${f}: ${orig.width}x${orig.height} -> ${meta.width}x${meta.height}`);
    }
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
