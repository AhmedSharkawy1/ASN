const fs = require('fs');
const path = require('path');

const dirs = [
  'f:/ASN/ASN/src/components/menu',
  'f:/ASN/ASN/src/components/Theme12Menu',
  'f:/ASN/ASN/src/app/menu/[restaurantId]'
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  content = content.replace(/thumbnail_url\?: string;/g, 'thumbnail_url?: string | null;');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Modified:', filePath);
  }
}

for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    processDirectory(dir);
  }
}
console.log('Done replacing thumbnail_url types.');
