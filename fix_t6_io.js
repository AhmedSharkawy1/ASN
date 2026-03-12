const fs = require('fs');

let code = fs.readFileSync('src/components/menu/Theme6Menu.tsx', 'utf8');

// The old IO still has scrollIntoView — need to replace it
// Find and replace the IO block
const oldIO = `const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    setActiveSection(e.target.id);
                    const btn = catNavRef.current?.querySelector(\`[data-id="\${e.target.id}"]\`);
                    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        }, { rootMargin: '-140px 0px -75% 0px', threshold: 0 });`;

const newIO = `const obs = new IntersectionObserver(entries => {
            if (isManualScroll.current) return;
            entries.forEach(e => {
                if (e.isIntersecting) {
                    setActiveSection(e.target.id);
                }
            });
        }, { rootMargin: '-140px 0px -75% 0px', threshold: 0 });`;

// Normalize line endings for matching
const codeNorm = code.replace(/\r\n/g, '\n');
const oldNorm = oldIO.replace(/\r\n/g, '\n');
const newNorm = newIO.replace(/\r\n/g, '\n');

if (codeNorm.includes(oldNorm)) {
    code = codeNorm.replace(oldNorm, newNorm);
    console.log('  ✅ Replaced old IO with isManualScroll guard');
} else {
    console.log('  ⚠️ Old IO pattern not found, checking if already fixed...');
    if (codeNorm.includes('if (isManualScroll.current) return;')) {
        console.log('  ✅ Already has isManualScroll guard');
    } else {
        console.log('  ❌ Could not find the IO pattern to replace');
    }
}

// Check if center-scroll useEffect already exists
if (!codeNorm.includes('center active nav button')) {
    // Add after the IO useEffect closing
    const ioEnd = `return () => obs.disconnect();
    }, [categories]);`;
    const centerScroll = `return () => obs.disconnect();
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
    }, [activeSection]);`;
    
    if (code.includes(ioEnd.replace(/\r\n/g, '\n'))) {
        code = code.replace(ioEnd.replace(/\r\n/g, '\n'), centerScroll.replace(/\r\n/g, '\n'));
        console.log('  ✅ Added center-scroll useEffect');
    } else {
        console.log('  ⚠️ Could not find IO end to add center-scroll');
    }
} else {
    console.log('  ✅ Center-scroll useEffect already exists');
}

fs.writeFileSync('src/components/menu/Theme6Menu.tsx', code);
console.log('\n🎉 Theme 6 fixed!');
