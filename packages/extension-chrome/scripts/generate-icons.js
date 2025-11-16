/**
 * Generate placeholder icons for the extension
 * Run with: node scripts/generate-icons.js
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');

// Ensure public directory exists
try {
  mkdirSync(publicDir, { recursive: true });
} catch (e) {
  // Directory already exists
}

// SVG template for icons
function createIconSVG(size) {
  const fontSize = size / 3;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a78bfa;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="${size / 2}" y="${size / 2 + fontSize / 3}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle">L</text>
</svg>`;
}

// Generate icons in different sizes
const sizes = [16, 48, 128];

sizes.forEach(size => {
  const svg = createIconSVG(size);
  const filename = join(publicDir, `icon${size}.svg`);
  writeFileSync(filename, svg);
  console.log(`Generated ${filename}`);
});

console.log('\nIcon generation complete!');
console.log('Note: For production, convert SVG to PNG using a tool like ImageMagick or an online converter.');
