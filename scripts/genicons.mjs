import sharp from 'sharp';
import { readFileSync } from 'fs';
const svg = readFileSync(new URL('./icon.svg', import.meta.url));
const out = new URL('../public/', import.meta.url);
const sizes = [[192,'icon-192.png'],[512,'icon-512.png'],[180,'apple-touch-icon.png']];
for (const [s,name] of sizes) {
  await sharp(svg).resize(s,s).png().toFile(new URL(name, out).pathname);
  console.log('ok', name, s);
}
