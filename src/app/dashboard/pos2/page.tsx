/* eslint-disable @next/next/no-img-element */
"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/helpers/formatters";
import { posDb, generateId, getPosNextOrderNumber, decrementPosStock } from "@/lib/pos-db";
import type { PosCategory, PosMenuItem, PosOrder, PosCustomer, PosStaffUser } from "@/lib/pos-db";
import { pullFromSupabase, pushDirtyToSupabase, subscribeSyncStatus } from "@/lib/sync-service";
import { getPrinterSettings } from "@/lib/helpers/printerSettings";
import { executePrint, triggerCashDrawerIfEnabled } from "@/lib/helpers/printEngine";
import { usePrintSettings } from "@/lib/hooks/usePrintSettings";
import PrintModal from "@/components/PrintModal";
import { renderReceiptHtml, renderShiftReceiptHtml } from "@/lib/helpers/receiptRenderer";
import { useSearchParams, useRouter } from "next/navigation";
import { revertOrderInventory } from "@/lib/helpers/inventoryService";
import { toast } from "sonner";
import Link from "next/link";
import {
    Plus, Minus, Search, X, Printer, Clock, Banknote,
    Users, Volume2, VolumeX, ArrowLeftRight,
    Calendar, CheckSquare, Edit, CheckCircle2
} from "lucide-react";

/* ═══════════════════════════ TYPES ═══════════════════════════ */
type CartItem = {
    menuItem: PosMenuItem;
    qty: number;
    selectedSizeIdx: number;
    unitPrice: number;
    note?: string;
    categoryName?: string;
    weightUnit?: string;
};

type ActiveTab = "menu" | "today_invoices" | "tables" | "delivery" | "takeaway" | "online" | "shifts";
type NumpadTarget = "qty" | "price" | "tendered" | "discount";

