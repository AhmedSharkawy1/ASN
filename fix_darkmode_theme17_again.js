const fs = require('fs');
let code = fs.readFileSync('src/components/menu/Theme17Menu.tsx', 'utf8');

const replaceClass = (target, darkClass) => {
    const rx = new RegExp(target.replace(/\[/g, '\\\[').replace(/\]/g, '\\\]') + '(?![\\\\s]*dark:)', 'g');
    code = code.replace(rx, ${target} );
};

replaceClass('bg-[#fffdfd]', 'dark:bg-[#0a0a0a]');
replaceClass('bg-white', 'dark:bg-[#111]');

replaceClass('bg-gray-50', 'dark:bg-zinc-900');
replaceClass('bg-gray-100', 'dark:bg-zinc-800');
replaceClass('bg-gray-200', 'dark:bg-zinc-700');

replaceClass('border-gray-100', 'dark:border-white/5');
replaceClass('border-gray-200', 'dark:border-white/10');
replaceClass('border-gray-300', 'dark:border-white/20');

replaceClass('text-gray-900', 'dark:text-gray-100');
replaceClass('text-gray-800', 'dark:text-gray-200');
replaceClass('text-gray-700', 'dark:text-gray-300');
replaceClass('text-gray-600', 'dark:text-gray-400');
replaceClass('text-gray-500', 'dark:text-gray-400');

replaceClass('bg-[#fce4e4]', 'dark:bg-[#d32f2f]/10');
replaceClass('bg-red-50', 'dark:bg-red-950/30');

// Clean up multiples like dark:bg-[#111] dark:bg-[#111]
code = code.replace(/(dark:[a-z0-9-\/#\[\]]+) \1/gi, '');

fs.writeFileSync('src/components/menu/Theme17Menu.tsx', code);
console.log('Fixed Dark Mode Classes');
