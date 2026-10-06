const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(dir, { recursive: true });

// Create simple SVG icons for PWA
const createIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="#3F7F83"/>
  <text x="${size/2}" y="${size * 0.45}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.round(size * 0.25)}" font-weight="bold" fill="white">Jala</text>
  <text x="${size/2}" y="${size * 0.7}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.round(size * 0.25)}" font-weight="bold" fill="white">Setu</text>
</svg>`;

fs.writeFileSync(path.join(dir, 'icon-192.png'), createIcon(192));
fs.writeFileSync(path.join(dir, 'icon-512.png'), createIcon(512));

// Also create as SVG for better quality
fs.writeFileSync(path.join(dir, 'icon-192.svg'), createIcon(192));
fs.writeFileSync(path.join(dir, 'icon-512.svg'), createIcon(512));

console.log('✅ Created PWA icons in public/icons/');
