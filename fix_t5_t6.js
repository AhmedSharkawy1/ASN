const fs = require('fs');

// ===== THEME 5: Replace scrollIntoView with center-math =====
let t5 = fs.readFileSync('src/components/menu/Theme5Menu.tsx', 'utf8');

// Replace the scrollIntoView line in the IO callback with center-math
t5 = t5.replace(
    `const btn = categoryNavRef.current?.querySelector(\`[data-cat-id="\${id}"]\`);
                        btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });`,
    `// Center-math auto-scroll nav
                        if (categoryNavRef.current) {
                            const btn = categoryNavRef.current.querySelector(\`[data-cat-id="\${id}"]\`) as HTMLElement;
                            if (btn) {
                                const container = categoryNavRef.current;
                                const btnRect = btn.getBoundingClientRect();
                                const containerRect = container.getBoundingClientRect();
                                const btnCenter = btnRect.left + btnRect.width / 2;
                                const containerCenter = containerRect.left + containerRect.width / 2;
                                const diff = btnCenter - containerCenter;
                                container.scrollBy({ left: diff, behavior: 'smooth' });
                            }
                        }`
);

// Also fix scrollToSection to use proper offset instead of scrollIntoView
t5 = t5.replace(
    `el.scrollIntoView({ behavior: "smooth" });`,
    `const top = el.getBoundingClientRect().top + window.scrollY - 140;
            window.scrollTo({ top, behavior: "smooth" });`
);

fs.writeFileSync('src/components/menu/Theme5Menu.tsx', t5);
console.log('  ✅ Theme 5: scrollIntoView → center-math');


// ===== THEME 6: Replace scrollIntoView with center-math =====
let t6 = fs.readFileSync('src/components/menu/Theme6Menu.tsx', 'utf8');

// Add isManualScroll ref if not present
if (!t6.includes('isManualScroll')) {
    t6 = t6.replace(
        'const catNavRef = useRef<HTMLDivElement>(null);',
        `const catNavRef = useRef<HTMLDivElement>(null);
    const isManualScroll = useRef(false);`
    );
    console.log('  [1] Theme 6: Added isManualScroll ref');
}

// Replace IO callback with center-math and isManualScroll guard
t6 = t6.replace(
    `/* ── intersection observer for active section ── */
    useEffect(() => {
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    setActiveSection(e.target.id);
                    const btn = catNavRef.current?.querySelector(\`[data-id="\${e.target.id}"]\`);
                    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        }, { rootMargin: '-140px 0px -75% 0px', threshold: 0 });
        visibleCategories.forEach(c => { const el = document.getElementById(c.id); if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, [categories]);`,
    `/* ── intersection observer for active section ── */
    useEffect(() => {
        const obs = new IntersectionObserver(entries => {
            if (isManualScroll.current) return;
            entries.forEach(e => {
                if (e.isIntersecting) {
                    setActiveSection(e.target.id);
                }
            });
        }, { rootMargin: '-140px 0px -75% 0px', threshold: 0 });
        visibleCategories.forEach(c => { const el = document.getElementById(c.id); if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, [categories]);

    /* ── center active nav button ── */
    useEffect(() => {
        if (activeSection && catNavRef.current) {
            const btn = catNavRef.current.querySelector(\`[data-id="\${activeSection}"]\`) as HTMLElement;
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
    }, [activeSection]);`
);
console.log('  [2] Theme 6: IO → center-math + separate useEffect');

// Replace the onClick on nav buttons to use scrollToSection with proper offset
// Current: onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}
t6 = t6.replace(
    `onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}`,
    `onClick={() => {
                                isManualScroll.current = true;
                                setActiveSection(s.id);
                                const el = document.getElementById(s.id);
                                if (el) {
                                    const top = el.getBoundingClientRect().top + window.scrollY - 140;
                                    window.scrollTo({ top, behavior: 'smooth' });
                                }
                                setTimeout(() => { isManualScroll.current = false; }, 800);
                            }}`
);
console.log('  [3] Theme 6: Nav click → proper scroll with isManualScroll');

fs.writeFileSync('src/components/menu/Theme6Menu.tsx', t6);
console.log('  ✅ Theme 6 saved!\n');

console.log('🎉 Both themes fixed!');
