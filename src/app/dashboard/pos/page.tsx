/* eslint-disable @next/next/no-img-element */
"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency, formatQuantity } from "@/lib/helpers/formatters";
import { posDb, generateId, getPosNextOrderNumber, decrementPosStock } from "@/lib/pos-db";
import type { PosCategory, PosMenuItem, PosOrder, PosCustomer, PosStaffUser } from "@/lib/pos-db";
import { pullFromSupabase, pushDirtyToSupabase, subscribeSyncStatus } from "@/lib/sync-service";
import { getReceiptStyles, getPrinterSettings } from "@/lib/helpers/printerSettings";
import { executePrint } from "@/lib/helpers/printEngine";
import { usePrintSettings } from "@/lib/hooks/usePrintSettings";
import PrintModal from "@/components/PrintModal";
import { renderReceiptHtml, renderShiftReceiptHtml } from "@/lib/helpers/receiptRenderer";
import { useSearchParams, useRouter } from "next/navigation";
import { revertOrderInventory } from "@/lib/helpers/inventoryService";
import { toast } from "sonner";
import {
    Plus, Minus, Trash2, ShoppingCart, Search, Percent,
    DollarSign, Save, X, Printer, Clock, Banknote,
    PauseCircle, Play, StickyNote, Users, MapPin,
    LayoutGrid, Receipt, CheckCircle2, Volume2, VolumeX,
    Package, Truck, Wifi, WifiOff, Monitor, RefreshCw
} from "lucide-react";

/* ═══════════════════════════ TYPES ═══════════════════════════ */
type CartItem = {
    menuItem: PosMenuItem; qty: number; selectedSizeIdx: number;
    unitPrice: number; note?: string; categoryName?: string;
    weightUnit?: string;
};

