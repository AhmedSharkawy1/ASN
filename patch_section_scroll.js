/**
 * Converts all themes from filter-based to section-based scrolling.
 * Each theme will:
 * 1. Always render ALL categories as sections
 * 2. Use IntersectionObserver to track visible sections
 * 3. Auto-center the nav bar to the active category
 * 4. Clicking a category scrolls to that section
 */
const fs = require('fs');

// ============================================================
// THEME 9 — Already has sectionRefs + scroll handler, just needs:
//  1. Always show all categories (remove filter)
//  2. Remove 'all' guard from scroll handler
//  3. Add isManualScroll ref
//  4. Convert scrollToSection to use isManualScroll
// ============================================================
console.log('\n=== THEME 9 (Diablo) ===');
let t9 = fs.readFileSync('src/components/menu/Theme9Menu.tsx', 'utf8');

// 1. Change initial activeCategory from 'all' to first category ID
t9 = t9.replace(
    `const [activeCategory, setActiveCategory] = useState<string>('all');`,
    `const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id?.toString() || '');`
);
console.log('  [1] Changed initial activeCategory');

// 2. Add isManualScroll ref after catScrollRef
t9 = t9.replace(
    `    const catScrollRef = useRef<HTMLDivElement>(null);\r\n`,
    `    const catScrollRef = useRef<HTMLDivElement>(null);\r\n    const isManualScroll = useRef(false);\r\n`
);
if (!t9.includes('isManualScroll')) {
    t9 = t9.replace(
        `    const catScrollRef = useRef<HTMLDivElement>(null);\n`,
        `    const catScrollRef = useRef<HTMLDivElement>(null);\n    const isManualScroll = useRef(false);\n`
    );
}
console.log('  [2] Added isManualScroll ref');

// 3. Always show all categories - change activeCatList
t9 = t9.replace(
    /    const activeCatList = \(activeCategory === 'all' \|\| searchQuery\)\s*\r?\n\s*\? filteredCategories\s*\r?\n\s*: filteredCategories\.filter\(c => c\.id === activeCategory\);/,
    `    const activeCatList = filteredCategories;`
);
console.log('  [3] Always show all categories');

// 4. Replace scroll handler - use IntersectionObserver pattern instead of manual scroll spy
t9 = t9.replace(
    /    \/\/ Sync scroll\s*\r?\n    useEffect\(\(\) => \{[\s\S]*?return \(\) => window\.removeEventListener\('scroll', handleScroll\);\s*\r?\n    \}, \[activeCategory, searchQuery\]\);/,
    `    // Intersection Observer for active section
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScroll.current) return;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace('cat-', '');
                        setActiveCategory(id);
                    }
                });
            },
            { root: null, rootMargin: '-180px 0px -40% 0px', threshold: 0 }
        );
        categories.forEach((cat, idx) => {
            const el = sectionRefs.current[idx] || document.getElementById(\`cat-\${cat.id}\`);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [categories]);

    // Center active nav button
    useEffect(() => {
        if (activeCategory && catScrollRef.current) {
            const btn = catScrollRef.current.querySelector(\`[data-cat="\${activeCategory}"]\`) as HTMLElement;
            if (btn) {
                const container = catScrollRef.current;
                const btnRect = btn.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const btnCenter = btnRect.left + btnRect.width / 2;
                const containerCenter = containerRect.left + containerRect.width / 2;
                const diff = btnCenter - containerCenter;
                container.scrollBy({ left: diff, behavior: 'smooth' });
            }
        }
    }, [activeCategory]);`
);
console.log('  [4] Replaced scroll handler with IntersectionObserver + center-scroll');

// 5. Replace scrollToSection with smooth scroll + isManualScroll
t9 = t9.replace(
    /    const scrollToSection = \(id: string\) => \{[\s\S]*?    \};/,
    `    const scrollToSection = (id: string) => {
        isManualScroll.current = true;
        setActiveCategory(id);
        const el = document.getElementById(\`cat-\${id}\`);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 120;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
        setTimeout(() => { isManualScroll.current = false; }, 1200);
    };`
);
console.log('  [5] Updated scrollToSection');

