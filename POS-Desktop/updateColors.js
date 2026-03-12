const fs = require('fs');

function updateColors(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Update Colors globally (mostly for containers and texts)
    content = content.replaceAll('bg-[#0d1117]', 'bg-white dark:bg-[#0d1117]');
    content = content.replaceAll('bg-[#0a0e14]', 'bg-zinc-50 dark:bg-[#0a0e14]');
    content = content.replaceAll('bg-dark-900', 'bg-white dark:bg-dark-900');
    content = content.replaceAll('bg-dark-800', 'bg-zinc-50 dark:bg-dark-800');
    content = content.replaceAll('bg-dark-700', 'bg-white dark:bg-dark-700');

    // texts 
    content = content.replaceAll('text-white', 'text-zinc-900 dark:text-white');
    content = content.replaceAll('text-zinc-200', 'text-zinc-800 dark:text-zinc-200');
    content = content.replaceAll('text-zinc-300', 'text-zinc-700 dark:text-zinc-300');
    content = content.replaceAll('text-zinc-400', 'text-zinc-600 dark:text-zinc-400');
    content = content.replaceAll('text-zinc-600', 'text-zinc-400 dark:text-zinc-600');

    // borders
    content = content.replaceAll('border-zinc-800/50', 'border-zinc-200 dark:border-zinc-800/50');
    content = content.replaceAll('border-zinc-800/60', 'border-zinc-200 dark:border-zinc-800/60');
    content = content.replaceAll('border border-zinc-800 ', 'border border-zinc-200 dark:border-zinc-800 ');
    content = content.replaceAll('border-zinc-800', 'border-zinc-200 dark:border-zinc-800'); // the rest
    content = content.replaceAll('border-zinc-700/50', 'border-zinc-300 dark:border-zinc-700/50');

    // borders with white/[0.04] (like in OrdersPage)
    content = content.replaceAll('border-white/[0.04]', 'border-zinc-200 dark:border-white/[0.04]');
    content = content.replaceAll('border-white/[0.03]', 'border-zinc-200 dark:border-white/[0.03]');
    content = content.replaceAll('border-white/[0.06]', 'border-zinc-200 dark:border-white/[0.06]');

    // hover bg
    content = content.replaceAll('hover:bg-white/[0.02]', 'hover:bg-zinc-100 dark:hover:bg-white/[0.02]');

    // bg blacks and other bgs
    content = content.replaceAll('bg-black/20', 'bg-zinc-100 dark:bg-black/20');
    content = content.replaceAll('bg-black/30', 'bg-zinc-50 dark:bg-black/30');
    content = content.replaceAll('bg-dark-900/50', 'bg-zinc-50 dark:bg-dark-900/50');

    // specific tweaks
    content = content.replaceAll('placeholder:text-zinc-600', 'placeholder:text-zinc-400 dark:placeholder:text-zinc-600');
    content = content.replaceAll('bg-zinc-800/30', 'bg-zinc-100 dark:bg-zinc-800/30');
    content = content.replaceAll('bg-zinc-700/50', 'bg-zinc-200 dark:bg-zinc-700/50');
    content = content.replaceAll('bg-zinc-800/50', 'bg-zinc-100 dark:bg-zinc-800/50');

    fs.writeFileSync(filePath, content);
    console.log(`Updated colors for ${filePath}`);
}

updateColors('src/pages/OrdersPage.tsx');
updateColors('src/pages/CustomersPage.tsx');
