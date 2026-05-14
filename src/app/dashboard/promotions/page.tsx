"use client";
import { useLanguage } from "@/lib/context/LanguageContext";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Plus, Trash2, Edit2, Tag, X, Save, Loader2, ToggleLeft, ToggleRight, Search, Layers, CheckSquare } from "lucide-react";

type RequiredItem = { item_id: string; item_title_ar: string; item_title_en?: string; qty: number };
type Promotion = {
  id: string; restaurant_id: string; name_ar: string; name_en?: string;
  description_ar?: string; description_en?: string;
  discount_type: 'fixed_amount' | 'percentage' | 'free_shipping';
  discount_value: number; required_items: RequiredItem[];
  bundle_price?: number; min_order_amount: number;
  is_active: boolean; starts_at?: string; ends_at?: string; created_at: string;
};
type MenuItem = { id: string; title_ar: string; title_en?: string; prices: number[]; category_name?: string; category_id?: string };
type Category = { id: string; name_ar: string };

export default function PromotionsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Form state
  const [nameAr, setNameAr] = useState(""); const [nameEn, setNameEn] = useState("");
  const [descAr, setDescAr] = useState(""); const [descEn, setDescEn] = useState("");
  const [discountType, setDiscountType] = useState<'fixed_amount'|'percentage'|'free_shipping'>('fixed_amount');
  const [discountValue, setDiscountValue] = useState(0);
  const [bundlePrice, setBundlePrice] = useState<number|undefined>();
  const [minOrder, setMinOrder] = useState(0);
  const [startsAt, setStartsAt] = useState(""); const [endsAt, setEndsAt] = useState("");
  const [selectedItems, setSelectedItems] = useState<RequiredItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string|null>(null);
  const [filterCatId, setFilterCatId] = useState<string|null>(null);
  const [showItemPicker, setShowItemPicker] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const imp = typeof window !== "undefined" ? sessionStorage.getItem('impersonating_tenant') : null;
      const { data: rest } = await supabase.from('restaurants').select('id').eq(imp ? 'id' : 'email', imp || user.email).single();
      if (!rest) { setLoading(false); return; }
      setRestaurantId(rest.id);
      const [{ data: p }, { data: cats }] = await Promise.all([
        supabase.from('promotions').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name_ar').eq('restaurant_id', rest.id)
      ]);
      setPromos((p as Promotion[]) || []);
      if (cats && cats.length > 0) {
        setCategories(cats as Category[]);
        const { data: items } = await supabase.from('items').select('id, title_ar, title_en, prices, category_id').in('category_id', cats.map(c => c.id));
        setMenuItems((items || []).map(i => ({ ...i, category_name: cats.find(c => c.id === i.category_id)?.name_ar })));
      }
      setLoading(false);
    })();
  }, []);

  const resetForm = () => {
    setNameAr(""); setNameEn(""); setDescAr(""); setDescEn("");
    setDiscountType('fixed_amount'); setDiscountValue(0); setBundlePrice(undefined);
    setMinOrder(0); setStartsAt(""); setEndsAt(""); setSelectedItems([]); setEditingId(null);
  };

  const openEdit = (p: Promotion) => {
    setEditingId(p.id); setNameAr(p.name_ar); setNameEn(p.name_en || "");
    setDescAr(p.description_ar || ""); setDescEn(p.description_en || "");
    setDiscountType(p.discount_type); setDiscountValue(p.discount_value);
    setBundlePrice(p.bundle_price); setMinOrder(p.min_order_amount);
    setStartsAt(p.starts_at ? p.starts_at.slice(0,16) : "");
    setEndsAt(p.ends_at ? p.ends_at.slice(0,16) : "");
    setSelectedItems(p.required_items || []); setShowForm(true);
  };

  const handleSave = async () => {
    if (!restaurantId || !nameAr.trim()) return;
    setSaving(true);
    const payload = {
      restaurant_id: restaurantId, name_ar: nameAr, name_en: nameEn || null,
      description_ar: descAr || null, description_en: descEn || null,
      discount_type: discountType, discount_value: discountValue,
      required_items: selectedItems, bundle_price: bundlePrice || null,
      min_order_amount: minOrder, starts_at: startsAt || null, ends_at: endsAt || null,
    };
    if (editingId) {
      const { data } = await supabase.from('promotions').update(payload).eq('id', editingId).select().single();
      if (data) setPromos(promos.map(p => p.id === editingId ? data as Promotion : p));
    } else {
      const { data } = await supabase.from('promotions').insert(payload).select().single();
      if (data) setPromos([data as Promotion, ...promos]);
    }
    setSaving(false); setShowForm(false); resetForm();
  };

  const toggleActive = async (id: string, val: boolean) => {
    await supabase.from('promotions').update({ is_active: val }).eq('id', id);
    setPromos(promos.map(p => p.id === id ? { ...p, is_active: val } : p));
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await supabase.from('promotions').delete().eq('id', deletingId);
    setPromos(promos.filter(p => p.id !== deletingId)); setDeletingId(null);
  };

  const addItem = (item: MenuItem) => {
    if (selectedItems.find(s => s.item_id === item.id)) return;
    setSelectedItems(prev => [...prev, { item_id: item.id, item_title_ar: item.title_ar, item_title_en: item.title_en, qty: 1 }]);
  };

  const addCategory = (catId: string) => {
    const catItems = menuItems.filter(i => i.category_id === catId);
    const newItems = catItems.filter(i => !selectedItems.find(s => s.item_id === i.id));
    setSelectedItems(prev => [...prev, ...newItems.map(i => ({ item_id: i.id, item_title_ar: i.title_ar, item_title_en: i.title_en, qty: 1 }))]);
  };

  const addAllItems = () => {
    const newItems = menuItems.filter(i => !selectedItems.find(s => s.item_id === i.id));
    setSelectedItems(prev => [...prev, ...newItems.map(i => ({ item_id: i.id, item_title_ar: i.title_ar, item_title_en: i.title_en, qty: 1 }))]);
  };

  const removeCategoryItems = (catId: string) => {
    const catItemIds = menuItems.filter(i => i.category_id === catId).map(i => i.id);
    setSelectedItems(prev => prev.filter(s => !catItemIds.includes(s.item_id)));
  };

  const removeItem = (itemId: string) => setSelectedItems(selectedItems.filter(s => s.item_id !== itemId));
  const updateItemQty = (itemId: string, qty: number) => setSelectedItems(selectedItems.map(s => s.item_id === itemId ? { ...s, qty: Math.max(1, qty) } : s));

  const discountLabel = (p: Promotion) => {
    if (p.discount_type === 'fixed_amount') return `${p.discount_value} ${isAr ? 'ج' : 'EGP'}`;
    if (p.discount_type === 'percentage') return `${p.discount_value}%`;
    return isAr ? 'شحن مجاني' : 'Free Shipping';
  };

  const filteredItems = menuItems.filter(i => {
    if (filterCatId && i.category_id !== filterCatId) return false;
    if (!itemSearch) return true;
    return i.title_ar.includes(itemSearch) || (i.title_en||'').toLowerCase().includes(itemSearch.toLowerCase());
  });

  if (loading) return <div className="p-8 text-center text-silver animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-glass-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-1 flex items-center gap-3">
            <Tag className="w-8 h-8 text-amber-500" /> {isAr ? "العروض والخصومات" : "Promotions & Offers"}
          </h1>
          <p className="text-silver">{isAr ? "أنشئ عروض وخصومات لعملائك وسيتم تطبيقها تلقائياً" : "Create offers for your customers, applied automatically at checkout"}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95">
          <Plus className="w-5 h-5" /> {isAr ? "إضافة عرض جديد" : "New Promotion"}
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-glass-border">
            <div className="sticky top-0 z-10 bg-white dark:bg-card px-6 py-4 border-b border-glass-border flex items-center justify-between rounded-t-2xl">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2"><Tag className="w-5 h-5 text-amber-500" /> {editingId ? (isAr ? "تعديل العرض" : "Edit Promotion") : (isAr ? "عرض جديد" : "New Promotion")}</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 text-silver hover:text-red-500 transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-silver">{isAr ? "اسم العرض (عربي) *" : "Name (Arabic) *"}</label>
                  <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder={isAr ? "مثال: عرض الغداء" : "e.g. Lunch Deal"}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-silver">{isAr ? "اسم العرض (إنجليزي)" : "Name (English)"}</label>
                  <input value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" placeholder="Lunch Deal"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-silver">{isAr ? "الوصف (عربي)" : "Description (AR)"}</label>
                  <textarea value={descAr} onChange={e => setDescAr(e.target.value)} rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none resize-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-silver">{isAr ? "الوصف (إنجليزي)" : "Description (EN)"}</label>
                  <textarea value={descEn} onChange={e => setDescEn(e.target.value)} rows={2} dir="ltr"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none resize-none" />
                </div>
              </div>
              {/* Discount Type */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-silver">{isAr ? "نوع الخصم *" : "Discount Type *"}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['fixed_amount','percentage','free_shipping'] as const).map(t => (
                    <button key={t} onClick={() => setDiscountType(t)}
                      className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${discountType===t ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-600' : 'border-glass-border text-silver hover:border-amber-300'}`}>
                      {t==='fixed_amount' ? (isAr?'مبلغ ثابت':'Fixed Amount') : t==='percentage' ? (isAr?'نسبة مئوية':'Percentage') : (isAr?'شحن مجاني':'Free Shipping')}
                    </button>
                  ))}
                </div>
              </div>
              {discountType !== 'free_shipping' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-silver">{discountType==='percentage' ? (isAr?'النسبة %':'Percentage %') : (isAr?'مبلغ الخصم':'Discount Amount')}</label>
                    <input type="number" value={discountValue||''} onChange={e => setDiscountValue(parseFloat(e.target.value)||0)} dir="ltr"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none font-bold tabular-nums" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-silver">{isAr?'سعر الباقة (اختياري)':'Bundle Price (optional)'}</label>
                    <input type="number" value={bundlePrice||''} onChange={e => setBundlePrice(parseFloat(e.target.value)||undefined)} dir="ltr"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none font-bold tabular-nums" />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-bold text-silver">{isAr?'حد أدنى للطلب':'Min Order Amount'}</label>
                <input type="number" value={minOrder||''} onChange={e => setMinOrder(parseFloat(e.target.value)||0)} dir="ltr"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none font-bold tabular-nums" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-silver">{isAr?'تاريخ البداية':'Start Date'}</label>
                  <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-silver">{isAr?'تاريخ النهاية':'End Date'}</label>
                  <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none font-bold" />
                </div>
              </div>
              {/* Required Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-silver">{isAr?'الأصناف المطلوبة للعرض':'Required Items for Offer'}</label>
                  <button onClick={() => setShowItemPicker(!showItemPicker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 font-bold text-xs rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/20 transition">
                    <Plus className="w-3.5 h-3.5" /> {isAr?'اختر أصناف':'Select Items'}
                  </button>
                </div>

                {/* Quick Actions: Select All / Select by Category */}
                {showItemPicker && (
                  <div className="bg-slate-50 dark:bg-black/20 rounded-xl border border-glass-border p-4 space-y-3">
                    {/* Select All Button */}
                    <button onClick={addAllItems}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-500/30 text-amber-600 font-bold text-sm hover:bg-amber-50 dark:hover:bg-amber-500/10 transition">
                      <CheckSquare className="w-4 h-4" /> {isAr?'اختيار كل الأصناف':'Select All Items'}
                    </button>

                    {/* Category Chips */}
                    {categories.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-silver mb-2 flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {isAr?'اختيار قسم كامل:':'Select entire category:'}</p>
                        <div className="flex flex-wrap gap-2">
                          {categories.map(cat => {
                            const catItemCount = menuItems.filter(i => i.category_id === cat.id).length;
                            const selectedCount = menuItems.filter(i => i.category_id === cat.id && selectedItems.find(s => s.item_id === i.id)).length;
                            const allSelected = selectedCount === catItemCount && catItemCount > 0;
                            return (
                              <button key={cat.id} onClick={() => allSelected ? removeCategoryItems(cat.id) : addCategory(cat.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all ${allSelected ? 'border-amber-500 bg-amber-500 text-white shadow-md' : 'border-glass-border text-foreground hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}>
                                {cat.name_ar}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${allSelected ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-silver'}`}>{selectedCount}/{catItemCount}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Search + Filter */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-silver flex items-center gap-1"><Search className="w-3.5 h-3.5" /> {isAr?'أو ابحث عن صنف معين:':'Or search for specific item:'}</p>
                      {/* Category filter tabs */}
                      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                        <button onClick={() => setFilterCatId(null)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${!filterCatId ? 'bg-amber-500 text-white' : 'bg-white dark:bg-zinc-800 text-silver border border-glass-border hover:border-amber-300'}`}>
                          {isAr?'الكل':'All'}
                        </button>
                        {categories.map(cat => (
                          <button key={cat.id} onClick={() => setFilterCatId(filterCatId === cat.id ? null : cat.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${filterCatId === cat.id ? 'bg-amber-500 text-white' : 'bg-white dark:bg-zinc-800 text-silver border border-glass-border hover:border-amber-300'}`}>
                            {cat.name_ar}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-silver" />
                        <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder={isAr?'ابحث عن صنف...':'Search item...'}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-glass-border focus:border-amber-500 outline-none text-sm" />
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-xl border border-glass-border bg-white dark:bg-zinc-900">
                        {filteredItems.map(item => {
                          const isSelected = !!selectedItems.find(s => s.item_id === item.id);
                          return (
                            <button key={item.id} onClick={() => isSelected ? removeItem(item.id) : addItem(item)}
                              className={`w-full text-start px-4 py-2.5 transition flex justify-between items-center border-b border-glass-border last:border-0 ${isSelected ? 'bg-amber-50 dark:bg-amber-500/10' : 'hover:bg-slate-50 dark:hover:bg-zinc-800'}`}>
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-zinc-300 dark:border-zinc-600'}`}>
                                  {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <div>
                                  <span className="font-bold text-sm text-foreground">{item.title_ar}</span>
                                  {item.category_name && <span className="text-xs text-silver ms-2">({item.category_name})</span>}
                                </div>
                              </div>
                              <span className="text-xs font-bold text-amber-600">{item.prices?.[0]} {isAr?'ج':'EGP'}</span>
                            </button>
                          );
                        })}
                        {filteredItems.length === 0 && <p className="text-center text-silver text-sm py-3">{isAr?'لا توجد نتائج':'No results'}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Items List */}
                {selectedItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-600">{isAr ? `${selectedItems.length} صنف مختار` : `${selectedItems.length} items selected`}</span>
                      <button onClick={() => setSelectedItems([])} className="text-xs text-red-500 font-bold hover:underline">{isAr?'إزالة الكل':'Remove All'}</button>
                    </div>
                    {selectedItems.map(si => (
                      <div key={si.item_id} className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-200 dark:border-amber-500/20">
                        <span className="font-bold text-sm text-amber-800 dark:text-amber-300">{si.item_title_ar}</span>
                        <button onClick={() => removeItem(si.item_id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-glass-border">
                <button onClick={handleSave} disabled={saving || !nameAr.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 active:scale-95">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? (isAr?"جاري الحفظ...":"Saving...") : (isAr?"حفظ العرض":"Save Promotion")}
                </button>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-3 text-silver font-bold text-sm hover:text-foreground transition">{isAr?"إلغاء":"Cancel"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center border border-glass-border">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-6 text-foreground">{isAr?"هل أنت متأكد من حذف هذا العرض؟":"Delete this promotion?"}</h3>
            <div className="flex gap-4 justify-center">
              <button onClick={handleDelete} className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition">{isAr?"تأكيد الحذف":"Confirm Delete"}</button>
              <button onClick={() => setDeletingId(null)} className="px-6 py-2.5 rounded-xl bg-gray-200 dark:bg-secondary text-gray-700 dark:text-gray-300 font-bold">{isAr?"إلغاء":"Cancel"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Promotions List */}
      {promos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border border-dashed border-glass-border rounded-3xl bg-glass-dark text-center">
          <Tag className="w-16 h-16 text-silver/30 mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">{isAr?"لا توجد عروض بعد":"No Promotions Yet"}</h3>
          <p className="text-silver">{isAr?"اضغط على 'إضافة عرض جديد' لتبدأ":"Click 'New Promotion' to get started"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {promos.map(p => {
            const isExpired = p.ends_at && new Date(p.ends_at) < new Date();
            return (
              <div key={p.id} className={`relative bg-white dark:bg-card rounded-2xl border overflow-hidden shadow-sm transition-all hover:shadow-md ${p.is_active && !isExpired ? 'border-amber-200 dark:border-amber-500/20' : 'border-glass-border opacity-70'}`}>
                <div className={`h-1.5 ${p.is_active && !isExpired ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gray-300 dark:bg-zinc-700'}`} />
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-lg text-foreground">{p.name_ar}</h3>
                      {p.name_en && <p className="text-sm text-silver">{p.name_en}</p>}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.discount_type==='fixed_amount' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600' : p.discount_type==='percentage' ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-600' : 'bg-green-100 dark:bg-green-500/10 text-green-600'}`}>
                      {discountLabel(p)}
                    </span>
                  </div>
                  {p.description_ar && <p className="text-sm text-silver">{p.description_ar}</p>}
                  {p.required_items && p.required_items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {p.required_items.map((ri, i) => (
                        <span key={i} className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold px-2 py-1 rounded-lg">
                          {ri.item_title_ar}
                        </span>
                      ))}
                    </div>
                  )}
                  {isExpired && <span className="text-xs font-bold text-red-500">⏰ {isAr?"منتهي":"Expired"}</span>}
                  <div className="flex items-center justify-between pt-3 border-t border-glass-border">
                    <button onClick={() => toggleActive(p.id, !p.is_active)} className={`flex items-center gap-1.5 text-sm font-bold transition ${p.is_active ? 'text-green-600' : 'text-silver'}`}>
                      {p.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      {p.is_active ? (isAr?"نشط":"Active") : (isAr?"متوقف":"Inactive")}
                    </button>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeletingId(p.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