// 6. Remove 'All' button from nav
t9 = t9.replace(
    /                        <button data-cat="all" onClick=\{[\s\S]*?<\/button>\s*\r?\n/,
    ''
);
console.log('  [6] Removed All button');

fs.writeFileSync('src/components/menu/Theme9Menu.tsx', t9);
console.log('  ✅ Theme 9 saved');


// ============================================================
// THEME 10 — Swiper nav + filter. Need to:
//  1. Add useRef import
//  2. Add refs (navRef, isManualScroll)
//  3. Always render all categories
//  4. Add section IDs
//  5. Replace Swiper nav with scrollable div
//  6. Add IntersectionObserver + center-scroll
//  7. Convert clicks to scroll-to-section
// ============================================================
console.log('\n=== THEME 10 (Orange Glow) ===');
let t10 = fs.readFileSync('src/components/menu/Theme10Menu.tsx', 'utf8');

// 1. Add useRef
t10 = t10.replace(
    `import React, { useState, useEffect } from 'react';`,
    `import React, { useState, useEffect, useRef } from 'react';`
);
console.log('  [1] Added useRef import');

// 2. Change initial activeCategory
t10 = t10.replace(
    `const [activeCategory, setActiveCategory] = useState<string>('all');`,
    `const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id?.toString() || '');\n    const catNavRef = useRef<HTMLDivElement>(null);\n    const isManualScroll = useRef(false);`
);
console.log('  [2] Changed activeCategory + added refs');

// 3. Always show all categories
t10 = t10.replace(
    /    \/\/ Filter Logic\s*\r?\n    const activeCatList = activeCategory === 'all'\s*\r?\n\s*\? categories\s*\r?\n\s*: categories\.filter\(c => c\.id === activeCategory\);/,
    `    // Always show all categories as sections
    const activeCatList = categories;

    // Intersection Observer for active section
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScroll.current) return;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace('t10-section-', '');
                        setActiveCategory(id);
                    }
                });
            },
            { root: null, rootMargin: '-180px 0px -40% 0px', threshold: 0 }
        );
        categories.forEach((cat) => {
            const el = document.getElementById(\`t10-section-\${cat.id}\`);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [categories]);

    // Center active nav button
    useEffect(() => {
        if (activeCategory && catNavRef.current) {
            const btn = catNavRef.current.querySelector(\`[data-cat-id="\${activeCategory}"]\`) as HTMLElement;
            if (btn) {
                const container = catNavRef.current;
                const btnRect = btn.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const btnCenter = btnRect.left + btnRect.width / 2;
                const containerCenter = containerRect.left + containerRect.width / 2;
                const diff = btnCenter - containerCenter;
                container.scrollBy({ left: diff, behavior: 'smooth' });
            }
        }
    }, [activeCategory]);

    const scrollToSection = (catId: string) => {
        isManualScroll.current = true;
        setActiveCategory(catId);
        const el = document.getElementById(\`t10-section-\${catId}\`);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 180;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
        setTimeout(() => { isManualScroll.current = false; }, 1200);
    };`
);
console.log('  [3] Added section-based logic');

// 4. Replace Swiper nav with scrollable div
t10 = t10.replace(
    /                {\/\* Category Navigation \(Swiper Based\) \*\/}[\s\S]*?<\/Swiper>\s*\r?\n\s*<\/div>\s*\r?\n\s*<\/div>/,
    `                {/* Category Navigation */}
                <div className="my-6 sticky top-[65px] z-40" style={{ backgroundColor: bgBody }}>
                    <div className="absolute -inset-x-4 inset-y-0 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] pointer-events-none" />
                    <div className="relative z-10 py-3">
                        <div ref={catNavRef} className="flex gap-2.5 overflow-x-auto pb-2 px-1" style={{ scrollbarWidth: 'none' }} dir={isAr ? 'rtl' : 'ltr'}>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    data-cat-id={cat.id}
                                    onClick={() => scrollToSection(cat.id.toString())}
                                    className={\`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all border-2 shadow-sm flex items-center gap-2 shrink-0 \${activeCategory === cat.id.toString() ? 'text-white' : ''}\`}
                                    style={{
                                        backgroundColor: activeCategory === cat.id.toString() ? primaryColor : bgCard,
                                        borderColor: activeCategory === cat.id.toString() ? primaryColor : borderColor,
                                        color: activeCategory === cat.id.toString() ? '#fff' : textMain,
                                    }}
                                >
                                    {cat.image_url && (
                                        <img src={cat.image_url} alt={catName(cat)} className="w-5 h-5 rounded-full object-cover" />
                                    )}
                                    {catName(cat)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>`
);
console.log('  [4] Replaced Swiper nav with scrollable div');

// 5. Add section ID to each category div
t10 = t10.replace(
    `                    {activeCatList.map((cat) => (\r\n                        <div key={cat.id} className="scroll-mt-32">`,
    `                    {activeCatList.map((cat) => (\r\n                        <div key={cat.id} id={\`t10-section-\${cat.id}\`} className="scroll-mt-32">`
);
// Also try LF version
t10 = t10.replace(
    `                    {activeCatList.map((cat) => (\n                        <div key={cat.id} className="scroll-mt-32">`,
    `                    {activeCatList.map((cat) => (\n                        <div key={cat.id} id={\`t10-section-\${cat.id}\`} className="scroll-mt-32">`
);
console.log('  [5] Added section IDs');

fs.writeFileSync('src/components/menu/Theme10Menu.tsx', t10);
console.log('  ✅ Theme 10 saved');


// ============================================================
// Helper function for Swiper-based themes (11, 13, 14)
// ============================================================
function patchSwiperTheme(filename, themeName, prefix, navStickyTop) {
    console.log(`\n=== ${themeName} ===`);
    let content = fs.readFileSync(filename, 'utf8');

    // Add useRef if not present
    if (!content.includes('useRef')) {
        content = content.replace(
            /import React, \{ useState, useEffect \} from 'react';/,
            `import React, { useState, useEffect, useRef } from 'react';`
        );
        console.log('  [1] Added useRef import');
    } else {
        console.log('  [1] useRef already imported');
    }

    // Change initial activeCategory + add refs
    if (content.includes(`useState<string>('all')`)) {
        content = content.replace(
            `const [activeCategory, setActiveCategory] = useState<string>('all');`,
            `const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id?.toString() || '');\n    const catNavRef = useRef<HTMLDivElement>(null);\n    const isManualScroll = useRef(false);`
        );
        console.log('  [2] Changed activeCategory + added refs');
    }

    // Replace filter logic with always-show-all + observers
    const filterPatterns = [
        /    const activeCatList = activeCategory === 'all'\s*\r?\n\s*\? categories\s*\r?\n\s*: categories\.filter\(c => c\.id === activeCategory\);/,
        /    \/\/ Filter Logic\s*\r?\n    const activeCatList = activeCategory === 'all'\s*\r?\n\s*\? categories\s*\r?\n\s*: categories\.filter\(c => c\.id === activeCategory\);/
    ];

    let replaced = false;
    for (const pattern of filterPatterns) {
        if (pattern.test(content)) {
            content = content.replace(pattern, `    const activeCatList = categories;

    // Intersection Observer for active section
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScroll.current) return;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace('${prefix}-', '');
                        setActiveCategory(id);
                    }
                });
            },
            { root: null, rootMargin: '-180px 0px -40% 0px', threshold: 0 }
        );
        categories.forEach((cat) => {
            const el = document.getElementById(\`${prefix}-\${cat.id}\`);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [categories]);

    // Center active nav button
    useEffect(() => {
        if (activeCategory && catNavRef.current) {
            const btn = catNavRef.current.querySelector(\`[data-cat-id="\${activeCategory}"]\`) as HTMLElement;
            if (btn) {
                const container = catNavRef.current;
                const btnRect = btn.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const btnCenter = btnRect.left + btnRect.width / 2;
                const containerCenter = containerRect.left + containerRect.width / 2;
                const diff = btnCenter - containerCenter;
                container.scrollBy({ left: diff, behavior: 'smooth' });
            }
        }
    }, [activeCategory]);

    const scrollToSection = (catId: string) => {
        isManualScroll.current = true;
        setActiveCategory(catId);
        const el = document.getElementById(\`${prefix}-\${catId}\`);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 180;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
        setTimeout(() => { isManualScroll.current = false; }, 1200);
    };`);
            replaced = true;
            break;
        }
    }
    if (replaced) console.log('  [3] Added section-based logic');
    else console.log('  [3] ⚠️ Filter pattern not found');

    // Replace Swiper category nav with scrollable div
    content = content.replace(
        /(<div className="relative z-10 py-3">\s*\r?\n\s*)<Swiper\s*\r?\n\s*modules=\{\[FreeMode\]\}\s*\r?\n\s*slidesPerView="auto"\s*\r?\n\s*spaceBetween=\{10\}\s*\r?\n\s*freeMode=\{true\}\s*\r?\n\s*dir=\{isAr \? 'rtl' : 'ltr'\}\s*\r?\n\s*className="w-full pb-2 px-1"\s*\r?\n\s*>\s*\r?\n\s*<SwiperSlide style=\{\{ width: 'auto' \}\}>\s*\r?\n\s*<button\s*\r?\n\s*onClick=\{[\s\S]*?<\/Swiper>/,
        `$1<div ref={catNavRef} className="flex gap-2.5 overflow-x-auto pb-2 px-1" style={{ scrollbarWidth: 'none' }} dir={isAr ? 'rtl' : 'ltr'}>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    data-cat-id={cat.id}
                                    onClick={() => scrollToSection(cat.id.toString())}
                                    className={\`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all border-2 shadow-sm flex items-center gap-2 shrink-0 \${activeCategory === cat.id.toString() ? 'text-white' : ''}\`}
                                    style={{
                                        backgroundColor: activeCategory === cat.id.toString() ? (config.theme_colors?.primary || primaryColor) : (typeof bgCard !== 'undefined' ? bgCard : '#fff'),
                                        borderColor: activeCategory === cat.id.toString() ? (config.theme_colors?.primary || primaryColor) : (typeof borderColor !== 'undefined' ? borderColor : '#e2e8f0'),
                                        color: activeCategory === cat.id.toString() ? '#fff' : (typeof textMain !== 'undefined' ? textMain : '#333'),
                                    }}
                                >
                                    {cat.image_url && (
                                        <img src={cat.image_url} alt={catName(cat)} className="w-5 h-5 rounded-full object-cover" />
                                    )}
                                    {catName(cat)}
                                </button>
                            ))}
                        </div>`
    );
    console.log('  [4] Replaced Swiper nav with scrollable div');

    // Add section IDs to category divs - multiple patterns
    const sectionPatterns = [
        [/<div key=\{cat\.id\} className="scroll-mt-32">/g, `<div key={cat.id} id={\`${prefix}-\${cat.id}\`} className="scroll-mt-32">`],
        [/<div key=\{cat\.id\} className="mb-12">/g, `<div key={cat.id} id={\`${prefix}-\${cat.id}\`} className="mb-12">`],
        [/<div key=\{cat\.id\} className="mb-10">/g, `<div key={cat.id} id={\`${prefix}-\${cat.id}\`} className="mb-10">`],
        [/<div key=\{cat\.id\} className="mb-8">/g, `<div key={cat.id} id={\`${prefix}-\${cat.id}\`} className="mb-8">`],
        [/<div key=\{cat\.id\} className="mb-6">/g, `<div key={cat.id} id={\`${prefix}-\${cat.id}\`} className="mb-6">`],
    ];
    let addedId = false;
    for (const [pattern, replacement] of sectionPatterns) {
        if (pattern.test(content)) {
            content = content.replace(pattern, replacement);
            addedId = true;
            break;
        }
    }
    // Try a more generic approach if none matched
    if (!addedId) {
        // Look for activeCatList.map or categories.map in JSX
        const mapPattern = /\{activeCatList\.map\(\(cat[^)]*\) => \(\s*\r?\n\s*<div key=\{cat\.id\}/g;
        if (mapPattern.test(content)) {
            content = content.replace(
                /(<div key=\{cat\.id\})((?!id=)[^>]*>)/g,
                (match, p1, p2) => {
                    if (match.includes('id={')) return match;
                    return `${p1} id={\`${prefix}-\${cat.id}\`}${p2}`;
                }
            );
            addedId = true;
        }
    }
    console.log(addedId ? '  [5] Added section IDs' : '  [5] ⚠️ Could not add section IDs automatically');

    fs.writeFileSync(filename, content);
    console.log(`  ✅ ${themeName} saved`);
}


// Apply to themes 11, 13, 14
patchSwiperTheme('src/components/menu/Theme11Menu.tsx', 'THEME 11 (Luxe)', 't11-section', '65px');
patchSwiperTheme('src/components/menu/Theme13Menu.tsx', 'THEME 13 (Golden Luxe)', 't13-section', '65px');
patchSwiperTheme('src/components/menu/Theme14Menu.tsx', 'THEME 14 (Interactive)', 't14-section', '65px');


// ============================================================
// THEME 12 — Has circular icon nav, need to check structure
// ============================================================
console.log('\n=== THEME 12 ===');
let t12 = fs.readFileSync('src/components/Theme12Menu/Theme12Menu.tsx', 'utf8');

if (!t12.includes('useRef')) {
    t12 = t12.replace(
        /import React, \{ useState, useEffect \} from 'react';/,
        `import React, { useState, useEffect, useRef } from 'react';`
    );
}

// Change initial activeCategory + add refs
if (t12.includes(`useState<string>('all')`)) {
    t12 = t12.replace(
        `const [activeCategory, setActiveCategory] = useState<string>('all');`,
        `const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id?.toString() || '');\n    const catNavRef = useRef<HTMLDivElement>(null);\n    const isManualScroll = useRef(false);`
    );
}

// Replace filter logic
const t12FilterPattern = /    const activeCatList = activeCategory === 'all'\s*\r?\n\s*\? categories\s*\r?\n\s*: categories\.filter\(c => c\.id[^)]*=== activeCategory\);/;
if (t12FilterPattern.test(t12)) {
    t12 = t12.replace(t12FilterPattern, `    const activeCatList = categories;

    // Intersection Observer for active section
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScroll.current) return;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace('t12-section-', '');
                        setActiveCategory(id);
                    }
                });
            },
            { root: null, rootMargin: '-180px 0px -40% 0px', threshold: 0 }
        );
        categories.forEach((cat) => {
            const el = document.getElementById(\`t12-section-\${cat.id}\`);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [categories]);

    // Center active nav button
    useEffect(() => {
        if (activeCategory && catNavRef.current) {
            const btn = catNavRef.current.querySelector(\`[data-cat-id="\${activeCategory}"]\`) as HTMLElement;
            if (btn) {
                const container = catNavRef.current;
                const btnRect = btn.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const btnCenter = btnRect.left + btnRect.width / 2;
                const containerCenter = containerRect.left + containerRect.width / 2;
                const diff = btnCenter - containerCenter;
                container.scrollBy({ left: diff, behavior: 'smooth' });
            }
        }
    }, [activeCategory]);

    const scrollToSection = (catId: string) => {
        isManualScroll.current = true;
        setActiveCategory(catId);
        const el = document.getElementById(\`t12-section-\${catId}\`);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 180;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
        setTimeout(() => { isManualScroll.current = false; }, 1200);
    };`);
    console.log('  [3] Added section-based logic');
} else {
    console.log('  [3] ⚠️ Filter pattern not found in Theme 12');
}

fs.writeFileSync('src/components/Theme12Menu/Theme12Menu.tsx', t12);
console.log('  ✅ Theme 12 saved');


// ============================================================
// THEMES 15 & 16 — Flat grid, need to group by category
// ============================================================
function patchFlatTheme(filename, themeName, prefix, containerClass) {
    console.log(`\n=== ${themeName} ===`);
    let content = fs.readFileSync(filename, 'utf8');

    // Already has useRef + filterChipsRef from previous patch
    // Already has center-scroll useEffect from previous patch
    // Now need to:
    // 1. Always show sections grouped by category instead of flat grid
    // 2. Add IntersectionObserver
    // 3. Convert filter clicks to scroll-to-section

    // Replace the search & filter logic to always show by sections
    content = content.replace(
        /    \/\/ --- Search & Filter Logic ---\s*\r?\n    let filteredItems: Item\[\] = \[\];\s*\r?\n[\s\S]*?filteredItems = cat \? cat\.items : \[\];\s*\r?\n    \}/,
        `    // --- Always show all categories as sections ---
    const activeCatList = categories;`
    );
    console.log('  [1] Replaced filter logic with section-based');

    // Add isManualScroll ref and IntersectionObserver if not already there
    if (!content.includes('isManualScroll')) {
        content = content.replace(
            `    const filterChipsRef = useRef<HTMLDivElement>(null);`,
            `    const filterChipsRef = useRef<HTMLDivElement>(null);
    const isManualScroll = useRef(false);`
        );
    }

    // Replace center-scroll useEffect with full IntersectionObserver + center-scroll
    content = content.replace(
        /    \/\/ --- Center active filter chip ---\s*\r?\n    useEffect\(\(\) => \{[\s\S]*?\}, \[activeCategory\]\);/,
        `    // Intersection Observer for active section
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScroll.current) return;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace('${prefix}-', '');
                        setActiveCategory(id);
                    }
                });
            },
            { root: null, rootMargin: '-180px 0px -40% 0px', threshold: 0 }
        );
        categories.forEach((cat) => {
            const el = document.getElementById(\`${prefix}-\${cat.id}\`);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [categories]);

    // Center active filter chip
    useEffect(() => {
        requestAnimationFrame(() => {
            if (filterChipsRef.current) {
                const activeChip = filterChipsRef.current.querySelector('.filter-chip.active') as HTMLElement;
                if (activeChip) {
                    const container = filterChipsRef.current;
                    const chipRect = activeChip.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    const chipCenter = chipRect.left + chipRect.width / 2;
                    const containerCenter = containerRect.left + containerRect.width / 2;
                    const diff = chipCenter - containerCenter;
                    container.scrollBy({ left: diff, behavior: 'smooth' });
                }
            }
        });
    }, [activeCategory]);

    const scrollToSection = (catId: string) => {
        isManualScroll.current = true;
        setActiveCategory(catId);
        const el = document.getElementById(\`${prefix}-\${catId}\`);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 120;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
        setTimeout(() => { isManualScroll.current = false; }, 1200);
    };`
    );
    console.log('  [2] Added IntersectionObserver + scrollToSection');

    // Change filter chip clicks to scroll-to-section
    content = content.replace(
        /onClick=\{\(\) => setActiveCategory\('all'\)\}/g,
        `onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}`
    );
    content = content.replace(
        /onClick=\{\(\) => setActiveCategory\(cat\.id\.toString\(\)\)\}/g,
        `onClick={() => scrollToSection(cat.id.toString())}`
    );
    console.log('  [3] Changed filter clicks to scrollToSection');

    // Replace flat grid rendering with section-based rendering
    content = content.replace(
        /            {\/\* Main Menu Grid \*\/}\s*\r?\n\s*<main className="main-content">\s*\r?\n\s*<div className="menu-grid">\s*\r?\n\s*\{filteredItems\.map\(item => \{[\s\S]*?\}\)\}\s*\r?\n\s*<\/div>\s*\r?\n\s*<\/main>/,
        `            {/* Main Menu Grid */}
            <main className="main-content">
                {activeCatList.map(cat => (
                    <div key={cat.id} id={\`${prefix}-\${cat.id}\`} className="mb-8 scroll-mt-32">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '16px 0 8px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 4, height: 20, borderRadius: 4, background: 'var(--primary-color)', display: 'inline-block' }}></span>
                            {catName(cat)}
                        </h3>
                        <div className="menu-grid">
                            {cat.items.filter(i => i.is_available !== false).map(item => {
                                const cName = catName(cat);
                                const cImage = cat.image_url;
                                return (
                                    <div className="menu-item" key={item.id}>
                                        <span className="item-badge">{cName}</span>
                                        <div className="item-image" onClick={() => openModal(item, cName, cImage || '')}>
                                            <Image src={item.image_url || cImage || '/placeholder.jpg'} alt="Item" fill className="object-cover cursor-pointer" />
                                        </div>
                                        <div className="item-content">
                                            <div className="item-header">
                                                <h3 className="item-title">{itemName(item)}</h3>
                                            </div>
                                            <p className="item-description">{isRTL ? (item.description_ar || '') : (item.description_en || item.description_ar || item.description || '')}</p>
                                            <div className="item-footer">
                                                <div className="flex flex-col gap-1 w-[70%] pr-1 pt-2 pb-1">
                                                    {item.prices?.map((p: number | string, pIdx: number) => (
                                                        <div key={pIdx} className="flex items-center gap-1.5 item-price-row">
                                                            <span className="item-price text-sm whitespace-nowrap">{cur} {p}</span>
                                                            {item.size_labels?.[pIdx] && (
                                                                <span className="text-[9px] text-gray-400 line-clamp-1">({item.size_labels[pIdx]})</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="item-actions">
                                                    <button className="action-btn copy-btn" onClick={(e) => copyToClipboard(\`\${itemName(item)} - \${cur} \${item.prices[0]?.toFixed?.(0) || item.prices[0]}\`, e)}>
                                                        <Clipboard size={14} />
                                                    </button>
                                                    {config.orders_enabled !== false && (
                                                        <button className="action-btn cart-btn" onClick={() => openModal(item, cName, cImage || '')}>
                                                            <Plus size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </main>`
    );
    console.log('  [4] Replaced flat grid with section-based rendering');

    // Remove "All" from category chips onClick for category sheet too
    content = content.replace(
        /onClick=\{\(\) => \{ setActiveCategory\('all'\); setShowCategorySheet\(false\); \}\}/g,
        `onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setShowCategorySheet(false); }}`
    );
    content = content.replace(
        /onClick=\{\(\) => \{ setActiveCategory\(c\.id\.toString\(\)\); setShowCategorySheet\(false\); \}\}/g,
        `onClick={() => { scrollToSection(c.id.toString()); setShowCategorySheet(false); }}`
    );
    console.log('  [5] Updated category sheet clicks');

    fs.writeFileSync(filename, content);
    console.log(`  ✅ ${themeName} saved`);
}

patchFlatTheme('src/components/menu/Theme15Menu.tsx', 'THEME 15 (Quick Grid)', 't15-section', 'filter-chips-container');
patchFlatTheme('src/components/menu/Theme16Menu.tsx', 'THEME 16 (Classic Red)', 't16-section', 'filter-chips-container');

console.log('\n\n🎉 All themes converted to section-based scrolling!');