/* ═══════════════════════════ COMPONENT ═══════════════════════════ */
export default function POS2ClassicPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const editId = searchParams.get("edit");
    const { language } = useLanguage();
    const { restaurantId, restaurant, canEditOrders, currentUserId, currentUserName } = useRestaurant();
    const isAr = language === "ar";

    /* ── Active Main View Tab ── */
    const [activeTab, setActiveTab] = useState<ActiveTab>("menu");

    /* ── Data state ── */
    const [categories, setCategories] = useState<PosCategory[]>([]);
    const [menuItems, setMenuItems] = useState<PosMenuItem[]>([]);
    const [todayOrders, setTodayOrders] = useState<PosOrder[]>([]);
    const [heldOrders, setHeldOrders] = useState<PosOrder[]>([]);
    const [onlineOrders, setOnlineOrders] = useState<PosOrder[]>([]);
    const [drivers, setDrivers] = useState<PosStaffUser[]>([]);
    const [allCustomers, setAllCustomers] = useState<PosCustomer[]>([]);
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);

    /* ── Order/Cart State (Left Panel) ── */
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCartIdx, setSelectedCartIdx] = useState<number | null>(null);
    const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("takeaway");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [tableNumber, setTableNumber] = useState("");

    /* ── Quick Line Input Fields (Like classic software) ── */
    const [inputPrice, setInputPrice] = useState<string>("");
    const [inputQty, setInputQty] = useState<string>("1");
    const [selectedMenuItem, setSelectedMenuItem] = useState<PosMenuItem | null>(null);
    const [selectedSizeIdx, setSelectedSizeIdx] = useState<number>(0);

    /* ── Calculations & Discount ── */
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [discountPercent, setDiscountPercent] = useState<number>(0);
    const [deliveryFee, setDeliveryFee] = useState<number>(0);
    const [serviceFeePercent, setServiceFeePercent] = useState<number>(0);
    const [tenderedCash, setTenderedCash] = useState<number>(0);

    /* ── Options Checkboxes ── */
    const [printOnSave, setPrintOnSave] = useState<boolean>(true);
    const [printKitchen, setPrintKitchen] = useState<boolean>(false);
    const [addTax, setAddTax] = useState<boolean>(false);
    const taxRate = 14;

    /* ── Customer Info ── */
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [selectedDriver, setSelectedDriver] = useState<string>("");
    const [orderNotes, setOrderNotes] = useState("");
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    /* ── Numpad State ── */
    const [numpadTarget, setNumpadTarget] = useState<NumpadTarget>("qty");
    const [numpadBuffer, setNumpadBuffer] = useState<string>("");

    /* ── Menu & Filter State ── */
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [searchQ, setSearchQ] = useState("");
    const [invoicesFilterType, setInvoicesFilterType] = useState<"all" | "takeaway" | "delivery" | "dine_in">("all");
    const [invoicesFilterPayment, setInvoicesFilterPayment] = useState<string>("all");
    const [invoicesSearchQ, setInvoicesSearchQ] = useState("");

    /* ── State & Metadata ── */
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [originalOrderNumber, setOriginalOrderNumber] = useState<number | null>(null);
    const [originalCreatedAt, setOriginalCreatedAt] = useState<string | null>(null);
    const [cashierId, setCashierId] = useState<string>("");
    const [cashierName, setCashierName] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [soundEnabled, setSoundEnabled] = useState(true);

    /* ── Modals & Printing ── */
    const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);
    const [weightPrompt, setWeightPrompt] = useState<{ item: PosMenuItem, sizeIdx: number } | null>(null);
    const [weightInput, setWeightInput] = useState<string>("");
    const [printModalHtml, setPrintModalHtml] = useState<string | null>(null);
    const [showShiftReport, setShowShiftReport] = useState(false);

    const searchRef = useRef<HTMLInputElement>(null);
    const printFrameRef = useRef<HTMLIFrameElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const { settings: printSettings, saveSettings } = usePrintSettings(restaurantId);

    /* ── Cashier resolution ── */
    useEffect(() => {
        if (currentUserId) {
            setCashierId(currentUserId);
            if (currentUserName) {
                setCashierName(currentUserName);
                return;
            }
        }
        const fetchCashier = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                if (typeof window !== 'undefined') {
                    const offline = localStorage.getItem('offline_session');
                    if (offline) {
                        try {
                            const parsed = JSON.parse(offline);
                            setCashierId(parsed.user?.id || parsed.id || 'offline_cashier');
                            setCashierName(parsed.user?.user_metadata?.name || parsed.name || (isAr ? "كاشير أوفلاين" : "Offline Cashier"));
                            return;
                        } catch {}
                    }
                }
                return;
            }
            setCashierId(session.user.id);
            const { data: team } = await supabase.from('team_members').select('name').eq('auth_id', session.user.id).maybeSingle();
            if (team) {
                setCashierName(team.name);
            } else {
                setCashierName(session.user.user_metadata?.name || restaurant?.name || (isAr ? "المدير (كاشير)" : "Admin Cashier"));
            }
        };
        fetchCashier();
    }, [isAr, currentUserId, currentUserName, restaurant?.name]);

    /* ── Real-time Clock ── */
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    /* ── Beep Sound ── */
    const playBeep = useCallback(() => {
        if (!soundEnabled) return;
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = "sine";
            gain.gain.value = 0.09;
            osc.start();
            osc.stop(ctx.currentTime + 0.06);
        } catch { /* ignore */ }
    }, [soundEnabled]);

    /* ── Load Dexie Data ── */
    const loadData = useCallback(async () => {
        if (!restaurantId) return;

        // Fetch from Dexie
        let cats = await posDb.categories.where("restaurant_id").equals(restaurantId).toArray();
        cats = cats.filter(c => !c.deleted_at);
        cats.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

        let items = await posDb.menu_items.where("restaurant_id").equals(restaurantId).toArray();
        items = items.filter(i => !i.deleted_at);
        items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.title_ar || "").localeCompare(b.title_ar || ""));

        // Fallback to Supabase if Dexie has no categories or items yet and we are online
        if ((cats.length === 0 || items.length === 0) && navigator.onLine) {
            const { data: remoteCats } = await supabase
                .from('categories')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .order('sort_order', { ascending: true })
                .limit(1000);

            if (remoteCats && remoteCats.length > 0) {
                cats = remoteCats.filter(c => !c.deleted_at);
                cats.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                await posDb.categories.bulkPut(remoteCats.map(c => ({ ...c, _dirty: false } as PosCategory)));

                const catIds = remoteCats.map(c => c.id as string);
                if (catIds.length > 0) {
                    const { data: remoteItems } = await supabase
                        .from('items')
                        .select('*')
                        .in('category_id', catIds)
                        .order('sort_order', { ascending: true })
                        .limit(10000);

                    if (remoteItems && remoteItems.length > 0) {
                        items = remoteItems.map(i => ({ ...i, restaurant_id: restaurantId, _dirty: false } as PosMenuItem));
                        await posDb.menu_items.bulkPut(items);
                    }
                }
            }
        }

        setCategories(cats);
        setMenuItems(items.filter(i => i.is_available !== false));

        // Orders filter for today (robust to timezone offsets)
        const isSameDay = (dateStr: string) => {
            const d = new Date(dateStr);
            const now = new Date();
            return d.getFullYear() === now.getFullYear() &&
                   d.getMonth() === now.getMonth() &&
                   d.getDate() === now.getDate();
        };

        const allOrders = await posDb.orders.where("restaurant_id").equals(restaurantId).toArray();
        const validToday = allOrders
            .filter(o => isSameDay(o.created_at) && o.status !== "cancelled" && !o.is_draft)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setTodayOrders(validToday);

        const held = allOrders.filter(o => o.is_draft === true);
        setHeldOrders(held);

        const pendingOnline = allOrders.filter(o => isSameDay(o.created_at) && o.source === "website" && o.status === "pending");
        setOnlineOrders(pendingOnline);

        const driverList = await posDb.pos_users.where("restaurant_id").equals(restaurantId).and(u => u.role === "delivery" && u.is_active !== false).toArray();
        setDrivers(driverList);

        const custs = await posDb.customers.where("restaurant_id").equals(restaurantId).toArray();
        setAllCustomers(custs);
    }, [restaurantId]);

    useEffect(() => {
        if (!restaurantId) return;
        loadData();
        pullFromSupabase(restaurantId).catch(() => {}).finally(() => loadData());
    }, [restaurantId, loadData]);

    useEffect(() => {
        return subscribeSyncStatus(s => {
            setIsOnline(s.isOnline);
            setIsSyncing(s.isSyncing);
            setPendingSyncCount(s.pendingCount);
        });
    }, []);

    /* ── Realtime listener for website orders ── */
    useEffect(() => {
        if (!restaurantId) return;
        const channel = supabase.channel(`pos2-orders-${restaurantId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `restaurant_id=eq.${restaurantId}`
            }, async (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newOrd = payload.new as PosOrder;
                    await posDb.orders.put({ ...newOrd, _dirty: false });
                    if (newOrd.source === 'website' && newOrd.status === 'pending') {
                        setOnlineOrders(prev => {
                            if (prev.some(o => o.id === newOrd.id)) return prev;
                            return [newOrd, ...prev];
                        });
                        playBeep();
                        toast.info(isAr ? `طلب أونلاين جديد #${newOrd.order_number || ''}` : `New Online Order #${newOrd.order_number || ''}`);
                    }
                    loadData();
                } else if (payload.eventType === 'UPDATE') {
                    const updated = payload.new as PosOrder;
                    await posDb.orders.put({ ...updated, _dirty: false });
                    if (updated.source === 'website') {
                        if (updated.status !== 'pending') {
                            setOnlineOrders(prev => prev.filter(o => o.id !== updated.id));
                        } else {
                            setOnlineOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                        }
                    }
                    loadData();
                } else if (payload.eventType === 'DELETE') {
                    const oldOrd = payload.old as { id: string };
                    await posDb.orders.delete(oldOrd.id);
                    setOnlineOrders(prev => prev.filter(o => o.id !== oldOrd.id));
                    loadData();
                }
            }).subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [restaurantId, isAr, playBeep, loadData]);

    /* ── Load existing order for editing if ?edit=... ── */
    useEffect(() => {
        const loadOrderToEdit = async () => {
            if (!editId || !restaurantId || menuItems.length === 0) return;

            if (canEditOrders === false) {
                toast.error(isAr ? "عذراً، تعديل الطلبات محصور فقط بالمدير وصاحب المطعم" : "Editing created orders is restricted to manager and owner");
                router.replace('/dashboard/pos2');
                return;
            }

            if (editingOrderId === editId) return;

            try {
                let order = await posDb.orders.get(editId);
                if (!order) {
                    const { data } = await supabase.from('orders').select('*').eq('id', editId).single();
                    if (data) order = data as PosOrder;
                }

                if (order) {
                    setEditingOrderId(order.id);
                    setOriginalOrderNumber(order.order_number);
                    setOriginalCreatedAt(order.created_at);

                    const restoredItems: CartItem[] = (order.items || []).map(item => {
                        const m = menuItems.find(mm => mm.id === item.id || mm.title_ar === item.title) || {
                            id: item.id || generateId(),
                            restaurant_id: restaurantId,
                            category_id: '',
                            title_ar: item.title,
                            prices: [item.price],
                            is_available: true,
                        } as PosMenuItem;

                        const sIdx = m.size_labels?.indexOf(item.size || '') ?? 0;
                        return {
                            menuItem: m,
                            qty: item.qty || 1,
                            selectedSizeIdx: sIdx >= 0 ? sIdx : 0,
                            unitPrice: item.price,
                            categoryName: item.category,
                            note: item.note,
                            weightUnit: item.weight_unit
                        };
                    });

                    setCart(restoredItems);
                    if (restoredItems.length > 0) setSelectedCartIdx(0);
                    if (order.discount) {
                        if (order.discount_type === 'percent') {
                            setDiscountPercent(order.discount);
                            setDiscountValue(0);
                        } else {
                            setDiscountValue(order.discount);
                            setDiscountPercent(0);
                        }
                    }
                    if (order.delivery_fee) setDeliveryFee(order.delivery_fee);
                    if (order.order_type === 'dine_in' || order.order_type === 'takeaway' || order.order_type === 'delivery') {
                        setOrderType(order.order_type);
                    }
                    if (order.table_id) setTableNumber(order.table_id);
                    if (order.payment_method) setPaymentMethod(order.payment_method);
                    if (order.customer_name) setCustomerName(order.customer_name);
                    if (order.customer_phone) setCustomerPhone(order.customer_phone);
                    if (order.customer_address) setCustomerAddress(order.customer_address);
                    if (order.delivery_driver_id) setSelectedDriver(order.delivery_driver_id);
                    if (order.notes) setOrderNotes(order.notes);

                    toast.info(isAr ? `تم تحميل الفاتورة #${order.order_number} للتعديل` : `Loaded invoice #${order.order_number} for editing`);
                }
            } catch (err) {
                console.error("Failed to load order for editing:", err);
            }
        };

        loadOrderToEdit();
    }, [editId, restaurantId, menuItems, editingOrderId, isAr, canEditOrders, router]);

    /* ── Calculations ── */
    const subtotal = useMemo(() => cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0), [cart]);
    const computedDiscount = useMemo(() => {
        if (discountPercent > 0) return subtotal * (discountPercent / 100);
        return discountValue;
    }, [subtotal, discountPercent, discountValue]);

    const serviceFee = useMemo(() => {
        if (orderType === "dine_in" && serviceFeePercent > 0) {
            return (subtotal - computedDiscount) * (serviceFeePercent / 100);
        }
        return 0;
    }, [orderType, serviceFeePercent, subtotal, computedDiscount]);

    const taxAmount = useMemo(() => {
        if (!addTax) return 0;
        return (subtotal - computedDiscount + serviceFee) * (taxRate / 100);
    }, [addTax, subtotal, computedDiscount, serviceFee, taxRate]);

    const deliveryTotalFee = useMemo(() => {
        return orderType === "delivery" ? deliveryFee : 0;
    }, [orderType, deliveryFee]);

    const total = useMemo(() => {
        return Math.max(0, subtotal - computedDiscount + serviceFee + taxAmount + deliveryTotalFee);
    }, [subtotal, computedDiscount, serviceFee, taxAmount, deliveryTotalFee]);

    const changeDue = useMemo(() => {
        if (tenderedCash <= 0 || paymentMethod !== "cash") return 0;
        return Math.max(0, tenderedCash - total);
    }, [tenderedCash, paymentMethod, total]);

    /* ── Flattened Menu Items for Direct Fast Display ── */
    const flattenedCards = useMemo(() => {
        const filtered = menuItems.filter(item => {
            if (activeCategory !== "all" && item.category_id !== activeCategory) return false;
            if (searchQ) {
                const q = searchQ.toLowerCase().trim();
                const matchTitle = (item.title_ar || "").toLowerCase().includes(q) || (item.title_en || "").toLowerCase().includes(q);
                const matchPrice = (item.prices || []).some(p => p.toString().includes(q));
                return matchTitle || matchPrice;
            }
            return true;
        });

        // Ensure sorted by sort_order
        filtered.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

        const cards: { item: PosMenuItem, sizeIdx: number, title: string, price: number }[] = [];
        filtered.forEach(item => {
            const prices = Array.isArray(item.prices) && item.prices.length > 0 ? item.prices : [0];
            if (prices.length > 1) {
                prices.forEach((p, idx) => {
                    const label = item.size_labels?.[idx] || (idx === 0 ? "صغير" : idx === 1 ? "وسط" : idx === 2 ? "كبير" : `حجم ${idx + 1}`);
                    cards.push({
                        item,
                        sizeIdx: idx,
                        title: `${item.title_ar || item.title_en || ''} (${label})`,
                        price: p
                    });
                });
            } else {
                cards.push({
                    item,
                    sizeIdx: 0,
                    title: item.title_ar || item.title_en || '',
                    price: prices[0] || 0
                });
            }
        });
        return cards;
    }, [menuItems, activeCategory, searchQ]);

    /* ── Cart Operations ── */
    const addItemToCart = useCallback((item: PosMenuItem, sizeIdx: number = 0, specificQty?: number, specificPrice?: number) => {
        const prices = Array.isArray(item.prices) && item.prices.length > 0 ? item.prices : [0];
        const price = specificPrice !== undefined ? specificPrice : (prices[sizeIdx] !== undefined ? prices[sizeIdx] : prices[0]);
        const qty = specificQty !== undefined ? specificQty : (parseFloat(inputQty) || 1);
        const catName = categories.find(c => c.id === item.category_id)?.name_ar || "";
        const weightUnit = item.sell_by_weight ? (item.weight_unit || (isAr ? 'كجم' : 'kg')) : undefined;

        setCart(prev => {
            const idx = prev.findIndex(c => c.menuItem.id === item.id && c.selectedSizeIdx === sizeIdx);
            let nextCart: CartItem[];
            if (idx >= 0) {
                nextCart = prev.map((c, i) => i === idx ? { ...c, qty: c.qty + qty, unitPrice: price } : c);
                setTimeout(() => setSelectedCartIdx(idx), 0);
            } else {
                nextCart = [...prev, { menuItem: item, qty, selectedSizeIdx: sizeIdx, unitPrice: price, categoryName: catName, weightUnit }];
                setTimeout(() => setSelectedCartIdx(nextCart.length - 1), 0);
            }
            return nextCart;
        });

        setInputQty("1");
        setInputPrice(price.toString());
        setSelectedMenuItem(item);
        setSelectedSizeIdx(sizeIdx);
        playBeep();
    }, [inputQty, categories, isAr, playBeep]);

    const handleSelectMenuItem = (item: PosMenuItem, sizeIdx: number = 0) => {
        setSelectedMenuItem(item);
        setSelectedSizeIdx(sizeIdx);
        const prices = Array.isArray(item.prices) && item.prices.length > 0 ? item.prices : [0];
        const p = prices[sizeIdx] !== undefined ? prices[sizeIdx] : prices[0];
        setInputPrice(p.toString());

        if (item.sell_by_weight) {
            setWeightPrompt({ item, sizeIdx });
            setWeightInput("");
        } else {
            addItemToCart(item, sizeIdx);
        }
    };

    const handleAddCurrentInput = () => {
        if (!selectedMenuItem) {
            toast.error(isAr ? "يرجى اختيار صنف من القائمة أولاً" : "Please select an item first");
            return;
        }
        const price = parseFloat(inputPrice) || (selectedMenuItem.prices[selectedSizeIdx] || 0);
        const qty = parseFloat(inputQty) || 1;
        addItemToCart(selectedMenuItem, selectedSizeIdx, qty, price);
    };

    const removeSelectedItem = () => {
        if (selectedCartIdx === null || !cart[selectedCartIdx]) {
            toast.error(isAr ? "يرجى تحديد صنف لحذفه من الفاتورة" : "Select an item to remove");
            return;
        }
        const next = cart.filter((_, i) => i !== selectedCartIdx);
        setCart(next);
        setSelectedCartIdx(next.length > 0 ? Math.max(0, selectedCartIdx - 1) : null);
        if (next.length === 0) {
            setSelectedMenuItem(null);
            setInputPrice("");
            setInputQty("1");
        }
        playBeep();
    };

    const clearCart = () => {
        setCart([]);
        setSelectedCartIdx(null);
        setInputPrice("");
        setInputQty("1");
        setSelectedMenuItem(null);
        setDiscountValue(0);
        setDiscountPercent(0);
        setDeliveryFee(0);
        setServiceFeePercent(0);
        setTenderedCash(0);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setTableNumber("");
        setOrderNotes("");
        setPaymentMethod("cash");
        setNumpadBuffer("");
        setEditingOrderId(null);
        setOriginalOrderNumber(null);
        setOriginalCreatedAt(null);
        if (editId) {
            router.replace('/dashboard/pos2');
        }
    };

    /* ── Customer Phone Auto-fill ── */
    const handlePhoneChange = (phone: string) => {
        setCustomerPhone(phone);
        if (phone.length >= 4) {
            const match = allCustomers.find(c => c.phone.includes(phone) || phone.includes(c.phone));
            if (match) {
                if (!customerName) setCustomerName(match.name);
                if (!customerAddress && match.address) setCustomerAddress(match.address);
            }
        }
    };

    /* ── Numpad Input Handler ── */
    const handleNumpadKey = (val: string) => {
        playBeep();
        if (val === "C") {
            setNumpadBuffer("");
            if (numpadTarget === "qty") {
                setInputQty("1");
                if (selectedCartIdx !== null && cart[selectedCartIdx]) {
                    setCart(prev => prev.map((c, i) => i === selectedCartIdx ? { ...c, qty: 1 } : c));
                }
            } else if (numpadTarget === "price") {
                setInputPrice("");
            } else if (numpadTarget === "tendered") {
                setTenderedCash(0);
            } else if (numpadTarget === "discount") {
                setDiscountValue(0);
                setDiscountPercent(0);
            }
            return;
        }

        if (val === "BACKSPACE") {
            const next = numpadBuffer.length > 1 ? numpadBuffer.slice(0, -1) : "";
            setNumpadBuffer(next);
            applyNumpadValue(next);
            return;
        }

        let next = numpadBuffer;
        if (val === "." && next.includes(".")) return;
        if (val === "00" && (next === "" || next === "0")) next = "0";
        else if (next === "0" && val !== ".") next = val;
        else next = next + val;

        setNumpadBuffer(next);
        applyNumpadValue(next);
    };

    const applyNumpadValue = (valStr: string) => {
        const num = parseFloat(valStr) || 0;
        if (numpadTarget === "qty") {
            setInputQty(valStr || "1");
            if (selectedCartIdx !== null && cart[selectedCartIdx]) {
                const validQty = num > 0 ? num : 1;
                setCart(prev => prev.map((c, i) => i === selectedCartIdx ? { ...c, qty: validQty } : c));
            }
        } else if (numpadTarget === "price") {
            setInputPrice(valStr);
            if (selectedCartIdx !== null && cart[selectedCartIdx] && num > 0) {
                setCart(prev => prev.map((c, i) => i === selectedCartIdx ? { ...c, unitPrice: num } : c));
            }
        } else if (numpadTarget === "tendered") {
            setTenderedCash(num);
            setPaymentMethod("cash");
        } else if (numpadTarget === "discount") {
            setDiscountValue(num);
            setDiscountPercent(0);
        }
    };

    /* ── Submit / Save Order ── */
    const handleSubmitOrder = async (isHold = false) => {
        if (!restaurantId || cart.length === 0 || submitting) return;
        setSubmitting(true);
        try {
            const orderId = editingOrderId || generateId();
            let orderNumber = originalOrderNumber;
            if (!orderNumber) {
                const issued = await getPosNextOrderNumber(restaurantId, restaurant?.starting_order_number || 1);
                if (issued === null) {
                    toast.error(isAr ? 'تعذر الحصول على رقم فاتورة جديد. يرجى إعادة المحاولة.' : 'Could not obtain order number.');
                    setSubmitting(false);
                    return;
                }
                orderNumber = issued;
            }

            if (editingOrderId) {
                if (canEditOrders === false) {
                    toast.error(isAr ? "عذراً، تعديل الفواتير متاح فقط للمدير وصاحب المطعم" : "Editing orders is restricted to manager and owner");
                    setSubmitting(false);
                    return;
                }
                await revertOrderInventory(restaurantId, editingOrderId);
            }

            const items = cart.map(c => ({
                id: c.menuItem.id,
                title: c.menuItem.title_ar,
                qty: c.qty,
                price: c.unitPrice,
                size: c.menuItem.size_labels?.[c.selectedSizeIdx] || undefined,
                category: c.categoryName,
                note: c.note,
                weight_unit: c.weightUnit,
            }));

            const driverObj = selectedDriver ? drivers.find(d => d.id === selectedDriver) : undefined;
            const isAutoApprove = typeof restaurant?.auto_approve_cashier_orders === 'boolean'
                ? restaurant.auto_approve_cashier_orders
                : (typeof window !== 'undefined' && localStorage.getItem(`pos_auto_approve_cashier_${restaurantId}`) === 'true');
            const initialStatus = isHold ? "pending" : (isAutoApprove ? "completed" : "pending");

            const orderRecord: PosOrder = {
                id: orderId,
                restaurant_id: restaurantId,
                order_number: orderNumber,
                items,
                subtotal,
                discount: computedDiscount,
                discount_type: discountPercent > 0 ? "percent" : "fixed",
                total,
                payment_method: paymentMethod,
                customer_name: customerName || undefined,
                customer_phone: customerPhone || undefined,
                customer_address: customerAddress || undefined,
                table_id: tableNumber || undefined,
                delivery_driver_id: selectedDriver || undefined,
                delivery_driver_name: driverObj?.name,
                delivery_fee: deliveryTotalFee || undefined,
                notes: orderNotes || undefined,
                cashier_id: cashierId || undefined,
                cashier_name: cashierName || undefined,
                deposit_amount: paymentMethod === "deposit" ? tenderedCash : 0,
                status: initialStatus,
                is_draft: isHold,
                order_type: orderType,
                source: 'pos',
                created_at: editingOrderId && originalCreatedAt ? originalCreatedAt : new Date().toISOString(),
                updated_at: new Date().toISOString(),
                _dirty: true,
            };

            await posDb.orders.put(orderRecord);

            for (const item of cart) {
                if (item.menuItem.inventory_item_id) {
                    await decrementPosStock(restaurantId, item.menuItem.inventory_item_id, item.qty);
                }
            }

            if (customerName && customerPhone) {
                const existing = await posDb.customers.where("phone").equals(customerPhone).first();
                if (!existing) {
                    await posDb.customers.put({
                        id: generateId(),
                        restaurant_id: restaurantId,
                        name: customerName,
                        phone: customerPhone,
                        address: customerAddress || undefined,
                        created_at: new Date().toISOString(),
                        _dirty: true,
                    });
                }
            }

            if (navigator.onLine) {
                pushDirtyToSupabase(restaurantId).catch(console.error);
            }

            if (isHold) {
                toast.success(isAr ? `تم تعليق الفاتورة #${orderNumber}` : `Invoice #${orderNumber} held`);
            } else {
                setLastOrderNumber(orderNumber);
                const orderData = {
                    order_number: orderNumber,
                    items: cart.map(c => ({
                        title: c.menuItem.title_ar,
                        qty: c.qty,
                        price: c.unitPrice,
                        size: c.menuItem.size_labels?.[c.selectedSizeIdx],
                        category: c.categoryName
                    })),
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    customer_address: customerAddress,
                    table_id: tableNumber,
                    notes: orderNotes,
                    delivery_fee: deliveryTotalFee,
                    delivery_driver_name: driverObj?.name,
                    order_type: orderType,
                    discount: computedDiscount,
                    total: total,
                    payment_method: paymentMethod,
                    deposit_amount: paymentMethod === "deposit" ? tenderedCash : 0,
                    cashier_name: cashierName,
                    created_at: new Date().toISOString()
                };

                if (printOnSave) {
                    const html = renderReceiptHtml(orderData, restaurant, isAr);
                    const currentSettings = getPrinterSettings();
                    executePrint(html, currentSettings, modalHtml => setPrintModalHtml(modalHtml));
                    triggerCashDrawerIfEnabled(currentSettings);
                }
                if (printKitchen) {
                    const kitchenData = { ...orderData, isKitchen: true };
                    const kitchenHtml = renderReceiptHtml(kitchenData, restaurant, isAr);
                    executePrint(kitchenHtml, getPrinterSettings());
                }

                toast.success(isAr ? `تم حفظ الفاتورة #${orderNumber} بنجاح` : `Invoice #${orderNumber} saved`);
            }

            clearCart();
            loadData();
        } catch (err) {
            console.error("Order save error:", err);
            toast.error(isAr ? "حدث خطأ أثناء حفظ الفاتورة" : "Error saving invoice");
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Accept / Confirm Online Order ── */
    const handleAcceptOnlineOrder = async (order: PosOrder) => {
        try {
            const updatedOrder: PosOrder = {
                ...order,
                status: 'in_progress',
                cashier_id: cashierId || undefined,
                cashier_name: cashierName || undefined,
                updated_at: new Date().toISOString(),
                _dirty: true,
            };
            await posDb.orders.put(updatedOrder);
            setOnlineOrders(prev => prev.filter(o => o.id !== order.id));

            if (navigator.onLine) {
                await supabase.from('orders').update({
                    status: 'in_progress',
                    cashier_id: cashierId || null,
                    cashier_name: cashierName || null,
                    updated_at: new Date().toISOString()
                }).eq('id', order.id);
            }

            if (printOnSave) {
                const html = renderReceiptHtml(updatedOrder, restaurant, isAr);
                executePrint(html, getPrinterSettings(), modalHtml => setPrintModalHtml(modalHtml));
            }

            toast.success(isAr ? `تم قبول الطلب الأونلاين #${order.order_number}` : `Accepted online order #${order.order_number}`);
            loadData();
        } catch (err) {
            console.error("Accept online order error:", err);
            toast.error(isAr ? "حدث خطأ أثناء قبول الطلب" : "Error accepting order");
        }
    };

    /* ── Physical Keyboard Bindings ── */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName;
            const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";

            if (e.key === "F2") {
                e.preventDefault();
                clearCart();
                return;
            }
            if (e.key === "F12") {
                e.preventDefault();
                handleSubmitOrder();
                return;
            }
            if (e.key === "Escape") {
                setShowCustomerModal(false);
                setWeightPrompt(null);
                setShowShiftReport(false);
                return;
            }

            if (!isTyping) {
                if (e.key >= "0" && e.key <= "9") {
                    e.preventDefault();
                    handleNumpadKey(e.key);
                } else if (e.key === ".") {
                    e.preventDefault();
                    handleNumpadKey(".");
                } else if (e.key === "Backspace") {
                    e.preventDefault();
                    handleNumpadKey("BACKSPACE");
                } else if (e.key === "c" || e.key === "C") {
                    e.preventDefault();
                    handleNumpadKey("C");
                } else if (e.key === "+") {
                    e.preventDefault();
                    if (selectedCartIdx !== null && cart[selectedCartIdx]) {
                        setCart(prev => prev.map((c, i) => i === selectedCartIdx ? { ...c, qty: c.qty + 1 } : c));
                        playBeep();
                    }
                } else if (e.key === "-") {
                    e.preventDefault();
                    if (selectedCartIdx !== null && cart[selectedCartIdx] && cart[selectedCartIdx].qty > 1) {
                        setCart(prev => prev.map((c, i) => i === selectedCartIdx ? { ...c, qty: c.qty - 1 } : c));
                        playBeep();
                    }
                } else if (e.key === "Delete") {
                    e.preventDefault();
                    removeSelectedItem();
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (cart.length > 0) {
                        handleSubmitOrder();
                    }
                }
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    });

    /* ── Filtered Today Invoices ── */
    const filteredTodayInvoices = useMemo(() => {
        const sourceList = activeTab === "online" ? onlineOrders : todayOrders;
        return sourceList.filter(o => {
            if (activeTab !== "online" && invoicesFilterType !== "all" && o.order_type !== invoicesFilterType) return false;
            if (invoicesFilterPayment !== "all" && o.payment_method !== invoicesFilterPayment) return false;
            if (invoicesSearchQ) {
                const q = invoicesSearchQ.toLowerCase().trim();
                const matchNum = o.order_number.toString().includes(q);
                const matchCust = (o.customer_name || "").toLowerCase().includes(q);
                const matchPhone = (o.customer_phone || "").includes(q);
                if (!matchNum && !matchCust && !matchPhone) return false;
            }
            return true;
        });
    }, [todayOrders, onlineOrders, activeTab, invoicesFilterType, invoicesFilterPayment, invoicesSearchQ]);

    const totalInvoicesSum = useMemo(() => filteredTodayInvoices.reduce((s, o) => s + (o.total || 0), 0), [filteredTodayInvoices]);
    const totalDeliveryFeesSum = useMemo(() => filteredTodayInvoices.reduce((s, o) => s + (o.delivery_fee || 0), 0), [filteredTodayInvoices]);

    /* ── Shift Handover Calculations ── */
    const shiftStats = useMemo(() => {
        const cash = todayOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (o.total || 0), 0);
        const visa = todayOrders.filter(o => o.payment_method === 'visa').reduce((s, o) => s + (o.total || 0), 0);
        const deposit = todayOrders.reduce((s, o) => s + (o.deposit_amount || 0), 0);
        const delivery = todayOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0);
        const totalRev = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
        const websiteCount = todayOrders.filter(o => o.source === 'website').length;
        const websiteRev = todayOrders.filter(o => o.source === 'website').reduce((s, o) => s + (o.total || 0), 0);

        return {
            count: todayOrders.length,
            revenue: totalRev,
            cash,
            visa,
            deposit,
            delivery,
            orderNumbers: todayOrders.map(o => o.order_number),
            posOrders: todayOrders.length - websiteCount,
            posRevenue: totalRev - websiteRev,
            websiteOrders: websiteCount,
            websiteRevenue: websiteRev
        };
    }, [todayOrders]);

    /* ═══════════════════════════ RENDER ═══════════════════════════ */
    return (
        <div className="flex flex-col h-[calc(100vh-84px)] bg-[#c9d4e2] dark:bg-[#0a1017] text-slate-900 dark:text-slate-100 select-none font-sans text-xs border-2 border-[#54799e] dark:border-slate-800 rounded-md shadow-2xl overflow-hidden" dir="rtl">
            
            {/* ═══ 1. CLASSIC DESKTOP WINDOW TITLE BAR ═══ */}
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-gradient-to-r from-[#1b4363] via-[#245780] to-[#1b4363] dark:from-[#0f1e2c] dark:via-[#162d42] dark:to-[#0f1e2c] text-white border-b-2 border-[#0e273c] dark:border-slate-900 shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-wide text-white drop-shadow">
                        مبيعات - كاشير ASN الكلاسيكي ({restaurant?.name || "مطعم"})
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">
                        v2.0 Classic
                    </span>
                    {heldOrders.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-mono">
                            {heldOrders.length} معلقة
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                    {/* Status Light with Manual Sync Click */}
                    <button
                        onClick={async () => {
                            if (!restaurantId || isSyncing) return;
                            setIsSyncing(true);
                            try {
                                await pushDirtyToSupabase(restaurantId);
                                await pullFromSupabase(restaurantId);
                                await loadData();
                                toast.success(isAr ? "تمت المزامنة بنجاح" : "Synced successfully");
                            } catch {
                                toast.error(isAr ? "تعذرت المزامنة" : "Sync failed");
                            } finally {
                                setIsSyncing(false);
                            }
                        }}
                        title={isAr ? "اضغط للمزامنة اليدوية" : "Click to sync now"}
                        className="flex items-center gap-1.5 px-2 py-0.5 bg-black/40 hover:bg-black/60 rounded border border-white/10 font-mono text-[11px] cursor-pointer transition"
                    >
                        <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
                        <span>{isSyncing ? "مزامنة..." : isOnline ? "متصل" : "أوفلاين"}</span>
                        {pendingSyncCount > 0 && <span className="text-amber-300">({pendingSyncCount})</span>}
                    </button>

                    <div className="flex items-center gap-1 text-slate-200">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold">{cashierName || "المدير"}</span>
                    </div>

                    <div className="flex items-center gap-1 font-mono text-cyan-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                    </div>

                    {/* Return to Modern POS */}
                    <Link
                        href="/dashboard/pos"
                        className="px-2 py-0.5 bg-[#316999] hover:bg-[#3d83bd] dark:bg-[#1a3d5e] dark:hover:bg-[#23517c] border border-[#7fb3dd] dark:border-cyan-700 text-white rounded text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                    >
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>النمط العصري</span>
                    </Link>
                </div>
            </div>

            {/* ═══ 2. CLASSIC MENU STRIP ═══ */}
            <div className="flex items-center justify-between px-2 py-1 bg-[#e4ebf3] dark:bg-[#131b26] border-b border-[#a9bad0] dark:border-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={clearCart} className="hover:text-blue-700 dark:hover:text-cyan-300 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition">فاتورة جديدة (F2)</button>
                    <button onClick={() => setActiveTab("menu")} className={`px-1.5 py-0.5 rounded transition ${activeTab === 'menu' ? 'text-blue-800 font-black' : 'hover:text-blue-700'}`}>القائمة والطلب</button>
                    <button onClick={() => setActiveTab("today_invoices")} className={`px-1.5 py-0.5 rounded transition ${activeTab === 'today_invoices' ? 'text-blue-800 font-black' : 'hover:text-blue-700'}`}>فواتير اليوم</button>
                    <button onClick={() => setShowShiftReport(true)} className="hover:text-blue-700 dark:hover:text-cyan-300 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition">تقرير الوردية</button>
                    <button onClick={() => { triggerCashDrawerIfEnabled(getPrinterSettings()); toast.info("تم فتح الدرج"); }} className="hover:text-blue-700 dark:hover:text-cyan-300 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition">فتح الدرج</button>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white">
                        {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">ASN POS System 2026</span>
                </div>
            </div>

            {/* ═══ 3. TOP HORIZONTAL NAVIGATION TABS ═══ */}
            <div className="flex items-center gap-1 px-2 pt-1.5 bg-[#b9cbe0] dark:bg-[#111722] border-b-2 border-[#486e92] dark:border-slate-700 shrink-0 overflow-x-auto hide-scrollbar">
                {[
                    { id: "menu", label: "القائمة والطلب", count: menuItems.length },
                    { id: "today_invoices", label: "فواتير اليوم", count: todayOrders.length },
                    { id: "takeaway", label: "فواتير التيك اواي", count: todayOrders.filter(o => o.order_type === 'takeaway').length },
                    { id: "delivery", label: "فواتير الدليفري", count: todayOrders.filter(o => o.order_type === 'delivery').length },
                    { id: "tables", label: "فواتير الطاولات", count: todayOrders.filter(o => o.order_type === 'dine_in').length },
                    { id: "online", label: "طلبات أون لاين", count: onlineOrders.length },
                ].map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as ActiveTab);
                                if (tab.id === "takeaway") setInvoicesFilterType("takeaway");
                                else if (tab.id === "delivery") setInvoicesFilterType("delivery");
                                else if (tab.id === "tables") setInvoicesFilterType("dine_in");
                                else if (tab.id === "today_invoices") setInvoicesFilterType("all");
                            }}
                            className={`px-3 py-1.5 rounded-t-md font-bold text-xs transition-all border-t-2 border-x-2 shrink-0 ${
                                isActive
                                    ? "bg-white dark:bg-[#182333] text-[#1b4363] dark:text-cyan-300 border-[#486e92] dark:border-cyan-500 shadow font-black -mb-[2px] pb-2 z-10"
                                    : "bg-[#8ea8c4] dark:bg-[#17202d] text-slate-800 dark:text-slate-300 border-[#6c8aa8] dark:border-slate-800 hover:bg-[#a2bad3] dark:hover:bg-[#202c3d]"
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`mr-1 text-[10px] px-1 rounded-full font-mono ${tab.id === 'online' && onlineOrders.length > 0 ? 'bg-violet-600 text-white animate-pulse' : 'bg-black/10 dark:bg-white/10'}`}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ═══ 4. SPLIT SCREEN ═══ */}
            <div className="flex-1 grid grid-cols-12 gap-1.5 p-1.5 min-h-0 bg-[#d8e2ed] dark:bg-[#0c1219] overflow-hidden">
                
                {/* ══════════════════════════════════════════════════════════
                    LEFT PANEL: CLASSIC CURRENT INVOICE (5 COLS)
                ══════════════════════════════════════════════════════════ */}
                <div className="col-span-12 lg:col-span-5 flex flex-col h-full bg-[#f4f7fa] dark:bg-[#111823] border-2 border-[#7693b1] dark:border-slate-800 rounded shadow-md overflow-hidden min-h-0">
                    
                    {/* Top Row: Date, User station, Order Sequence Numbers */}
                    <div className="p-1.5 bg-[#e5ecf5] dark:bg-[#162232] border-b border-[#a8bbd1] dark:border-slate-800 flex items-center justify-between gap-1 text-[11px] shrink-0 font-bold">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-700 dark:text-cyan-400" />
                            <input
                                type="text"
                                readOnly
                                value={new Date().toLocaleDateString("en-GB")}
                                className="w-20 px-1 py-0.5 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 text-center font-mono font-bold text-slate-900 dark:text-cyan-300"
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            <span className="text-slate-600 dark:text-slate-400">الكاشير:</span>
                            <span className="px-2 py-0.5 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 text-blue-900 dark:text-cyan-300 font-bold truncate max-w-[100px]">
                                {cashierName || "مبيعات"}
                            </span>
                        </div>

                        <div className="flex items-center gap-1 font-mono">
                            {editingOrderId ? (
                                <span className="px-1.5 py-0.5 bg-amber-500 text-white font-black rounded animate-pulse">
                                    تعديل #{originalOrderNumber}
                                </span>
                            ) : (
                                <span className="px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-950/70 border border-cyan-400 dark:border-cyan-700 text-cyan-950 dark:text-cyan-200 font-black">
                                    #{lastOrderNumber ? lastOrderNumber + 1 : 1}
                                </span>
                            )}
                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/70 border border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200 font-black">
                                {cart.length} صنف
                            </span>
                        </div>
                    </div>

                    {/* Quick Item Input Row: [السعر] [الكمية] [إضافة] [وزن] [إلغاء صنف] */}
                    <div className="p-1.5 bg-[#dbe5f2] dark:bg-[#151f2c] border-b border-[#a3b8cf] dark:border-slate-800 flex items-center gap-1.5 shrink-0 text-xs font-bold">
                        <div className="flex items-center gap-1 flex-1">
                            <span className="text-slate-700 dark:text-slate-300">السعر:</span>
                            <input
                                type="number"
                                value={inputPrice}
                                onChange={e => {
                                    setInputPrice(e.target.value);
                                    setNumpadTarget("price");
                                    setNumpadBuffer(e.target.value);
                                }}
                                onFocus={() => setNumpadTarget("price")}
                                placeholder="0"
                                className="w-16 px-1 py-1 bg-white dark:bg-[#0c121a] border-2 border-slate-400 dark:border-slate-700 text-center font-black font-mono text-blue-900 dark:text-cyan-300"
                            />
                        </div>

                        <div className="flex items-center gap-1 flex-1">
                            <span className="text-slate-700 dark:text-slate-300">الكمية:</span>
                            <input
                                type="number"
                                value={inputQty}
                                onChange={e => {
                                    setInputQty(e.target.value);
                                    setNumpadTarget("qty");
                                    setNumpadBuffer(e.target.value);
                                }}
                                onFocus={() => setNumpadTarget("qty")}
                                placeholder="1"
                                className="w-14 px-1 py-1 bg-white dark:bg-[#0c121a] border-2 border-slate-400 dark:border-slate-700 text-center font-black font-mono text-slate-900 dark:text-white"
                            />
                        </div>

                        <button
                            onClick={handleAddCurrentInput}
                            className="px-2.5 py-1 bg-[#1e5885] hover:bg-[#256ea6] dark:bg-[#1a4a6e] dark:hover:bg-[#246291] text-white border border-[#0d3452] dark:border-cyan-800 font-black rounded shadow-sm text-[11px] active:scale-95 transition"
                        >
                            إضافة للفاتورة
                        </button>

                        <button
                            onClick={() => {
                                if (selectedMenuItem) {
                                    setWeightPrompt({ item: selectedMenuItem, sizeIdx: selectedSizeIdx });
                                } else {
                                    toast.info(isAr ? "اختر صنفاً أولاً" : "Select item first");
                                }
                            }}
                            className="px-2 py-1 bg-[#476882] hover:bg-[#5881a2] dark:bg-[#2d4253] dark:hover:bg-[#3d5970] text-white border border-[#2d4457] dark:border-slate-700 font-bold rounded text-[11px] active:scale-95 transition"
                        >
                            وزن
                        </button>

                        <button
                            onClick={removeSelectedItem}
                            className="px-2 py-1 bg-[#a33939] hover:bg-[#c24444] dark:bg-[#7a2828] dark:hover:bg-[#9c3333] text-white border border-[#6b2222] dark:border-red-900 font-bold rounded text-[11px] active:scale-95 transition"
                        >
                            إلغاء صنف
                        </button>
                    </div>

                    {/* Middle: Order Type Selector + INVOICE ITEMS SPREADSHEET TABLE */}
                    <div className="flex-1 flex min-h-0 bg-white dark:bg-[#0d141e]">
                        {/* Vertical Order Type Selector Bar (صالة | دليفري | تيك أواي) */}
                        <div className="w-16 bg-[#c5d5e7] dark:bg-[#16212e] border-l-2 border-[#839cb5] dark:border-slate-800 flex flex-col p-1 gap-1 shrink-0">
                            {[
                                { key: "dine_in", label: "صالة" },
                                { key: "takeaway", label: "تيك أواي" },
                                { key: "delivery", label: "دليفري" },
                            ].map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setOrderType(t.key as "dine_in" | "takeaway" | "delivery")}
                                    className={`flex-1 flex items-center justify-center font-black text-xs rounded transition-all border shadow-sm ${
                                        orderType === t.key
                                            ? "bg-[#18486e] dark:bg-cyan-600 text-white border-[#0c283f] dark:border-cyan-400 ring-2 ring-cyan-400"
                                            : "bg-[#e5ecf5] dark:bg-[#1c293a] text-slate-700 dark:text-slate-300 border-[#9bb1c7] dark:border-slate-700 hover:bg-[#d0deee] dark:hover:bg-[#24354b]"
                                    }`}
                                    style={{ writingMode: "vertical-rl" }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Invoice Items Spreadsheet Table */}
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-300 dark:divide-slate-800 min-h-0 bg-[#eef3f8] dark:bg-[#111822]">
                            <table className="w-full border-collapse text-right text-xs">
                                <thead className="bg-[#cbdcf0] dark:bg-[#182638] text-slate-800 dark:text-slate-200 border-b-2 border-[#839cb5] dark:border-slate-700 sticky top-0 font-black shadow-sm">
                                    <tr>
                                        <th className="p-1.5 border-l border-[#9cb3cc] dark:border-slate-700">اسم الصنف</th>
                                        <th className="p-1.5 border-l border-[#9cb3cc] dark:border-slate-700 text-center w-12">العدد</th>
                                        <th className="p-1.5 border-l border-[#9cb3cc] dark:border-slate-700 text-center w-14">السعر</th>
                                        <th className="p-1.5 text-center w-16">الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-slate-400 dark:text-slate-600 font-bold">
                                                الفاتورة فارغة — اضغط على الأصناف في القائمة لإضافتها
                                            </td>
                                        </tr>
                                    ) : (
                                        cart.map((c, i) => {
                                            const isSelected = selectedCartIdx === i;
                                            return (
                                                <tr
                                                    key={i}
                                                    onClick={() => {
                                                        setSelectedCartIdx(i);
                                                        setSelectedMenuItem(c.menuItem);
                                                        setSelectedSizeIdx(c.selectedSizeIdx);
                                                        setInputPrice(c.unitPrice.toString());
                                                        setInputQty(c.qty.toString());
                                                        setNumpadTarget("qty");
                                                        setNumpadBuffer(c.qty.toString());
                                                    }}
                                                    className={`cursor-pointer transition-colors border-b border-slate-300 dark:border-slate-800 ${
                                                        isSelected
                                                            ? "bg-[#b8d6f5] dark:bg-[#1d3550] text-[#0a2f55] dark:text-cyan-200 font-bold border-l-4 border-l-cyan-500"
                                                            : i % 2 === 0
                                                                ? "bg-white dark:bg-[#0e1520] text-slate-900 dark:text-slate-100"
                                                                : "bg-[#eaf1f8] dark:bg-[#131b26] text-slate-900 dark:text-slate-100"
                                                    }`}
                                                >
                                                    <td className="p-1.5 border-l border-slate-300 dark:border-slate-800 font-bold truncate max-w-[130px]">
                                                        {c.menuItem.title_ar || c.menuItem.title_en}
                                                        {c.menuItem.size_labels && c.menuItem.size_labels.length > 1 && (
                                                            <span className="text-[10px] text-blue-600 dark:text-cyan-400 mr-1 font-mono">
                                                                ({c.menuItem.size_labels[c.selectedSizeIdx]})
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-1.5 border-l border-slate-300 dark:border-slate-800 text-center font-mono font-bold">
                                                        {c.qty}
                                                    </td>
                                                    <td className="p-1.5 border-l border-slate-300 dark:border-slate-800 text-center font-mono">
                                                        {c.unitPrice}
                                                    </td>
                                                    <td className="p-1.5 text-center font-mono font-black text-blue-900 dark:text-emerald-400">
                                                        {c.unitPrice * c.qty}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Invoice Calculations & Checkboxes Panel */}
                    <div className="p-2 bg-[#d7e3f1] dark:bg-[#16212e] border-t-2 border-[#839cb5] dark:border-slate-800 shrink-0 text-xs space-y-1.5">
                        <div className="grid grid-cols-12 gap-2 items-center">
                            
                            {/* Left Calculations Box */}
                            <div className="col-span-7 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 p-1.5 space-y-1 font-mono font-bold">
                                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="font-sans font-bold">الإجمالي:</span>
                                    <span className="text-sm font-black">{subtotal}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="font-sans">الخصم:</span>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={discountValue || ""}
                                            onChange={e => {
                                                setDiscountValue(Number(e.target.value));
                                                setDiscountPercent(0);
                                                setNumpadTarget("discount");
                                            }}
                                            onFocus={() => setNumpadTarget("discount")}
                                            placeholder="0"
                                            className="w-12 px-1 py-0.5 bg-slate-100 dark:bg-[#151f2b] border border-slate-400 dark:border-slate-700 text-center text-xs font-black text-rose-600 dark:text-rose-400"
                                        />
                                        <span className="text-[10px]">ج.م</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-slate-900 dark:text-white pt-0.5 border-t border-slate-300 dark:border-slate-800">
                                    <span className="font-sans font-black text-blue-900 dark:text-cyan-400">الصافي:</span>
                                    <span className="text-base font-black text-blue-900 dark:text-cyan-400">{total}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                                    <span className="font-sans">المدفوع:</span>
                                    <input
                                        type="number"
                                        value={tenderedCash || ""}
                                        onChange={e => {
                                            setTenderedCash(Number(e.target.value));
                                            setNumpadTarget("tendered");
                                        }}
                                        onFocus={() => setNumpadTarget("tendered")}
                                        placeholder="0"
                                        className="w-16 px-1 py-0.5 bg-emerald-50 dark:bg-[#0f241a] border border-emerald-500 dark:border-emerald-600 text-center font-black text-emerald-800 dark:text-emerald-400"
                                    />
                                </div>
                                <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 pt-0.5 border-t border-slate-300 dark:border-slate-800">
                                    <span className="font-sans font-black">الباقي:</span>
                                    <span className="text-base font-black font-mono">{changeDue}</span>
                                </div>
                            </div>

                            {/* Right Settings & Checkboxes Box */}
                            <div className="col-span-5 space-y-1 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={printOnSave}
                                        onChange={e => setPrintOnSave(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-blue-600 dark:bg-[#0c121a] dark:border-slate-700"
                                    />
                                    <span>طباعة مع الحفظ</span>
                                </label>

                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={printKitchen}
                                        onChange={e => setPrintKitchen(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-blue-600 dark:bg-[#0c121a] dark:border-slate-700"
                                    />
                                    <span>طباعة المطبخ</span>
                                </label>

                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={addTax}
                                        onChange={e => setAddTax(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-blue-600 dark:bg-[#0c121a] dark:border-slate-700"
                                    />
                                    <span>ضريبة ({taxRate}%)</span>
                                </label>

                                {orderType === "dine_in" && (
                                    <div className="flex items-center gap-1">
                                        <span>رقم الطاولة:</span>
                                        <input
                                            type="text"
                                            value={tableNumber}
                                            onChange={e => setTableNumber(e.target.value)}
                                            placeholder="طاولة..."
                                            className="w-12 px-1 py-0.5 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 text-center font-bold text-slate-900 dark:text-white"
                                        />
                                    </div>
                                )}

                                {orderType === "delivery" && (
                                    <div className="flex items-center gap-1">
                                        <span>خدمة توصيل:</span>
                                        <input
                                            type="number"
                                            value={deliveryFee || ""}
                                            onChange={e => setDeliveryFee(Number(e.target.value))}
                                            placeholder="0"
                                            className="w-12 px-1 py-0.5 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 text-center font-bold text-slate-900 dark:text-white"
                                        />
                                    </div>
                                )}

                                <div className="flex items-center gap-1">
                                    <span>طريقة الدفع:</span>
                                    <select
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                        className="px-1 py-0.5 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 text-[11px] font-bold text-slate-900 dark:text-white"
                                    >
                                        <option value="cash">نقدي</option>
                                        <option value="visa">فيزا</option>
                                        <option value="deposit">عربون</option>
                                    </select>
                                </div>

                                <button
                                    onClick={() => setShowCustomerModal(true)}
                                    className="w-full py-1 bg-slate-200 hover:bg-slate-300 dark:bg-[#182332] dark:hover:bg-[#202f43] border border-slate-400 dark:border-slate-700 rounded text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate transition"
                                >
                                    {customerName || customerPhone ? `👤 ${customerName || customerPhone}` : "بيانات العميل"}
                                </button>
                            </div>
                        </div>

                        {/* Big Bottom Action Buttons */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                            <button
                                onClick={clearCart}
                                className="py-2.5 bg-[#2b6cb0] hover:bg-[#3182ce] dark:bg-[#1b4b7a] dark:hover:bg-[#235f9a] text-white font-black rounded border-2 border-[#1a4971] dark:border-slate-700 text-xs shadow active:scale-95 transition"
                            >
                                جديد (F2)
                            </button>

                            <button
                                onClick={() => handleSubmitOrder(false)}
                                disabled={cart.length === 0 || submitting}
                                className="col-span-2 py-2.5 bg-[#0d826a] hover:bg-[#0f9b7e] dark:bg-[#0c735d] dark:hover:bg-[#0f8c72] text-white font-black rounded border-2 border-[#065041] dark:border-emerald-700 text-sm shadow-md active:scale-95 transition disabled:opacity-50"
                            >
                                {submitting ? "جاري الحفظ..." : "حفظ وطباعة (F12)"}
                            </button>

                            <button
                                onClick={removeSelectedItem}
                                className="py-2.5 bg-[#c53030] hover:bg-[#e53e3e] dark:bg-[#852222] dark:hover:bg-[#a32a2a] text-white font-black rounded border-2 border-[#742a2a] dark:border-red-900 text-xs shadow active:scale-95 transition"
                            >
                                حذف صنف
                            </button>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    RIGHT PANEL: WORKSPACE (MENU / TODAY INVOICES / NUMPAD) (7 COLS)
                ══════════════════════════════════════════════════════════ */}
                <div className="col-span-12 lg:col-span-7 flex flex-col h-full bg-[#f4f7fa] dark:bg-[#111823] border-2 border-[#7693b1] dark:border-slate-800 rounded shadow-md overflow-hidden min-h-0">
                    
                    {/* ═══ VIEW A: MENU & TACTILE NUMPAD (WHEN activeTab === "menu") ═══ */}
                    {activeTab === "menu" && (
                        <div className="flex-1 flex flex-col min-h-0 p-1.5 space-y-1.5">
                            
                            {/* Top Search & Filter Bar */}
                            <div className="flex items-center gap-2 p-1.5 bg-[#e5ecf5] dark:bg-[#151f2c] border border-[#a8bbd1] dark:border-slate-800 rounded shrink-0">
                                <div className="relative flex-1">
                                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        ref={searchRef}
                                        value={searchQ}
                                        onChange={e => setSearchQ(e.target.value)}
                                        placeholder="بحث عن صنف بالاسم أو السعر..."
                                        className="w-full pr-8 pl-2 py-1.5 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-cyan-500"
                                    />
                                    {searchQ && (
                                        <button onClick={() => setSearchQ("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={() => setActiveCategory("all")}
                                    className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${
                                        activeCategory === "all"
                                            ? "bg-[#18486e] dark:bg-cyan-600 text-white font-black border-[#0c283f] dark:border-cyan-400 shadow-sm"
                                            : "bg-white dark:bg-[#182332] text-slate-700 dark:text-slate-300 border-slate-400 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#202f43]"
                                    }`}
                                >
                                    الكل ({menuItems.length})
                                </button>
                            </div>

                            {/* Categories Horizontal Buttons Strip */}
                            <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar shrink-0 py-0.5">
                                {categories.map(cat => {
                                    const count = menuItems.filter(i => i.category_id === cat.id).length;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={`px-3 py-1.5 rounded font-bold text-xs shrink-0 border transition-all flex items-center gap-1 ${
                                                activeCategory === cat.id
                                                    ? "bg-[#18486e] dark:bg-cyan-600 text-white border-[#0c283f] dark:border-cyan-400 shadow font-black"
                                                    : "bg-[#e5ecf5] dark:bg-[#172230] text-slate-700 dark:text-slate-200 border-[#9bb1c7] dark:border-slate-700 hover:bg-[#d0deee] dark:hover:bg-[#202e40]"
                                            }`}
                                        >
                                            {cat.emoji && <span>{cat.emoji}</span>}
                                            <span>{cat.name_ar || cat.name_en}</span>
                                            <span className="text-[10px] opacity-75 font-mono">({count})</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Middle Split: Product Buttons Grid (Left) + Tactile POS Numpad (Right) */}
                            <div className="flex-1 grid grid-cols-12 gap-1.5 min-h-0">
                                
                                {/* Product Tiles Grid (8 Cols) */}
                                <div className="col-span-12 md:col-span-8 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 content-start min-h-0 p-1 bg-[#eaf1f8] dark:bg-[#0d141e] border border-slate-300 dark:border-slate-800 rounded">
                                    {flattenedCards.length === 0 ? (
                                        <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-600 font-bold">
                                            {searchQ ? "لا توجد أصناف مطابقة للبحث" : "لا توجد أصناف متاحة في هذا القسم حالياً"}
                                        </div>
                                    ) : (
                                        flattenedCards.map(({ item, sizeIdx, title, price }, cardIdx) => {
                                            const isItemSelected = selectedMenuItem?.id === item.id && selectedSizeIdx === sizeIdx;
                                            return (
                                                <button
                                                    key={`${item.id}-${sizeIdx}-${cardIdx}`}
                                                    onClick={() => handleSelectMenuItem(item, sizeIdx)}
                                                    className={`rounded-lg border-2 transition-all flex flex-col justify-between overflow-hidden active:scale-95 cursor-pointer shadow-sm min-h-[90px] xl:min-h-[105px] ${
                                                        isItemSelected
                                                            ? "bg-[#c1e0fc] dark:bg-[#1a385c] border-[#18486e] dark:border-cyan-400 ring-2 ring-cyan-400/40"
                                                            : "bg-white dark:bg-[#15202e] border-[#9bb1c7] dark:border-slate-700 hover:border-blue-500 hover:dark:border-cyan-500 hover:bg-[#f3f8fd] dark:hover:bg-[#1c2a3d]"
                                                    }`}
                                                >
                                                    {/* ONLY Item Title (Big, bold, crisp font) */}
                                                    <div className="flex-1 flex items-center justify-center p-2.5 text-center">
                                                        <span className="font-black text-sm xl:text-base leading-snug text-slate-900 dark:text-slate-100 line-clamp-2">
                                                            {title}
                                                        </span>
                                                    </div>

                                                    {/* ONLY Price (Big, bold, high-contrast font) */}
                                                    <div className="w-full py-1.5 bg-[#eaf1f8] dark:bg-[#0c131c] border-t border-slate-200 dark:border-slate-800 flex justify-center items-center">
                                                        <span className="font-black text-sm xl:text-base font-mono text-emerald-700 dark:text-emerald-400 tracking-tight">
                                                            {formatCurrency(price)}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Tactile Classic Numpad (4 Cols) */}
                                <div className="col-span-12 md:col-span-4 bg-[#e5ecf5] dark:bg-[#141d28] border-2 border-[#7693b1] dark:border-slate-800 rounded p-1.5 flex flex-col justify-between shadow-inner">
                                    <div>
                                        {/* Numpad Display & Target Selector */}
                                        <div className="mb-1 text-center">
                                            <div className="grid grid-cols-4 gap-0.5 mb-1 bg-slate-300 dark:bg-black p-0.5 rounded text-[10px] font-bold">
                                                {[
                                                    { id: "qty", label: "الكمية" },
                                                    { id: "price", label: "السعر" },
                                                    { id: "tendered", label: "المدفوع" },
                                                    { id: "discount", label: "خصم" },
                                                ].map(m => (
                                                    <button
                                                        key={m.id}
                                                        onClick={() => {
                                                            setNumpadTarget(m.id as NumpadTarget);
                                                            setNumpadBuffer("");
                                                        }}
                                                        className={`py-1 rounded transition-colors ${numpadTarget === m.id ? "bg-[#18486e] dark:bg-cyan-600 text-white font-black" : "text-slate-700 dark:text-slate-300"}`}
                                                    >
                                                        {m.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Digital Display */}
                                            <div className="px-2 py-1.5 bg-black text-emerald-400 font-mono font-black text-xl rounded text-left border border-slate-700 truncate shadow-inner tracking-wider">
                                                {numpadBuffer || "0"}
                                            </div>
                                        </div>

                                        {/* Quick Cash Buttons */}
                                        <div className="grid grid-cols-4 gap-1 mb-1 text-[10px] font-bold font-mono">
                                            <button onClick={() => { setNumpadTarget("tendered"); setTenderedCash(total); setNumpadBuffer(total.toString()); }} className="py-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded font-sans font-black">بالضبط</button>
                                            <button onClick={() => { setNumpadTarget("tendered"); setTenderedCash(50); setNumpadBuffer("50"); }} className="py-1 bg-white dark:bg-[#1b2737] border border-slate-400 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded font-black">+50</button>
                                            <button onClick={() => { setNumpadTarget("tendered"); setTenderedCash(100); setNumpadBuffer("100"); }} className="py-1 bg-white dark:bg-[#1b2737] border border-slate-400 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded font-black">+100</button>
                                            <button onClick={() => { setNumpadTarget("tendered"); setTenderedCash(200); setNumpadBuffer("200"); }} className="py-1 bg-white dark:bg-[#1b2737] border border-slate-400 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded font-black">+200</button>
                                        </div>

                                        {/* Classic Keypad 4x4 Grid */}
                                        <div className="grid grid-cols-4 gap-1 font-mono text-sm font-black">
                                            <button onClick={() => handleNumpadKey("7")} className="py-2.5 bg-white dark:bg-[#1b2737] hover:bg-slate-100 dark:hover:bg-[#233347] text-slate-900 dark:text-white rounded border border-slate-400 dark:border-slate-700 active:scale-95 shadow-sm">7</button>
                                            <button onClick={() => handleNumpadKey("8")} className="py-2.5 bg-white dark:bg-[#1b2737] hover:bg-slate-100 dark:hover:bg-[#233347] text-slate-900 dark:text-white rounded border border-slate-400 dark:border-slate-700 active:scale-95 shadow-sm">8</button>
                                            <button onClick={() => handleNumpadKey("9")} className="py-2.5 bg-white dark:bg-[#1b2737] hover:bg-slate-100 dark:hover:bg-[#233347] text-slate-900 dark:text-white rounded border border-slate-400 dark:border-slate-700 active:scale-95 shadow-sm">9</button>
                                            <button onClick={() => { if (selectedCartIdx !== null && cart[selectedCartIdx]) setCart(prev => prev.map((c, i) => i === selectedCartIdx ? { ...c, qty: c.qty + 1 } : c)); }} className="py-2.5 bg-[#8da5be] hover:bg-[#a1b8d0] dark:bg-[#25364b] dark:hover:bg-[#314763] rounded border border-[#647c94] dark:border-slate-700 text-slate-900 dark:text-cyan-200 active:scale-95 shadow-sm flex items-center justify-center font-bold">
                                                <Plus className="w-4 h-4" />
                                            </button>

                                            <button onClick={() => handleNumpadKey("4")} className="py-2.5 bg-white dark:bg-[#1b2737] hover:bg-slate-100 dark:hover:bg-[#233347] text-slate-900 dark:text-white rounded border border-slate-400 dark:border-slate-700 active:scale-95 shadow-sm">4</button>
                                            <button onClick={() => handleNumpadKey("5")} className="py-2.5 bg-white dark:bg-[#1b2737] hover:bg-slate-100 dark:hover:bg-[#233347] text-slate-900 dark:text-white rounded border border-slate-400 dark:border-slate-700 active:scale-95 shadow-sm">5</button>
                                            <button onClick={() => handleNumpadKey("6")} className="py-2.5 bg-white dark:bg-[#1b2737] hover:bg-slate-100 dark:hover:bg-[#233347] text-slate-900 dark:text-white rounded border border-slate-400 dark:border-slate-700 active:scale-95 shadow-sm">6</button>
                                            <button onClick={() => { if (selectedCartIdx !== null && cart[selectedCartIdx] && cart[selectedCartIdx].qty > 1) setCart(prev => prev.map((c, i) => i === selectedCartIdx ? { ...c, qty: c.qty - 1 } : c)); }} className="py-2.5 bg-[#8da5be] hover:bg-[#a1b8d0] dark:bg-[#25364b] dark:hover:bg-[#314763] rounded border border-[#647c94] dark:border-slate-700 text-slate-900 dark:text-cyan-200 active:scale-95 shadow-sm flex items-center justify-center font-bold">
                                                <Minus className="w-4 h-4" />
                                            </button>

                                            <button onClick={() => handleNumpadKey("1")} className="py-2.5 bg-white dark:bg-[#1b2737] hover:bg-slate-100 dark:hover:bg-[#233347] text-slate-900 dark:text-white rounded border border-slate-400 dark:border-slate-700 active:scale-95 shadow-sm">1</button>
                                            <button onClick={() => handleNumpadKey("2")} className="py-2.5 bg-white dark:bg-[#1b2737] hover:bg-slate-100 dark:hover:bg-[#233347] text-slate-900 dark:text-white rounded border border-slate-400 dark:border-slate-700 active:scale-95 shadow-sm">2</button>
                                            <button onClick={() => handleNumpadKey("3")} className="py-2.5 bg-white dark:bg-[#1b2737] hover:bg-slate-100 dark:hover:bg-[#233347] text-slate-900 dark:text-white rounded border border-slate-400 dark:border-slate-700 active:scale-95 shadow-sm">3</button>
                                            <button onClick={() => handleNumpadKey("BACKSPACE")} className="py-2.5 bg-[#e08b8b] hover:bg-[#ec9e9e] dark:bg-[#522226] dark:hover:bg-[#692a30] rounded border border-[#b46565] dark:border-red-900 text-red-950 dark:text-red-200 active:scale-95 shadow-sm flex items-center justify-center">
                                                <span className="font-sans font-bold text-xs">← مسح</span>
                                            </button>

                                            <button onClick={() => handleNumpadKey("C")} className="py-2.5 bg-[#6c859e] hover:bg-[#7e99b4] dark:bg-[#2c3d52] dark:hover:bg-[#384d66] text-white rounded border border-[#4d6379] dark:border-slate-700 active:scale-95 shadow-sm">C</button>
                                            <button onClick={() => handleNumpadKey("0")} className="py-2.5 bg-white dark:bg-[#1b2737] hover:bg-slate-100 dark:hover:bg-[#233347] text-slate-900 dark:text-white rounded border border-slate-400 dark:border-slate-700 active:scale-95 shadow-sm">0</button>
                                            <button onClick={() => handleNumpadKey("00")} className="py-2.5 bg-white dark:bg-[#1b2737] hover:bg-slate-100 dark:hover:bg-[#233347] text-slate-900 dark:text-white rounded border border-slate-400 dark:border-slate-700 active:scale-95 shadow-sm">00</button>
                                            <button onClick={() => handleNumpadKey(".")} className="py-2.5 bg-white dark:bg-[#1b2737] hover:bg-slate-100 dark:hover:bg-[#233347] text-slate-900 dark:text-white rounded border border-slate-400 dark:border-slate-700 active:scale-95 shadow-sm">.</button>
                                        </div>
                                    </div>

                                    {/* Direct Enter & Pay Button */}
                                    <button
                                        onClick={() => handleSubmitOrder(false)}
                                        disabled={cart.length === 0 || submitting}
                                        className="w-full mt-2 py-2.5 bg-[#0d826a] hover:bg-[#0f9b7e] dark:bg-[#0c735d] dark:hover:bg-[#0f8c72] text-white font-black rounded border-2 border-[#065041] dark:border-emerald-700 text-xs shadow-md active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    >
                                        <CheckSquare className="w-4 h-4" />
                                        <span>تنفيذ الفاتورة (ENTER)</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ VIEW B: TODAY'S INVOICES TABLE ═══ */}
                    {activeTab !== "menu" && (
                        <div className="flex-1 flex flex-col min-h-0 p-1.5 space-y-1.5">
                            
                            {/* Filter and Search Bar */}
                            <div className="p-1.5 bg-[#dbe5f2] dark:bg-[#151f2c] border-2 border-[#8da5bf] dark:border-slate-800 rounded flex items-center justify-between gap-1.5 text-xs font-bold shrink-0 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-slate-800 dark:text-slate-200">عرض الفواتير:</span>
                                    <button
                                        onClick={() => { setActiveTab("today_invoices"); setInvoicesFilterType("all"); }}
                                        className={`px-3 py-1 rounded border transition-colors ${activeTab === "today_invoices" && invoicesFilterType === "all" ? "bg-[#18486e] dark:bg-cyan-600 text-white font-black border-[#0c283f] dark:border-cyan-400" : "bg-white dark:bg-[#182332] border-slate-400 dark:border-slate-700 text-slate-700 dark:text-slate-300"}`}
                                    >
                                        كل الفواتير
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab("takeaway"); setInvoicesFilterType("takeaway"); }}
                                        className={`px-3 py-1 rounded border transition-colors ${activeTab === "takeaway" || invoicesFilterType === "takeaway" ? "bg-[#18486e] dark:bg-cyan-600 text-white font-black border-[#0c283f] dark:border-cyan-400" : "bg-white dark:bg-[#182332] border-slate-400 dark:border-slate-700 text-slate-700 dark:text-slate-300"}`}
                                    >
                                        فواتير التك اواي
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab("delivery"); setInvoicesFilterType("delivery"); }}
                                        className={`px-3 py-1 rounded border transition-colors ${activeTab === "delivery" || invoicesFilterType === "delivery" ? "bg-[#18486e] dark:bg-cyan-600 text-white font-black border-[#0c283f] dark:border-cyan-400" : "bg-white dark:bg-[#182332] border-slate-400 dark:border-slate-700 text-slate-700 dark:text-slate-300"}`}
                                    >
                                        فواتير الدليفرى
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab("tables"); setInvoicesFilterType("dine_in"); }}
                                        className={`px-3 py-1 rounded border transition-colors ${activeTab === "tables" || invoicesFilterType === "dine_in" ? "bg-[#18486e] dark:bg-cyan-600 text-white font-black border-[#0c283f] dark:border-cyan-400" : "bg-white dark:bg-[#182332] border-slate-400 dark:border-slate-700 text-slate-700 dark:text-slate-300"}`}
                                    >
                                        فواتير الصالة
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("online")}
                                        className={`px-3 py-1 rounded border transition-colors ${activeTab === "online" ? "bg-violet-700 text-white font-black border-violet-900" : "bg-white dark:bg-[#182332] border-slate-400 dark:border-slate-700 text-violet-700 dark:text-violet-300"}`}
                                    >
                                        طلبات الأونلاين ({onlineOrders.length})
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-slate-800 dark:text-slate-200">نوع الدفع:</span>
                                    <select
                                        value={invoicesFilterPayment}
                                        onChange={e => setInvoicesFilterPayment(e.target.value)}
                                        className="px-2 py-1 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                                    >
                                        <option value="all">كل طرق الدفع</option>
                                        <option value="cash">نقدي</option>
                                        <option value="visa">فيزا</option>
                                        <option value="deposit">عربون</option>
                                    </select>

                                    <input
                                        type="text"
                                        value={invoicesSearchQ}
                                        onChange={e => setInvoicesSearchQ(e.target.value)}
                                        placeholder="بحث برقم الفاتورة أو العميل..."
                                        className="w-48 px-2 py-1 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Invoices Spreadsheet Table */}
                            <div className="flex-1 overflow-y-auto border-2 border-[#8da5bf] dark:border-slate-800 rounded bg-white dark:bg-[#0d141e] min-h-0">
                                <table className="w-full border-collapse text-right text-xs">
                                    <thead className="bg-[#cbdcf0] dark:bg-[#182638] text-slate-900 dark:text-slate-100 border-b-2 border-[#7693b1] dark:border-slate-700 sticky top-0 font-black shadow-sm">
                                        <tr>
                                            <th className="p-2 border-l border-[#9cb3cc] dark:border-slate-700 text-center w-20">رقم_الفاتورة</th>
                                            <th className="p-2 border-l border-[#9cb3cc] dark:border-slate-700 text-center w-24">النوع</th>
                                            <th className="p-2 border-l border-[#9cb3cc] dark:border-slate-700 text-center w-24">الإجمالي</th>
                                            <th className="p-2 border-l border-[#9cb3cc] dark:border-slate-700 text-center w-24">المستخدم</th>
                                            <th className="p-2 border-l border-[#9cb3cc] dark:border-slate-700 text-center w-20">الدفع</th>
                                            <th className="p-2 border-l border-[#9cb3cc] dark:border-slate-700 text-center w-28">الوقت</th>
                                            <th className="p-2 border-l border-[#9cb3cc] dark:border-slate-700 text-center w-28">التاريخ</th>
                                            <th className="p-2 text-center w-36">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-300 dark:divide-slate-800 font-bold">
                                        {filteredTodayInvoices.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-slate-600 font-bold">
                                                    {activeTab === "online" ? "لا توجد طلبات أونلاين جديدة حالياً" : "لا توجد فواتير مسجلة اليوم ضمن هذا التصنيف"}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredTodayInvoices.map((o, idx) => (
                                                <tr
                                                    key={o.id}
                                                    className={`hover:bg-[#d8e8f8] dark:hover:bg-[#1a293d] transition-colors ${
                                                        idx % 2 === 0 ? "bg-white dark:bg-[#0f1722]" : "bg-[#f2f7fc] dark:bg-[#141c27]"
                                                    }`}
                                                >
                                                    <td className="p-2 border-l border-slate-300 dark:border-slate-800 text-center font-mono font-black text-blue-900 dark:text-cyan-300 text-sm">
                                                        #{o.order_number}
                                                    </td>
                                                    <td className="p-2 border-l border-slate-300 dark:border-slate-800 text-center">
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                                            {o.source === 'website' ? 'أونلاين' : o.order_type === 'dine_in' ? 'صالة' : o.order_type === 'delivery' ? 'دليفري' : 'تيك أواي'}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 border-l border-slate-300 dark:border-slate-800 text-center font-mono font-black text-sm text-slate-900 dark:text-emerald-400">
                                                        {o.total}
                                                    </td>
                                                    <td className="p-2 border-l border-slate-300 dark:border-slate-800 text-center text-slate-800 dark:text-slate-200">
                                                        {o.cashier_name || "مدير"}
                                                    </td>
                                                    <td className="p-2 border-l border-slate-300 dark:border-slate-800 text-center">
                                                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                                                            {o.payment_method === "cash" ? "نقدي" : o.payment_method === "visa" ? "فيزا" : o.payment_method}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 border-l border-slate-300 dark:border-slate-800 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300" dir="ltr">
                                                        {new Date(o.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                                    </td>
                                                    <td className="p-2 border-l border-slate-300 dark:border-slate-800 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300" dir="ltr">
                                                        {new Date(o.created_at).toLocaleDateString("en-GB")}
                                                    </td>
                                                    <td className="p-1.5 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {o.source === 'website' && o.status === 'pending' && (
                                                                <button
                                                                    onClick={() => handleAcceptOnlineOrder(o)}
                                                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-black flex items-center gap-1 shadow-sm transition"
                                                                >
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    <span>قبول</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    const html = renderReceiptHtml(o, restaurant, isAr);
                                                                    executePrint(html, getPrinterSettings(), modalHtml => setPrintModalHtml(modalHtml));
                                                                }}
                                                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-sm transition"
                                                            >
                                                                <Printer className="w-3 h-3" />
                                                                <span>طباعة</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setActiveTab("menu");
                                                                    router.push(`/dashboard/pos2?edit=${o.id}`);
                                                                }}
                                                                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-sm transition"
                                                            >
                                                                <Edit className="w-3 h-3" />
                                                                <span>تعديل</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bottom Classic Invoices Summary Strip */}
                            <div className="p-2 bg-[#c5d6e8] dark:bg-[#151f2c] border-2 border-[#7693b1] dark:border-slate-800 rounded flex items-center justify-between text-xs font-bold shrink-0">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-1.5 font-mono">
                                        <span className="font-sans font-bold text-slate-700 dark:text-slate-300">إجمالي الفواتير:</span>
                                        <span className="px-3 py-1 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 font-black text-sm text-blue-900 dark:text-cyan-300">
                                            {totalInvoicesSum}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 font-mono">
                                        <span className="font-sans font-bold text-slate-700 dark:text-slate-300">إجمالي خدمة التوصيل:</span>
                                        <span className="px-3 py-1 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 font-black text-sm text-slate-800 dark:text-slate-200">
                                            {totalDeliveryFeesSum}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 font-mono">
                                    <span className="font-sans font-black text-slate-900 dark:text-white text-sm">الإجمالي الكلي:</span>
                                    <span className="px-4 py-1.5 bg-black text-emerald-400 font-black text-lg border border-slate-600 rounded">
                                        {totalInvoicesSum} ج.م
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ CUSTOMER & DELIVERY MODAL ═══ */}
            {showCustomerModal && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCustomerModal(false)}>
                    <div className="bg-[#e9f1f8] dark:bg-[#131b26] border-2 border-[#18486e] dark:border-cyan-600 rounded-lg w-full max-w-md shadow-2xl p-4 text-xs font-bold" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-400 dark:border-slate-700">
                            <span className="font-black text-sm text-[#18486e] dark:text-cyan-300 flex items-center gap-1.5">
                                <Users className="w-4 h-4" /> بيانات العميل والتوصيل
                            </span>
                            <button onClick={() => setShowCustomerModal(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="py-3 space-y-2">
                            <div>
                                <label className="block mb-1 text-slate-700 dark:text-slate-300">رقم الهاتف:</label>
                                <input
                                    type="text"
                                    dir="ltr"
                                    value={customerPhone}
                                    onChange={e => handlePhoneChange(e.target.value)}
                                    placeholder="01xxxxxxxxx"
                                    className="w-full p-1.5 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 rounded font-mono font-bold text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="relative">
                                <label className="block mb-1 text-slate-700 dark:text-slate-300">اسم العميل:</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder="اسم العميل..."
                                    className="w-full p-1.5 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-slate-700 dark:text-slate-300">العنوان بالتفصيل:</label>
                                <input
                                    type="text"
                                    value={customerAddress}
                                    onChange={e => setCustomerAddress(e.target.value)}
                                    placeholder="الشارع، العمارة، الشقة..."
                                    className="w-full p-1.5 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                                />
                            </div>

                            {orderType === "delivery" && (
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-300 dark:border-slate-700">
                                    <div>
                                        <label className="block mb-1 text-slate-700 dark:text-slate-300">الطيار:</label>
                                        <select
                                            value={selectedDriver}
                                            onChange={e => setSelectedDriver(e.target.value)}
                                            className="w-full p-1 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                                        >
                                            <option value="">اختر الطيار...</option>
                                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-slate-700 dark:text-slate-300">رسوم التوصيل:</label>
                                        <input
                                            type="number"
                                            value={deliveryFee || ""}
                                            onChange={e => setDeliveryFee(Number(e.target.value))}
                                            placeholder="0"
                                            className="w-full p-1 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 rounded font-black text-blue-900 dark:text-cyan-300"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block mb-1 text-slate-700 dark:text-slate-300">ملاحظات على الفاتورة:</label>
                                <input
                                    type="text"
                                    value={orderNotes}
                                    onChange={e => setOrderNotes(e.target.value)}
                                    placeholder="ملاحظات..."
                                    className="w-full p-1.5 bg-white dark:bg-[#0c121a] border border-slate-400 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setShowCustomerModal(false)}
                                className="w-full py-2 bg-[#18486e] dark:bg-cyan-600 hover:bg-[#205b8a] dark:hover:bg-cyan-500 text-white rounded font-black text-xs transition"
                            >
                                حفظ وإغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ WEIGHT MODAL ═══ */}
            {weightPrompt && (
                <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#e9f1f8] dark:bg-[#131b26] border-2 border-[#18486e] dark:border-cyan-600 rounded-lg w-full max-w-sm shadow-2xl p-5 text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-black mb-1 text-slate-900 dark:text-white">⚖️ وزن الصنف المطلوب</h3>
                        <p className="text-xs text-blue-800 dark:text-cyan-300 font-bold mb-3">{weightPrompt.item.title_ar}</p>
                        
                        <input
                            type="number"
                            autoFocus
                            value={weightInput}
                            onChange={e => setWeightInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter") {
                                    const w = parseFloat(weightInput);
                                    if (w > 0) {
                                        addItemToCart(weightPrompt.item, weightPrompt.sizeIdx, w);
                                        setWeightPrompt(null);
                                    }
                                }
                            }}
                            placeholder="0.00"
                            step="0.01"
                            className="w-full py-2 text-center text-3xl font-black font-mono bg-white dark:bg-[#0c121a] border-2 border-slate-500 dark:border-slate-700 text-slate-900 dark:text-white rounded mb-3"
                        />

                        <div className="grid grid-cols-4 gap-1.5 mb-3 font-mono text-xs font-bold">
                            {[0.25, 0.5, 1, 1.5].map(w => (
                                <button
                                    key={w}
                                    onClick={() => setWeightInput(w.toString())}
                                    className="py-1.5 bg-white dark:bg-[#182332] border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                                >
                                    {w}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setWeightPrompt(null)} className="flex-1 py-2 bg-slate-300 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded font-bold">إلغاء</button>
                            <button
                                onClick={() => {
                                    const w = parseFloat(weightInput);
                                    if (w > 0) {
                                        addItemToCart(weightPrompt.item, weightPrompt.sizeIdx, w);
                                        setWeightPrompt(null);
                                    }
                                }}
                                className="flex-1 py-2 bg-[#18486e] dark:bg-cyan-600 hover:bg-[#205b8a] dark:hover:bg-cyan-500 text-white rounded font-black"
                            >
                                تأكيد
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ SHIFT REPORT MODAL ═══ */}
            {showShiftReport && (
                <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowShiftReport(false)}>
                    <div className="bg-[#e9f1f8] dark:bg-[#131b26] border-2 border-[#18486e] dark:border-cyan-600 rounded-lg w-full max-w-sm shadow-2xl p-4 text-xs font-bold" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-400 dark:border-slate-700">
                            <span className="font-black text-sm text-[#18486e] dark:text-cyan-300 flex items-center gap-1.5">
                                <Banknote className="w-4 h-4" /> تقفيل وإيرادات الوردية
                            </span>
                            <button onClick={() => setShowShiftReport(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="py-4 space-y-3">
                            <div className="text-center pb-2 border-b border-slate-300 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400 block text-[11px]">الكاشير الحالي</span>
                                <span className="text-base font-black text-blue-900 dark:text-cyan-300">{cashierName}</span>
                            </div>

                            <div className="bg-white dark:bg-[#0c121a] p-3 border border-slate-400 dark:border-slate-700 text-center rounded">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">إجمالي مبيعات اليوم</span>
                                <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                                    {shiftStats.revenue} ج.م
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-center font-mono">
                                <div className="p-2 bg-white dark:bg-[#0c121a] border border-slate-300 dark:border-slate-700 rounded">
                                    <span className="text-[10px] text-slate-500 block font-sans">عدد الفواتير</span>
                                    <span className="text-base font-black text-slate-900 dark:text-white">{shiftStats.count}</span>
                                </div>
                                <div className="p-2 bg-white dark:bg-[#0c121a] border border-slate-300 dark:border-slate-700 rounded">
                                    <span className="text-[10px] text-slate-500 block font-sans">خدمات التوصيل</span>
                                    <span className="text-base font-black text-slate-900 dark:text-white">{shiftStats.delivery}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-center font-mono">
                                <div className="p-2 bg-white dark:bg-[#0c121a] border border-slate-300 dark:border-slate-700 rounded">
                                    <span className="text-[10px] text-slate-500 block font-sans">النقدي (كاش)</span>
                                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{shiftStats.cash}</span>
                                </div>
                                <div className="p-2 bg-white dark:bg-[#0c121a] border border-slate-300 dark:border-slate-700 rounded">
                                    <span className="text-[10px] text-slate-500 block font-sans">فيزا وعربون</span>
                                    <span className="text-base font-black text-blue-600 dark:text-cyan-400">{shiftStats.visa + shiftStats.deposit}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex gap-2">
                            <button
                                onClick={() => {
                                    const html = renderShiftReceiptHtml({
                                        cashierName,
                                        shiftStats,
                                        restaurantName: restaurant?.name || "",
                                        isAr
                                    });
                                    executePrint(html, getPrinterSettings(), modalHtml => setPrintModalHtml(modalHtml));
                                }}
                                className="flex-1 py-2 bg-[#18486e] dark:bg-cyan-600 hover:bg-[#205b8a] dark:hover:bg-cyan-500 text-white rounded font-black text-xs"
                            >
                                طباعة تقرير الوردية
                            </button>
                            <button onClick={() => setShowShiftReport(false)} className="px-3 py-2 bg-slate-300 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded font-bold">
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Iframe for Direct Printing */}
            <iframe ref={printFrameRef} style={{ position: 'absolute', width: '0px', height: '0px', border: 'none' }} title="Print Frame" />

            {/* Print Modal for Settings / Preview */}
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
