const fs = require('fs');

function safeReplace(fileStr, searchStr, replacementStr) {
    const escapedSearch = searchStr
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\n/g, '\\r?\\n');
    const searchRegex = new RegExp(escapedSearch, 'g');
    return fileStr.replace(searchRegex, replacementStr);
}

let atyab = fs.readFileSync('src/components/menu/AtyabEtoileMenu.tsx', 'utf8');

atyab = safeReplace(atyab,
`    // Scroll active nav button into view
    useEffect(() => {
        if (activeSection && navRef.current) {
            const btn = navRef.current.querySelector(\`[data-cat-id="\${activeSection}"]\`);
            btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
    }, [activeSection]);`,
`    // Scroll active nav button into view
    useEffect(() => {
        if (activeSection && navRef.current) {
            const btn = navRef.current.querySelector(\`[data-cat-id="\${activeSection}"]\`) as HTMLElement;
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
    }, [activeSection]);`
);

atyab = safeReplace(atyab,
`    // Nav click → scroll to section
    const handleNavClick = (id: string) => {
        haptic(10);
        setShowCategoriesMenu(false);
        const el = document.getElementById(\`etoile-\${id}\`);
        if (el) {
            isManualScroll.current = true;
            setActiveSection(id);
            const top = el.getBoundingClientRect().top + window.pageYOffset - 170;
            window.scrollTo({ top, behavior: "auto" });
            setTimeout(() => { isManualScroll.current = false; }, 150);
        }
    };`,
`    // Nav click → scroll to section
    const handleNavClick = (id: string) => {
        haptic(10);
        setShowCategoriesMenu(false);
        const el = document.getElementById(\`etoile-\${id}\`);
        if (el) {
            isManualScroll.current = true;
            setActiveSection(id);
            const top = el.getBoundingClientRect().top + window.scrollY - 170;
            window.scrollTo({ top, behavior: "smooth" });
            setTimeout(() => { isManualScroll.current = false; }, 800);
        }
    };`
);

fs.writeFileSync('src/components/menu/AtyabEtoileMenu.tsx', atyab);

let pizza = fs.readFileSync('src/components/menu/PizzaPastaMenu.tsx', 'utf8');

pizza = safeReplace(pizza,
`    const [showCheckout, setShowCheckout] = useState(false);
    const navScrollRef = useRef<HTMLDivElement>(null);

    const triggerHaptic = (ms: number = 10) => {
        if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
    };

    const scrollNav = (dir: "left" | "right") => {
        if (navScrollRef.current) {
            navScrollRef.current.scrollBy({ left: dir === "left" ? -150 : 150, behavior: "smooth" });
        }
    };

    const handleNavClick = (id: string) => {
        triggerHaptic(10);
        setShowCategoriesModal(false);
        setActiveSection(id);
        const el = document.getElementById(\`section-\${id}\`);
        if (el) {
            const offset = 160;
            const pos = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: pos, behavior: "smooth" });
        }
    };`,
`    const [showCheckout, setShowCheckout] = useState(false);
    const navScrollRef = useRef<HTMLDivElement>(null);
    const isManualScroll = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScroll.current) return;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace("section-", "");
                        setActiveSection(id);
                    }
                });
            },
            { root: null, rootMargin: "-180px 0px -40% 0px", threshold: 0 }
        );
        categories.forEach((cat) => {
            const el = document.getElementById(\`section-\${cat.id}\`);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [categories]);

    useEffect(() => {
        if (activeSection && navScrollRef.current) {
            const btn = navScrollRef.current.querySelector(\`[data-cat-id="\${activeSection}"]\`) as HTMLElement;
            if (btn) {
                const container = navScrollRef.current;
                const btnRect = btn.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const btnCenter = btnRect.left + btnRect.width / 2;
                const containerCenter = containerRect.left + containerRect.width / 2;
                const diff = btnCenter - containerCenter;
                container.scrollBy({ left: diff, behavior: 'smooth' });
            }
        }
    }, [activeSection]);

    const triggerHaptic = (ms: number = 10) => {
        if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
    };

    const scrollNav = (dir: "left" | "right") => {
        if (navScrollRef.current) {
            navScrollRef.current.scrollBy({ left: dir === "left" ? -150 : 150, behavior: "smooth" });
        }
    };

    const handleNavClick = (id: string) => {
        triggerHaptic(10);
        setShowCategoriesModal(false);
        setActiveSection(id);
        const el = document.getElementById(\`section-\${id}\`);
        if (el) {
            isManualScroll.current = true;
            const offset = 160;
            const pos = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: pos, behavior: "smooth" });
            setTimeout(() => { isManualScroll.current = false; }, 800);
        }
    };`
);

pizza = safeReplace(pizza,
`                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleNavClick(cat.id)}`,
`                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                data-cat-id={cat.id}
                                onClick={() => handleNavClick(cat.id)}`
);

fs.writeFileSync('src/components/menu/PizzaPastaMenu.tsx', pizza);

console.log("Patch completed successfully!");
