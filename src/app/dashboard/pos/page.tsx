/* eslint-disable @next/next/no-img-element */
"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/helpers/formatters";
import { CreditCard, Plus, Minus, Trash2, ShoppingCart, Search, Percent, DollarSign, Save, Send } from "lucide-react";

type Category = { id: string; name: string; emoji?: string };
type MenuItem = { id: string; title: string; title_en?: string; price: number; sizes?: { label: string; price: number }[]; image_url?: string; category_id: string; stock_quantity?: number };
type CartItem = { menuItem: MenuItem; qty: number; selectedSize?: { label: string; price: number }; unitPrice: number };

export default function POSPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQ, setSearchQ] = useState("");
    const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
    const [discountValue, setDiscountValue] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [customerName, setCustomerName] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [tables, setTables] = useState<{ id: string; label: string }[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>("");

    useEffect(() => {
        if (!restaurantId) return;
        const load = async () => {
            const { data: cats } = await supabase.from('categories').select('id, name, emoji').eq('restaurant_id', restaurantId).order('sort_order');
            setCategories((cats || []) as Category[]);
            const { data: items } = await supabase.from('items').select('id, title, title_en, price, sizes, image_url, category_id, stock_quantity').eq('categories.restaurant_id', restaurantId);
            setMenuItems((items || []) as MenuItem[]);
            const { data: tbl } = await supabase.from('tables').select('id, label').eq('restaurant_id', restaurantId).eq('status', 'available');
            setTables((tbl || []) as { id: string; label: string }[]);
        };
        load();
    }, [restaurantId]);

    const filteredItems = menuItems.filter(item => {
        if (activeCategory !== "all" && item.category_id !== activeCategory) return false;
        if (searchQ) {
            const q = searchQ.toLowerCase();
            return item.title.toLowerCase().includes(q) || item.title_en?.toLowerCase().includes(q);
        }
        return true;
    });

    const addToCart = (item: MenuItem, size?: { label: string; price: number }) => {
        const price = size?.price || item.price;
        const existing = cart.findIndex(c => c.menuItem.id === item.id && c.selectedSize?.label === size?.label);
        if (existing >= 0) {
            setCart(cart.map((c, i) => i === existing ? { ...c, qty: c.qty + 1 } : c));
        } else {
            setCart([...cart, { menuItem: item, qty: 1, selectedSize: size, unitPrice: price }]);
        }
    };

    const updateQty = (index: number, delta: number) => {
        setCart(cart.map((c, i) => {
            if (i !== index) return c;
            const newQty = c.qty + delta;
            return newQty > 0 ? { ...c, qty: newQty } : c;
        }).filter(c => c.qty > 0));
    };

    const removeFromCart = (index: number) => setCart(cart.filter((_, i) => i !== index));
    const clearCart = () => { setCart([]); setDiscountValue(0); setCustomerName(""); setNotes(""); setSelectedTable(""); };

    const subtotal = cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);
    const discount = discountType === "percent" ? subtotal * (discountValue / 100) : discountValue;
    const total = Math.max(0, subtotal - discount);

    const submitOrder = useCallback(async (isDraft = false) => {
        if (!restaurantId || cart.length === 0 || submitting) return;
        setSubmitting(true);
        try {
            const items = cart.map(c => ({ title: c.menuItem.title, qty: c.qty, price: c.unitPrice, size: c.selectedSize?.label }));
            await supabase.from('orders').insert({
                restaurant_id: restaurantId, items, subtotal, discount, discount_type: discountType,
                total, payment_method: paymentMethod, customer_name: customerName || null,
                table_id: selectedTable || null, notes: notes || null, is_draft: isDraft,
                status: isDraft ? "pending" : "pending"
            });
            if (selectedTable) {
                await supabase.from('tables').update({ status: 'occupied' }).eq('id', selectedTable);
            }
            clearCart();
        } catch (e) { console.error(e); }
        finally { setSubmitting(false); }
    }, [restaurantId, cart, subtotal, discount, discountType, total, paymentMethod, customerName, selectedTable, notes, submitting]);

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-88px)]">
            {/* === LEFT: Menu Grid === */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-3 mb-4">
                    <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-emerald-400" /> POS
                    </h1>
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                            placeholder={isAr ? "بحث..." : "Search..."} dir={isAr ? "rtl" : "ltr"}
                            className="w-full pe-10 ps-4 py-2 bg-[#0d1117] border border-zinc-800/50 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/50" />
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                    <button onClick={() => setActiveCategory("all")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${activeCategory === "all" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/30 hover:text-white"}`}>
                        {isAr ? "الكل" : "All"}
                    </button>
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${activeCategory === cat.id ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/30 hover:text-white"}`}>
                            {cat.emoji} {cat.name}
                        </button>
                    ))}
                </div>

                {/* Items Grid */}
                <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start" style={{ scrollbarWidth: 'none' }}>
                    {filteredItems.map(item => (
                        <button key={item.id} onClick={() => {
                            if (item.sizes && item.sizes.length > 0) addToCart(item, item.sizes[0]);
                            else addToCart(item);
                        }}
                            className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-3 text-right hover:border-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95 group">
                            {item.image_url && (
                                <div className="w-full h-20 rounded-lg bg-zinc-800/30 mb-2 overflow-hidden">
                                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <p className="text-sm font-bold text-zinc-200 truncate group-hover:text-emerald-400 transition">{isAr ? item.title : (item.title_en || item.title)}</p>
                            <p className="text-xs font-extrabold text-emerald-400 mt-1">{formatCurrency(item.price)}</p>
                            {item.stock_quantity !== undefined && item.stock_quantity <= 5 && item.stock_quantity > 0 && (
                                <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold mt-1 inline-block">{isAr ? `متبقي ${item.stock_quantity}` : `${item.stock_quantity} left`}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* === RIGHT: Cart === */}
            <div className="w-full lg:w-[380px] bg-[#0d1117] border border-zinc-800/50 rounded-xl flex flex-col min-h-0 shrink-0">
                <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
                    <h2 className="font-extrabold text-white flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-emerald-400" /> {isAr ? "السلة" : "Cart"} <span className="text-emerald-400">({cart.length})</span></h2>
                    {cart.length > 0 && <button onClick={clearCart} className="text-[10px] text-red-400 hover:text-red-300 font-bold">{isAr ? "مسح الكل" : "Clear"}</button>}
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'none' }}>
                    {cart.length === 0 ? (
                        <div className="text-center py-12 text-zinc-600"><ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" /><p className="text-xs">{isAr ? "السلة فارغة" : "Cart is empty"}</p></div>
                    ) : cart.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 bg-black/20 rounded-lg p-2.5">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-zinc-200 truncate">{c.menuItem.title}{c.selectedSize ? ` (${c.selectedSize.label})` : ""}</p>
                                <p className="text-[10px] text-emerald-400 font-bold">{formatCurrency(c.unitPrice)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => updateQty(i, -1)} className="w-6 h-6 bg-zinc-700/50 text-zinc-400 rounded flex items-center justify-center hover:bg-zinc-600 text-xs"><Minus className="w-3 h-3" /></button>
                                <span className="w-6 text-center text-xs font-bold text-white">{c.qty}</span>
                                <button onClick={() => updateQty(i, 1)} className="w-6 h-6 bg-zinc-700/50 text-zinc-400 rounded flex items-center justify-center hover:bg-zinc-600 text-xs"><Plus className="w-3 h-3" /></button>
                            </div>
                            <span className="text-xs font-extrabold text-white w-16 text-left">{formatCurrency(c.unitPrice * c.qty)}</span>
                            <button onClick={() => removeFromCart(i)} className="text-red-400/60 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    ))}
                </div>

                {/* Cart Footer */}
                {cart.length > 0 && (
                    <div className="border-t border-zinc-800/50 p-4 space-y-3">
                        {/* Customer & Table */}
                        <div className="grid grid-cols-2 gap-2">
                            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={isAr ? "اسم العميل" : "Customer"} className="px-2.5 py-2 bg-black/30 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none" />
                            <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)} className="px-2.5 py-2 bg-black/30 border border-zinc-800 rounded-lg text-xs text-white outline-none appearance-none cursor-pointer">
                                <option value="">{isAr ? "بدون طاولة" : "No table"}</option>
                                {tables.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>

                        {/* Discount */}
                        <div className="flex items-center gap-2">
                            <button onClick={() => setDiscountType(discountType === "fixed" ? "percent" : "fixed")}
                                className="w-8 h-8 bg-zinc-700/50 text-zinc-400 rounded-lg flex items-center justify-center hover:text-white">
                                {discountType === "percent" ? <Percent className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                            </button>
                            <input type="number" value={discountValue || ""} onChange={e => setDiscountValue(Number(e.target.value))}
                                placeholder={isAr ? "خصم" : "Discount"} min="0"
                                className="flex-1 px-2.5 py-2 bg-black/30 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none" />
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                className="px-2.5 py-2 bg-black/30 border border-zinc-800 rounded-lg text-xs text-white outline-none appearance-none cursor-pointer">
                                <option value="cash">{isAr ? "كاش" : "Cash"}</option>
                                <option value="card">{isAr ? "بطاقة" : "Card"}</option>
                                <option value="online">{isAr ? "أونلاين" : "Online"}</option>
                            </select>
                        </div>

                        {/* Totals */}
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between text-zinc-400"><span>{isAr ? "المجموع الفرعي" : "Subtotal"}</span><span>{formatCurrency(subtotal)}</span></div>
                            {discount > 0 && <div className="flex justify-between text-red-400"><span>{isAr ? "الخصم" : "Discount"}</span><span>-{formatCurrency(discount)}</span></div>}
                            <div className="flex justify-between text-white font-extrabold text-lg pt-1 border-t border-zinc-700/50"><span>{isAr ? "الإجمالي" : "Total"}</span><span className="text-emerald-400">{formatCurrency(total)}</span></div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button onClick={() => submitOrder(true)} disabled={submitting}
                                className="flex-1 flex items-center justify-center gap-1 py-3 bg-zinc-700/50 text-zinc-300 font-bold text-sm rounded-xl hover:bg-zinc-600/50 transition active:scale-95 disabled:opacity-50">
                                <Save className="w-4 h-4" /> {isAr ? "حفظ مسودة" : "Draft"}
                            </button>
                            <button onClick={() => submitOrder(false)} disabled={submitting}
                                className="flex-[2] flex items-center justify-center gap-1 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition active:scale-95 disabled:opacity-50">
                                <Send className="w-4 h-4" /> {submitting ? (isAr ? "جاري الإرسال..." : "Submitting...") : (isAr ? "إرسال الطلب" : "Submit Order")}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
