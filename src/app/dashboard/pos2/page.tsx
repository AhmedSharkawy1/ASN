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
import { executePrint, triggerCashDrawerIfEnabled } from "@/lib/helpers/printEngine";
import { usePrintSettings } from "@/lib/hooks/usePrintSettings";
import PrintModal from "@/components/PrintModal";
import { renderReceiptHtml, renderShiftReceiptHtml } from "@/lib/helpers/receiptRenderer";
import { useSearchParams, useRouter } from "next/navigation";
import { revertOrderInventory } from "@/lib/helpers/inventoryService";
import { toast } from "sonner";
import Link from "next/link";
import {
    Plus, Minus, Trash2, ShoppingCart, Search, Percent,
    DollarSign, Save, X, Printer, Clock, Banknote,
    PauseCircle, Play, StickyNote, Users, MapPin,
    LayoutGrid, Receipt, CheckCircle2, Volume2, VolumeX,
    Package, Truck, Wifi, WifiOff, Monitor, RefreshCw,
    RotateCcw, Globe, Check, Calculator, Delete, ArrowLeftRight,
    CreditCard
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

type NumpadMode = "qty" | "cash" | "discount" | "deposit";

/* ═══════════════════════════ COMPONENT ═══════════════════════════ */
export default function POS2Page() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const editId = searchParams.get("edit");
    const { language } = useLanguage();
    const { restaurantId, restaurant, canEditOrders, currentUserId, currentUserName } = useRestaurant();
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
    const [selectedCartIdx, setSelectedCartIdx] = useState<number | null>(null);

    /* ── Numpad State ── */
    const [numpadMode, setNumpadMode] = useState<NumpadMode>("qty");
    const [numpadBuffer, setNumpadBuffer] = useState<string>("");
    const [tenderedCash, setTenderedCash] = useState<number>(0);

    /* ── Order Attributes ── */
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

    /* ── Panels & Modals ── */
    const [showHeld, setShowHeld] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
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
    const [showOnlineOrders, setShowOnlineOrders] = useState(false);
    const [onlineOrders, setOnlineOrders] = useState<PosOrder[]>([]);
    const [showShiftReport, setShowShiftReport] = useState(false);
    const [shiftStats, setShiftStats] = useState({
        count: 0, revenue: 0, cash: 0, deposit: 0, delivery: 0, orderNumbers: [] as number[],
        posOrders: 0, posRevenue: 0, websiteOrders: 0, websiteRevenue: 0
    });

    const searchRef = useRef<HTMLInputElement>(null);
    const receiptRef = useRef<HTMLDivElement>(null);
    const printFrameRef = useRef<HTMLIFrameElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    /* ── Print Settings ── */
    const { settings: printSettings, saveSettings } = usePrintSettings(restaurantId);

    /* ── Fetch Cashier Details ── */
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

    /* ── Clock ── */
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    /* ── Sound ── */
    const playBeep = useCallback(() => {
        if (!soundEnabled) return;
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 850;
            osc.type = "sine";
            gain.gain.value = 0.08;
            osc.start();
            osc.stop(ctx.currentTime + 0.07);
        } catch { /* ignore */ }
    }, [soundEnabled]);

    /* ── Load data from Dexie ── */
    const loadData = useCallback(async () => {
        if (!restaurantId) return;

        let cats = await posDb.categories.where("restaurant_id").equals(restaurantId).sortBy("sort_order");
        let items = await posDb.menu_items.where("restaurant_id").equals(restaurantId).toArray();

        if ((cats.length === 0 || items.length === 0) && navigator.onLine) {
            const { data: remoteCats } = await supabase
                .from('categories').select('*')
                .eq('restaurant_id', restaurantId).order('sort_order');
            if (remoteCats && remoteCats.length > 0) {
                cats = remoteCats;
                await posDb.categories.bulkPut(remoteCats.map(c => ({ ...c, _dirty: false } as PosCategory)));

                const catIds = remoteCats.map(c => c.id as string);
                const { data: remoteItems } = await supabase.from('items').select('*').in('category_id', catIds);
                if (remoteItems && remoteItems.length > 0) {
                    items = remoteItems.map(i => ({ ...i, restaurant_id: restaurantId, _dirty: false } as PosMenuItem));
                    await posDb.menu_items.bulkPut(items);
                }
            }
        }

        setCategories(cats);
        setActiveCategory(prev => (prev === "all" || !prev) && cats.length > 0 ? cats[0].id : (prev || (cats.length > 0 ? cats[0].id : "all")));
        setMenuItems(items.filter(i => i.is_available !== false));

        const todayStr = new Date().toISOString().split("T")[0];
        const allOrders = await posDb.orders.where("restaurant_id").equals(restaurantId).toArray();
        const todayOrders = allOrders.filter(o => o.created_at.startsWith(todayStr) && o.status !== "cancelled" && !o.is_draft);
        setTodayStats({ count: todayOrders.length, revenue: todayOrders.reduce((s, o) => s + o.total, 0) });

        const held = allOrders.filter(o => o.is_draft === true);
        setHeldOrders(held);

        const pendingOnline = allOrders.filter(o => o.created_at.startsWith(todayStr) && o.source === "website" && o.status === "pending");
        setOnlineOrders(pendingOnline);

        if (navigator.onLine) {
            try {
                const { data: remoteOnline } = await supabase
                    .from("orders")
                    .select("*")
                    .eq("restaurant_id", restaurantId)
                    .eq("source", "website")
                    .eq("status", "pending")
                    .gte("created_at", `${todayStr}T00:00:00.000Z`)
                    .order("created_at", { ascending: false });
                if (remoteOnline && remoteOnline.length > 0) {
                    await posDb.orders.bulkPut(remoteOnline.map(o => ({ ...o, _dirty: false })));
                    setOnlineOrders(remoteOnline as PosOrder[]);
                }
            } catch (err) {
                console.warn("Could not fetch remote pending website orders:", err);
            }
        }

        let driverList = await posDb.pos_users
            .where("restaurant_id").equals(restaurantId)
            .and(u => u.role === "delivery" && u.is_active !== false)
            .toArray();

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
        if (restaurant && typeof restaurant.auto_approve_cashier_orders === 'boolean') {
            localStorage.setItem(`pos_auto_approve_cashier_${restaurantId}`, String(restaurant.auto_approve_cashier_orders));
        }

        loadData();

        pullFromSupabase(restaurantId)
            .catch(e => console.error("Initial Sync Error:", e))
            .finally(() => loadData());
    }, [restaurantId, restaurant, loadData]);

    /* ── Sync status listener ── */
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
        const channel = supabase.channel(`pos2-website-orders-${restaurantId}`)
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
                } else if (payload.eventType === 'DELETE') {
                    const oldOrd = payload.old as { id: string };
                    await posDb.orders.delete(oldOrd.id);
                    setOnlineOrders(prev => prev.filter(o => o.id !== oldOrd.id));
                }
            }).subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [restaurantId, isAr, playBeep]);

    /* ── Load existing order for editing ── */
    useEffect(() => {
        const loadOrderToEdit = async () => {
            if (!editId || !restaurantId || menuItems.length === 0) return;

            if (canEditOrders === false) {
                toast.error(isAr ? "عذراً، تعديل الطلبات المنشأة متاح فقط للمدير وصاحب المطعم" : "Editing created orders is restricted to manager and owner");
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
                    setSelectedCartIdx(restoredCart.length > 0 ? 0 : null);
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
    }, [editId, restaurantId, menuItems, editingOrderId, isAr, canEditOrders, router]);

    /* ── Autocomplete Customers ── */
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

    /* ── Filtering Menu ── */
    const filteredItems = useMemo(() => menuItems.filter(item => {
        if (activeCategory && activeCategory !== "all" && item.category_id !== activeCategory) return false;
        if (searchQ) {
            const q = searchQ.toLowerCase();
            return item.title_ar.toLowerCase().includes(q) || item.title_en?.toLowerCase().includes(q);
        }
        return true;
    }), [menuItems, activeCategory, searchQ]);

    const categoryCounts = useMemo(() => {
        const map: Record<string, number> = {};
        menuItems.forEach(i => { map[i.category_id] = (map[i.category_id] || 0) + 1; });
        return map;
    }, [menuItems]);

    const getCatName = (catId: string) => categories.find(c => c.id === catId)?.name_ar || "";

    /* ── Cart Calculations ── */
    const subtotal = useMemo(() => cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0), [cart]);
    const discount = useMemo(() => discountType === "percent" ? subtotal * (discountValue / 100) : discountValue, [discountType, subtotal, discountValue]);
    const total = useMemo(() => Math.max(0, subtotal - discount + deliveryFee), [subtotal, discount, deliveryFee]);
    const cartCount = useMemo(() => cart.reduce((s, c) => s + c.qty, 0), [cart]);

    // Remaining change for cash payment
    const changeDue = useMemo(() => {
        if (paymentMethod !== "cash" || tenderedCash <= 0) return 0;
        return Math.max(0, tenderedCash - total);
    }, [paymentMethod, tenderedCash, total]);

    /* ── Add to Cart ── */
    const addToCart = useCallback((item: PosMenuItem, sizeIdx: number = 0, specificQty?: number) => {
        const price = item.prices[sizeIdx] || item.prices[0];
        const catName = getCatName(item.category_id);
        const weightUnit = item.sell_by_weight ? (item.weight_unit || (isAr ? 'كجم' : 'kg')) : undefined;

        // If numpad has a buffer in "qty" mode, use it as initial quantity
        let addQty = 1;
        if (specificQty !== undefined) {
            addQty = specificQty;
        } else if (numpadMode === "qty" && numpadBuffer) {
            const parsed = parseFloat(numpadBuffer);
            if (!isNaN(parsed) && parsed > 0) {
                addQty = parsed;
                setNumpadBuffer(""); // clear after applying
            }
        }

        setCart(prev => {
            const idx = prev.findIndex(c => c.menuItem.id === item.id && c.selectedSizeIdx === sizeIdx);
            if (idx >= 0) {
                const next = prev.map((c, i) => i === idx ? { ...c, qty: c.qty + addQty } : c);
                setSelectedCartIdx(idx);
                return next;
            }
            const next = [...prev, { menuItem: item, qty: addQty, selectedSizeIdx: sizeIdx, unitPrice: price, categoryName: catName, weightUnit }];
            setSelectedCartIdx(next.length - 1);
            return next;
        });

        playBeep();
    }, [playBeep, numpadMode, numpadBuffer, categories, isAr]);

    const confirmWeight = () => {
        if (!weightPrompt) return;
        const weight = parseFloat(weightInput);
        if (isNaN(weight) || weight <= 0) {
            toast.error(isAr ? "الرجاء إدخال وزن صحيح" : "Please enter a valid weight");
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
                const next = [...prev, { menuItem: item, qty: weight, selectedSizeIdx: sizeIdx, unitPrice: price, categoryName: catName, weightUnit }];
                setSelectedCartIdx(next.length - 1);
                return next;
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

    const setExactQty = (index: number, exactQty: number) => {
        if (exactQty <= 0) {
            removeFromCart(index);
            return;
        }
        setCart(prev => prev.map((c, i) => i === index ? { ...c, qty: exactQty } : c));
    };

    const removeFromCart = (index: number) => {
        setCart(prev => {
            const next = prev.filter((_, i) => i !== index);
            if (selectedCartIdx === index) {
                setSelectedCartIdx(next.length > 0 ? Math.max(0, index - 1) : null);
            } else if (selectedCartIdx !== null && selectedCartIdx > index) {
                setSelectedCartIdx(selectedCartIdx - 1);
            }
            return next;
        });
    };

    const setItemNote = (index: number, note: string) => setCart(prev => prev.map((c, i) => i === index ? { ...c, note } : c));

    const clearCart = () => {
        setCart([]);
        setSelectedCartIdx(null);
        setDiscountValue(0);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setOrderNotes("");
        setPaymentMethod("cash");
        setTenderedCash(0);
        setOrderType("takeaway");
        setSelectedDriver("");
        setDeliveryFee(0);
        setDepositAmount(0);
        setNumpadBuffer("");
        setNumpadMode("qty");
    };

    /* ── Numpad Operations ── */
    const handleNumpadDigit = useCallback((val: string) => {
        playBeep();
        setNumpadBuffer(prev => {
            if (val === "." && prev.includes(".")) return prev;
            if (val === "00" && (prev === "" || prev === "0")) return "0";
            if (prev === "0" && val !== ".") return val;
            const nextVal = prev + val;

            // Immediate live updates based on active mode
            const num = parseFloat(nextVal);
            if (!isNaN(num)) {
                if (numpadMode === "qty" && selectedCartIdx !== null && cart[selectedCartIdx]) {
                    setExactQty(selectedCartIdx, num);
                } else if (numpadMode === "cash") {
                    setTenderedCash(num);
                } else if (numpadMode === "discount") {
                    setDiscountValue(num);
                } else if (numpadMode === "deposit") {
                    setDepositAmount(num);
                }
            }
            return nextVal;
        });
    }, [playBeep, numpadMode, selectedCartIdx, cart]);

    const handleNumpadBackspace = useCallback(() => {
        playBeep();
        setNumpadBuffer(prev => {
            if (prev.length <= 1) {
                if (numpadMode === "qty" && selectedCartIdx !== null && cart[selectedCartIdx]) {
                    setExactQty(selectedCartIdx, 1);
                } else if (numpadMode === "cash") {
                    setTenderedCash(0);
                } else if (numpadMode === "discount") {
                    setDiscountValue(0);
                } else if (numpadMode === "deposit") {
                    setDepositAmount(0);
                }
                return "";
            }
            const next = prev.slice(0, -1);
            const num = parseFloat(next);
            if (!isNaN(num)) {
                if (numpadMode === "qty" && selectedCartIdx !== null && cart[selectedCartIdx]) {
                    setExactQty(selectedCartIdx, num);
                } else if (numpadMode === "cash") {
                    setTenderedCash(num);
                } else if (numpadMode === "discount") {
                    setDiscountValue(num);
                } else if (numpadMode === "deposit") {
                    setDepositAmount(num);
                }
            }
            return next;
        });
    }, [playBeep, numpadMode, selectedCartIdx, cart]);

    const handleNumpadClear = useCallback(() => {
        playBeep();
        setNumpadBuffer("");
        if (numpadMode === "cash") setTenderedCash(0);
        if (numpadMode === "discount") setDiscountValue(0);
        if (numpadMode === "deposit") setDepositAmount(0);
    }, [playBeep, numpadMode]);

    const setQuickCash = (amount: number) => {
        playBeep();
        setPaymentMethod("cash");
        setNumpadMode("cash");
        setTenderedCash(amount);
        setNumpadBuffer(amount.toString());
    };

    const setExactCash = () => {
        playBeep();
        setPaymentMethod("cash");
        setNumpadMode("cash");
        setTenderedCash(total);
        setNumpadBuffer(total.toString());
    };

    const adjustSelectedQty = (delta: number) => {
        playBeep();
        if (selectedCartIdx !== null && cart[selectedCartIdx]) {
            updateQty(selectedCartIdx, delta);
            const currentItem = cart[selectedCartIdx];
            const nextQty = Math.max(1, currentItem.qty + delta);
            setNumpadBuffer(nextQty.toString());
        }
    };

    /* ── Keyboard Physical Shortcuts ── */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            const isTyping = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT");

            if (e.key === "Escape") {
                setSearchQ("");
                setShowReceipt(false);
                setEditNoteIdx(null);
                setShowHeld(false);
                setShowCustomerSuggestions(false);
                setShowCustomerModal(false);
                setWeightPrompt(null);
                setNumpadBuffer("");
                return;
            }

            if (e.key === "F12") {
                e.preventDefault();
                submitOrder(false);
                return;
            }

            if (!isTyping) {
                if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    searchRef.current?.focus();
                    return;
                }
                if (e.key >= "0" && e.key <= "9") {
                    e.preventDefault();
                    handleNumpadDigit(e.key);
                    return;
                }
                if (e.key === ".") {
                    e.preventDefault();
                    handleNumpadDigit(".");
                    return;
                }
                if (e.key === "Backspace") {
                    e.preventDefault();
                    handleNumpadBackspace();
                    return;
                }
                if (e.key === "c" || e.key === "C") {
                    e.preventDefault();
                    handleNumpadClear();
                    return;
                }
                if (e.key === "+") {
                    e.preventDefault();
                    adjustSelectedQty(1);
                    return;
                }
                if (e.key === "-") {
                    e.preventDefault();
                    adjustSelectedQty(-1);
                    return;
                }
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (cart.length > 0) {
                        submitOrder(false);
                    }
                    return;
                }
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [handleNumpadDigit, handleNumpadBackspace, handleNumpadClear, cart]);

    /* ── Printing Logic ── */
    const printReceipt = () => {
        if (!receiptRef.current) return;
        const html = `<html><head><title>Receipt</title><style>${getReceiptStyles()}</style></head><body><div class="receipt-wrapper">${receiptRef.current.innerHTML}</div></body></html>`;
        const settings = getPrinterSettings();
        executePrint(html, settings, (modalHtml) => {
            setPrintModalHtml(modalHtml);
        });
        triggerCashDrawerIfEnabled(settings);
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
        const currentSettings = getPrinterSettings();
        executePrint(html, currentSettings, (modalHtml) => {
            setPrintModalHtml(modalHtml);
        });
        triggerCashDrawerIfEnabled(currentSettings);
    }, [restaurant, isAr]);

    /* ── Submit Order ── */
    const submitOrder = useCallback(async (isHold = false) => {
        if (!restaurantId || cart.length === 0 || submitting) return;
        setSubmitting(true);
        try {
            const orderId = editingOrderId || generateId();
            let orderNumber = originalOrderNumber;
            if (!orderNumber) {
                const issued = await getPosNextOrderNumber(
                    restaurantId,
                    restaurant?.starting_order_number || 1
                );
                if (issued === null) {
                    toast.error(
                        isAr
                            ? 'تعذر الحصول على رقم طلب جديد. اتصل بالإنترنت لحظة ثم أعد المحاولة.'
                            : 'Could not obtain a new order number. Reconnect briefly and try again.'
                    );
                    setSubmitting(false);
                    return;
                }
                orderNumber = issued;
            }

            if (editingOrderId) {
                if (canEditOrders === false) {
                    toast.error(isAr ? "عذراً، تعديل الطلبات متاح فقط للمدير وصاحب المطعم" : "Editing orders is restricted to manager and owner");
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
                discount,
                discount_type: discountType,
                total,
                payment_method: paymentMethod,
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
                status: initialStatus,
                is_draft: isHold,
                source: 'pos',
                created_at: editingOrderId && originalCreatedAt ? originalCreatedAt : new Date().toISOString(),
                updated_at: new Date().toISOString(),
                _dirty: true,
            };

            await posDb.orders.put(orderRecord);

            // Deduct local inventory
            for (const item of cart) {
                if (item.menuItem.inventory_item_id) {
                    await decrementPosStock(restaurantId, item.menuItem.inventory_item_id, item.qty);
                }
            }

            // Upsert Customer
            if (customerName && customerPhone) {
                const existing = await posDb.customers.where("phone").equals(customerPhone).first();
                if (existing) {
                    if (customerAddress && existing.address !== customerAddress) {
                        await posDb.customers.update(existing.id, { address: customerAddress, name: customerName, _dirty: true });
                    }
                } else {
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
                if (navigator.onLine) {
                    supabase.from("customers").upsert({
                        id: await posDb.customers.where("phone").equals(customerPhone).first().then(c => c?.id),
                        restaurant_id: restaurantId,
                        name: customerName,
                        phone: customerPhone,
                        address: customerAddress || null,
                    }).then(() => {});
                }
            }

            if (navigator.onLine) {
                pushDirtyToSupabase(restaurantId).catch(e => console.error("Background sync error:", e));
            }

            if (isHold) {
                toast.success(isAr ? `تم تعليق الطلب #${orderNumber}` : `Order #${orderNumber} held`);
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

                printDirectReceipt(
                    orderNumber, capturedCart, customerName, customerPhone, customerAddress,
                    orderNotes || '', deliveryFee, driverObj?.name || '',
                    orderType, discount, total, paymentMethod, depositAmount
                );

                setTodayStats(p => ({
                    count: editingOrderId ? p.count : p.count + 1,
                    revenue: editingOrderId ? p.revenue : p.revenue + total
                }));
                toast.success(isAr ? `تم حفظ وطباعة الطلب #${orderNumber}` : `Order #${orderNumber} completed`);
            }

            clearCart();
            setEditingOrderId(null);
            setOriginalOrderNumber(null);
            setOriginalCreatedAt(null);
            if (editId) {
                router.replace('/dashboard/pos2');
            }
        } catch (e) {
            console.error(e);
            toast.error(isAr ? "حدث خطأ أثناء حفظ الطلب" : "Error saving order");
        } finally {
            setSubmitting(false);
        }
    }, [
        restaurantId, restaurant, cart, subtotal, discount, discountType, total, paymentMethod,
        depositAmount, customerName, customerPhone, customerAddress, selectedDriver, drivers,
        deliveryFee, orderNotes, submitting, loadData, editingOrderId, originalOrderNumber,
        editId, router, isAr, printDirectReceipt, cashierId, cashierName, originalCreatedAt,
        canEditOrders
    ]);

    /* ── Held Orders Actions ── */
    const restoreHeldOrder = async (order: PosOrder) => {
        const restored: CartItem[] = order.items.map(item => {
            const m = menuItems.find(mm => mm.title_ar === item.title);
            return {
                menuItem: m || { id: "held", title_ar: item.title, prices: [item.price], category_id: "", restaurant_id: restaurantId!, is_available: true } as PosMenuItem,
                qty: item.qty, selectedSizeIdx: 0, unitPrice: item.price, categoryName: item.category,
            };
        });
        setCart(restored);
        setSelectedCartIdx(restored.length > 0 ? 0 : null);
        setCustomerName(order.customer_name || "");
        setCustomerPhone(order.customer_phone || "");
        setCustomerAddress(order.customer_address || "");
        setPaymentMethod(order.payment_method || "cash");
        setOrderNotes(order.notes || "");
        setSelectedDriver(order.delivery_driver_id || "");
        setDeliveryFee(order.delivery_fee || 0);
        if (order.discount) { setDiscountValue(order.discount); setDiscountType(order.discount_type || "fixed"); }

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

    /* ── Shift Report Logic ── */
    const openShiftReport = async () => {
        if (!restaurantId) return;
        const todayStr = new Date().toISOString().split("T")[0];
        const resetKey = `pos_shift_reset_${restaurantId}_${cashierId || 'default'}`;
        const lastReset = typeof window !== 'undefined' ? localStorage.getItem(resetKey) : null;

        const allOrders = await posDb.orders.where("restaurant_id").equals(restaurantId).toArray();
        const myOrders = allOrders.filter(o => {
            if (!o.created_at.startsWith(todayStr)) return false;
            if (o.status === "cancelled" || o.is_draft) return false;

            if (cashierId || cashierName) {
                if (o.source === 'website') {
                    const matchId = cashierId && o.cashier_id && o.cashier_id === cashierId;
                    const matchName = cashierName && o.cashier_name && o.cashier_name === cashierName;
                    if (!matchId && !matchName) return false;
                } else {
                    if (cashierId && o.cashier_id && o.cashier_id !== cashierId) return false;
                }
            }
            if (lastReset && new Date(o.created_at) <= new Date(lastReset)) return false;
            return true;
        });

        let cash = 0, deposit = 0, deliveryFees = 0, collectedCashTotal = 0;
        let posOrders = 0, posRevenue = 0, websiteOrders = 0, websiteRevenue = 0;
        const orderNumbers = myOrders.map(o => o.order_number).sort((a,b) => a-b);

        myOrders.forEach(o => {
            const ordTotal = o.total || 0;
            if (o.status === "completed" || o.payment_method === "cash") {
                collectedCashTotal += ordTotal;
                cash += ordTotal;
            } else if (o.deposit_amount && o.deposit_amount > 0) {
                collectedCashTotal += o.deposit_amount;
                deposit += o.deposit_amount;
            }
            if (o.order_type === 'delivery' && o.delivery_fee) deliveryFees += o.delivery_fee;

            if (o.source === 'website') {
                websiteOrders++;
                websiteRevenue += ordTotal;
            } else {
                posOrders++;
                posRevenue += ordTotal;
            }
        });

        setShiftStats({
            count: myOrders.length,
            revenue: collectedCashTotal,
            cash,
            deposit,
            delivery: deliveryFees,
            orderNumbers,
            posOrders,
            posRevenue,
            websiteOrders,
            websiteRevenue
        });
        setShowShiftReport(true);
    };

    const handleResetShift = () => {
        if (!restaurantId) return;
        const resetKey = `pos_shift_reset_${restaurantId}_${cashierId || 'default'}`;
        const nowIso = new Date().toISOString();
        if (typeof window !== 'undefined') {
            localStorage.setItem(resetKey, nowIso);
        }
        setShiftStats({
            count: 0, revenue: 0, cash: 0, deposit: 0, delivery: 0, orderNumbers: [],
            posOrders: 0, posRevenue: 0, websiteOrders: 0, websiteRevenue: 0
        });
        setShowShiftReport(false);
        toast.success(isAr ? "تم تصفير الوردية بنجاح" : "Shift reset successfully");
    };

    const confirmWebsiteOrder = async (order: PosOrder) => {
        if (!restaurantId) return;
        const confirmedBy = cashierName || (isAr ? "كاشير" : "Cashier");
        const updatedOrder: PosOrder = {
            ...order,
            status: 'in_progress',
            cashier_id: cashierId || undefined,
            cashier_name: confirmedBy,
            updated_at: new Date().toISOString(),
            _dirty: true
        };

        try {
            await posDb.orders.put(updatedOrder);
            setOnlineOrders(prev => prev.filter(o => o.id !== order.id));

            if (navigator.onLine) {
                await supabase.from('orders').update({
                    status: 'in_progress',
                    cashier_id: cashierId || null,
                    cashier_name: confirmedBy,
                    updated_at: new Date().toISOString()
                }).eq('id', order.id);

                await supabase.from('order_logs').insert({
                    order_id: order.id,
                    action: 'confirmed_by_cashier',
                    details: `تم تأكيد الطلب بواسطة الكاشير: ${confirmedBy}`
                });

                fetch(`/api/orders/${order.id}/complete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cashier_id: cashierId, cashier_name: confirmedBy })
                }).catch(() => {});
            }

            toast.success(isAr ? `تم تأكيد الطلب #${order.order_number}` : `Order #${order.order_number} confirmed`);
        } catch (err) {
            console.error("Error confirming website order:", err);
            toast.error(isAr ? "فشل تأكيد الطلب" : "Failed to confirm order");
        }
    };

    const printWebsiteOrderReceipt = useCallback((order: PosOrder) => {
        const orderForReceipt = {
            order_number: order.order_number,
            items: order.items || [],
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            customer_address: order.customer_address,
            notes: order.notes,
            delivery_fee: order.delivery_fee || 0,
            delivery_driver_name: order.delivery_driver_name,
            order_type: order.order_type || 'delivery',
            discount: order.discount || 0,
            total: order.total,
            payment_method: order.payment_method || 'cash',
            deposit_amount: order.deposit_amount || 0,
            cashier_name: cashierName,
            created_at: order.created_at
        };
        const html = renderReceiptHtml(orderForReceipt, restaurant, isAr);
        const currentSettings = getPrinterSettings();
        executePrint(html, currentSettings, (modalHtml) => {
            setPrintModalHtml(modalHtml);
        });
    }, [restaurant, isAr, cashierName]);

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
        <div className="flex flex-col h-[calc(100vh-84px)] relative select-none font-sans" dir={isAr ? "rtl" : "ltr"}>
            {/* ═══ TOP CLASSIC POS BAR ═══ */}
            <div className="flex items-center justify-between gap-2.5 px-3 py-2 bg-slate-900 border-b border-slate-800 text-white rounded-t-xl shrink-0 shadow-md">
                {/* Brand / Mode & Status */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-950/80 border border-emerald-600/40 rounded-lg">
                        <Calculator className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-black tracking-wider text-emerald-300">
                            POS 2 <span className="text-[10px] text-emerald-400/80 font-normal">({isAr ? "كلاسيك" : "Classic"})</span>
                        </span>
                    </div>

                    {/* Switch to modern POS 1 */}
                    <Link
                        href="/dashboard/pos"
                        className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] text-slate-300 hover:text-white transition"
                        title={isAr ? "التبديل إلى نظام POS العصري" : "Switch to Modern POS"}
                    >
                        <ArrowLeftRight className="w-3 h-3 text-cyan-400" />
                        <span>{isAr ? "النمط العصري" : "Modern POS"}</span>
                    </Link>

                    {/* Online / Offline Status */}
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isOnline ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"}`}>
                        {isOnline ? <><Wifi className="w-2.5 h-2.5" /> أونلاين</> : <><WifiOff className="w-2.5 h-2.5" /> أوفلاين</>}
                    </span>

                    {/* Sync badge */}
                    {(pendingSyncCount > 0 || isSyncing) && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? "animate-spin" : ""}`} />
                            {isSyncing ? "جاري المزامنة..." : `غير متزامن (${pendingSyncCount})`}
                        </span>
                    )}

                    {/* Cashier Badge */}
                    <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 bg-slate-800/80 rounded-md text-[11px] text-slate-300 border border-slate-700/60">
                        <Users className="w-3 h-3 text-amber-400" />
                        <span>{cashierName || (isAr ? "الكاشير" : "Cashier")}</span>
                    </div>
                </div>

                {/* Right / Header Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Shift Report Button */}
                    <button
                        onClick={openShiftReport}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow active:scale-95 cursor-pointer"
                    >
                        <Banknote className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{isAr ? "الوردية" : "Shift"}</span>
                    </button>

                    {/* Manual Sync Button */}
                    <button
                        onClick={async () => {
                            if (!restaurantId) return;
                            if (!navigator.onLine) {
                                toast.error(isAr ? "أنت غير متصل بالإنترنت" : "You are offline");
                                return;
                            }
                            const toastId = toast.loading(isAr ? "جاري المزامنة مع السيرفر..." : "Syncing...");
                            try {
                                const res = await pushDirtyToSupabase(restaurantId, true);
                                await pullFromSupabase(restaurantId);
                                if (res.success) {
                                    toast.success(isAr ? `تمت المزامنة بنجاح (${res.pushed} طلب)` : `Synced ${res.pushed} orders`, { id: toastId });
                                } else {
                                    toast.error(isAr ? "حدث خطأ أثناء المزامنة" : "Sync error", { id: toastId });
                                }
                            } catch (err) {
                                console.error(err);
                                toast.error(isAr ? "فشلت المزامنة" : "Sync failed", { id: toastId });
                            }
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
                        title={isAr ? "مزامنة يدوية مع السيرفر" : "Manual Sync"}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-cyan-400" : ""}`} />
                    </button>

                    {/* Cash Drawer Button */}
                    <button
                        onClick={() => {
                            const settings = getPrinterSettings();
                            triggerCashDrawerIfEnabled(settings);
                            toast.info(isAr ? "تم إرسال إشارة فتح الدرج" : "Cash drawer trigger sent");
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 hover:text-amber-200 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
                        title={isAr ? "فتح درج النقدية" : "Open Cash Drawer"}
                    >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{isAr ? "الدرج" : "Drawer"}</span>
                    </button>

                    {/* Held Orders */}
                    <button
                        onClick={() => setShowHeld(!showHeld)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${showHeld ? "bg-amber-500 text-slate-950 font-black" : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"}`}
                    >
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>{heldOrders.length}</span>
                    </button>

                    {/* Online Orders */}
                    <button
                        onClick={() => setShowOnlineOrders(!showOnlineOrders)}
                        className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${showOnlineOrders ? "bg-violet-600 text-white" : onlineOrders.length > 0 ? "bg-violet-900/60 text-violet-200 border border-violet-500 animate-pulse" : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"}`}
                        title={isAr ? "طلبات الأونلاين" : "Online Orders"}
                    >
                        <Globe className="w-3.5 h-3.5" />
                        <span>{onlineOrders.length}</span>
                    </button>

                    {/* Sound */}
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition cursor-pointer"
                    >
                        {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                    </button>

                    {/* Clock */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-black/40 rounded-lg text-xs font-mono text-cyan-300 border border-slate-800">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                </div>
            </div>

            {/* ═══ MAIN CLASSIC WORKSPACE (SPLIT LAYOUT) ═══ */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 bg-slate-100 dark:bg-[#0c1017] min-h-0 overflow-hidden">
                
                {/* ──────────────────────────────────────────────────────────
                    LEFT / RECEIPT TAPE & NUMPAD PANEL (5 Cols)
                ────────────────────────────────────────────────────────── */}
                <div className="lg:col-span-5 xl:col-span-5 flex flex-col h-full bg-white dark:bg-card border-2 border-slate-300 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden min-h-0">
                    
                    {/* Tape Header: Order Type & Customer bar */}
                    <div className="p-2 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-1.5">
                        {/* Order Type Toggle */}
                        <div className="grid grid-cols-3 gap-1 bg-slate-200 dark:bg-slate-950 p-1 rounded-lg">
                            {[
                                { key: "takeaway", icon: <Package className="w-3.5 h-3.5" />, label: isAr ? "سفري (تيك أواي)" : "Takeaway" },
                                { key: "dine_in", icon: <LayoutGrid className="w-3.5 h-3.5" />, label: isAr ? "صالة (طاولة)" : "Dine In" },
                                { key: "delivery", icon: <Truck className="w-3.5 h-3.5" />, label: isAr ? "توصيل (دليفري)" : "Delivery" }
                            ].map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setOrderType(t.key as any)}
                                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-black transition-all ${orderType === t.key ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                                >
                                    {t.icon}
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Customer Quick Bar */}
                        <div className="flex items-center justify-between gap-1.5 px-2 py-1 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <div className="flex items-center gap-1.5 truncate flex-1 cursor-pointer" onClick={() => setShowCustomerModal(true)}>
                                <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {customerName || customerPhone ? `${customerName || ""} ${customerPhone ? `(${customerPhone})` : ""}` : (isAr ? "عميل نقدي / عام" : "Walk-in Customer")}
                                </span>
                                {orderType === "delivery" && deliveryFee > 0 && (
                                    <span className="text-[10px] px-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-bold">
                                        +{deliveryFee}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setShowCustomerModal(true)}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition"
                            >
                                {isAr ? "بيانات العميل" : "Customer Info"}
                            </button>
                        </div>
                    </div>

                    {/* VIRTUAL RECEIPT TAPE / CART LIST */}
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-1 bg-white dark:bg-black/20 font-mono min-h-0 divide-y divide-dashed divide-slate-200 dark:divide-slate-800">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-8 text-slate-400 dark:text-slate-600">
                                <Receipt className="w-10 h-10 mb-2 opacity-30 stroke-[1.5]" />
                                <p className="text-xs font-sans font-bold">{isAr ? "الفاتورة فارغة - اختر أصناف من القائمة" : "Receipt tape is empty"}</p>
                                <p className="text-[11px] font-sans opacity-70 mt-1">{isAr ? "استخدم لوحة الأرقام للكمية أو الدفع السريع" : "Use numpad for fast cashier actions"}</p>
                            </div>
                        ) : (
                            cart.map((c, i) => {
                                const isSelected = selectedCartIdx === i;
                                return (
                                    <div
                                        key={`${c.menuItem.id}-${c.selectedSizeIdx}-${i}`}
                                        onClick={() => {
                                            setSelectedCartIdx(i);
                                            setNumpadMode("qty");
                                            setNumpadBuffer(c.qty.toString());
                                        }}
                                        className={`p-2 rounded-lg transition-all cursor-pointer font-sans text-xs ${isSelected ? "bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 shadow-sm" : "hover:bg-slate-50 dark:hover:bg-slate-900/40 border border-transparent"}`}
                                    >
                                        <div className="flex items-start justify-between gap-1">
                                            {/* Item name and size */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-slate-100 text-[13px] leading-tight">
                                                    <span className="w-5 text-center text-slate-400 font-mono text-[11px]">#{i + 1}</span>
                                                    <span className="truncate">{c.menuItem.title_ar}</span>
                                                    {c.menuItem.size_labels && c.menuItem.size_labels.length > 1 && (
                                                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                                                            ({c.menuItem.size_labels[c.selectedSizeIdx]})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 pr-5">
                                                    <span>{formatCurrency(c.unitPrice)}</span>
                                                    <span>×</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                                        {formatQuantity(c.qty, c.weightUnit || (isAr ? 'قطعة' : 'unit'), isAr).qty}
                                                    </span>
                                                    {c.note && <span className="text-amber-600 dark:text-amber-400 font-bold truncate">📝 {c.note}</span>}
                                                </div>
                                            </div>

                                            {/* Total Line Price */}
                                            <div className="text-left font-black text-sm text-slate-900 dark:text-white tabular-nums">
                                                {formatCurrency(c.unitPrice * c.qty)}
                                            </div>

                                            {/* Delete button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeFromCart(i);
                                                }}
                                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                                                title={isAr ? "حذف" : "Remove"}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* DIGITAL TOTAL DISPLAY (CLASSIC POS VFD / LED LOOK) */}
                    <div className="p-3 bg-slate-950 border-t-2 border-slate-800 text-white shrink-0">
                        {/* Summary breakdown row */}
                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono pb-1 border-b border-slate-800/80">
                            <div>
                                {isAr ? "المجموع:" : "Subtotal:"} <span className="text-slate-200 font-bold">{formatCurrency(subtotal)}</span>
                            </div>
                            {discount > 0 && (
                                <div>
                                    {isAr ? "خصم:" : "Disc:"} <span className="text-rose-400 font-bold">-{formatCurrency(discount)}</span>
                                </div>
                            )}
                            {deliveryFee > 0 && (
                                <div>
                                    {isAr ? "توصيل:" : "Delivery:"} <span className="text-cyan-400 font-bold">+{formatCurrency(deliveryFee)}</span>
                                </div>
                            )}
                        </div>

                        {/* Large LED Digital Total */}
                        <div className="flex items-baseline justify-between pt-1.5">
                            <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                                {isAr ? "المبلغ المطلوب (الإجمالي)" : "TOTAL DUE"}
                            </span>
                            <span className="text-2xl xl:text-3xl font-black font-mono tracking-tight text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                                {formatCurrency(total)}
                            </span>
                        </div>

                        {/* Cash & Change Display (if Cash mode) */}
                        {paymentMethod === "cash" && tenderedCash > 0 && (
                            <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                                <div className="text-slate-300">
                                    {isAr ? "المستلم:" : "Tendered:"} <span className="text-white font-bold">{formatCurrency(tenderedCash)}</span>
                                </div>
                                <div className="text-cyan-300 font-bold flex items-center gap-1">
                                    <span>{isAr ? "الباقي للعميل:" : "Change Due:"}</span>
                                    <span className="text-sm font-black text-cyan-400">{formatCurrency(changeDue)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══ TACTILE CLASSIC NUMPAD & ACTIONS ═══ */}
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 shrink-0 space-y-1.5">
                        {/* Numpad Display & Mode Selector Bar */}
                        <div className="flex items-center gap-1">
                            {/* Mode selector pills */}
                            <div className="grid grid-cols-4 gap-1 flex-1">
                                {[
                                    { id: "qty", label: isAr ? "الكمية" : "QTY" },
                                    { id: "cash", label: isAr ? "المدفوع" : "CASH" },
                                    { id: "discount", label: isAr ? "الخصم" : "DISC" },
                                    { id: "deposit", label: isAr ? "عربون" : "DEPOSIT" },
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => {
                                            setNumpadMode(m.id as NumpadMode);
                                            setNumpadBuffer("");
                                        }}
                                        className={`py-1 rounded text-[11px] font-black uppercase transition-all ${numpadMode === m.id ? "bg-amber-500 text-slate-950 shadow" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:text-slate-900"}`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>

                            {/* Buffer Display */}
                            <div className="w-24 px-2 py-1 bg-white dark:bg-black border border-slate-300 dark:border-slate-700 rounded text-right font-mono font-black text-sm text-slate-900 dark:text-amber-400 truncate shadow-inner">
                                {numpadBuffer || "0"}
                            </div>
                        </div>

                        {/* Quick Cash Buttons */}
                        <div className="grid grid-cols-5 gap-1">
                            <button
                                onClick={setExactCash}
                                className="py-1 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded text-[10px] font-black transition"
                            >
                                {isAr ? "بالضبط" : "Exact"}
                            </button>
                            {[50, 100, 200, 500].map(val => (
                                <button
                                    key={val}
                                    onClick={() => setQuickCash(val)}
                                    className="py-1 bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold font-mono transition"
                                >
                                    +{val}
                                </button>
                            ))}
                        </div>

                        {/* Keypad Grid (4 Rows x 4 Columns) */}
                        <div className="grid grid-cols-4 gap-1 font-mono text-sm">
                            {/* Row 1 */}
                            <button onClick={() => handleNumpadDigit("7")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-black text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95 transition">7</button>
                            <button onClick={() => handleNumpadDigit("8")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-black text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95 transition">8</button>
                            <button onClick={() => handleNumpadDigit("9")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-black text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95 transition">9</button>
                            <button onClick={() => adjustSelectedQty(1)} className="py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg font-black text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 flex items-center justify-center gap-1 active:scale-95 transition">
                                <Plus className="w-4 h-4" /> 1
                            </button>

                            {/* Row 2 */}
                            <button onClick={() => handleNumpadDigit("4")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-black text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95 transition">4</button>
                            <button onClick={() => handleNumpadDigit("5")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-black text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95 transition">5</button>
                            <button onClick={() => handleNumpadDigit("6")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-black text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95 transition">6</button>
                            <button onClick={() => adjustSelectedQty(-1)} className="py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg font-black text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 flex items-center justify-center gap-1 active:scale-95 transition">
                                <Minus className="w-4 h-4" /> 1
                            </button>

                            {/* Row 3 */}
                            <button onClick={() => handleNumpadDigit("1")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-black text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95 transition">1</button>
                            <button onClick={() => handleNumpadDigit("2")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-black text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95 transition">2</button>
                            <button onClick={() => handleNumpadDigit("3")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-black text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95 transition">3</button>
                            <button onClick={handleNumpadBackspace} className="py-2.5 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900/80 rounded-lg font-black text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center justify-center active:scale-95 transition">
                                <Delete className="w-4 h-4" />
                            </button>

                            {/* Row 4 */}
                            <button onClick={handleNumpadClear} className="py-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 rounded-lg font-black text-slate-800 dark:text-white border border-slate-400 dark:border-slate-600 active:scale-95 transition">C</button>
                            <button onClick={() => handleNumpadDigit("0")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-black text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95 transition">0</button>
                            <button onClick={() => handleNumpadDigit("00")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-black text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95 transition">00</button>
                            <button onClick={() => handleNumpadDigit(".")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-black text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm active:scale-95 transition">.</button>
                        </div>

                        {/* Payment Method Switcher */}
                        <div className="grid grid-cols-3 gap-1 pt-1">
                            {[
                                { key: "cash", icon: <Banknote className="w-3.5 h-3.5" />, label: isAr ? "نقدي (كاش)" : "Cash" },
                                { key: "visa", icon: <CreditCard className="w-3.5 h-3.5" />, label: isAr ? "فيزا / شبكة" : "Visa/Card" },
                                { key: "deposit", icon: <Receipt className="w-3.5 h-3.5" />, label: isAr ? "عربون / آجل" : "Deposit" }
                            ].map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => setPaymentMethod(p.key)}
                                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-black transition-all ${paymentMethod === p.key ? "bg-emerald-600 text-white shadow" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:text-slate-900"}`}
                                >
                                    {p.icon}
                                    <span>{p.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* PRIMARY CHECKOUT ACTION BUTTONS */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                            <button
                                onClick={clearCart}
                                disabled={cart.length === 0}
                                className="py-3 bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded-xl font-bold text-xs flex flex-col items-center justify-center border border-slate-300 dark:border-slate-700 disabled:opacity-40 transition cursor-pointer"
                                title={isAr ? "مسح السلة" : "Clear"}
                            >
                                <Trash2 className="w-4 h-4 mb-0.5" />
                                <span>{isAr ? "مسح" : "Clear"}</span>
                            </button>

                            <button
                                onClick={() => submitOrder(true)}
                                disabled={cart.length === 0 || submitting}
                                className="py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex flex-col items-center justify-center shadow-md disabled:opacity-40 transition active:scale-95 cursor-pointer"
                                title={isAr ? "تعليق الطلب" : "Hold"}
                            >
                                <PauseCircle className="w-4 h-4 mb-0.5" />
                                <span>{isAr ? "تعليق" : "Hold"}</span>
                            </button>

                            <button
                                onClick={() => submitOrder(false)}
                                disabled={cart.length === 0 || submitting}
                                className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm xl:text-base rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-40 transition active:scale-95 cursor-pointer"
                            >
                                <Printer className="w-5 h-5" />
                                <span>{submitting ? "..." : (isAr ? "دفع وطباعة (F12)" : "PAY & PRINT (F12)")}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────────
                    RIGHT / MENU PRODUCTS & CATEGORIES AREA (7 Cols)
                ────────────────────────────────────────────────────────── */}
                <div className="lg:col-span-7 xl:col-span-7 flex flex-col h-full min-h-0 bg-white dark:bg-card border-2 border-slate-300 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden">
                    
                    {/* Search & Top Action Bar */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center gap-2">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                            <input
                                ref={searchRef}
                                value={searchQ}
                                onChange={e => setSearchQ(e.target.value)}
                                placeholder={isAr ? "بحث بالاسم أو الكود... (/)" : "Search menu... (/)"}
                                className={`w-full ${isAr ? "pr-9 pl-8" : "pl-9 pr-8"} py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 transition shadow-sm`}
                            />
                            {searchQ && (
                                <button onClick={() => setSearchQ("")} className={`absolute ${isAr ? "left-2.5" : "right-2.5"} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}>
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Recent Last Order print pill */}
                        {lastOrderNumber && (
                            <button
                                onClick={() => setShowReceipt(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 rounded-xl text-xs font-black transition hover:bg-emerald-100"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>#{lastOrderNumber}</span>
                            </button>
                        )}
                    </div>

                    {/* Category Buttons Tabs (Classic Touch Bar) */}
                    <div className="p-2 bg-slate-100 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto hide-scrollbar flex items-center gap-1.5">
                        <button
                            onClick={() => setActiveCategory("all")}
                            className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all ${activeCategory === "all" || !activeCategory ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50"}`}
                        >
                            {isAr ? "الكل" : "All"} ({menuItems.length})
                        </button>
                        {categories.map(cat => {
                            const count = categoryCounts[cat.id] || 0;
                            const isActive = activeCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${isActive ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50"}`}
                                >
                                    <span>{isAr ? cat.name_ar : (cat.name_en || cat.name_ar)}</span>
                                    <span className="text-[10px] px-1 rounded bg-black/10 dark:bg-white/10 opacity-80">{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Products Grid (Classic High-Speed Buttons) */}
                    <div className="flex-1 overflow-y-auto p-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2 content-start min-h-0 hide-scrollbar auto-rows-max">
                        {filteredItems.length === 0 ? (
                            <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-600">
                                <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-bold">{isAr ? "لا توجد أصناف مطابقة" : "No products found"}</p>
                            </div>
                        ) : (
                            filteredItems.map(item => {
                                const hasMultipleSizes = item.prices.length > 1;
                                return (
                                    <div
                                        key={item.id}
                                        className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow transition flex flex-col justify-between"
                                    >
                                        {/* Item Title & Details */}
                                        <div
                                            onClick={() => {
                                                if (item.sell_by_weight) {
                                                    setWeightPrompt({ item, sizeIdx: 0 });
                                                    setWeightInput("");
                                                } else {
                                                    addToCart(item, 0);
                                                }
                                            }}
                                            className="p-2.5 flex-1 flex flex-col justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
                                        >
                                            <div>
                                                <p className="font-extrabold text-[13px] xl:text-[14px] leading-tight text-slate-900 dark:text-white line-clamp-2">
                                                    {isAr ? item.title_ar : (item.title_en || item.title_ar)}
                                                </p>
                                                {item.sell_by_weight && (
                                                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold rounded">
                                                        ⚖️ {item.weight_unit || (isAr ? "بالوزن" : "By weight")}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Single Price display if only 1 size */}
                                            {!hasMultipleSizes && (
                                                <div className="mt-2 text-right">
                                                    <span className="font-black text-sm xl:text-base text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(item.prices[0])}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Multi-Size Variant Buttons (Classic POS style) */}
                                        {hasMultipleSizes && (
                                            <div className="grid grid-cols-2 gap-1 p-1.5 bg-slate-100 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800">
                                                {item.prices.map((p, sIdx) => {
                                                    const sLabel = item.size_labels?.[sIdx] || `#${sIdx + 1}`;
                                                    return (
                                                        <button
                                                            key={sIdx}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (item.sell_by_weight) {
                                                                    setWeightPrompt({ item, sizeIdx: sIdx });
                                                                    setWeightInput("");
                                                                } else {
                                                                    addToCart(item, sIdx);
                                                                }
                                                            }}
                                                            className="py-1 px-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 rounded text-[11px] font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition flex flex-col items-center"
                                                        >
                                                            <span className="truncate max-w-full">{sLabel}</span>
                                                            <span className="text-[10px] font-black">{formatCurrency(p)}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ CUSTOMER & DELIVERY MODAL ═══ */}
            {showCustomerModal && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCustomerModal(false)}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-500" />
                                {isAr ? "بيانات العميل والتوصيل" : "Customer & Delivery Info"}
                            </h3>
                            <button onClick={() => setShowCustomerModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="py-4 space-y-3">
                            {/* Customer Phone */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "رقم الهاتف" : "Phone"}</label>
                                <input
                                    value={customerPhone}
                                    onChange={e => setCustomerPhone(e.target.value)}
                                    placeholder="01xxxxxxxxx"
                                    dir="ltr"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            {/* Customer Name */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "اسم العميل" : "Name"}</label>
                                <input
                                    value={customerName}
                                    onChange={e => {
                                        setCustomerName(e.target.value);
                                        setShowCustomerSuggestions(true);
                                    }}
                                    placeholder={isAr ? "اسم العميل..." : "Customer name..."}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                                {showCustomerSuggestions && customerSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden z-50 shadow-xl max-h-40 overflow-y-auto">
                                        {customerSuggestions.map((c, i) => (
                                            <button
                                                key={i}
                                                onClick={() => selectCustomer(c)}
                                                className="w-full text-right px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold flex items-center justify-between border-b last:border-0 border-slate-100 dark:border-slate-700"
                                            >
                                                <span>{c.name}</span>
                                                <span className="font-mono text-slate-500" dir="ltr">{c.phone}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Customer Address */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "العنوان بالتفصيل" : "Address"}</label>
                                <input
                                    value={customerAddress}
                                    onChange={e => setCustomerAddress(e.target.value)}
                                    placeholder={isAr ? "الشارع، العمارة، الشقة..." : "Detailed address..."}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            {/* Delivery Options */}
                            {orderType === "delivery" && (
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "الطيار / السائق" : "Driver"}</label>
                                        <select
                                            value={selectedDriver}
                                            onChange={e => setSelectedDriver(e.target.value)}
                                            className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                                        >
                                            <option value="">{isAr ? "اختر الطيار..." : "Select driver..."}</option>
                                            {drivers.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "رسوم التوصيل" : "Delivery Fee"}</label>
                                        <input
                                            type="number"
                                            value={deliveryFee || ""}
                                            onChange={e => setDeliveryFee(Number(e.target.value))}
                                            placeholder="0"
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-blue-600 dark:text-blue-400 outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Order Notes */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{isAr ? "ملاحظات الفاتورة" : "Notes"}</label>
                                <input
                                    value={orderNotes}
                                    onChange={e => setOrderNotes(e.target.value)}
                                    placeholder={isAr ? "ملاحظات عامة على الطلب..." : "Notes..."}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setShowCustomerModal(false)}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition"
                            >
                                {isAr ? "حفظ وإغلاق" : "Done"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ WEIGHT PROMPT MODAL ═══ */}
            {weightPrompt && (
                <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
                        <button onClick={() => setWeightPrompt(null)} className="absolute top-4 left-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white text-center mb-1">⚖️ {isAr ? "إدخال الوزن" : "Enter Weight"}</h3>
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 text-center mb-4">
                            {isAr ? weightPrompt.item.title_ar : (weightPrompt.item.title_en || weightPrompt.item.title_ar)}
                        </p>

                        <div className="mb-4 relative">
                            <input
                                type="number"
                                autoFocus
                                value={weightInput}
                                onChange={e => setWeightInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && confirmWeight()}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full text-center text-4xl font-black py-3 bg-slate-100 dark:bg-slate-950 border-2 border-indigo-300 dark:border-indigo-600 rounded-xl text-slate-900 dark:text-white outline-none"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                {weightPrompt.item.weight_unit || (isAr ? "كجم" : "kg")}
                            </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {[0.25, 0.5, 1, 1.5].map(w => (
                                <button
                                    key={w}
                                    onClick={() => setWeightInput(w.toString())}
                                    className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold font-mono transition"
                                >
                                    {w}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={confirmWeight}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-xl transition shadow"
                        >
                            {isAr ? "تأكيد وإضافة" : "Confirm"}
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ HELD ORDERS DRAWER ═══ */}
            {showHeld && (
                <div className="fixed inset-0 z-[220] flex" onClick={() => setShowHeld(false)}>
                    <div className="flex-1 bg-black/50 backdrop-blur-sm" />
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <PauseCircle className="w-5 h-5 text-amber-500" />
                                {isAr ? "الطلبات المعلقة" : "Held Orders"} ({heldOrders.length})
                            </h3>
                            <button onClick={() => setShowHeld(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {heldOrders.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <PauseCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-bold">{isAr ? "لا توجد طلبات معلقة" : "No held orders"}</p>
                                </div>
                            ) : (
                                heldOrders.map(o => (
                                    <div key={o.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{o.customer_name || (isAr ? "بدون اسم" : "Walk-in")}</span>
                                            <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(o.total)}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 space-y-0.5">
                                            {o.items.slice(0, 3).map((item, idx) => (
                                                <p key={idx} className="truncate">• {item.title} × {item.qty}</p>
                                            ))}
                                            {o.items.length > 3 && <p>+{o.items.length - 3} أخرى</p>}
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={() => restoreHeldOrder(o)}
                                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                                            >
                                                <Play className="w-3 h-3" /> {isAr ? "استعادة" : "Restore"}
                                            </button>
                                            <button
                                                onClick={() => deleteHeldOrder(o.id)}
                                                className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold transition"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ ONLINE ORDERS DRAWER ═══ */}
            {showOnlineOrders && (
                <div className="fixed inset-0 z-[220] flex" onClick={() => setShowOnlineOrders(false)}>
                    <div className="flex-1 bg-black/50 backdrop-blur-sm" />
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Globe className="w-5 h-5 text-violet-500" />
                                {isAr ? "طلبات الأونلاين المعلقة" : "Pending Online Orders"} ({onlineOrders.length})
                            </h3>
                            <button onClick={() => setShowOnlineOrders(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {onlineOrders.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <Globe className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-bold">{isAr ? "لا توجد طلبات أونلاين جديدة بالانتظار" : "No pending online orders"}</p>
                                </div>
                            ) : (
                                onlineOrders.map(o => (
                                    <div key={o.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm text-slate-900 dark:text-white">#{o.order_number}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold">{isAr ? "في الانتظار" : "Pending"}</span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{o.customer_name || (isAr ? "عميل الموقع" : "Customer")}</p>
                                                {o.customer_phone && <p className="text-[11px] text-slate-500 font-mono" dir="ltr">{o.customer_phone}</p>}
                                            </div>
                                            <span className="font-black text-sm text-violet-600 dark:text-violet-400">{formatCurrency(o.total)}</span>
                                        </div>

                                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-xs space-y-1">
                                            {o.items?.map((item, idx) => (
                                                <div key={idx} className="flex justify-between">
                                                    <span className="truncate">{item.title}</span>
                                                    <span className="font-bold">×{item.qty}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={() => confirmWebsiteOrder(o)}
                                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5"
                                            >
                                                <Check className="w-4 h-4" />
                                                <span>{isAr ? "تأكيد واستلام" : "Confirm"}</span>
                                            </button>
                                            <button
                                                onClick={() => printWebsiteOrderReceipt(o)}
                                                className="p-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ SHIFT REPORT MODAL ═══ */}
            {showShiftReport && (
                <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
                            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-emerald-500" />
                                {isAr ? "تقفيل الوردية" : "Shift Report"}
                            </h2>
                            <button onClick={() => setShowShiftReport(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
                                <p className="text-xs text-slate-400 font-bold">{isAr ? "اسم الكاشير" : "Cashier Name"}</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white">{cashierName}</p>
                            </div>

                            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{isAr ? "إجمالي تحصيل الوردية" : "Shift Revenue"}</p>
                                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{formatCurrency(shiftStats.revenue)}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                                    <p className="text-slate-400 font-bold">{isAr ? "كاش (نقدي)" : "Cash"}</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{formatCurrency(shiftStats.cash)}</p>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                                    <p className="text-slate-400 font-bold">{isAr ? "عربون / آجل" : "Deposits"}</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{formatCurrency(shiftStats.deposit)}</p>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                                    <p className="text-slate-400 font-bold">{isAr ? "عدد الطلبات" : "Orders"}</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{shiftStats.count}</p>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                                    <p className="text-slate-400 font-bold">{isAr ? "رسوم التوصيل" : "Delivery"}</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{formatCurrency(shiftStats.delivery)}</p>
                                </div>
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button
                                    onClick={handleResetShift}
                                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>{isAr ? "تصفير الوردية" : "Reset Shift"}</span>
                                </button>
                                <button
                                    onClick={printShiftReport}
                                    className="py-3 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>{isAr ? "طباعة" : "Print"}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ RECEIPT PREVIEW MODAL ═══ */}
            {showReceipt && lastOrderNumber && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReceipt(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div ref={receiptRef} className="p-4 text-sm text-black bg-white" dir="rtl" style={{ fontFamily: "'Courier New', monospace" }}>
                            <div style={{ textAlign: "center", marginBottom: "12px" }}>
                                {(restaurant?.receipt_logo_url || restaurant?.logo_url) && (
                                    <img src={restaurant.receipt_logo_url || restaurant.logo_url} alt="Logo" style={{ width: "70px", height: "70px", objectFit: "contain", marginBottom: "8px", marginLeft: "auto", marginRight: "auto", display: "block" }} />
                                )}
                                <p style={{ fontWeight: "bold", fontSize: "20px", margin: "0 0 4px 0" }}>{restaurant?.name || "Restaurant"}</p>
                                {restaurant?.phone && <p style={{ fontSize: "13px", margin: "0 0 4px 0" }} dir="ltr">{restaurant.phone}</p>}
                                <p style={{ fontSize: "13px", margin: "0 0 4px 0" }}>{new Date().toLocaleDateString("ar-EG")} - {new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</p>
                                <p style={{ fontWeight: "bold", fontSize: "16px", margin: "0" }}>فاتورة رقم #{lastOrderNumber}</p>
                            </div>
                            {(lastOrderCustomer.name || lastOrderCustomer.phone) && (
                                <><div style={{ borderTop: "1.5px dashed #000", margin: "8px 0" }} /><div style={{ fontSize: "13px" }}>
                                    {lastOrderCustomer.name && <p style={{ margin: "2px 0" }}>العميل: <strong>{lastOrderCustomer.name}</strong></p>}
                                    {lastOrderCustomer.phone && <p style={{ margin: "2px 0" }} dir="ltr">هاتف: <strong>{lastOrderCustomer.phone}</strong></p>}
                                    {lastOrderCustomer.address && <p style={{ margin: "2px 0" }}>العنوان: <strong>{lastOrderCustomer.address}</strong></p>}
                                </div></>
                            )}
                            <div style={{ borderTop: "1.5px dashed #000", margin: "8px 0" }} />
                            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
                                <thead><tr>
                                    <td style={{ fontWeight: "bold", paddingBottom: "6px", borderBottom: "1.5px dashed #000", fontSize: "13px" }}>الصنف</td>
                                    <td style={{ fontWeight: "bold", textAlign: "center", paddingBottom: "6px", borderBottom: "1.5px dashed #000", fontSize: "13px" }}>الكمية</td>
                                    <td style={{ fontWeight: "bold", textAlign: "left", paddingBottom: "6px", borderBottom: "1.5px dashed #000", fontSize: "13px" }}>المبلغ</td>
                                </tr></thead>
                                <tbody>
                                    {lastOrderCart.map((c, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: "4px 0", fontSize: "13px" }}>
                                                {c.menuItem.title_ar}
                                                {c.menuItem.size_labels && c.menuItem.size_labels.length > 1 ? ` (${c.menuItem.size_labels[c.selectedSizeIdx]})` : ""}
                                            </td>
                                            <td style={{ textAlign: "center", padding: "4px 0", fontSize: "13px", fontWeight: "bold" }}>{c.qty}</td>
                                            <td style={{ textAlign: "left", padding: "4px 0", fontSize: "13px", fontWeight: "bold" }}>{formatCurrency(c.unitPrice * c.qty)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ borderTop: "1.5px dashed #000", margin: "8px 0" }} />
                            {lastOrderDiscount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}><span>الخصم</span><span>-{formatCurrency(lastOrderDiscount)}</span></div>}
                            {lastDeliveryFee > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}><span>🚚 توصيل</span><span>+{formatCurrency(lastDeliveryFee)}</span></div>}
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "18px", marginTop: "6px" }}><span>الإجمالي</span><span>{formatCurrency(lastOrderTotal)}</span></div>
                            <div style={{ borderTop: "1.5px dashed #000", margin: "8px 0" }} />
                            <div style={{ fontSize: "12px", textAlign: "center" }}>طريقة الدفع: <strong>{lastPaymentMethod === "cash" ? "كاش" : lastPaymentMethod}</strong></div>
                            <div style={{ textAlign: "center", fontSize: "12px", marginTop: "12px" }}>شكراً لزيارتكم ❤️</div>
                        </div>
                        <div className="p-3 border-t bg-slate-50 flex gap-2">
                            <button onClick={() => setShowReceipt(false)} className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition">إغلاق</button>
                            <button onClick={printReceipt} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"><Printer className="w-3.5 h-3.5" /> طباعة</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Iframe for Direct Printing */}
            <iframe ref={printFrameRef} style={{ position: 'absolute', width: '0px', height: '0px', border: 'none' }} title="Print Frame" />

            {/* Print Modal for Settings / Manual preview */}
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
