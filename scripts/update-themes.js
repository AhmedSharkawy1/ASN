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

  // Add thumbnail_url to Item type
  content = content.replace(/(type Item = \{[^}]*?image_url\?: string;)/g, '$1\n  thumbnail_url?: string;');
  
  // Add thumbnail_url to Category type
  content = content.replace(/(type Category = \{[^}]*?image_url\?: string;)/g, '$1\n  thumbnail_url?: string;');

  // Modify OptimizedMenuImage usage for item.image_url
  content = content.replace(/src=\{([a-zA-Z0-9_]+)\.image_url(\s*\|\|\s*[^}]+)?\}/g, (match, varName, fallback) => {
    // If it's a category variable, use its thumbnail
    if (varName === 'item' || varName === 'cat' || varName === 'category' || varName === 'c' || varName === 'activeCatData' || varName === 'product' || varName === 'menuItem') {
      return `thumbnailSrc={${varName}.thumbnail_url} originalSrc={${varName}.image_url${fallback || ''}}`;
    }
    return match;
  });

  // Handle selectedItem.item.image_url and similar specifically for useOriginal=true
  content = content.replace(/src=\{selectedItem\.item\.image_url\}/g, 'thumbnailSrc={null} originalSrc={selectedItem.item.image_url}');
  content = content.replace(/src=\{selectedItem\.item\.image_url \|\| ([^}]+)\}/g, 'thumbnailSrc={null} originalSrc={selectedItem.item.image_url || $1}');

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
console.log('Done replacing types and components.');
