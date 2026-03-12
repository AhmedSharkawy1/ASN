const fs = require('fs');

// ===== THEME 6 (فراندة): Remove HIDDEN_CATS, revert to `categories` =====
let t6 = fs.readFileSync('src/components/menu/Theme6Menu.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Remove the HIDDEN_CATS block
t6 = t6.replace(
  `\n    // Categories to hide from display\n    const HIDDEN_CATS = [\n        'كريب', 'الكريب الحلو', 'فطير حشو داخلي', 'ركن الفطير الحلو',\n        'رول أطياب', 'إضافات الكريب والسوري', 'إضافات الفطير الحلو',\n        'إضافات البيتزا والفطير', 'بيتزا شرقي', 'بيتزا إيطالي', 'السندوتشات السوري'\n    ];\n    const visibleCategories = categories.filter((c) => !HIDDEN_CATS.includes(c.name_ar));`,
  ''
);
console.log('  [1] Theme 6: Removed HIDDEN_CATS');

// 2. Replace visibleCategories → categories everywhere
t6 = t6.replace(/visibleCategories/g, 'categories');
console.log('  [2] Theme 6: Reverted visibleCategories → categories');

fs.writeFileSync('src/components/menu/Theme6Menu.tsx', t6);
console.log('  ✅ Theme 6 saved!');


// ===== THEME 7 (حليم): Add HIDDEN_CATS filter + fix scroll sync =====
let t7 = fs.readFileSync('src/components/menu/Theme7Menu.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Add HIDDEN_CATS + visibleCategories after `const cur = ...`
if (!t7.includes('HIDDEN_CATS')) {
  t7 = t7.replace(
    "const cur = config.currency || 'EGP';",
    `const cur = config.currency || 'EGP';

    // Categories to hide from display
    const HIDDEN_CATS = [
        'كريب', 'الكريب الحلو', 'فطير حشو داخلي', 'ركن الفطير الحلو',
        'رول أطياب', 'إضافات الكريب والسوري', 'إضافات الفطير الحلو',
        'إضافات البيتزا والفطير', 'بيتزا شرقي', 'بيتزا إيطالي', 'السندوتشات السوري'
    ];
    const visibleCategories = categories.filter((c) => !HIDDEN_CATS.includes(c.name_ar));`
  );
  console.log('  [1] Theme 7: Added HIDDEN_CATS + visibleCategories');
}

// 2. Add isManualScroll ref
if (!t7.includes('isManualScroll')) {
  t7 = t7.replace(
    'const subCatRef = useRef<HTMLDivElement>(null);',
    `const subCatRef = useRef<HTMLDivElement>(null);
    const isManualScroll = useRef(false);`
  );
  console.log('  [2] Theme 7: Added isManualScroll ref');
}

// 3. Fix IO: add isManualScroll guard, remove scrollIntoView
t7 = t7.replace(
  `const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    setActiveSubCat(e.target.id);
                    const btn = subCatRef.current?.querySelector(\`[data-id="\${e.target.id}"]\`);
                    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        }, { rootMargin: '-200px 0px -60% 0px', threshold: 0 });
        categories.forEach(c => { const el = document.getElementById(c.id); if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, [categories]);`,
  `const obs = new IntersectionObserver(entries => {
            if (isManualScroll.current) return;
            entries.forEach(e => {
                if (e.isIntersecting) {
                    setActiveSubCat(e.target.id);
                }
            });
        }, { rootMargin: '-200px 0px -60% 0px', threshold: 0 });
        visibleCategories.forEach(c => { const el = document.getElementById(c.id); if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, [categories]);

    /* center active nav button */
    useEffect(() => {
        if (activeSubCat && subCatRef.current) {
            const btn = subCatRef.current.querySelector(\`[data-id="\${activeSubCat}"]\`) as HTMLElement;
            if (btn) {
                const container = subCatRef.current;
                const btnRect = btn.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const btnCenter = btnRect.left + btnRect.width / 2;
                const containerCenter = containerRect.left + containerRect.width / 2;
                const diff = btnCenter - containerCenter;
                container.scrollBy({ left: diff, behavior: 'smooth' });
            }
        }
    }, [activeSubCat]);`
);
console.log('  [3] Theme 7: Fixed IO + center-scroll');

// 4. Fix nav onClick - text tabs (line 239)
t7 = t7.replace(
  `onClick={() => document.getElementById(cat.id)?.scrollIntoView({ behavior: 'smooth' })}
                                className="shrink-0 text-base font-bold pb-1 transition-all whitespace-nowrap"`,
  `onClick={() => {
                                    isManualScroll.current = true;
                                    setActiveSubCat(cat.id);
                                    const el = document.getElementById(cat.id);
                                    if (el) {
                                        const top = el.getBoundingClientRect().top + window.scrollY - 200;
                                        window.scrollTo({ top, behavior: 'smooth' });
                                    }
                                    setTimeout(() => { isManualScroll.current = false; }, 800);
                                }}
                                className="shrink-0 text-base font-bold pb-1 transition-all whitespace-nowrap"`
);
console.log('  [4] Theme 7: Fixed text tab onClick');

// 5. Fix nav onClick - circular sub-cats (line 259) 
t7 = t7.replace(
  `onClick={() => document.getElementById(cat.id)?.scrollIntoView({ behavior: 'smooth' })}
                                className="flex flex-col items-center gap-2 shrink-0 min-w-[80px]"`,
  `onClick={() => {
                                    isManualScroll.current = true;
                                    setActiveSubCat(cat.id);
                                    const el = document.getElementById(cat.id);
                                    if (el) {
                                        const top = el.getBoundingClientRect().top + window.scrollY - 200;
                                        window.scrollTo({ top, behavior: 'smooth' });
                                    }
                                    setTimeout(() => { isManualScroll.current = false; }, 800);
                                }}
                                className="flex flex-col items-center gap-2 shrink-0 min-w-[80px]"`
);
console.log('  [5] Theme 7: Fixed circular sub-cat onClick');

// 6. Replace `categories.map` and `categories.filter` in render with visibleCategories
// Text tabs nav
t7 = t7.replace(
  '{categories.map((cat: any) => {\n                        const isActive = activeSubCat === cat.id;\n                        return (\n                            <button key={cat.id}',
  '{visibleCategories.map((cat: any) => {\n                        const isActive = activeSubCat === cat.id;\n                        return (\n                            <button key={cat.id}'
);

// Circular sub-cats
t7 = t7.replace(
  '{categories.map((cat: any) => {\n                        const isActive = activeSubCat === cat.id;\n                        return (\n                            <button key={cat.id} data-id={cat.id}',
  '{visibleCategories.map((cat: any) => {\n                        const isActive = activeSubCat === cat.id;\n                        return (\n                            <button key={cat.id} data-id={cat.id}'
);

// Menu sections
t7 = t7.replace(
  '{categories.filter((c: any) => c.items?.length > 0).map((section: any) => (',
  '{visibleCategories.filter((c: any) => c.items?.length > 0).map((section: any) => ('
);
console.log('  [6] Theme 7: Replaced categories → visibleCategories in render');

// 7. Initialize activeSubCat from visibleCategories  
t7 = t7.replace(
  "const [activeSubCat, setActiveSubCat] = useState(categories[0]?.id || '');",
  "const [activeSubCat, setActiveSubCat] = useState(visibleCategories[0]?.id || '');"
);
console.log('  [7] Theme 7: Init activeSubCat from visibleCategories');

fs.writeFileSync('src/components/menu/Theme7Menu.tsx', t7);
console.log('  ✅ Theme 7 saved!');

console.log('\n🎉 Both themes fixed!');