/* ═══════════════════════════ COMPONENT ═══════════════════════════ */
export default function POSPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const editId = searchParams.get("edit");
    const { language } = useLanguage();
    const { restaurantId, restaurant } = useRestaurant();
    const isAr = language === "ar";

    /* ── Data state ── */
    const [categories, setCategories] = useState<PosCategory[]>([]);
    const [menuItems, setMenuItems] = useState<PosMenuItem[]>([]);
    const [heldOrders, setHeldOrders] = useState<PosOrder[]>([]);
    const [todayStats, setTodayStats] = useState({ count: 0, revenue: 0 });
    const [drivers, setDrivers] = useState<PosStaffUser[]>([]);
    const [allCustomers, setAllCustomers] = useState<PosCustomer[]>([]);
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);

    /* ── UI state ── */
    const [activeCategory, setActiveCategory] = useState<string>("");
    const [searchQ, setSearchQ] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
    const [discountValue, setDiscountValue] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [depositAmount, setDepositAmount] = useState(0);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("takeaway");
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
    const [lastPaymentMethod, setLastPaymentMethod] = useState("cash");
    const [lastDepositAmount, setLastDepositAmount] = useState(0);
    const [successFlash, setSuccessFlash] = useState(false);
    const [editNoteIdx, setEditNoteIdx] = useState<number | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
    const [weightPrompt, setWeightPrompt] = useState<{ item: PosMenuItem, sizeIdx: number, editingIndex?: number } | null>(null);
    const [weightInput, setWeightInput] = useState<string>("");
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [originalOrderNumber, setOriginalOrderNumber] = useState<number | null>(null);
    const [originalCreatedAt, setOriginalCreatedAt] = useState<string | null>(null);
    const [printModalHtml, setPrintModalHtml] = useState<string | null>(null);
    const [cashierId, setCashierId] = useState<string>("");
    const [cashierName, setCashierName] = useState<string>("");
    const [showShiftReport, setShowShiftReport] = useState(false);
    const [shiftStats, setShiftStats] = useState({ count: 0, revenue: 0, cash: 0, deposit: 0, delivery: 0, orderNumbers: [] as number[] });
    const searchRef = useRef<HTMLInputElement>(null);
    const receiptRef = useRef<HTMLDivElement>(null);
    const printFrameRef = useRef<HTMLIFrameElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    /* ── Print Settings ── */
    const { settings: printSettings, saveSettings } = usePrintSettings(restaurantId);

    /* ── Fetch Cashier Details ── */
    useEffect(() => {
        const fetchCashier = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            setCashierId(session.user.id);
            const { data: team } = await supabase.from('team_members').select('name').eq('auth_id', session.user.id).maybeSingle();
            if (team) {
                setCashierName(team.name);
            } else {
                setCashierName(isAr ? "المدير (كاشير)" : "Admin Cashier");
            }
        };
        fetchCashier();
    }, [isAr]);

    /* ── Clock ── */
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    /* ── Sync status ── */
    useEffect(() => {
        return subscribeSyncStatus(s => {
            setIsOnline(s.isOnline);
            setIsSyncing(s.isSyncing);
            setPendingSyncCount(s.pendingCount);
        });
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
        // Default to the first category if none is selected
        setActiveCategory(prev => (prev === "all" || !prev) && cats.length > 0 ? cats[0].id : prev);
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

        const zones = await posDb.delivery_zones.where("restaurant_id").equals(restaurantId).toArray();
        // Fallback for zones if empty
        if (zones.length === 0 && navigator.onLine) {
            const { data: zData } = await supabase
                .from("delivery_zones").select("id,name_ar,fee,estimated_time")
                .eq("restaurant_id", restaurantId).eq("is_active", true).order("fee");
            if (zData) {
                await posDb.delivery_zones.bulkPut(zData.map(z => ({ ...z, restaurant_id: restaurantId, is_active: true } as any)));
            }
        }
    }, [restaurantId]);

    /* ── Initial sync + load ── */
    useEffect(() => {
        if (!restaurantId) return;
        // Run sync in background, don't wait for it to load UI
        pullFromSupabase(restaurantId).catch(e => console.error("Initial Sync Error:", e)).finally(() => loadData());
    }, [restaurantId, loadData]);

    /* ── Load existing order for editing ── */
    useEffect(() => {
        const loadOrderToEdit = async () => {
            if (!editId || !restaurantId || menuItems.length === 0) return;
            
            // Avoid reloading same order
            if (editingOrderId === editId) return;

            try {
                // Try Dexie first
                let order = await posDb.orders.get(editId);
                
                // Fallback to Supabase if not in Dexie
                if (!order) {
                    const { data } = await supabase.from('orders').select('*').eq('id', editId).single();
                    if (data) order = data as PosOrder;
                }

                if (order) {
                    setEditingOrderId(order.id);
                    setOriginalOrderNumber(order.order_number);
                    setOriginalCreatedAt(order.created_at);
                    
                    // Map items back to CartItems
                    const restoredCart: CartItem[] = order.items.map(item => {
                        const m = menuItems.find(mm => mm.id === item.id || mm.title_ar === item.title);
                        return {
                            menuItem: m || { 
                                id: item.id || "manual", 
                                title_ar: item.title, 
                                prices: [item.price], 
                                category_id: "", 
                                restaurant_id: restaurantId, 
                                is_available: true 
                            } as PosMenuItem,
                            qty: item.qty,
                            selectedSizeIdx: m?.size_labels?.indexOf(item.size || "") ?? 0,
                            unitPrice: item.price,
                            categoryName: item.category,
                            weightUnit: item.weight_unit
                        };
                    });

                    setCart(restoredCart);
                    setCustomerName(order.customer_name || "");
                    setCustomerPhone(order.customer_phone || "");
                    setCustomerAddress(order.customer_address || "");
                    setOrderNotes(order.notes || "");
                    setPaymentMethod(order.payment_method || "cash");
                    setDepositAmount(order.deposit_amount || 0);
                    setSelectedDriver(order.delivery_driver_id || "");
                    setDeliveryFee(order.delivery_fee || 0);
                    
                    if (order.discount) {
                        setDiscountValue(order.discount_type === 'percent' 
                            ? (order.discount / (order.subtotal || 1)) * 100 
                            : order.discount
                        );
                        setDiscountType(order.discount_type || "fixed");
                    }

                    toast.success(isAr ? "تم تحميل الطلب للتعديل" : "Order loaded for editing");
                }
            } catch (err) {
                console.error("Error loading order for edit:", err);
            }
        };

        loadOrderToEdit();
    }, [editId, restaurantId, menuItems, editingOrderId, isAr]);

    /* ── Keyboard shortcuts ── */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") { setSearchQ(""); setShowReceipt(false); setEditNoteIdx(null); setShowHeld(false); setShowCustomerSuggestions(false); setWeightPrompt(null); }
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
        if (activeCategory && item.category_id !== activeCategory) return false;
        if (searchQ) { const q = searchQ.toLowerCase(); return item.title_ar.toLowerCase().includes(q) || item.title_en?.toLowerCase().includes(q); }
        return true;
    }), [menuItems, activeCategory, searchQ]);

    const categoryCounts = useMemo(() => {
        const map: Record<string, number> = {};
        menuItems.forEach(i => { map[i.category_id] = (map[i.category_id] || 0) + 1; });
        return map;
    }, [menuItems]);

    const getCatName = (catId: string) => categories.find(c => c.id === catId)?.name_ar || "";

    /* ── Cart ── */
    const addToCart = useCallback((item: PosMenuItem, sizeIdx: number = 0) => {
        const price = item.prices[sizeIdx] || item.prices[0];
        const catName = getCatName(item.category_id);
        const weightUnit = item.sell_by_weight ? (item.weight_unit || (isAr ? 'كجم' : 'kg')) : undefined;

        setCart(prev => {
            const idx = prev.findIndex(c => c.menuItem.id === item.id && c.selectedSizeIdx === sizeIdx);
            if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, qty: c.qty + 1 } : c);
            return [...prev, { menuItem: item, qty: 1, selectedSizeIdx: sizeIdx, unitPrice: price, categoryName: catName, weightUnit }];
        });
        playBeep();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playBeep, categories, isAr]);

    const confirmWeight = () => {
        if (!weightPrompt) return;
        const weight = parseFloat(weightInput);
        if (isNaN(weight) || weight <= 0) {
            alert(isAr ? "الرجاء إدخال وزن صحيح" : "Please enter a valid weight");
            return;
        }
        const { item, sizeIdx, editingIndex } = weightPrompt;
        const price = item.prices[sizeIdx] || item.prices[0];
        const catName = getCatName(item.category_id);
        const weightUnit = item.weight_unit || (isAr ? 'كجم' : 'kg');

        if (editingIndex !== undefined) {
             setCart(prev => prev.map((c, i) => i === editingIndex ? { ...c, qty: weight, weightUnit } : c));
        } else {
             setCart(prev => {
                const idx = prev.findIndex(c => c.menuItem.id === item.id && c.selectedSizeIdx === sizeIdx);
                if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, qty: c.qty + weight, weightUnit } : c);
                return [...prev, { menuItem: item, qty: weight, selectedSizeIdx: sizeIdx, unitPrice: price, categoryName: catName, weightUnit }];
            });
            playBeep();
        }
        setWeightPrompt(null);
    };

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
        setOrderType("takeaway"); setSelectedDriver(""); setDepositAmount(0);
    };

    const subtotal = cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);
    const discount = discountType === "percent" ? subtotal * (discountValue / 100) : discountValue;
    const total = Math.max(0, subtotal - discount + deliveryFee);
    const cartCount = cart.reduce((s, c) => s + c.qty, 0);

    const printReceipt = () => {
        if (!receiptRef.current) return;
        const html = `<html><head><title>Receipt</title><style>${getReceiptStyles()}</style></head><body><div class="receipt-wrapper">${receiptRef.current.innerHTML}</div></body></html>`;
        const settings = getPrinterSettings();
        executePrint(html, settings, (modalHtml) => {
            setPrintModalHtml(modalHtml);
        });
    };

    const printDirectReceipt = useCallback((
        orderNum: number, cartItems: CartItem[], cName: string, cPhone: string, cAddress: string,
        notes: string, dFee: number, dName: string, oType: string, disc: number, oTotal: number,
        pMethod: string, deposit: number
    ) => {
        const orderForReceipt = {
            order_number: orderNum,
            items: cartItems.map(c => ({
                title: c.menuItem.title_ar,
                qty: c.qty,
                price: c.unitPrice,
                size: c.menuItem.size_labels?.[c.selectedSizeIdx],
                category: c.categoryName,
                weight_unit: c.weightUnit
            })),
            customer_name: cName || undefined,
            customer_phone: cPhone || undefined,
            customer_address: cAddress || undefined,
            notes: notes || undefined,
            delivery_fee: dFee,
            delivery_driver_name: dName,
            order_type: oType,
            discount: disc,
            total: oTotal,
            payment_method: pMethod,
            deposit_amount: deposit,
            created_at: new Date().toISOString()
        };

        const html = renderReceiptHtml(orderForReceipt, restaurant, isAr);

        // Use the unified print engine (QZ Tray → iframe → popup fallback)
        const currentSettings = getPrinterSettings();
        executePrint(html, currentSettings, (modalHtml) => {
            setPrintModalHtml(modalHtml);
        });
    }, [restaurant, isAr]);

    /* ── Submit Order ── */
    const submitOrder = useCallback(async (isHold = false) => {
        if (!restaurantId || cart.length === 0 || submitting) return;
        setSubmitting(true);
        try {
            // If editing, use the same order number and ID
            const orderId = editingOrderId || generateId();
            const orderNumber = originalOrderNumber || await getPosNextOrderNumber(restaurantId);

            // 1. If editing, revert previous inventory deductions first
            if (editingOrderId) {
                await revertOrderInventory(restaurantId, editingOrderId);
            }

            const items = cart.map(c => ({
                id: c.menuItem.id,
                title: c.menuItem.title_ar, qty: c.qty, price: c.unitPrice,
                size: c.menuItem.size_labels?.[c.selectedSizeIdx] || undefined,
                category: c.categoryName, note: c.note,
                weight_unit: c.weightUnit,
            }));
            const driverObj = selectedDriver ? drivers.find(d => d.id === selectedDriver) : undefined;

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
                cashier_id: cashierId || undefined,
                cashier_name: cashierName || undefined,
                deposit_amount: depositAmount || 0,
                status: "pending",
                is_draft: isHold,
                created_at: editingOrderId && originalCreatedAt ? originalCreatedAt : new Date().toISOString(),
                updated_at: new Date().toISOString(),
                _dirty: true,
            };

            // Write to Dexie first (offline-first)
            await posDb.orders.put(orderRecord);

            // 1.5. Local Inventory Deduction (Offline-first)
            for (const item of cart) {
                if (item.menuItem.inventory_item_id) {
                    await decrementPosStock(restaurantId, item.menuItem.inventory_item_id, item.qty);
                }
            }

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

            // Push to Supabase if online (Background Sync)
            if (navigator.onLine) {
                pushDirtyToSupabase(restaurantId).catch(e => console.error("Background sync error:", e));
            }

            if (isHold) {
                loadData();
            } else {
                setLastOrderNumber(orderNumber);
                const capturedCart = [...cart];
                setLastOrderCart(capturedCart);
                setLastOrderDiscount(discount);
                setLastOrderTotal(total);
                setLastOrderCustomer({ name: customerName, phone: customerPhone, address: customerAddress });
                setLastOrderNotes(orderNotes || "");
                setLastDeliveryFee(deliveryFee);
                setLastDriverName(driverObj?.name || "");
                setLastPaymentMethod(paymentMethod);
                setLastDepositAmount(depositAmount);

                setLastPaymentMethod(paymentMethod);
                setLastDepositAmount(depositAmount);
        
                // Always print receipt - with --kiosk-printing flag it prints silently,
                // without it the browser print dialog appears for printer selection
                printDirectReceipt(
                    orderNumber, capturedCart, customerName, customerPhone, customerAddress,
                    orderNotes || '', deliveryFee, driverObj?.name || '',
                    orderType, discount, total, paymentMethod, depositAmount
                );
        
                setTodayStats(p => ({ count: editingOrderId ? p.count : p.count + 1, revenue: editingOrderId ? p.revenue : p.revenue + total }));
            }
            clearCart();
            setEditingOrderId(null);
            setOriginalOrderNumber(null);
            setOriginalCreatedAt(null);
            if (editId) {
                router.replace('/dashboard/pos'); // Clean URL
            }
        } catch (e) { console.error(e); }
        finally { setSubmitting(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId, restaurant, cart, subtotal, discount, discountType, total, paymentMethod, depositAmount, customerName, customerPhone, customerAddress, selectedDriver, drivers, deliveryFee, orderNotes, submitting, loadData, editingOrderId, originalOrderNumber, editId, router, isAr, categories, printDirectReceipt]);

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

        // Soft delete / remove from sync queue
        await posDb.orders.update(order.id, { deleted_at: new Date().toISOString(), _dirty: true });
        if (typeof window !== 'undefined' && 'electronAPI' in window) {
            await (window as any).electronAPI.enqueueAction({
                action_type: 'delete',
                table_name: 'orders',
                record_id: order.id
            });
        }
        setHeldOrders(prev => prev.filter(h => h.id !== order.id));
        setShowHeld(false);
    };

    const deleteHeldOrder = async (id: string) => {
        await posDb.orders.update(id, { deleted_at: new Date().toISOString(), _dirty: true });
        if (typeof window !== 'undefined' && 'electronAPI' in window) {
            await (window as any).electronAPI.enqueueAction({
                action_type: 'delete',
                table_name: 'orders',
                record_id: id
            });
        }
        setHeldOrders(prev => prev.filter(h => h.id !== id));
    };

    const handleItemClick = (item: PosMenuItem, sizeIdx: number) => { addToCart(item, sizeIdx); };

    /* ── Shift Report Logic ── */
    const openShiftReport = async () => {
        if (!restaurantId || !cashierId) return;
        const todayStr = new Date().toISOString().split("T")[0];
        const allOrders = await posDb.orders.where("restaurant_id").equals(restaurantId).toArray();
        const myOrders = allOrders.filter(o => o.created_at.startsWith(todayStr) && o.status !== "cancelled" && !o.is_draft && o.cashier_id === cashierId);
        
        let cash = 0, deposit = 0, deliveryFees = 0, collectedCashTotal = 0;
        const orderNumbers = myOrders.map(o => o.order_number).sort((a,b) => a-b);

        myOrders.forEach(o => {
            if (o.status === "completed" || o.payment_method === "cash") {
                collectedCashTotal += (o.total || 0);
                cash += (o.total || 0);
            } else if (o.deposit_amount && o.deposit_amount > 0) {
                collectedCashTotal += o.deposit_amount;
                deposit += o.deposit_amount;
            }
            if (o.order_type === 'delivery' && o.delivery_fee) deliveryFees += o.delivery_fee;
        });

        setShiftStats({ count: myOrders.length, revenue: collectedCashTotal, cash, deposit, delivery: deliveryFees, orderNumbers });
        setShowShiftReport(true);
    };

    const printShiftReport = useCallback(() => {
        const html = renderShiftReceiptHtml({
            cashierName,
            shiftStats,
            restaurantName: restaurant?.name || "",
            isAr
        });
        const currentSettings = getPrinterSettings();
        executePrint(html, currentSettings, (modalHtml) => {
            setPrintModalHtml(modalHtml);
        });
    }, [cashierName, shiftStats, restaurant, isAr]);

    /* ═══════════════════════════ RENDER ═══════════════════════════ */
    return (
        <div className="flex flex-col h-[calc(100vh-88px)] relative" dir={isAr ? "rtl" : "ltr"}>
            {/* TOP BAR */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Monitor className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> POS
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ml-2 ${isOnline ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>
                            {isOnline ? <><Wifi className="w-3 h-3" /> أونلاين</> : <><WifiOff className="w-3 h-3" /> أوفلاين</>}
                        </span>
                        {(pendingSyncCount > 0 || isSyncing) && (
                           <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
                               <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                               {isSyncing ? "جاري المزامنة..." : `غير متزامن (${pendingSyncCount})`}
                           </span>
                        )}
                    </h1>
                    
                    {/* Search */}
                    <div className="relative w-64 hidden sm:block">
                        <Search className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-zinc-500`} />
                        <input ref={searchRef} value={searchQ} onChange={e => setSearchQ(e.target.value)}
                            placeholder="بحث عن صنف... (/)"
                            className={`w-full ${isAr ? "pr-9 pl-4" : "pl-9 pr-4"} py-2 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none -blue/50 transition shadow-sm`} />
                        {searchQ && <button onClick={() => setSearchQ("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white"><X className="w-4 h-4" /></button>}
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl px-3 py-2">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold">اليوم</span>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">{todayStats.count}</span>
                    </div>
                    <button onClick={openShiftReport} className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-4 py-2 transition-colors active:scale-95 cursor-pointer shadow-sm">
                        <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">{isAr ? "إيرادات الكاشير / الوردية" : "Cashier Shift Report"}</span>
                    </button>
                    
                    <button 
                        onClick={() => {
                            if (navigator.onLine && restaurantId && !isSyncing) {
                                pushDirtyToSupabase(restaurantId).then(() => pullFromSupabase(restaurantId));
                            }
                        }}
                        disabled={isSyncing || !isOnline}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition ${isSyncing || !isOnline ? "opacity-50 cursor-not-allowed bg-slate-100 border-slate-200" : "bg-white dark:bg-card text-slate-500 dark:text-zinc-400 border-slate-200 hover:text-blue-600 focus:ring-2"}`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-500" : ""}`} /> 
                        مزامنة
                    </button>

                    <button onClick={() => setShowHeld(!showHeld)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition ${showHeld ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30" : "bg-white dark:bg-card text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800/50 hover:text-slate-900 dark:hover:text-white"}`}>
                        <PauseCircle className="w-3.5 h-3.5" /> معلقة ({heldOrders.length})
                    </button>
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className="w-9 h-9 flex items-center justify-center bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition">
                        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl px-3 py-2">
                        <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 tabular-nums">{currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                </div>
            </div>

            {/* MAIN */}
            <div className="flex flex-col lg:flex-row flex-1 gap-4 min-h-0 overflow-y-auto lg:overflow-hidden pb-4 lg:pb-0 hide-scrollbar">
                {/* LEFT: MENU */}
                <div className="flex-1 flex flex-col min-h-[50vh] lg:min-h-0 min-w-0">


                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2 mb-3 pb-2 w-full max-h-[110px] overflow-y-auto hide-scrollbar">
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                                className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeCategory === cat.id ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-400 dark:border-glass-border shadow-sm" : "bg-white dark:bg-card text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800/50 hover:bg-slate-50 hover:text-slate-900 dark:hover:text-white"}`}>
                                <span className="text-center">{isAr ? cat.name_ar : (cat.name_en || cat.name_ar)}</span>
                            </button>
                        ))}
                    </div>

                    {/* Items Grid */}
                    <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 content-start pb-2 auto-rows-max hide-scrollbar">
                        {filteredItems.length === 0 ? (
                            <div className="col-span-full text-center py-16 text-slate-400 dark:text-zinc-600"><Package className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm font-bold">لا توجد أصناف</p></div>
                        ) : (() => {
                            // Flatten items so each size variant becomes its own card
                            const flattenedCards: { item: PosMenuItem, sizeIdx: number, price: number, colorIdx: number }[] = [];
                            let colorCounter = 0;
                            
                            filteredItems.forEach(item => {
                                item.prices.forEach((price, idx) => {
                                    flattenedCards.push({ item, sizeIdx: idx, price, colorIdx: colorCounter++ });
                                });
                            });

                            return flattenedCards.map(({ item, sizeIdx, price, colorIdx }) => {
                                const sizeName = item.size_labels?.[sizeIdx] || "";
                                const hasMultipleSizes = item.prices.length > 1;
                                
                                // Vibrant colors for the price footer band
                                const bandColors = [
                                    "bg-indigo-500",
                                    "bg-rose-500",
                                    "bg-emerald-500",
                                    "bg-amber-500",
                                    "bg-sky-500",
                                    "bg-fuchsia-500"
                                ];
                                const bandColorClass = bandColors[colorIdx % bandColors.length];
                                
                                return (
                                    <button key={`${item.id}-${sizeIdx}`} onClick={() => handleItemClick(item, sizeIdx)}
                                        className="rounded-xl overflow-hidden text-center transition-all group relative active:scale-95 cursor-pointer flex flex-col items-stretch justify-between min-h-[115px] shadow-sm hover:shadow-md border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-card hover:border-slate-300 dark:hover:border-zinc-700">
                                        
                                        {/* Top section: Clean text */}
                                        <div className="flex-1 flex flex-col items-center justify-center p-2 pt-3 gap-1">
                                            <p className="text-[18px] xl:text-[22px] font-black leading-snug px-0.5 break-words w-full text-slate-800 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors">
                                                {isAr ? item.title_ar : (item.title_en || item.title_ar)}
                                            </p>
                                            
                                            {hasMultipleSizes && sizeName && (
                                                <p className="text-[14px] font-bold text-slate-500 dark:text-zinc-400 mt-0.5">
                                                    ({sizeName})
                                                </p>
                                            )}
                                        </div>
                                        
                                        {/* Bottom section: Colored price band */}
                                        <div className={`w-full py-2 flex justify-center items-center text-white ${bandColorClass} bg-opacity-90 group-hover:bg-opacity-100 transition-all`}>
                                            <span className="text-[15px] font-black tracking-widest drop-shadow-sm">
                                                {formatCurrency(price)}
                                            </span>
                                        </div>
                                        
                                        {item.is_popular && sizeIdx === 0 && <div className="absolute top-1.5 right-1.5 text-[10px] bg-amber-400 text-amber-950 font-black px-1.5 rounded-sm shadow-sm z-20">★ مميز</div>}
                                    </button>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* RIGHT: CART */}
                <div className="w-full lg:w-[400px] xl:w-[480px] 2xl:w-[520px] transition-all duration-300 ease-in-out bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl flex flex-col min-h-[60vh] lg:min-h-0 shrink-0">
                    <div className="p-4 border-b border-slate-200 dark:border-zinc-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> 
                                <span>السلة</span> 
                                <span className="text-emerald-600 dark:text-emerald-400 text-sm">({cartCount})</span>
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {lastOrderNumber && <button onClick={() => setShowReceipt(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg text-[10px] font-bold transition"><Printer className="w-3.5 h-3.5" /> #{lastOrderNumber}</button>}
                            {cart.length > 0 && <button onClick={clearCart} className="text-[10px] text-red-600 dark:text-red-400 hover:text-red-300 font-bold">مسح</button>}
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5" style={{ scrollbarWidth: "none" }}>
                        {cart.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 dark:text-zinc-600"><ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="text-xs">السلة فارغة</p></div>
                        ) : cart.map((c, i) => (
                            <div key={`${c.menuItem.id}-${c.selectedSizeIdx}-${i}`} className="bg-slate-50 dark:bg-black/10 border border-slate-200 dark:border-zinc-800 rounded-lg p-2 group/item">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] xl:text-[17px] font-black text-slate-800 dark:text-zinc-100 truncate">
                                            {(() => {
                                                const fmt = formatQuantity(c.qty, c.weightUnit || (isAr ? 'قطعة' : 'unit'), isAr);
                                                return c.menuItem.sell_by_weight 
                                                    ? `(${fmt.qty} ${fmt.unit}) ${c.menuItem.title_ar}` 
                                                    : c.menuItem.title_ar;
                                            })()}
                                            {c.menuItem.size_labels && c.menuItem.size_labels.length > 1 && <span className="text-slate-500 dark:text-zinc-500 text-[13px]"> ({c.menuItem.size_labels[c.selectedSizeIdx]})</span>}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {c.categoryName && <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">🗂️ {c.categoryName}</span>}
                                            <span className="text-[13px] text-emerald-600 dark:text-emerald-400 font-black">{formatCurrency(c.unitPrice)} × {c.menuItem.sell_by_weight ? 1 : c.qty}</span>
                                        </div>
                                        {c.note && <p className="text-[11px] text-amber-500 mt-0.5 truncate font-bold">📝 {c.note}</p>}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {c.menuItem.sell_by_weight ? (
                                            <button onClick={() => { setWeightPrompt({ item: c.menuItem, sizeIdx: c.selectedSizeIdx, editingIndex: i }); setWeightInput(c.qty.toString()); }} className="px-2 h-8 bg-indigo-50 border border-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold rounded text-[12px] flex items-center justify-center hover:bg-indigo-100 transition-colors">
                                                {c.qty} {c.weightUnit}
                                            </button>
                                        ) : (
                                            <>
                                                <button onClick={() => updateQty(i, -1)} className="w-8 h-8 bg-slate-200 dark:bg-zinc-700/50 text-slate-600 dark:text-zinc-300 rounded-md flex items-center justify-center hover:bg-zinc-600 transition-colors"><Minus className="w-3 h-3" /></button>
                                                <span className="w-6 text-center text-[15px] font-black text-slate-900 dark:text-white tabular-nums">
                                                    {formatQuantity(c.qty, c.weightUnit || (isAr ? 'قطعة' : 'piece'), isAr).qty}
                                                </span>
                                                <button onClick={() => updateQty(i, 1)} className="w-8 h-8 bg-slate-200 dark:bg-zinc-700/50 text-slate-600 dark:text-zinc-300 rounded-md flex items-center justify-center hover:bg-zinc-600 transition-colors"><Plus className="w-3 h-3" /></button>
                                            </>
                                        )}
                                    </div>
                                    <span className="text-[15px] xl:text-[17px] font-black text-slate-900 dark:text-white w-20 text-left tabular-nums">{formatCurrency(c.unitPrice * c.qty)}</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setEditNoteIdx(editNoteIdx === i ? null : i)} className={`${c.note ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-zinc-600"} hover:text-amber-400 opacity-0 group-hover/item:opacity-100 transition-opacity`}><StickyNote className="w-3 h-3" /></button>
                                        <button onClick={() => removeFromCart(i)} className="text-red-400/60 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                </div>
                                {editNoteIdx === i && (
                                    <div className="mt-1.5 flex gap-1">
                                        <input value={c.note || ""} onChange={e => setItemNote(i, e.target.value)} placeholder="أضف ملاحظة..." className="flex-1 px-2 py-1 bg-white dark:bg-zinc-900/50 border border-slate-300 dark:border-zinc-700 rounded text-[11px] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none" autoFocus onKeyDown={e => e.key === "Enter" && setEditNoteIdx(null)} />
                                        <button onClick={() => setEditNoteIdx(null)} className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold px-1.5">✓</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Cart Footer */}
                    {cart.length > 0 && (
                        <div className="border-t border-slate-200 dark:border-zinc-800/50 p-2.5 space-y-2 bg-slate-50/30 dark:bg-transparent">
                            {/* Order Type Toggle */}
                            <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-zinc-800 rounded-lg">
                                {[{ key: "dine_in", icon: <LayoutGrid className="w-3.5 h-3.5" />, label: "صالة" },
                                  { key: "takeaway", icon: <Package className="w-3.5 h-3.5" />, label: "تيك أواي" },
                                  { key: "delivery", icon: <Truck className="w-3.5 h-3.5" />, label: "دليفري" }].map(t => (
                                    <button key={t.key} onClick={() => setOrderType(t.key as "dine_in" | "takeaway" | "delivery")} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-extrabold transition-all ${orderType === t.key ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-zinc-700" : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"}`}>
                                        {t.icon} {t.label}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Customer Info Section */}
                            <div className="space-y-1.5 p-2.5 bg-white dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="relative">
                                        <Users className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                        <input value={customerName}
                                            onChange={e => { setCustomerName(e.target.value); setShowCustomerSuggestions(true); }}
                                            onFocus={() => setShowCustomerSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 300)}
                                            placeholder="اسم العميل..."
                                            className="w-full pr-8 pl-2 py-2 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-[13px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-emerald-500/50 transition" />
                                        {showCustomerSuggestions && customerSuggestions.length > 0 && (
                                            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white dark:bg-card border border-slate-300 dark:border-zinc-700 rounded-lg overflow-hidden z-50 shadow-xl max-h-48 overflow-y-auto">
                                                {customerSuggestions.map((c, i) => (
                                                    <button key={i} onClick={() => selectCustomer(c)} className="w-full text-right px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition flex items-center justify-between border-b last:border-0 border-slate-100 dark:border-zinc-800">
                                                        <span className="text-[13px] font-bold text-slate-800 dark:text-zinc-200">{c.name}</span>
                                                        <span className="text-[11px] text-slate-500 dark:text-zinc-500 font-mono" dir="ltr">{c.phone}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="رقم الهاتف..." dir="ltr" className="px-2.5 py-2 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-[13px] font-bold font-mono text-right text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-emerald-500/50 transition" />
                                </div>
                                <div className="relative">
                                    <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                    <input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="العنوان بالتفصيل..." className="w-full pr-8 pl-2 py-2 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-[13px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-blue-500/50 transition" />
                                </div>
                            </div>

                            {/* Delivery Options (Only if Delivery) */}
                            {orderType === "delivery" && (
                                <div className="grid grid-cols-2 gap-2 p-2 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl shadow-sm">
                                    <div className="relative">
                                        <Truck className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                        <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
                                            className="w-full pr-8 pl-2 py-2 bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-700 rounded-lg text-[12px] font-bold text-slate-900 dark:text-white outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-blue-500/30 transition">
                                            <option value="">الطيار...</option>
                                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 shadow-sm">
                                        <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">التوصيل</span>
                                        <input type="number" value={deliveryFee || ""} onChange={e => setDeliveryFee(Number(e.target.value))} placeholder="0" min="0" className="w-full py-2 text-[13px] text-blue-600 dark:text-blue-400 placeholder:text-slate-400 text-center font-black outline-none bg-transparent" />
                                    </div>
                                </div>
                            )}

                            {/* Calculations Grid */}
                            <div className="grid grid-cols-2 gap-2 p-2.5 bg-white/50 dark:bg-black/10 border border-slate-200 dark:border-zinc-800 rounded-xl">
                                {/* Left Col: Notes + Payment */}
                                <div className="space-y-1.5">
                                    <div className="relative">
                                        <StickyNote className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="ملاحظات..." className="w-full pr-7 pl-2 py-1.5 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-zinc-700 rounded-lg text-[11px] font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-slate-300" />
                                    </div>
                                    <div className="flex gap-1">
                                        {[{ key: "cash", icon: <Banknote className="w-3 h-3" />, label: "كاش" }, { key: "deposit", icon: <Receipt className="w-3 h-3" />, label: "عربون" }].map(pm => (
                                            <button key={pm.key} onClick={() => { setPaymentMethod(pm.key); if (pm.key !== 'deposit') setDepositAmount(0); }} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${paymentMethod === pm.key ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-100 dark:bg-zinc-800/80 text-slate-500 border border-slate-200 dark:border-zinc-700 hover:text-slate-900 dark:hover:text-white"}`}>
                                                {pm.icon} {pm.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Right Col: Discount + Deposit */}
                                <div className="space-y-1.5">
                                    <div className="flex bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-slate-300 shadow-sm">
                                        <button onClick={() => setDiscountType(discountType === "fixed" ? "percent" : "fixed")} className="px-2 bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-l border-slate-200 dark:border-zinc-700 hover:bg-slate-300 transition">
                                            {discountType === "percent" ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                                        </button>
                                        <input type="number" value={discountValue || ""} onChange={e => setDiscountValue(Number(e.target.value))} placeholder="خصم..." className="w-full px-2 py-1.5 text-[11px] font-black text-slate-900 dark:text-white placeholder:text-slate-400 outline-none bg-transparent" />
                                    </div>
                                    {paymentMethod === "deposit" && (
                                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg px-2 py-1 shadow-sm">
                                            <span className="text-[9px] text-amber-700 dark:text-amber-500 font-black">عربون</span>
                                            <input type="number" value={depositAmount || ""} onChange={e => setDepositAmount(Number(e.target.value))} placeholder="0" className="w-full py-0.5 text-[11px] text-amber-900 dark:text-amber-300 text-center font-black outline-none bg-transparent" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Totals Summary */}
                            <div className="px-1 space-y-0.5 text-[13px] font-bold">
                                <div className="flex justify-between items-center text-slate-500 dark:text-zinc-500">
                                    <span>المجموع</span>
                                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                                </div>
                                {discount > 0 && <div className="flex justify-between items-center text-red-500">
                                    <span>الخصم</span>
                                    <span className="tabular-nums">-{formatCurrency(discount)}</span>
                                </div>}
                                {deliveryFee > 0 && <div className="flex justify-between items-center text-blue-500">
                                    <span>🚚 التوصيل</span>
                                    <span className="tabular-nums">+{formatCurrency(deliveryFee)}</span>
                                </div>}
                                <div className="flex justify-between items-center text-slate-900 dark:text-white text-[20px] xl:text-[24px] font-black pt-1 border-t border-slate-200 dark:border-zinc-800">
                                    <span>الإجمالي</span>
                                    <span className="text-emerald-500 tabular-nums">{formatCurrency(total)}</span>
                                </div>
                                {paymentMethod === "deposit" && (
                                    <div className="flex justify-between items-center text-red-600 dark:text-red-400 text-[15px] font-black">
                                        <span>الباقي مطلوب</span>
                                        <span className="tabular-nums">{formatCurrency(Math.max(0, total - depositAmount))}</span>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button onClick={() => submitOrder(true)} disabled={submitting} className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-extrabold text-[13px] rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-700 transition active:scale-95 disabled:opacity-50 border border-slate-200 dark:border-zinc-700 shadow-sm"><Save className="w-4 h-4" /> تعليق</button>
                                <button onClick={() => submitOrder(false)} disabled={submitting} className="flex-[2] flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-black text-[17px] xl:text-[19px] rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition active:scale-95 disabled:opacity-50"><Printer className="w-5 h-5" /> {submitting ? "جاري..." : "طباعة " + (editingOrderId ? "(تعديل)" : "")}</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* HELD ORDERS */}
                {showHeld && (
                    <div className="absolute top-0 bottom-0 left-0 right-0 z-50 flex">
                        <div className="flex-1 bg-slate-200 dark:bg-black/50 backdrop-blur-sm" onClick={() => setShowHeld(false)} />
                        <div className="w-full max-w-sm bg-slate-50 dark:bg-background border-r border-slate-200 dark:border-zinc-800/50 flex flex-col shadow-2xl">
                            <div className="p-4 border-b border-slate-200 dark:border-zinc-800/50 flex items-center justify-between"><h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><PauseCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" /> طلبات معلقة ({heldOrders.length})</h3><button onClick={() => setShowHeld(false)} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button></div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: "none" }}>
                                {heldOrders.length === 0 ? <div className="text-center py-12 text-slate-400 dark:text-zinc-600"><PauseCircle className="w-10 h-10 mx-auto mb-2 opacity-20" /><p className="text-xs">لا توجد طلبات معلقة</p></div> :
                                    heldOrders.map(o => (
                                        <div key={o.id} className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-3">
                                            <div className="flex items-start justify-between mb-2"><div><p className="text-xs font-bold text-slate-700 dark:text-zinc-300">{o.customer_name || "بدون اسم"}</p><p className="text-[10px] text-slate-500 dark:text-zinc-500">{new Date(o.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p></div><span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(o.total)}</span></div>
                                            <div className="space-y-0.5 mb-2">{o.items.slice(0, 3).map((item, idx) => <p key={idx} className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">• {item.title} × {item.qty}</p>)}{o.items.length > 3 && <p className="text-[10px] text-slate-400 dark:text-zinc-600">+{o.items.length - 3} أخرى</p>}</div>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => restoreHeldOrder(o)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition"><Play className="w-3 h-3" /> استعادة</button>
                                                <button onClick={() => deleteHeldOrder(o.id)} className="px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-lg hover:bg-red-500/20 transition"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SUCCESS */}
            {successFlash && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
                    <div className="bg-emerald-100 dark:bg-emerald-500/20 backdrop-blur-xl border border-emerald-200 dark:border-glass-border rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-2xl animate-pulse">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" /><p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">تم إرسال الطلب!</p>
                        {lastOrderNumber && <p className="text-sm text-slate-700 dark:text-zinc-300 font-bold">#{lastOrderNumber}</p>}
                        <button onClick={() => { setSuccessFlash(false); setShowReceipt(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition pointer-events-auto"><Printer className="w-3.5 h-3.5" /> طباعة الفاتورة</button>
                    </div>
                </div>
            )}

            {/* RECEIPT */}
            {showReceipt && lastOrderNumber && (
                <div className="fixed inset-0 z-[200] bg-slate-300 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReceipt(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div ref={receiptRef} className="p-4 text-sm text-black bg-white" dir="rtl" style={{ fontFamily: "'Courier New', monospace" }}>
                            <div style={{ textAlign: "center", marginBottom: "15px" }}>
                                {(restaurant?.receipt_logo_url || restaurant?.logo_url) && (
                                    <img src={restaurant.receipt_logo_url || restaurant.logo_url} alt="Logo" style={{ width: "80px", height: "80px", objectFit: "contain", marginBottom: "10px", marginLeft: "auto", marginRight: "auto", display: "block" }} />
                                )}
                                <p style={{ fontWeight: "bold", fontSize: "22px", margin: "0 0 5px 0" }}>{restaurant?.name || "Restaurant"}</p>
                                {restaurant?.phone && <p style={{ fontSize: "14px", margin: "0 0 5px 0" }} dir="ltr">{restaurant.phone}</p>}
                                {restaurant?.phone_numbers?.map((p, idx) => (
                                    <p key={idx} style={{ fontSize: "14px", margin: "0 0 5px 0" }} dir="ltr">{p.number}</p>
                                ))}
                                {restaurant?.address && <p style={{ fontSize: "14px", margin: "0 0 5px 0" }}>{restaurant.address}</p>}
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
                                                {c.menuItem.title_ar}
                                                {c.menuItem.size_labels && c.menuItem.size_labels.length > 1 ? ` (${c.menuItem.size_labels[c.selectedSizeIdx]})` : ""}
                                            </td>
                                            <td style={{ textAlign: "center", padding: "4px 0", fontSize: "15px", fontWeight: "bold", direction: "rtl" }}>
                                                {c.qty} {c.menuItem.sell_by_weight ? (c.weightUnit || (isAr ? 'كجم' : 'kg')) : ""}
                                            </td>
                                            <td style={{ textAlign: "left", padding: "4px 0", fontSize: "15px", fontWeight: "bold" }}>{formatCurrency(c.unitPrice * c.qty)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ borderTop: "1.5px dashed #000", margin: "12px 0" }} />
                            {lastOrderDiscount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px" }}><span>الخصم</span><span>-{formatCurrency(lastOrderDiscount)}</span></div>}
                            {lastDeliveryFee > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#0891b2" }}><span>🚚 حساب الدليفري {lastDriverName ? `(${lastDriverName})` : ""}</span><span>+{formatCurrency(lastDeliveryFee)}</span></div>}
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "20px", marginTop: "10px" }}><span>الإجمالي</span><span>{formatCurrency(lastOrderTotal)}</span></div>
                            {lastPaymentMethod === "deposit" && lastDepositAmount > 0 && (
                                <>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "bold", color: "#d97706", marginTop: "8px" }}><span>المدفوع (عربون)</span><span>{formatCurrency(lastDepositAmount)}</span></div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "900", color: "#dc2626", marginTop: "4px" }}><span>الباقي</span><span>{formatCurrency(Math.max(0, lastOrderTotal - lastDepositAmount))}</span></div>
                                </>
                            )}
                            <div style={{ borderTop: "1.5px dashed #000", margin: "12px 0" }} />
                            <div style={{ fontSize: "13px", fontWeight: "bold", textAlign: "center" }}>طريقة الدفع: <strong>{lastPaymentMethod === "cash" ? "كاش" : lastPaymentMethod === "deposit" ? "عربون" : lastPaymentMethod}</strong></div>
                            <div style={{ textAlign: "center", fontSize: "13px", marginTop: "20px", fontWeight: "bold" }}><p style={{ margin: 0 }}>شكرا لطلبكم نتمنى ان ينال اعجابكم ❤️</p></div>
                        </div>
                        <div className="p-3 border-t flex gap-2">
                            <button onClick={() => setShowReceipt(false)} className="flex-1 py-2.5 bg-zinc-100 text-slate-400 dark:text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-200 transition">إغلاق</button>
                            <button onClick={printReceipt} className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition"><Printer className="w-3.5 h-3.5" /> طباعة</button>
                        </div>
                    </div>
                </div>
            )}

            {/* WEIGHT MODAL */}
            {weightPrompt && (
                <div className="fixed inset-0 z-[250] bg-slate-300 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
                        <button onClick={() => setWeightPrompt(null)} className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg"><X className="w-5 h-5" /></button>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2 text-center flex items-center justify-center gap-2">⚖️ {isAr ? "الوزن المطلوب" : "Enter Weight"}</h3>
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-6 text-center">{isAr ? weightPrompt.item.title_ar : (weightPrompt.item.title_en || weightPrompt.item.title_ar)}</p>
                        
                        <div className="mb-6 relative">
                            <input 
                                type="number" 
                                autoFocus
                                value={weightInput} 
                                onChange={e => setWeightInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && confirmWeight()}
                                placeholder="0.00" 
                                min="0" 
                                step="0.01"
                                className="w-full text-center text-4xl font-black py-4 bg-slate-100 dark:bg-zinc-900 border-2 border-indigo-200 dark:border-indigo-500/30 rounded-xl text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors tabular-nums"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">{weightPrompt.item.weight_unit || (isAr ? "كجم" : "kg")}</span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 mb-6">
                            {[0.25, 0.5, 1, 1.5].map(w => (
                                <button key={w} onClick={() => setWeightInput(w.toString())} className="py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition active:scale-95 tabular-nums text-sm">
                                    {w}
                                </button>
                            ))}
                        </div>

                        <button onClick={confirmWeight} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-lg rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 transition active:scale-95">
                            {isAr ? "تأكيد وإضافة" : "Confirm"}
                        </button>
                    </div>
                </div>
            )}
            {/* Hidden Iframe for Direct Printing */}
            <iframe
                ref={printFrameRef}
                style={{ position: 'absolute', width: '0px', height: '0px', border: 'none' }}
                title="Print Frame"
            />
            {/* Cashier Shift Report Modal */}
            {showShiftReport && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#131b26] w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-black/20">
                            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-emerald-500" /> 
                                {isAr ? "تقفيل الوردية" : "Shift Report"}
                            </h2>
                            <button onClick={() => setShowShiftReport(false)} className="p-2 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="flex flex-col items-center justify-center pb-5 border-b border-slate-100 dark:border-zinc-800">
                                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-3">
                                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{cashierName.charAt(0)}</span>
                                </div>
                                <span className="font-bold text-sm text-slate-500 dark:text-zinc-400 mb-1">{isAr ? "اسم الكاشير" : "Cashier Name"}</span>
                                <span className="font-black text-2xl text-slate-800 dark:text-white leading-none">{cashierName}</span>
                            </div>

                            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 text-center">
                                <div className="text-[12px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-1.5">{isAr ? "إجمالي التحصيل اليوم" : "Total Collected"}</div>
                                <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(shiftStats.revenue)}</div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                                    <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">{isAr ? "كاش (نقدي ومكتمل)" : "Cash In"}</div>
                                    <div className="text-lg font-black text-slate-800 dark:text-white">{formatCurrency(shiftStats.cash)}</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                                    <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">{isAr ? "مقدم / عربون" : "Deposits In"}</div>
                                    <div className="text-lg font-black text-slate-800 dark:text-white">{formatCurrency(shiftStats.deposit)}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                                    <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">{isAr ? "عدد الطلبات" : "Order Count"}</div>
                                    <div className="text-lg font-black text-slate-800 dark:text-white">{shiftStats.count} {isAr ? "طلب" : "orders"}</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                                    <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">{isAr ? "رسوم الدليفري" : "Delivery Fees"}</div>
                                    <div className="text-lg font-black text-slate-800 dark:text-white">{formatCurrency(shiftStats.delivery)}</div>
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button onClick={() => setShowShiftReport(false)} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-2xl font-black transition-all shadow-lg shadow-indigo-600/20 text-lg flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-5 h-5"/>
                                    {isAr ? "تأكيد واستمرار" : "Acknowledge"}
                                </button>
                                <button onClick={printShiftReport} className="py-4 px-6 bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-200 active:scale-[0.98] text-white dark:text-black rounded-2xl font-black transition-all shadow-lg text-lg flex items-center justify-center gap-2">
                                    <Printer className="w-5 h-5"/>
                                    {isAr ? "طباعة" : "Print"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Modal (Manual Mode) */}
            {printModalHtml && (
                <PrintModal
                    html={printModalHtml}
                    settings={printSettings}
                    isAr={isAr}
                    onClose={() => setPrintModalHtml(null)}
                    onSaveSettings={saveSettings}
                />
            )}
        </div>
    );
}
