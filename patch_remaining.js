const fs = require('fs');

// ============================================================
// THEME 12 — Already section-based! Needs:
//   1. Add isManualScroll ref
//   2. Add IntersectionObserver for active section tracking
//   3. Add center-scroll for the circular nav
//   4. Update scrollToCategory to use isManualScroll
// ============================================================
console.log('\n=== THEME 12 ===');
let t12 = fs.readFileSync('src/components/Theme12Menu/Theme12Menu.tsx', 'utf8');

// Add isManualScroll + catNavRef after headerRef
t12 = t12.replace(
    `    const headerRef = useRef<HTMLElement>(null);`,
    `    const headerRef = useRef<HTMLElement>(null);
    const catNavRef = useRef<HTMLDivElement>(null);
    const isManualScroll = useRef(false);`
);
console.log('  [1] Added refs');

// Add IntersectionObserver + center-scroll after the scroll handler useEffect
t12 = t12.replace(
    `    const toggleTheme = () => {`,
    `    // IntersectionObserver for active section
    const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id?.toString() || '');

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScroll.current) return;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace('category-', '');
                        setActiveCategory(id);
                    }
                });
            },
            { root: null, rootMargin: '-200px 0px -40% 0px', threshold: 0 }
        );
        categories.forEach((cat) => {
            const el = document.getElementById(\`category-\${cat.id}\`);
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

    const toggleTheme = () => {`
);
console.log('  [2] Added IntersectionObserver + center-scroll');

// Update scrollToCategory to use isManualScroll + setActiveCategory
t12 = t12.replace(
    `    const scrollToCategory = (categoryId: string) => {
        const element = document.getElementById(\`category-\${categoryId}\`);
        if (element) {
            const headerOffset = 180; // Header + Banner
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setIsMobileMenuOpen(false);
        }
    };`,
    `    const scrollToCategory = (categoryId: string) => {
        isManualScroll.current = true;
        setActiveCategory(categoryId);
        const element = document.getElementById(\`category-\${categoryId}\`);
        if (element) {
            const headerOffset = 180;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            setIsMobileMenuOpen(false);
        }
        setTimeout(() => { isManualScroll.current = false; }, 1200);
    };`
);
console.log('  [3] Updated scrollToCategory');

// Add ref + data-cat-id to the circular nav category buttons
t12 = t12.replace(
    `                        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">`,
    `                        <div ref={catNavRef} className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">`
);
t12 = t12.replace(
    `                                    onClick={() => scrollToCategory(String(cat.id))}
                                    className="snap-start flex flex-col items-center gap-3 min-w-[90px] group flex-shrink-0"`,
    `                                    data-cat-id={cat.id}
                                    onClick={() => scrollToCategory(String(cat.id))}
                                    className={\`snap-start flex flex-col items-center gap-3 min-w-[90px] group flex-shrink-0 \${activeCategory === String(cat.id) ? 'scale-105' : ''}\`}`
);
console.log('  [4] Added ref + data-cat-id to nav buttons');

// Add active styling to border
t12 = t12.replace(
    `                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-tr from-[#6c63ff] to-[#00b894] shadow-[0_8px_15px_rgba(108,99,255,0.25)] group-hover:-translate-y-2 group-hover:shadow-[0_12px_20px_rgba(108,99,255,0.4)] transition-all duration-300">`,
    `                                    <div className={\`w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 shadow-[0_8px_15px_rgba(108,99,255,0.25)] group-hover:-translate-y-2 group-hover:shadow-[0_12px_20px_rgba(108,99,255,0.4)] transition-all duration-300 \${activeCategory === String(cat.id) ? 'bg-gradient-to-tr from-[#6c63ff] to-[#00b894] -translate-y-2' : 'bg-gray-200 dark:bg-gray-700'}\`}>`
);
console.log('  [5] Added active styling to nav circles');

fs.writeFileSync('src/components/Theme12Menu/Theme12Menu.tsx', t12);
console.log('  ✅ Theme 12 saved');


// ============================================================
// THEME 13 — Needs:
//   1. Replace filter with always-show-all
//   2. Replace Swiper category nav with scrollable div
//   3. Add IntersectionObserver + center-scroll
// ============================================================
console.log('\n=== THEME 13 ===');
let t13 = fs.readFileSync('src/components/menu/Theme13Menu.tsx', 'utf8');

