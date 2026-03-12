const fs = require('fs');

function safeReplace(fileStr, searchStr, replacementStr) {
    const escapedSearch = searchStr
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\n/g, '\\r?\\n');
    const searchRegex = new RegExp(escapedSearch, 'g');
    const result = fileStr.replace(searchRegex, replacementStr);
    if (result === fileStr) {
        console.log('  WARNING: Pattern not found, no replacement made!');
        return fileStr;
    }
    return result;
}

// ========== THEME 9 ==========
console.log('Patching Theme9Menu.tsx...');
let t9 = fs.readFileSync('src/components/menu/Theme9Menu.tsx', 'utf8');

// Replace scrollIntoView with center-math in the scroll handler
t9 = safeReplace(t9,
`            // Auto scroll nav
            if (currentSection !== activeCategory) {
                setActiveCategory(currentSection);
                const activeTab = catScrollRef.current?.querySelector(\`[data-cat="\${currentSection}"]\`);
                if (activeTab && catScrollRef.current) {
                    const navRect = catScrollRef.current.getBoundingClientRect();
                    const tabRect = activeTab.getBoundingClientRect();
                    if (tabRect.left < navRect.left || tabRect.right > navRect.right) {
                        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                }
            }`,
`            // Auto scroll nav with center-math
            if (currentSection !== activeCategory) {
                setActiveCategory(currentSection);
                const activeTab = catScrollRef.current?.querySelector(\`[data-cat="\${currentSection}"]\`) as HTMLElement;
                if (activeTab && catScrollRef.current) {
                    const container = catScrollRef.current;
                    const btnRect = activeTab.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    const btnCenter = btnRect.left + btnRect.width / 2;
                    const containerCenter = containerRect.left + containerRect.width / 2;
                    const diff = btnCenter - containerCenter;
                    container.scrollBy({ left: diff, behavior: 'smooth' });
                }
            }`
);

fs.writeFileSync('src/components/menu/Theme9Menu.tsx', t9);
console.log('  Theme9Menu.tsx patched!');

// ========== THEME 15 ==========
console.log('Patching Theme15Menu.tsx...');
let t15 = fs.readFileSync('src/components/menu/Theme15Menu.tsx', 'utf8');

// Add useRef import
t15 = safeReplace(t15,
`import React, { useState, useEffect } from 'react';`,
`import React, { useState, useEffect, useRef } from 'react';`
);

// Add ref and useEffect after state declaration
t15 = safeReplace(t15,
`    // --- State ---
    const [activeCategory, setActiveCategory] = useState<string>('all');`,
`    // --- State ---
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const filterChipsRef = useRef<HTMLDivElement>(null);`
);

// Add useEffect to center active chip - insert after the effects block
t15 = safeReplace(t15,
`    // --- Helpers ---`,
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
    }, [activeCategory]);

    // --- Helpers ---`
);

// Add ref to the filter-chips-container div
t15 = safeReplace(t15,
`                <div className="filter-chips-container">`,
`                <div className="filter-chips-container" ref={filterChipsRef}>`
);

fs.writeFileSync('src/components/menu/Theme15Menu.tsx', t15);
console.log('  Theme15Menu.tsx patched!');

// ========== THEME 16 ==========
console.log('Patching Theme16Menu.tsx...');
let t16 = fs.readFileSync('src/components/menu/Theme16Menu.tsx', 'utf8');

// Add useRef import
t16 = safeReplace(t16,
`import React, { useState, useEffect } from 'react';`,
`import React, { useState, useEffect, useRef } from 'react';`
);

// Add ref and useEffect after state declaration
t16 = safeReplace(t16,
`    // --- State ---
    const [activeCategory, setActiveCategory] = useState<string>('all');`,
`    // --- State ---
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const filterChipsRef = useRef<HTMLDivElement>(null);`
);

// Add useEffect to center active chip - insert after the effects block
t16 = safeReplace(t16,
`    // --- Helpers ---`,
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
    }, [activeCategory]);

    // --- Helpers ---`
);

// Add ref to the filter-chips-container div
t16 = safeReplace(t16,
`                <div className="filter-chips-container">`,
`                <div className="filter-chips-container" ref={filterChipsRef}>`
);

fs.writeFileSync('src/components/menu/Theme16Menu.tsx', t16);
console.log('  Theme16Menu.tsx patched!');

console.log('\nAll theme patches completed successfully!');
