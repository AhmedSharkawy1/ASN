const fs = require('fs');
const path = require('path');

const dir = 'f:/ASN/ASN/src/components/menu';

const targets = [
    'PizzaPastaMenu.tsx',
    'PizzaPastaCyanMenu.tsx',
    'PizzaPastaEmeraldMenu.tsx',
    'PizzaPastaSkyMenu.tsx',
    'AtyabOrientalMenu.tsx',
    'AtyabOrientalCyanMenu.tsx',
    'AtyabOrientalEmeraldMenu.tsx',
    'AtyabOrientalSkyMenu.tsx',
];

let count = 0;

for (const file of targets) {
    const fp = path.join(dir, file);
    let content = fs.readFileSync(fp, 'utf8');

    // 1. Add showBottomCallModal state after showCallMenu state
    if (!content.includes('showBottomCallModal')) {
        content = content.replace(
            /const \[showCallMenu, setShowCallMenu\] = useState\(false\);/,
            `const [showCallMenu, setShowCallMenu] = useState(false);\n    const [showBottomCallModal, setShowBottomCallModal] = useState(false);`
        );
    }

    // 2. Replace the bottom nav phone button to use showBottomCallModal instead of showCallMenu
    // PizzaPasta pattern:
    content = content.replace(
        /\{?\(config\.phone_numbers && config\.phone_numbers\.length > 0\) && \(\n\s*<button onClick=\{[\s\S]*?setShowCallMenu\(true\)[\s\S]*?<\/button>\n\s*\)\}/,
        `{(config.phone_numbers && config.phone_numbers.length > 0) && (
                        <button onClick={() => setShowBottomCallModal(true)} className="flex-1 flex flex-col items-center py-2 text-zinc-500 active:scale-90 transition-transform">
                            <span className="text-xl">📞</span>
                            <span className="text-[8px] font-black text-zinc-400 mt-1 uppercase">{isAr ? "اتصال" : "Call"}</span>
                        </button>
                    )}`
    );

    // AtyabOriental bottom nav pattern - the phone icon triggers showCallMenu via haptic
    // We need to change the bottom nav phone icon to use showBottomCallModal
    content = content.replace(
        /<button onClick=\{?\(\) => \{ haptic\(\); setShowCallMenu\(!showCallMenu\); \}\}[^>]*className=\{`flex-1 flex flex-col items-center py-2 active:scale-90 transition-all \$\{showCallMenu \? "[^"]*" : "text-zinc-500"\}`\}>/g,
        `<button onClick={() => { haptic(); setShowBottomCallModal(!showBottomCallModal); }} className={\`flex-1 flex flex-col items-center py-2 active:scale-90 transition-all \${showBottomCallModal ? "text-[#eab308]" : "text-zinc-500"}\`}>`
    );

    // 3. Add the bottom call modal JSX before the ASNFooter or CheckoutModal
    if (!content.includes('showBottomCallModal &&')) {
        // Determine the theme color for the modal
        const isPizzaPasta = file.includes('PizzaPasta');
        const accentColor = isPizzaPasta ? 'rose-600' : '[#eab308]';
        const accentColorDark = isPizzaPasta ? 'rose-500' : '[#eab308]';
        const hoverBg = isPizzaPasta ? 'hover:bg-rose-50 dark:hover:bg-rose-500/5' : 'hover:bg-amber-50 dark:hover:bg-amber-500/5';
        
        const modalJSX = `
            {/* ═══════ BOTTOM NAV DELIVERY MODAL ═══════ */}
            <AnimatePresence>
                {showBottomCallModal && (
                    <>
                        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" onClick={() => setShowBottomCallModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 z-[201] bg-white dark:bg-zinc-900 rounded-t-[2rem] shadow-2xl overflow-hidden max-h-[70vh]"
                        >
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                            </div>
                            <div className="px-5 pb-3 pt-1 flex items-center justify-between border-b border-zinc-100 dark:border-white/5">
                                <h3 className="text-lg font-black text-zinc-900 dark:text-white">{isAr ? 'أرقام الدليفري' : 'Delivery Numbers'}</h3>
                                <button onClick={() => setShowBottomCallModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 active:scale-90 transition-transform">
                                    <span className="text-lg">✕</span>
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto space-y-3 pb-safe" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 1rem), 1.5rem)' }}>
                                {config.phone_numbers && config.phone_numbers.length > 0 ? (
                                    config.phone_numbers.map((pn: {label?: string; number: string}, idx: number) => (
                                        <a key={idx} href={\`tel:\${pn.number}\`}
                                            className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl active:scale-[0.97] transition-all ${hoverBg} group"
                                        >
                                            <div className="flex flex-col text-right flex-1 min-w-0">
                                                <span className="font-bold text-zinc-400 dark:text-zinc-500 text-[11px] mb-1">
                                                    {pn.label || (isAr ? \`رقم \${idx + 1}\` : \`Line \${idx + 1}\`)}
                                                </span>
                                                <span className="text-[17px] font-black text-${accentColor} dark:text-${accentColorDark} tabular-nums tracking-tight" dir="ltr">
                                                    {pn.number}
                                                </span>
                                            </div>
                                            <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-700 flex items-center justify-center shadow-sm text-lg border border-zinc-100 dark:border-white/5 group-hover:scale-110 transition-transform shrink-0 ml-3">
                                                📞
                                            </div>
                                        </a>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-zinc-400 font-bold">{isAr ? 'لا توجد أرقام مسجلة' : 'No numbers registered'}</div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
`;

        // Insert before <ASNFooter
        content = content.replace(
            /(\s*<ASNFooter\s*\/?>)/,
            modalJSX + '\n$1'
        );
    }

    fs.writeFileSync(fp, content, 'utf8');
    count++;
    console.log('Updated:', file);
}

console.log('Total:', count);
