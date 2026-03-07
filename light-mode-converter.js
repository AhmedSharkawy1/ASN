const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, 'src/app/dashboard');

// Classes that should just be prepended with a light equivalent
const exactReplacements = {
    // Backgrounds
    "bg-[#0d1117]": "bg-white dark:bg-[#0d1117]",
    "bg-[#0a0e14]": "bg-slate-50 dark:bg-[#0a0e14]",
    "bg-black/20": "bg-slate-50 dark:bg-black/20",
    "bg-black/30": "bg-slate-100 dark:bg-black/30",
    "bg-black/40": "bg-slate-100 dark:bg-black/40",
    "bg-black/50": "bg-slate-200 dark:bg-black/50",
    "bg-black/60": "bg-slate-300 dark:bg-black/60",
    "bg-zinc-900": "bg-slate-100 dark:bg-zinc-900",
    "bg-zinc-800": "bg-slate-100 dark:bg-zinc-800",
    "bg-zinc-800/50": "bg-slate-100 dark:bg-zinc-800/50",
    "bg-zinc-800/60": "bg-slate-100 dark:bg-zinc-800/60",
    "bg-zinc-800/30": "bg-slate-50 dark:bg-zinc-800/30",
    "bg-zinc-800/20": "bg-slate-50 dark:bg-zinc-800/20",
    "bg-zinc-700": "bg-slate-200 dark:bg-zinc-700",
    "bg-zinc-700/50": "bg-slate-200 dark:bg-zinc-700/50",
    "bg-zinc-700/30": "bg-slate-100 dark:bg-zinc-700/30",
    "bg-white/\\[0\\.02\\]": "hover:bg-slate-50 dark:hover:bg-white/[0.02]",

    // Borders
    "border-zinc-800/60": "border-slate-200 dark:border-zinc-800/60",
    "border-zinc-800/50": "border-slate-200 dark:border-zinc-800/50",
    "border-zinc-800/30": "border-slate-200 dark:border-zinc-800/30",
    "border-zinc-800/20": "border-slate-100 dark:border-zinc-800/20",
    "border-zinc-800": "border-slate-200 dark:border-zinc-800",
    "border-zinc-700/50": "border-slate-300 dark:border-zinc-700/50",
    "border-zinc-700/30": "border-slate-200 dark:border-zinc-700/30",
    "border-zinc-700": "border-slate-300 dark:border-zinc-700",

    // Text (Zinc)
    "text-zinc-200": "text-slate-700 dark:text-zinc-200",
    "text-zinc-300": "text-slate-700 dark:text-zinc-300",
    "text-zinc-400": "text-slate-500 dark:text-zinc-400",
    "text-zinc-500": "text-slate-500 dark:text-zinc-500",
    "text-zinc-600": "text-slate-400 dark:text-zinc-600",
    "placeholder:text-zinc-500": "placeholder:text-slate-400 dark:placeholder:text-zinc-500",
    "placeholder:text-zinc-600": "placeholder:text-slate-400 dark:placeholder:text-zinc-600",
    "hover:text-white": "hover:text-slate-900 dark:hover:text-white",

    // Accents Text
    "text-emerald-400": "text-emerald-600 dark:text-emerald-400",
    "text-amber-400": "text-amber-600 dark:text-amber-400",
    "text-blue-400": "text-blue-600 dark:text-blue-400",
    "text-cyan-400": "text-cyan-600 dark:text-cyan-400",
    "text-red-400": "text-red-600 dark:text-red-400",
    "text-violet-400": "text-violet-600 dark:text-violet-400",
    "text-orange-400": "text-orange-600 dark:text-orange-400",

    // Accent Backgrounds (Opacities)
    "bg-emerald-500/10": "bg-emerald-50 dark:bg-emerald-500/10",
    "bg-emerald-500/15": "bg-emerald-50 dark:bg-emerald-500/15",
    "bg-emerald-500/20": "bg-emerald-100 dark:bg-emerald-500/20",
    "bg-emerald-500/30": "bg-emerald-200 dark:bg-emerald-500/30",
    
    "bg-amber-500/10": "bg-amber-50 dark:bg-amber-500/10",
    "bg-amber-500/20": "bg-amber-100 dark:bg-amber-500/20",
    
    "bg-blue-500/10": "bg-blue-50 dark:bg-blue-500/10",
    "bg-blue-500/20": "bg-blue-100 dark:bg-blue-500/20",
    
    "bg-cyan-500/10": "bg-cyan-50 dark:bg-cyan-500/10",
    "bg-cyan-500/20": "bg-cyan-100 dark:bg-cyan-500/20",
    
    "bg-red-500/10": "bg-red-50 dark:bg-red-500/10",
    "bg-red-500/20": "bg-red-100 dark:bg-red-500/20",

    "bg-orange-500/10": "bg-orange-50 dark:bg-orange-500/10",
    
    "bg-violet-500/10": "bg-violet-50 dark:bg-violet-500/10",

    // Accent Borders
    "border-emerald-500/20": "border-emerald-200 dark:border-emerald-500/20",
    "border-emerald-500/30": "border-emerald-200 dark:border-emerald-500/30",
    "border-emerald-500/40": "border-emerald-300 dark:border-emerald-500/40",
    
    "border-amber-500/20": "border-amber-200 dark:border-amber-500/20",
    "border-amber-500/30": "border-amber-200 dark:border-amber-500/30",
    
    "border-red-500/20": "border-red-200 dark:border-red-500/20",
    "border-red-500/30": "border-red-200 dark:border-red-500/30",
    
    "border-cyan-500/20": "border-cyan-200 dark:border-cyan-500/20",

    "border-blue-500/20": "border-blue-200 dark:border-blue-500/20",
    
    "border-orange-500/20": "border-orange-200 dark:border-orange-500/20",

    // Hover
    "hover:bg-emerald-500/10": "hover:bg-emerald-50 dark:hover:bg-emerald-500/10",
    "hover:bg-emerald-500/20": "hover:bg-emerald-100 dark:hover:bg-emerald-500/20",
    "hover:bg-emerald-500/30": "hover:bg-emerald-200 dark:hover:bg-emerald-500/30",

    // Shadows
    "shadow-emerald-500/10": "shadow-emerald-200 dark:shadow-emerald-500/10",
    "shadow-emerald-500/20": "shadow-emerald-200 dark:shadow-emerald-500/20",
};

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Skip layout.tsx and page.tsx in the root of dashboard as they are already done
    if (filePath.endsWith('src\\app\\dashboard\\layout.tsx') || filePath.endsWith('src/app/dashboard/layout.tsx')) return;
    if (filePath.endsWith('src\\app\\dashboard\\page.tsx') || filePath.endsWith('src/app/dashboard/page.tsx')) return;

    // Apply exact replacements
    for (const [key, val] of Object.entries(exactReplacements)) {
        // use regex to match word boundaries so we don't partially match, e.g. text-zinc-400 inside text-zinc-400/-10
        // Need to escape brackets for regex
        const regexStr = "(?<=[\"'\\s`])" + key.replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\//g, '\\/') + "(?=[\"'\\s`])";
        const regex = new RegExp(regexStr, 'g');
        content = content.replace(regex, val);
    }

    // Special handling for text-white
    // Replace text-white with "text-slate-900 dark:text-white" ONLY IF it is not preceded by a solid color background
    // Look for text-white
    const textWhiteRegex = /(?<=["'\s`])text-white(?=["'\s`])/g;
    
    // We will do a manual pass for text-white since JS variable length lookbehind might be tricky
    // Actually, we can just replace all text-white inside className attributes.
    // Instead of complex logic, we replace all `text-white` with `text-slate-900 dark:text-white`
    // THEN we fix any buttons by looking for `bg-emerald-500 text-slate-900 dark:text-white`
    content = content.replace(textWhiteRegex, "text-slate-900 dark:text-white");
    
    // Fixes for solid buttons (we put them back to text-white)
    const fixRegexes = [
        /bg-emerald-500([^"'{>]*?)text-slate-900 dark:text-white/g,
        /from-emerald-500([^"'{>]*?)text-slate-900 dark:text-white/g,
        /bg-indigo-500([^"'{>]*?)text-slate-900 dark:text-white/g,
        /bg-blue-500([^"'{>]*?)text-slate-900 dark:text-white/g,
        /bg-red-500([^"'{>]*?)text-slate-900 dark:text-white/g,
        /bg-amber-500([^"'{>]*?)text-slate-900 dark:text-white/g,
        /bg-violet-500([^"'{>]*?)text-slate-900 dark:text-white/g,
        /bg-cyan-500([^"'{>]*?)text-slate-900 dark:text-white/g,
        /bg-zinc-800([^"'{>]*?)text-slate-900 dark:text-white/g, // maybe? actually zinc-800 button needs white text in dark mode, but what about light mode? In light mode bg-zinc-800 becomes bg-slate-100, so we WANT slate-900. Leave it.
    ];

    fixRegexes.forEach(rx => {
        content = content.replace(rx, (match, p1) => {
            return match.replace("text-slate-900 dark:text-white", "text-white");
        });
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${path.basename(filePath)}`);
    }
}

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            processFile(fullPath);
        }
    });
}

walk(DASHBOARD_DIR);
console.log("Done refactoring light mode classes.");
