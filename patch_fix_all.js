const fs = require('fs');

function patchFile(filename, patches) {
    let content = fs.readFileSync(filename, 'utf8');
    for (const [label, search, replace] of patches) {
        if (content.includes(search)) {
            content = content.replace(search, replace);
            console.log(`  ✅ ${label}`);
        } else {
            // Try with \r\n variations
            const searchNorm = search.replace(/\r?\n/g, '\r\n');
            if (content.includes(searchNorm)) {
                content = content.replace(searchNorm, replace.replace(/\n/g, '\r\n'));
                console.log(`  ✅ ${label} (CRLF)`);
            } else {
                const searchLF = search.replace(/\r\n/g, '\n');
                if (content.includes(searchLF)) {
                    content = content.replace(searchLF, replace);
                    console.log(`  ✅ ${label} (LF)`);
                } else {
                    console.log(`  ❌ ${label} — PATTERN NOT FOUND`);
                }
            }
        }
    }
    fs.writeFileSync(filename, content);
}

// ========== 1. AtyabOrientalMenu — fix scrollIntoView → center-math ==========
console.log('\n--- AtyabOrientalMenu.tsx ---');
patchFile('src/components/menu/AtyabOrientalMenu.tsx', [
    [
        'Replace scrollIntoView with center-math in useEffect',
        `    useEffect(() => {
        if (activeCategory && navRef.current) {
            const btn = navRef.current.querySelector(\`[data-cat-id="\${activeCategory}"]\`);
            btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
    }, [activeCategory]);`,
        `    useEffect(() => {
        if (activeCategory && navRef.current) {
            const btn = navRef.current.querySelector(\`[data-cat-id="\${activeCategory}"]\`) as HTMLElement;
            if (btn) {
                const container = navRef.current;
                const btnRect = btn.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const btnCenter = btnRect.left + btnRect.width / 2;
                const containerCenter = containerRect.left + containerRect.width / 2;
                const diff = btnCenter - containerCenter;
                container.scrollBy({ left: diff, behavior: 'smooth' });
            }
        }
    }, [activeCategory]);`
    ],
    [
        'Fix handleNavClick: smooth scroll + longer timeout',
        `    const handleNavClick = (id: string) => {
        haptic(10);
        setShowCategoriesGrid(false);
        const el = document.getElementById(\`atyab-\${id}\`);
        if (el) {
            isManualScroll.current = true;
            setActiveCategory(id);
            const top = el.getBoundingClientRect().top + window.pageYOffset - 170;
            window.scrollTo({ top, behavior: "auto" });
            setTimeout(() => { isManualScroll.current = false; }, 150);
        }
    };`,
        `    const handleNavClick = (id: string) => {
        haptic(10);
        setShowCategoriesGrid(false);
        const el = document.getElementById(\`atyab-\${id}\`);
        if (el) {
            isManualScroll.current = true;
            setActiveCategory(id);
            const top = el.getBoundingClientRect().top + window.scrollY - 170;
            window.scrollTo({ top, behavior: "smooth" });
            setTimeout(() => { isManualScroll.current = false; }, 1200);
        }
    };`
    ]
]);

// ========== 2. Theme9Menu — add nav centering to scrollToSection ==========
console.log('\n--- Theme9Menu.tsx ---');
patchFile('src/components/menu/Theme9Menu.tsx', [
    [
        'Add nav centering to scrollToSection',
        `    const scrollToSection = (id: string) => {
        setActiveCategory(id);
        if (id === 'all') {
            window.scrollTo({ top: 300, behavior: 'smooth' });
            return;
        }
        const el = document.getElementById(\`cat-\${id}\`);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };`,
        `    const scrollToSection = (id: string) => {
        setActiveCategory(id);
        // Center the nav button
        const activeTab = catScrollRef.current?.querySelector(\`[data-cat="\${id}"]\`) as HTMLElement;
        if (activeTab && catScrollRef.current) {
            const container = catScrollRef.current;
            const btnRect = activeTab.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const btnCenter = btnRect.left + btnRect.width / 2;
            const containerCenter = containerRect.left + containerRect.width / 2;
            const diff = btnCenter - containerCenter;
            container.scrollBy({ left: diff, behavior: 'smooth' });
        }
        if (id === 'all') {
            window.scrollTo({ top: 300, behavior: 'smooth' });
            return;
        }
        const el = document.getElementById(\`cat-\${id}\`);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };`
    ]
]);

// ========== 3. Theme15Menu — wrap useEffect in requestAnimationFrame ==========
console.log('\n--- Theme15Menu.tsx ---');
patchFile('src/components/menu/Theme15Menu.tsx', [
    [
        'Add requestAnimationFrame to center-math useEffect',
        `    // --- Center active filter chip ---
    useEffect(() => {
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
    }, [activeCategory]);`,
        `    // --- Center active filter chip ---
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
    }, [activeCategory]);`
    ]
]);

// ========== 4. Theme16Menu — wrap useEffect in requestAnimationFrame ==========
console.log('\n--- Theme16Menu.tsx ---');
patchFile('src/components/menu/Theme16Menu.tsx', [
    [
        'Add requestAnimationFrame to center-math useEffect',
        `    // --- Center active filter chip ---
    useEffect(() => {
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
    }, [activeCategory]);`,
        `    // --- Center active filter chip ---
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
    }, [activeCategory]);`
    ]
]);

console.log('\n✅ All fixes applied!');