// 1. Replace filter
t13 = t13.replace(
    `    // Filter Logic\r\n    const activeCatList = activeCategory === 'all'\r\n        ? categories\r\n        : categories.filter(c => c.id.toString() === activeCategory);`,
    `    const activeCatList = categories;

    // Intersection Observer for active section
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScroll.current) return;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace('t13-section-', '');
                        setActiveCategory(id);
                    }
                });
            },
            { root: null, rootMargin: '-180px 0px -40% 0px', threshold: 0 }
        );
        categories.forEach((cat) => {
            const el = document.getElementById(\`t13-section-\${cat.id}\`);
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
        const el = document.getElementById(\`t13-section-\${catId}\`);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 180;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
        setTimeout(() => { isManualScroll.current = false; }, 1200);
    };`
);
console.log('  [1] Replaced filter + added observers');

// 2. Replace Swiper category nav with scrollable div
t13 = t13.replace(
    /                {\/\* Category Filter - Circular Design \*\/}\s*\r?\n\s*<div className="px-4 mb-6">\s*\r?\n\s*<Swiper[\s\S]*?<\/Swiper>\s*\r?\n\s*<\/div>/,
    `                {/* Category Filter - Circular Design */}
                <div className="px-4 mb-6">
                    <div ref={catNavRef} className="flex gap-4 overflow-x-auto py-2 px-1" style={{ scrollbarWidth: 'none' }} dir={isAr ? 'rtl' : 'ltr'}>
                        {categories.map((cat) => (
                            <div
                                key={cat.id}
                                data-cat-id={cat.id}
                                onClick={() => scrollToSection(cat.id.toString())}
                                className={\`flex flex-col items-center cursor-pointer transition-all duration-300 w-[80px] md:w-[100px] shrink-0 \${activeCategory === cat.id.toString() ? '-translate-y-1' : ''}\`}
                            >
                                <div className="relative w-[65px] h-[65px] md:w-[80px] md:h-[80px] rounded-full overflow-hidden mb-2 mx-auto">
                                    <img
                                        src={cat.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200'}
                                        alt={catName(cat)}
                                        className="w-full h-full object-cover"
                                    />
                                    <div
                                        className={\`absolute inset-0 border-[3px] rounded-full transition-opacity duration-300 \${activeCategory === cat.id.toString() ? 'opacity-100 shadow-[0_5px_15px_rgba(0,0,0,0.15)]' : 'opacity-0'}\`}
                                        style={{ borderColor: primaryColor }}
                                    />
                                </div>
                                <span className="text-xs md:text-sm font-semibold truncate w-full text-center" style={{ color: activeCategory === cat.id.toString() ? primaryColor : textMain }}>
                                    {catName(cat)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>`
);
console.log('  [2] Replaced Swiper nav with scrollable div');

