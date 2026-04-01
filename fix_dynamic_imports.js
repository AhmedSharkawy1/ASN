const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'src', 'app', 'menu', '[restaurantId]', 'page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

if (!content.includes('import dynamic from "next/dynamic"')) {
    content = content.replace(
        'import { motion, AnimatePresence } from "framer-motion";',
        'import { motion, AnimatePresence } from "framer-motion";\nimport dynamic from "next/dynamic";'
    );
}

// Regex to find all static menu imports
const importRegex = /import (\w+Menu) from "(@\/components\/(?:menu|Theme12Menu)\/[\w\-]+)";/g;

content = content.replace(importRegex, 'const $1 = dynamic(() => import("$2"));');

fs.writeFileSync(pagePath, content);
console.log('Successfully replaced static imports with dynamic imports in page.tsx');
