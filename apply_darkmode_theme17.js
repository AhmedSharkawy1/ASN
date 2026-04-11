const fs = require('fs');
let code = fs.readFileSync('src/components/menu/Theme17Menu.tsx', 'utf8');

if (!code.includes('useTheme')) {
    code = code.replace(/import React, \{([^\}]+)\} from 'react';/, "import React, {  } from 'react';\nimport { useTheme } from 'next-themes';");
}

if (!code.includes('toggleDarkMode')) {
    code = code.replace(/const primaryColor = '#d32f2f';[ \t]*\n/, "const primaryColor = '#d32f2f';\n\n    const { theme, setTheme } = useTheme();\n    const isDark = theme === 'dark';\n    const toggleDarkMode = () => setTheme(isDark ? 'light' : 'dark');\n");
}

// Ensure the dark mode toggles exist in the header
if (!code.includes('toggleDarkMode}')) {
    code = code.replace(/(<button className="text-gray-800 hover:text-red-600 transition" aria-label="Share".*?<\/button>)/, "\n                        <button onClick={toggleDarkMode} className=\"text-gray-800 dark:text-gray-200 hover:text-red-600 transition text-xl\" suppressHydrationWarning>{isDark ? '☀️' : '🌙'}</button>");
}

// Apply dark mode classes
code = code.replace(/bg-\\[#fffdfd\\]/g, 'bg-[#fffdfd] dark:bg-[#0a0a0a]');
code = code.replace(/\\bbg-white(\\s|")/g, 'bg-white dark:bg-[#111]');
// avoid double dark modes if we run it twice:
code = code.replace(/dark:bg-\\[#111\\] dark:bg-\\[#111\\]/g, 'dark:bg-[#111]');

code = code.replace(/\\bbg-gray-50(\\s|")/g, 'bg-gray-50 dark:bg-zinc-900');
code = code.replace(/\\bbg-gray-100(\\s|")/g, 'bg-gray-100 dark:bg-zinc-800');
code = code.replace(/\\bbg-gray-200(\\s|")/g, 'bg-gray-200 dark:bg-zinc-700');

code = code.replace(/\\bborder-gray-100(\\s|")/g, 'border-gray-100 dark:border-white/5');
code = code.replace(/\\bborder-gray-200(\\s|")/g, 'border-gray-200 dark:border-white/10');
code = code.replace(/\\bborder-gray-300(\\s|")/g, 'border-gray-300 dark:border-white/20');

code = code.replace(/\\btext-gray-900(\\s|")/g, 'text-gray-900 dark:text-gray-100');
code = code.replace(/\\btext-gray-800(\\s|")/g, 'text-gray-800 dark:text-gray-200');
code = code.replace(/\\btext-gray-700(\\s|")/g, 'text-gray-700 dark:text-gray-300');
code = code.replace(/\\btext-gray-600(\\s|")/g, 'text-gray-600 dark:text-gray-400');

// special Lush red bg colors
code = code.replace(/\\bbg-\\[#fce4e4\\]/g, 'bg-[#fce4e4] dark:bg-[#d32f2f]/10');
code = code.replace(/\\bbg-red-50\\b/g, 'bg-red-50 dark:bg-red-950/30');
code = code.replace(/\\bborder-red-100\\b/g, 'border-red-100 dark:border-red-900/30');

// fix double dark
code = code.replace(/(dark:[a-z0-9-\\/#]+) \\1/g, '');

fs.writeFileSync('src/components/menu/Theme17Menu.tsx', code);
console.log('Injected dark mode support into Theme17Menu');