// 3. Remove "Featured Items" section conditional on activeCategory === 'all'
t13 = t13.replace(
    /                {\/\* Featured Items Section - Only show when "All" is selected \*\/}\s*\r?\n\s*\{activeCategory === 'all' && featuredItems\.length > 0 && \(/,
    `                {/* Featured Items Section */}
                {featuredItems.length > 0 && (`
);
console.log('  [3] Removed featured section condition');

fs.writeFileSync('src/components/menu/Theme13Menu.tsx', t13);
console.log('  ✅ Theme 13 saved');


// ============================================================
// THEME 14 — Needs:
//   1. Add useRef import + refs
//   2. Add IntersectionObserver + center-scroll
//   3. Always render sections (remove conditional render)
//   4. Replace Swiper category nav
//   5. Remove "all" from extended categories
// ============================================================
console.log('\n=== THEME 14 ===');
let t14 = fs.readFileSync('src/components/menu/Theme14Menu.tsx', 'utf8');

// 1. Add useRef
t14 = t14.replace(
    `import React, { useState, useEffect } from "react";`,
    `import React, { useState, useEffect, useRef } from "react";`
);
console.log('  [1] Added useRef import');

// 2. Change initial activeCategory + add refs
t14 = t14.replace(
    `    const [activeCategory, setActiveCategory] = useState<string>("all");`,
    `    const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id?.toString() || '');
    const catNavRef = useRef<HTMLDivElement>(null);
    const isManualScroll = useRef(false);`
);
console.log('  [2] Changed activeCategory + added refs');

// 3. Remove extendedCategories (drop 'all')
t14 = t14.replace(
    `    const extendedCategories = [{ id: "all", name_ar: "الكل", name_en: "All", icon: "🏠" }, ...categories];`,
    `    const extendedCategories = categories;`
);
console.log('  [3] Removed "all" from categories');

// 4. Replace filteredItems with always-show-all + add observers
t14 = t14.replace(
    `    const filteredItems = activeCategory === "all"\r\n        ? allItems\r\n        : categories.find((c: CategoryWithItemsType) => c.id.toString() === activeCategory)?.items || [];`,
    `    // Intersection Observer for active section
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScroll.current) return;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace('t14-section-', '');
                        setActiveCategory(id);
                    }
                });
            },
            { root: null, rootMargin: '-180px 0px -40% 0px', threshold: 0 }
        );
        categories.forEach((cat) => {
            const el = document.getElementById(\`t14-section-\${cat.id}\`);
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
        const el = document.getElementById(\`t14-section-\${catId}\`);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 180;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
        setTimeout(() => { isManualScroll.current = false; }, 1200);
    };`
);
console.log('  [4] Added IntersectionObserver + scrollToSection');

// 5. Replace Swiper category nav with scrollable div
t14 = t14.replace(
    /            {\/\* Categories Filter \*\/}\s*\r?\n\s*<div className=\{\`categories-filter[\s\S]*?<\/Swiper>\s*\r?\n\s*<\/div>/,
    `            {/* Categories Filter */}
            <div className={\`categories-filter \${isScrolled ? 'floating' : ''}\`}>
                <div ref={catNavRef} className="flex gap-2.5 overflow-x-auto px-1 py-2" style={{ scrollbarWidth: 'none' }} dir={isRTL ? "rtl" : "ltr"}>
                    {extendedCategories.map((cat: any) => (
                        <button
                            key={cat.id || cat.name_en || cat.name_ar}
                            data-cat-id={cat.id}
                            className={\`category-pill \${activeCategory === cat.id.toString() ? 'active' : ''}\`}
                            onClick={() => scrollToSection(cat.id.toString())}
                        >
                            <div className="category-icon-wrapper">
                                {cat.image_url ? (
                                    <img src={cat.image_url} alt={catName(cat)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                ) : (cat.icon || "🍽️")}
                            </div>
                            <span className="category-name">{catName(cat)}</span>
                        </button>
                    ))}
                </div>`
);
console.log('  [5] Replaced Swiper nav with scrollable div');

// 6. Remove Featured swiper conditional on activeCategory === "all"
t14 = t14.replace(
    `            {activeCategory === "all" && featuredItems.length > 0 && (`,
    `            {featuredItems.length > 0 && (`
);
console.log('  [6] Removed featured section condition');

// 7. Replace conditional category render with always-show-all
t14 = t14.replace(
    /            {\/\* Main Menu Grid \/ List \*\/}\s*\r?\n\s*<div className="menu-container">\s*\r?\n\s*\{activeCategory === "all" \? \(\s*\r?\n\s*categories\.map\(\(cat: CategoryWithItemsType, i: number\) => \(\s*\r?\n\s*<div key=\{cat\.id \|\| i\}>/,
    `            {/* Main Menu Grid */}
            <div className="menu-container">
                {categories.map((cat: CategoryWithItemsType, i: number) => (
                    <div key={cat.id || i} id={\`t14-section-\${cat.id}\`} className="scroll-mt-32">`
);
console.log('  [7] Changed to always render all sections');

// 8. Remove the else branch (single category render)
t14 = t14.replace(
    /                    \)\)\s*\r?\n\s*\) : \(\s*\r?\n\s*<div>\s*\r?\n\s*<h3 className="category-title">\s*\r?\n\s*\{categories\.find[\s\S]*?<\/div>\s*\r?\n\s*\)}\s*\r?\n\s*<\/div>/,
    `                    ))}`
);
console.log('  [8] Removed single-category branch');

fs.writeFileSync('src/components/menu/Theme14Menu.tsx', t14);
console.log('  ✅ Theme 14 saved');


console.log('\n\n🎉 All remaining themes fixed!');
