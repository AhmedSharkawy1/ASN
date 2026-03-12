const fs = require('fs');
let content = fs.readFileSync('src/pages/POSPage.tsx', 'utf8');

// 1. Memoize handleItemClick and getCatImage
content = content.replace(
    'const getCatImage = (catId: number) => categories.find(c => c.id === catId)?.image_data;',
    'const getCatImage = useCallback((catId: number) => categories.find(c => c.id === catId)?.image_data, [categories]);'
);
content = content.replace(
    'const handleItemClick = (item: MenuItem) => { item.prices.length > 1 ? setSizePickerItem(item) : addToCart(item, 0); };',
    'const handleItemClick = useCallback((item: MenuItem) => { item.prices.length > 1 ? setSizePickerItem(item) : addToCart(item, 0); }, [addToCart]);'
);

// 2. Update Autocomplete
const autoCompOld = `    const customerSuggestions = useMemo(() => {
        if (!customerName || customerName.length < 1) return [];
        const q = customerName.toLowerCase();
        return allCustomers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 5);
    }, [customerName, allCustomers]);`;

const autoCompNew = `    const [focusedField, setFocusedField] = useState<'name'|'phone'|null>(null);
    const customerSuggestions = useMemo(() => {
        const val = focusedField === 'phone' ? customerPhone : customerName;
        if (!val || val.length < 1) return [];
        const q = val.toLowerCase().trim();
        return allCustomers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 5);
    }, [customerName, customerPhone, focusedField, allCustomers]);`;

content = content.replace(autoCompOld, autoCompNew);

// UI inputs for autocomplete
const nameInputOld = `<input ref={customerInputRef} value={customerName} onChange={e => { setCustomerName(e.target.value); setShowCustomerSuggestions(true); }}
                                        onFocus={() => setShowCustomerSuggestions(true)} onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 300)}
                                        placeholder="اسم العميل" className="w-full pr-7 pl-2 py-2 bg-black/30 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition" />
                                    {showCustomerSuggestions && customerSuggestions.length > 0 && (`

const nameInputNew = `<input ref={customerInputRef} value={customerName} onChange={e => { setCustomerName(e.target.value); setShowCustomerSuggestions(true); setFocusedField('name'); }}
                                        onFocus={() => { setShowCustomerSuggestions(true); setFocusedField('name'); }} onBlur={() => setTimeout(() => { setShowCustomerSuggestions(false); setFocusedField(null); }, 300)}
                                        placeholder="اسم العميل" className="w-full pr-7 pl-2 py-2 bg-white dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-emerald-500 dark:focus:border-zinc-600 transition" />
                                    {showCustomerSuggestions && focusedField === 'name' && customerSuggestions.length > 0 && (`

content = content.replace(nameInputOld, nameInputNew);

const phoneInputOld = `<input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="الهاتف" dir="ltr" className="px-2.5 py-2 bg-black/30 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition" />`
const phoneInputNew = `<div className="relative">
                                    <input value={customerPhone} onChange={e => { setCustomerPhone(e.target.value); setShowCustomerSuggestions(true); setFocusedField('phone'); }}
                                        onFocus={() => { setShowCustomerSuggestions(true); setFocusedField('phone'); }} onBlur={() => setTimeout(() => { setShowCustomerSuggestions(false); setFocusedField(null); }, 300)}
                                        placeholder="الهاتف (للبحث)" dir="ltr" className="w-full px-2.5 py-2 bg-white dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-emerald-500 dark:focus:border-zinc-600 transition" />
                                    {showCustomerSuggestions && focusedField === 'phone' && customerSuggestions.length > 0 && (
                                        <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-[#0d1117] border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden z-50 shadow-xl">
                                            {customerSuggestions.map((c, i) => (
                                                <button key={i} onClick={() => selectCustomer(c)} className="w-full text-right px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition flex items-center justify-between z-50 relative cursor-pointer border-b last:border-0 border-zinc-100 dark:border-zinc-800/50">
                                                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-300 pointer-events-none">{c.name}</span>
                                                    <span className="text-[10px] text-zinc-500 pointer-events-none" dir="ltr">{c.phone}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>`

content = content.replace(phoneInputOld, phoneInputNew);

// 3. Grid Row modification from 2-5 to 3-6
const gridOld = '<div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 content-start pb-2 auto-rows-max"';
const gridNew = '<div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3 content-start pb-2 auto-rows-max"';
content = content.replace(gridOld, gridNew);


// 4. Update Colors globally (mostly for containers and texts)
content = content.replaceAll('bg-[#0d1117]', 'bg-white dark:bg-[#0d1117]');
content = content.replaceAll('bg-[#0a0e14]', 'bg-zinc-50 dark:bg-[#0a0e14]');

// texts 
content = content.replaceAll('text-white', 'text-zinc-900 dark:text-white');
content = content.replaceAll('text-zinc-200', 'text-zinc-800 dark:text-zinc-200');
content = content.replaceAll('text-zinc-300', 'text-zinc-700 dark:text-zinc-300');
content = content.replaceAll('text-zinc-400', 'text-zinc-600 dark:text-zinc-400');
content = content.replaceAll('text-zinc-600', 'text-zinc-400 dark:text-zinc-600');

// borders
content = content.replaceAll('border-zinc-800/50', 'border-zinc-200 dark:border-zinc-800/50');
content = content.replaceAll('border-zinc-800/60', 'border-zinc-200 dark:border-zinc-800/60');
content = content.replaceAll('border border-zinc-800 ', 'border border-zinc-200 dark:border-zinc-800 ');
content = content.replaceAll('border-zinc-800', 'border-zinc-200 dark:border-zinc-800'); // the rest
content = content.replaceAll('border-zinc-700/50', 'border-zinc-300 dark:border-zinc-700/50');

// bg blacks
content = content.replaceAll('bg-black/20', 'bg-zinc-100 dark:bg-black/20');
content = content.replaceAll('bg-black/30', 'bg-zinc-50 dark:bg-black/30');

// specific tweaks
content = content.replaceAll('placeholder:text-zinc-600', 'placeholder:text-zinc-400 dark:placeholder:text-zinc-600');
content = content.replaceAll('bg-zinc-800/30', 'bg-zinc-100 dark:bg-zinc-800/30');
content = content.replaceAll('bg-zinc-700/50', 'bg-zinc-200 dark:bg-zinc-700/50');
content = content.replaceAll('bg-zinc-800/50', 'bg-zinc-100 dark:bg-zinc-800/50');

fs.writeFileSync('src/pages/POSPage.tsx', content);
console.log('Update complete');
