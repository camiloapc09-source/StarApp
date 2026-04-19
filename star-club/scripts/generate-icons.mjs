import sharp from "sharp";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
const iconsDir = join(publicDir, "icons");

// NOVA SVG — inline so the script is self-contained
function novaSvg(size) {
  const s = 1; // star scale relative to 200x200 viewBox
  const rx = Math.round(size * 0.225 * (200 / size)); // border radius in viewBox units

  const star = `M ${4*s},${-66*s} C ${16*s},${-10*s} ${16*s},${-8*s} ${55*s},${5*s} C ${7*s},${13*s} ${5*s},${15*s} ${-3*s},${46*s} C ${-14*s},${6*s} ${-16*s},${4*s} ${-60*s},${-4*s} C ${-9*s},${-14*s} ${-7*s},${-16*s} ${4*s},${-66*s} Z`;

  return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fill" x1="50" y1="20" x2="150" y2="180" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#DEC4FF"/>
      <stop offset="40%" stop-color="#7F47DD"/>
      <stop offset="100%" stop-color="#3A0E9E"/>
    </linearGradient>
    <radialGradient id="light" cx="38%" cy="30%" r="52%">
      <stop offset="0%" stop-color="white" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <filter id="shd" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b"/>
      <feOffset dx="2" dy="3" in="b" result="o"/>
      <feFlood flood-color="#1A0050" flood-opacity="0.5" result="c"/>
      <feComposite in="c" in2="o" operator="in" result="s"/>
      <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="200" height="200" rx="${rx}" fill="#07071A"/>
  <g transform="translate(100,102)" filter="url(#shd)">
    <path d="${star}" fill="url(#fill)"/>
    <path d="${star}" fill="url(#light)"/>
  </g>
</svg>`;
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log("Generating NOVA icons...");

for (const size of sizes) {
  const svg = Buffer.from(novaSvg(size));
  const outPath = join(iconsDir, `icon-${size}x${size}.png`);
  await sharp(svg).png().toFile(outPath);
  console.log(`  ✓ icon-${size}x${size}.png`);
}

// Also generate favicon.ico (32x32)
const faviconSvg = Buffer.from(novaSvg(32));
await sharp(faviconSvg).png().toFile(join(publicDir, "favicon.png"));
console.log("  ✓ favicon.png");

// Save the SVG itself for reference
writeFileSync(join(publicDir, "nova-icon.svg"), novaSvg(1024));
console.log("  ✓ nova-icon.svg (1024x1024 reference)");

console.log("\nDone. All icons generated with NOVA logo.");
