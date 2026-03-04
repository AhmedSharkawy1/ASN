/* eslint-disable @next/next/no-img-element */
"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/helpers/formatters";
import { posDb, generateId, getPosNextOrderNumber } from "@/lib/pos-db";
import type { PosCategory, PosMenuItem, PosOrder, PosCustomer, PosStaffUser } from "@/lib/pos-db";
import { pullFromSupabase, pushDirtyToSupabase, subscribeSyncStatus } from "@/lib/sync-service";
import {
    CreditCard, Plus, Minus, Trash2, ShoppingCart, Search, Percent,
    DollarSign, Save, Send, X, Printer, Clock, Banknote,
    Smartphone, PauseCircle, Play, StickyNote, Users,
    LayoutGrid, Receipt, CheckCircle2, Volume2, VolumeX,
    Package, Truck, Wifi, WifiOff, MapPin
} from "lucide-react";

/* ═══════════════════════════ TYPES ═══════════════════════════ */
type CartItem = {
    menuItem: PosMenuItem; qty: number; selectedSizeIdx: number;
    unitPrice: number; note?: string; categoryName?: string;
};

/* ═══════════════════════════ COMPONENT ═══════════════════════════ */
export default function POSPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    /* ── Data state ── */
    const [categories, setCategories] = useState<PosCategory[]>([]);
    const [menuItems, setMenuItems] = useState<PosMenuItem[]>([]);
    const [heldOrders, setHeldOrders] = useState<PosOrder[]>([]);
    const [todayStats, setTodayStats] = useState({ count: 0, revenue: 0 });
    const [drivers, setDrivers] = useState<PosStaffUser[]>([]);
    const [allCustomers, setAllCustomers] = useState<PosCustomer[]>([]);
    const [zones, setZones] = useState<{ id: string; name_ar: string; fee: number; estimated_time: number }[]>([]);
    const [isOnline, setIsOnline] = useState(true);

    /* ── UI state ── */
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [searchQ, setSearchQ] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
    const [discountValue, setDiscountValue] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [orderNotes, setOrderNotes] = useState("");
    const [selectedDriver, setSelectedDriver] = useState<string>("");
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [showHeld, setShowHeld] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);
    const [lastOrderCart, setLastOrderCart] = useState<CartItem[]>([]);
    const [lastOrderDiscount, setLastOrderDiscount] = useState(0);
    const [lastOrderTotal, setLastOrderTotal] = useState(0);
    const [lastOrderCustomer, setLastOrderCustomer] = useState({ name: "", phone: "", address: "" });
    const [lastOrderNotes, setLastOrderNotes] = useState("");
    const [lastDeliveryFee, setLastDeliveryFee] = useState(0);
    const [lastDriverName, setLastDriverName] = useState("");
    const [successFlash, setSuccessFlash] = useState(false);
    const [sizePickerItem, setSizePickerItem] = useState<PosMenuItem | null>(null);
    const [editNoteIdx, setEditNoteIdx] = useState<number | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

    const searchRef = useRef<HTMLInputElement>(null);
    const receiptRef = useRef<HTMLDivElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    /* ── Clock ── */
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    /* ── Sync status ── */
    useEffect(() => {
        return subscribeSyncStatus(s => setIsOnline(s.isOnline));
    }, []);

    /* ── Sound ── */
    const playBeep = useCallback(() => {
        if (!soundEnabled) return;
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 800; osc.type = "sine"; gain.gain.value = 0.08;
            osc.start(); osc.stop(ctx.currentTime + 0.08);
        } catch { /* ignore */ }
    }, [soundEnabled]);

    /* ── Load data from Dexie ── */
    const loadData = useCallback(async () => {
        if (!restaurantId) return;

        const cats = await posDb.categories.where("restaurant_id").equals(restaurantId).sortBy("sort_order");
        setCategories(cats);
        const items = await posDb.menu_items.where("restaurant_id").equals(restaurantId).toArray();
        setMenuItems(items.filter(i => i.is_available !== false));

        const todayStr = new Date().toISOString().split("T")[0];
        const allOrders = await posDb.orders.where("restaurant_id").equals(restaurantId).toArray();
        const todayOrders = allOrders.filter(o => o.created_at.startsWith(todayStr) && o.status !== "cancelled" && !o.is_draft);
        setTodayStats({ count: todayOrders.length, revenue: todayOrders.reduce((s, o) => s + o.total, 0) });

        const held = allOrders.filter(o => o.is_draft === true);
        setHeldOrders(held);

        let driverList = await posDb.pos_users
            .where("restaurant_id").equals(restaurantId)
            .and(u => u.role === "delivery" && u.is_active !== false)
            .toArray();

        // Fallback: if no drivers in Dexie yet, pull directly from Supabase
        if (driverList.length === 0 && navigator.onLine) {
            const { data: teamData } = await supabase
                .from("team_members").select("id,name,email,phone,role,is_active")
                .eq("restaurant_id", restaurantId).eq("role", "delivery");
            if (teamData && teamData.length > 0) {
                const mapped = teamData.map(t => ({
                    id: t.id as string, restaurant_id: restaurantId,
                    name: t.name || "", username: t.email || t.phone || "",
                    password: "", role: "delivery" as const,
                    is_active: typeof t.is_active === "boolean" ? t.is_active : true,
                    _dirty: false,
                }));
                await posDb.pos_users.bulkPut(mapped);
                driverList = mapped.filter(u => u.is_active !== false);
            }
        }
        setDrivers(driverList);

        const custs = await posDb.customers.where("restaurant_id").equals(restaurantId).toArray();
        setAllCustomers(custs);

        // Load delivery zones
        const { data: zoneData } = await supabase
            .from("delivery_zones").select("id,name_ar,fee,estimated_time")
            .eq("restaurant_id", restaurantId).eq("is_active", true).order("fee");
        if (zoneData) setZones(zoneData);
    }, [restaurantId]);

    /* ── Initial sync + load ── */
    useEffect(() => {
        if (!restaurantId) return;
        pullFromSupabase(restaurantId).then(() => loadData());
    }, [restaurantId, loadData]);

    /* ── Keyboard shortcuts ── */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") { setSearchQ(""); setSizePickerItem(null); setShowReceipt(false); setEditNoteIdx(null); setShowHeld(false); setShowCustomerSuggestions(false); }
            if (e.key === "/" && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
                e.preventDefault(); searchRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    /* ── Customer autocomplete ── */
    const customerSuggestions = useMemo(() => {
        if (!customerName || customerName.length < 1) return [];
        const q = customerName.toLowerCase();
        return allCustomers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 5);
    }, [customerName, allCustomers]);

    const selectCustomer = (c: PosCustomer) => {
        setCustomerName(c.name);
        setCustomerPhone(c.phone);
        if (c.address) setCustomerAddress(c.address);
        setShowCustomerSuggestions(false);
    };

    /* ── Filtering ── */
    const filteredItems = useMemo(() => menuItems.filter(item => {
        if (activeCategory !== "all" && item.category_id !== activeCategory) return false;
        if (searchQ) { const q = searchQ.toLowerCase(); return item.title_ar.toLowerCase().includes(q) || item.title_en?.toLowerCase().includes(q); }
        return true;
    }), [menuItems, activeCategory, searchQ]);

    const categoryCounts = useMemo(() => {
        const map: Record<string, number> = {};
        menuItems.forEach(i => { map[i.category_id] = (map[i.category_id] || 0) + 1; });
        return map;
    }, [menuItems]);

    const getCatName = (catId: string) => categories.find(c => c.id === catId)?.name_ar || "";
    const getCatImage = (catId: string) => {
        const cat = categories.find(c => c.id === catId);
        return cat?.image_data || cat?.image_url;
    };

    /* ── Cart ── */
    const addToCart = useCallback((item: PosMenuItem, sizeIdx: number = 0) => {
        const price = item.prices[sizeIdx] || item.prices[0];
        const catName = getCatName(item.category_id);
        setCart(prev => {
            const idx = prev.findIndex(c => c.menuItem.id === item.id && c.selectedSizeIdx === sizeIdx);
            if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, qty: c.qty + 1 } : c);
            return [...prev, { menuItem: item, qty: 1, selectedSizeIdx: sizeIdx, unitPrice: price, categoryName: catName }];
        });
        playBeep();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playBeep, categories]);

    const updateQty = (index: number, delta: number) => {
        setCart(prev => prev.map((c, i) => {
            if (i !== index) return c;
            const nq = c.qty + delta;
            return nq > 0 ? { ...c, qty: nq } : c;
        }).filter(c => c.qty > 0));
    };
    const removeFromCart = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));
    const setItemNote = (index: number, note: string) => setCart(prev => prev.map((c, i) => i === index ? { ...c, note } : c));
    const clearCart = () => {
        setCart([]); setDiscountValue(0); setCustomerName(""); setCustomerPhone("");
        setCustomerAddress(""); setOrderNotes(""); setPaymentMethod("cash");
        setSelectedDriver(""); setDeliveryFee(0);
    };

    const subtotal = cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);
    const discount = discountType === "percent" ? subtotal * (discountValue / 100) : discountValue;
    const total = Math.max(0, subtotal - discount + deliveryFee);
    const cartCount = cart.reduce((s, c) => s + c.qty, 0);

    /* ── Submit Order ── */
    const submitOrder = useCallback(async (isHold = false) => {
        if (!restaurantId || cart.length === 0 || submitting) return;
        setSubmitting(true);
        try {
            const orderNumber = await getPosNextOrderNumber(restaurantId);
            const items = cart.map(c => ({
                title: c.menuItem.title_ar, qty: c.qty, price: c.unitPrice,
                size: c.menuItem.size_labels?.[c.selectedSizeIdx] || undefined,
                category: c.categoryName, note: c.note,
            }));
            const driverObj = selectedDriver ? drivers.find(d => d.id === selectedDriver) : undefined;
            const orderId = generateId();

            const orderRecord: PosOrder = {
                id: orderId,
                restaurant_id: restaurantId,
                order_number: orderNumber,
                items, subtotal, discount, discount_type: discountType,
                total, payment_method: paymentMethod,
                customer_name: customerName || undefined,
                customer_phone: customerPhone || undefined,
                customer_address: customerAddress || undefined,
                delivery_driver_id: selectedDriver || undefined,
                delivery_driver_name: driverObj?.name,
                delivery_fee: deliveryFee || undefined,
                notes: orderNotes || undefined,
                status: isHold ? "pending" : "completed",
                is_draft: isHold,
                created_at: new Date().toISOString(),
                _dirty: true,
            };

            // Write to Dexie first (offline-first)
            await posDb.orders.put(orderRecord);

            // Auto-save / update customer
            if (customerName && customerPhone) {
                const existing = await posDb.customers.where("phone").equals(customerPhone).first();
                if (existing) {
                    if (customerAddress && existing.address !== customerAddress) {
                        await posDb.customers.update(existing.id, { address: customerAddress, name: customerName, _dirty: true });
                    }
                } else {
                    await posDb.customers.put({
                        id: generateId(), restaurant_id: restaurantId,
                        name: customerName, phone: customerPhone,
                        address: customerAddress || undefined,
                        created_at: new Date().toISOString(), _dirty: true,
                    });
                }
                // Also upsert to Supabase if online
                if (navigator.onLine) {
                    supabase.from("customers").upsert({
                        id: await posDb.customers.where("phone").equals(customerPhone).first().then(c => c?.id),
                        restaurant_id: restaurantId, name: customerName, phone: customerPhone,
                        address: customerAddress || null,
                    }).then(() => { /* fire and forget */ });
                }
            }

            // Push to Supabase if online
            if (navigator.onLine) {
                await pushDirtyToSupabase(restaurantId);
            }

            if (isHold) {
                loadData();
            } else {
                setLastOrderNumber(orderNumber);
                setLastOrderCart([...cart]);
                setLastOrderDiscount(discount);
                setLastOrderTotal(total);
                setLastOrderCustomer({ name: customerName, phone: customerPhone, address: customerAddress });
                setLastOrderNotes(orderNotes || "");
                setLastDeliveryFee(deliveryFee);
                setLastDriverName(driverObj?.name || "");
                setSuccessFlash(true);
                setTimeout(() => setSuccessFlash(false), 3000);
                setTodayStats(p => ({ count: p.count + 1, revenue: p.revenue + total }));
            }
            clearCart();
        } catch (e) { console.error(e); }
        finally { setSubmitting(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId, cart, subtotal, discount, discountType, total, paymentMethod, customerName, customerPhone, customerAddress, selectedDriver, drivers, deliveryFee, orderNotes, submitting, loadData]);

    const restoreHeldOrder = async (order: PosOrder) => {
        const restored: CartItem[] = order.items.map(item => {
            const m = menuItems.find(mm => mm.title_ar === item.title);
            return {
                menuItem: m || { id: "held", title_ar: item.title, prices: [item.price], category_id: "", restaurant_id: restaurantId!, is_available: true } as PosMenuItem,
                qty: item.qty, selectedSizeIdx: 0, unitPrice: item.price, categoryName: item.category,
            };
        });
        setCart(restored);
        setCustomerName(order.customer_name || "");
        setCustomerPhone(order.customer_phone || "");
        setCustomerAddress(order.customer_address || "");
        setPaymentMethod(order.payment_method || "cash");
        setOrderNotes(order.notes || "");
        // Restore delivery info
        setSelectedDriver(order.delivery_driver_id || "");
        setDeliveryFee(order.delivery_fee || 0);
        if (order.discount) { setDiscountValue(order.discount); setDiscountType(order.discount_type || "fixed"); }

        // Delete held order
        await posDb.orders.delete(order.id);
        if (navigator.onLine) {
            supabase.from("orders").delete().eq("id", order.id).then(() => { });
        }
        setHeldOrders(prev => prev.filter(h => h.id !== order.id));
        setShowHeld(false);
    };

    const deleteHeldOrder = async (id: string) => {
        await posDb.orders.delete(id);
        if (navigator.onLine) supabase.from("orders").delete().eq("id", id).then(() => { });
        setHeldOrders(prev => prev.filter(h => h.id !== id));
    };

    const handleItemClick = (item: PosMenuItem) => { if (item.prices.length > 1) { setSizePickerItem(item); } else { addToCart(item, 0); } };

    const { restaurant } = useRestaurant();

    const printReceipt = () => {
        if (!receiptRef.current) return;
        const pw = window.open("", "_blank", "width=300,height=600");
        if (!pw) return;
        pw.document.write(`<html><head><title>Receipt</title><style>body{font-family:'Courier New',monospace;font-size:15px;width:72mm;margin:0 auto;padding:10px;direction:rtl;color:#000}table{width:100%;border-collapse:collapse}td{padding:4px 0;vertical-align:top;font-size:15px}.line{border-top:1.5px dashed #000;margin:12px 0}@media print{body{width:72mm}}</style></head><body>${receiptRef.current.innerHTML}</body></html>`);
        pw.document.close(); pw.focus(); pw.print();
    };

    /* ═══════════════════════════ RENDER ═══════════════════════════ */
    return (
        <div className="flex flex-col h-[calc(100vh-88px)] relative" dir={isAr ? "rtl" : "ltr"}>
            {/* TOP BAR */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-emerald-400" /> POS
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ml-2 ${isOnline ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                        {isOnline ? <><Wifi className="w-3 h-3" /> أونلاين</> : <><WifiOff className="w-3 h-3" /> أوفلاين</>}
                    </span>
                </h1>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-[#0d1117] border border-zinc-800/50 rounded-xl px-3 py-2">
                        <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] text-zinc-500 font-bold">اليوم</span>
                        <span className="text-xs font-extrabold text-white">{todayStats.count}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#0d1117] border border-zinc-800/50 rounded-xl px-3 py-2">
                        <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] text-zinc-500 font-bold">الإيرادات</span>
                        <span className="text-xs font-extrabold text-emerald-400">{formatCurrency(todayStats.revenue)}</span>
                    </div>
                    <button onClick={() => setShowHeld(!showHeld)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition ${showHeld ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-[#0d1117] text-zinc-400 border-zinc-800/50 hover:text-white"}`}>
                        <PauseCircle className="w-3.5 h-3.5" /> معلقة ({heldOrders.length})
                    </button>
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className="w-9 h-9 flex items-center justify-center bg-[#0d1117] border border-zinc-800/50 rounded-xl text-zinc-500 hover:text-white transition">
                        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    <div className="flex items-center gap-1.5 bg-[#0d1117] border border-zinc-800/50 rounded-xl px-3 py-2">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs font-bold text-zinc-300 tabular-nums">{currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                </div>
            </div>

            {/* MAIN */}
            <div className="flex flex-1 gap-4 min-h-0">
                {/* LEFT: MENU */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0">
                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500`} />
                        <input ref={searchRef} value={searchQ} onChange={e => setSearchQ(e.target.value)}
                            placeholder="بحث عن صنف... (/)"
                            className={`w-full ${isAr ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 bg-[#0d1117] border border-zinc-800/50 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition`} />
                        {searchQ && <button onClick={() => setSearchQ("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>}
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        <button onClick={() => setActiveCategory("all")}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeCategory === "all" ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10" : "bg-[#0d1117] text-zinc-400 border border-zinc-800/50 hover:text-white"}`}>
                            <LayoutGrid className="w-3.5 h-3.5" /> الكل
                            <span className="bg-zinc-700/50 text-zinc-400 px-1.5 py-0.5 rounded-md text-[10px] font-bold">{menuItems.length}</span>
                        </button>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeCategory === cat.id ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10" : "bg-[#0d1117] text-zinc-400 border border-zinc-800/50 hover:text-white"}`}>
                                {(cat.image_data || cat.image_url) ? <img src={cat.image_data || cat.image_url} alt="" className="w-4 h-4 rounded object-cover" /> : cat.emoji && <span>{cat.emoji}</span>}
                                {isAr ? cat.name_ar : (cat.name_en || cat.name_ar)}
                                <span className="bg-zinc-700/50 text-zinc-400 px-1.5 py-0.5 rounded-md text-[10px] font-bold">{categoryCounts[cat.id] || 0}</span>
                            </button>
                        ))}
                    </div>

                    {/* Items Grid */}
                    <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 content-start pb-2 auto-rows-max" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>
                        {filteredItems.length === 0 ? (
                            <div className="col-span-full text-center py-16 text-zinc-600"><Package className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm font-bold">لا توجد أصناف</p></div>
                        ) : filteredItems.map(item => {
                            const imgSrc = item.image_data || item.image_url || getCatImage(item.category_id);
                            return (
                                <button key={item.id} onClick={() => handleItemClick(item)}
                                    className="bg-[#0d1117] border border-zinc-800/60 rounded-xl p-2 text-right transition-all group relative overflow-hidden hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 active:scale-95 cursor-pointer flex flex-col">
                                    {imgSrc ? (
                                        <div className="w-full h-16 rounded-lg bg-zinc-800/30 mb-2 overflow-hidden"><img src={imgSrc} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" /></div>
                                    ) : (
                                        <div className="w-full h-16 rounded-lg bg-zinc-800/30 mb-2 flex items-center justify-center"><Package className="w-6 h-6 text-zinc-700" /></div>
                                    )}
                                    <p className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition leading-tight mb-1">{isAr ? item.title_ar : (item.title_en || item.title_ar)}</p>
                                    <div className="flex flex-col gap-1 mt-auto pt-2 border-t border-zinc-800/50">
                                        {item.prices.map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-[13px] bg-black/20 px-2 py-1.5 rounded mt-1">
                                                <span className="text-zinc-400 font-bold">{item.size_labels?.[idx] || (item.prices.length > 1 ? `حجم ${idx + 1}` : "السعر")}</span>
                                                <span className="font-black text-emerald-400 text-lg">{formatCurrency(p)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {item.is_popular && <div className="absolute top-1 right-1 text-[8px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold z-10 border border-amber-500/20">⭐ مميز</div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: CART */}
                <div className="w-full lg:w-[400px] bg-[#0d1117] border border-zinc-800/50 rounded-xl flex flex-col min-h-0 shrink-0">
                    <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
                        <h2 className="font-extrabold text-white flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-emerald-400" /> السلة <span className="text-emerald-400 text-sm">({cartCount})</span>
                        </h2>
                        <div className="flex items-center gap-2">
                            {lastOrderNumber && <button onClick={() => setShowReceipt(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-[10px] font-bold transition"><Printer className="w-3.5 h-3.5" /> #{lastOrderNumber}</button>}
                            {cart.length > 0 && <button onClick={clearCart} className="text-[10px] text-red-400 hover:text-red-300 font-bold">مسح الكل</button>}
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: "none" }}>
                        {cart.length === 0 ? (
                            <div className="text-center py-12 text-zinc-600"><ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="text-xs">السلة فارغة</p></div>
                        ) : cart.map((c, i) => (
                            <div key={`${c.menuItem.id}-${c.selectedSizeIdx}-${i}`} className="bg-black/20 rounded-lg p-2.5 group/item">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-zinc-200 truncate">
                                            {c.menuItem.title_ar}
                                            {c.menuItem.size_labels && c.menuItem.size_labels.length > 1 && <span className="text-zinc-500"> ({c.menuItem.size_labels[c.selectedSizeIdx]})</span>}
                                        </p>
                                        {c.categoryName && <p className="text-[10px] text-blue-400 font-bold">{c.categoryName}</p>}
                                        <p className="text-[10px] text-emerald-400 font-bold">{formatCurrency(c.unitPrice)} × {c.qty}</p>
                                        {c.note && <p className="text-[9px] text-amber-400/70 mt-0.5 truncate">📝 {c.note}</p>}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => updateQty(i, -1)} className="w-6 h-6 bg-zinc-700/50 text-zinc-400 rounded flex items-center justify-center hover:bg-zinc-600"><Minus className="w-3 h-3" /></button>
                                        <span className="w-6 text-center text-xs font-bold text-white tabular-nums">{c.qty}</span>
                                        <button onClick={() => updateQty(i, 1)} className="w-6 h-6 bg-zinc-700/50 text-zinc-400 rounded flex items-center justify-center hover:bg-zinc-600"><Plus className="w-3 h-3" /></button>
                                    </div>
                                    <span className="text-xs font-extrabold text-white w-16 text-left tabular-nums">{formatCurrency(c.unitPrice * c.qty)}</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setEditNoteIdx(editNoteIdx === i ? null : i)} className={`${c.note ? "text-amber-400" : "text-zinc-600"} hover:text-amber-400 opacity-0 group-hover/item:opacity-100 transition-opacity`}><StickyNote className="w-3 h-3" /></button>
                                        <button onClick={() => removeFromCart(i)} className="text-red-400/60 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                </div>
                                {editNoteIdx === i && (
                                    <div className="mt-2 flex gap-1">
                                        <input value={c.note || ""} onChange={e => setItemNote(i, e.target.value)} placeholder="ملاحظة..." className="flex-1 px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded text-[10px] text-white placeholder:text-zinc-600 outline-none" autoFocus onKeyDown={e => e.key === "Enter" && setEditNoteIdx(null)} />
                                        <button onClick={() => setEditNoteIdx(null)} className="text-emerald-400 text-[10px] font-bold px-1">✓</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Cart Footer */}
                    {cart.length > 0 && (
                        <div className="border-t border-zinc-800/50 p-4 space-y-3">
                            {/* Customer */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                    <Users className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                                    <input value={customerName}
                                        onChange={e => { setCustomerName(e.target.value); setShowCustomerSuggestions(true); }}
                                        onFocus={() => setShowCustomerSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 300)}
                                        placeholder="اسم العميل"
                                        className="w-full pr-7 pl-2 py-2 bg-black/30 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition" />
                                    {showCustomerSuggestions && customerSuggestions.length > 0 && (
                                        <div className="absolute top-full mt-1 left-0 right-0 bg-[#0d1117] border border-zinc-700 rounded-lg overflow-hidden z-50 shadow-xl">
                                            {customerSuggestions.map((c, i) => (
                                                <button key={i} onClick={() => selectCustomer(c)} className="w-full text-right px-3 py-2 hover:bg-emerald-500/10 transition flex items-center justify-between">
                                                    <span className="text-xs font-bold text-zinc-300">{c.name}</span>
                                                    <span className="text-[10px] text-zinc-500" dir="ltr">{c.phone}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="الهاتف" dir="ltr" className="px-2.5 py-2 bg-black/30 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition" />
                            </div>

                            {/* Notes + Driver */}
                            <div className="grid grid-cols-2 gap-2">
                                <input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="ملاحظات الطلب" className="px-2.5 py-2 bg-black/30 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition" />
                                <div className="relative">
                                    <Truck className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                                    <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
                                        className="w-full pr-7 pl-2 py-2 bg-black/30 border border-zinc-800 rounded-lg text-xs text-white outline-none appearance-none cursor-pointer">
                                        <option value="">بدون دليفري</option>
                                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            {selectedDriver !== "" && (
                                <div className="space-y-2">
                                    {/* Delivery zones quick-select */}
                                    {zones.length > 0 && (
                                        <div>
                                            <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> منطقة التوصيل</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {zones.map(z => (
                                                    <button key={z.id} onClick={() => setDeliveryFee(z.fee)}
                                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${deliveryFee === z.fee ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-sm shadow-cyan-500/10" : "bg-zinc-800/50 text-zinc-400 border-zinc-700/30 hover:text-white hover:border-zinc-600"}`}>
                                                        <MapPin className="w-2.5 h-2.5" />
                                                        {z.name_ar}
                                                        <span className={`font-extrabold ${deliveryFee === z.fee ? "text-cyan-300" : "text-emerald-400"}`}>{formatCurrency(z.fee)}</span>
                                                        {z.estimated_time > 0 && <span className="text-zinc-600 text-[9px]">• {z.estimated_time}د</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="عنوان التوصيل" className="w-full px-2.5 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-white placeholder:text-amber-500/50 outline-none focus:border-amber-500 transition" />
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                                        <input type="number" value={deliveryFee || ""} onChange={e => setDeliveryFee(Number(e.target.value))} placeholder="حساب الدليفري (ج.م)" min="0" className="flex-1 px-2.5 py-2 bg-black/30 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500/50 transition" />
                                        <span className="text-[10px] font-extrabold text-cyan-400 whitespace-nowrap">{deliveryFee > 0 ? formatCurrency(deliveryFee) : ""}</span>
                                    </div>
                                </div>
                            )}

                            {/* Discount */}
                            <div className="flex items-center gap-2">
                                <button onClick={() => setDiscountType(discountType === "fixed" ? "percent" : "fixed")} className="w-8 h-8 bg-zinc-700/50 text-zinc-400 rounded-lg flex items-center justify-center hover:text-white transition">
                                    {discountType === "percent" ? <Percent className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                                </button>
                                <input type="number" value={discountValue || ""} onChange={e => setDiscountValue(Number(e.target.value))} placeholder="خصم" min="0" className="flex-1 px-2.5 py-2 bg-black/30 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition" />
                            </div>

                            {/* Payment */}
                            <div className="flex gap-1.5">
                                {[{ key: "cash", icon: <Banknote className="w-3 h-3" />, label: "كاش" }, { key: "card", icon: <CreditCard className="w-3 h-3" />, label: "بطاقة" }, { key: "online", icon: <Smartphone className="w-3 h-3" />, label: "أونلاين" }].map(pm => (
                                    <button key={pm.key} onClick={() => setPaymentMethod(pm.key)} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-all ${paymentMethod === pm.key ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/30 hover:text-white"}`}>
                                        {pm.icon} {pm.label}
                                    </button>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between text-zinc-400"><span>المجموع الفرعي</span><span className="tabular-nums">{formatCurrency(subtotal)}</span></div>
                                {discount > 0 && <div className="flex justify-between text-red-400"><span>الخصم</span><span className="tabular-nums">-{formatCurrency(discount)}</span></div>}
                                {deliveryFee > 0 && <div className="flex justify-between text-cyan-400"><span>🚚 حساب الدليفري</span><span className="tabular-nums">+{formatCurrency(deliveryFee)}</span></div>}
                                <div className="flex justify-between text-white font-extrabold text-lg pt-1.5 border-t border-zinc-700/50"><span>الإجمالي</span><span className="text-emerald-400 tabular-nums">{formatCurrency(total)}</span></div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button onClick={() => submitOrder(true)} disabled={submitting} className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-zinc-700/50 text-zinc-300 font-bold text-sm rounded-xl hover:bg-zinc-600/50 transition active:scale-95 disabled:opacity-50 border border-zinc-700/30"><Save className="w-4 h-4" /> تعليق</button>
                                <button onClick={() => submitOrder(false)} disabled={submitting} className="flex-[2] flex items-center justify-center gap-1.5 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition active:scale-95 disabled:opacity-50"><Send className="w-4 h-4" /> {submitting ? "جاري..." : "إرسال الطلب"}</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* HELD ORDERS */}
                {showHeld && (
                    <div className="absolute top-0 bottom-0 left-0 right-0 z-50 flex">
                        <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setShowHeld(false)} />
                        <div className="w-full max-w-sm bg-[#0a0e14] border-r border-zinc-800/50 flex flex-col shadow-2xl">
                            <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between"><h3 className="font-extrabold text-white flex items-center gap-2"><PauseCircle className="w-5 h-5 text-amber-400" /> طلبات معلقة ({heldOrders.length})</h3><button onClick={() => setShowHeld(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button></div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: "none" }}>
                                {heldOrders.length === 0 ? <div className="text-center py-12 text-zinc-600"><PauseCircle className="w-10 h-10 mx-auto mb-2 opacity-20" /><p className="text-xs">لا توجد طلبات معلقة</p></div> :
                                    heldOrders.map(o => (
                                        <div key={o.id} className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-3">
                                            <div className="flex items-start justify-between mb-2"><div><p className="text-xs font-bold text-zinc-300">{o.customer_name || "بدون اسم"}</p><p className="text-[10px] text-zinc-500">{new Date(o.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p></div><span className="text-xs font-extrabold text-emerald-400">{formatCurrency(o.total)}</span></div>
                                            <div className="space-y-0.5 mb-2">{o.items.slice(0, 3).map((item, idx) => <p key={idx} className="text-[10px] text-zinc-500 truncate">• {item.title} × {item.qty}</p>)}{o.items.length > 3 && <p className="text-[10px] text-zinc-600">+{o.items.length - 3} أخرى</p>}</div>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => restoreHeldOrder(o)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-emerald-500/30 transition"><Play className="w-3 h-3" /> استعادة</button>
                                                <button onClick={() => deleteHeldOrder(o.id)} className="px-3 py-1.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-lg hover:bg-red-500/20 transition"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SIZE PICKER */}
            {sizePickerItem && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSizePickerItem(null)}>
                    <div className="bg-[#0d1117] border border-zinc-800/50 rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between"><h3 className="font-bold text-white text-sm">اختر الحجم</h3><button onClick={() => setSizePickerItem(null)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button></div>
                        <div className="p-3 space-y-2">
                            <p className="text-xs text-zinc-400 mb-2 font-bold">{sizePickerItem.title_ar}</p>
                            {sizePickerItem.prices.map((price, idx) => (
                                <button key={idx} onClick={() => { addToCart(sizePickerItem, idx); setSizePickerItem(null); }}
                                    className="w-full flex items-center justify-between p-3 bg-black/20 border border-zinc-800/50 rounded-xl hover:border-emerald-500/30 hover:bg-emerald-500/5 transition active:scale-95 text-right mt-2">
                                    <span className="text-xl font-black text-emerald-400">{formatCurrency(price)}</span>
                                    <span className="text-sm font-bold text-zinc-300">{sizePickerItem.size_labels?.[idx] || `حجم ${idx + 1}`}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* SUCCESS */}
            {successFlash && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
                    <div className="bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/30 rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-2xl animate-pulse">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400" /><p className="text-lg font-extrabold text-emerald-400">تم إرسال الطلب!</p>
                        {lastOrderNumber && <p className="text-sm text-zinc-300 font-bold">#{lastOrderNumber}</p>}
                        <button onClick={() => { setSuccessFlash(false); setShowReceipt(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition pointer-events-auto"><Printer className="w-3.5 h-3.5" /> طباعة الفاتورة</button>
                    </div>
                </div>
            )}

            {/* RECEIPT */}
            {showReceipt && lastOrderNumber && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReceipt(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div ref={receiptRef} className="p-4 text-sm text-black bg-white" dir="rtl" style={{ fontFamily: "'Courier New', monospace" }}>
                            <div style={{ textAlign: "center", marginBottom: "15px" }}>
                                <p style={{ fontWeight: "bold", fontSize: "22px", margin: "0 0 5px 0" }}>{restaurant?.name || "Restaurant"}</p>
                                <p style={{ fontSize: "14px", margin: "0 0 5px 0" }}>{new Date().toLocaleDateString("ar-EG")} - {new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</p>
                                <p style={{ fontWeight: "bold", fontSize: "18px", margin: "0" }}>فاتورة رقم #{lastOrderNumber}</p>
                            </div>
                            {(lastOrderCustomer.name || lastOrderCustomer.phone) && (
                                <><div style={{ borderTop: "1.5px dashed #000", margin: "12px 0" }} /><div style={{ fontSize: "14px" }}>
                                    {lastOrderCustomer.name && <p style={{ margin: "2px 0" }}>العميل: <strong>{lastOrderCustomer.name}</strong></p>}
                                    {lastOrderCustomer.phone && <p style={{ margin: "2px 0" }} dir="ltr">هاتف: <strong>{lastOrderCustomer.phone}</strong></p>}
                                    {lastOrderCustomer.address && <p style={{ margin: "2px 0" }}>العنوان: <strong>{lastOrderCustomer.address}</strong></p>}
                                </div></>
                            )}
                            {lastOrderNotes && (<><div style={{ borderTop: "1.5px dashed #000", margin: "12px 0" }} /><div style={{ fontSize: "14px" }}><p style={{ margin: "2px 0" }}>ملاحظات: <strong>{lastOrderNotes}</strong></p></div></>)}
                            <div style={{ borderTop: "1.5px dashed #000", margin: "12px 0" }} />
                            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
                                <thead><tr>
                                    <td style={{ fontWeight: "bold", paddingBottom: "8px", borderBottom: "1.5px dashed #000", fontSize: "15px" }}>الصنف</td>
                                    <td style={{ fontWeight: "bold", textAlign: "center", paddingBottom: "8px", borderBottom: "1.5px dashed #000", fontSize: "15px" }}>الكمية</td>
                                    <td style={{ fontWeight: "bold", textAlign: "left", paddingBottom: "8px", borderBottom: "1.5px dashed #000", fontSize: "15px" }}>المبلغ</td>
                                </tr></thead>
                                <tbody>
                                    {lastOrderCart.map((c, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: "4px 0", fontSize: "14px" }}>
                                                {c.categoryName && <span style={{ fontSize: "12px", color: "#0284c7", fontWeight: "bold" }}>{c.categoryName}<br /></span>}
                                                {c.menuItem.title_ar}{c.menuItem.size_labels && c.menuItem.size_labels.length > 1 ? ` (${c.menuItem.size_labels[c.selectedSizeIdx]})` : ""}
                                            </td>
                                            <td style={{ textAlign: "center", padding: "4px 0", fontSize: "15px", fontWeight: "bold" }}>{c.qty}</td>
                                            <td style={{ textAlign: "left", padding: "4px 0", fontSize: "15px", fontWeight: "bold" }}>{formatCurrency(c.unitPrice * c.qty)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ borderTop: "1.5px dashed #000", margin: "12px 0" }} />
                            {lastOrderDiscount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px" }}><span>الخصم</span><span>-{formatCurrency(lastOrderDiscount)}</span></div>}
                            {lastDeliveryFee > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#0891b2" }}><span>🚚 حساب الدليفري {lastDriverName ? `(${lastDriverName})` : ""}</span><span>+{formatCurrency(lastDeliveryFee)}</span></div>}
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "20px", marginTop: "10px" }}><span>الإجمالي</span><span>{formatCurrency(lastOrderTotal)}</span></div>
                            <div style={{ borderTop: "1.5px dashed #000", margin: "12px 0" }} />
                            <div style={{ textAlign: "center", fontSize: "13px", marginTop: "20px", fontWeight: "bold" }}><p style={{ margin: 0 }}>شكرا لطلبكم نتمنى ان ينال اعجابكم ❤️</p></div>
                        </div>
                        <div className="p-3 border-t flex gap-2">
                            <button onClick={() => setShowReceipt(false)} className="flex-1 py-2.5 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-200 transition">إغلاق</button>
                            <button onClick={printReceipt} className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition"><Printer className="w-3.5 h-3.5" /> طباعة</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
