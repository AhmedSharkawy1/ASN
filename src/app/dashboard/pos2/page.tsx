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
    CreditCard, Calendar, Filter, FileText, ChevronDown, CheckSquare,
    Square
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
    const [kitchenCopies, setKitchenCopies] = useState<number>(1);
    const [addTax, setAddTax] = useState<boolean>(false);
    const [taxRate, setTaxRate] = useState<number>(14);

    /* ── Customer Info ── */
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [selectedDriver, setSelectedDriver] = useState<string>("");
    const [orderNotes, setOrderNotes] = useState("");
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

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
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);
    const [lastOrderData, setLastOrderData] = useState<any>(null);
    const [weightPrompt, setWeightPrompt] = useState<{ item: PosMenuItem, sizeIdx: number } | null>(null);
    const [weightInput, setWeightInput] = useState<string>("");
    const [printModalHtml, setPrintModalHtml] = useState<string | null>(null);
    const [showShiftReport, setShowShiftReport] = useState(false);
    const [shiftStats, setShiftStats] = useState({
        count: 0, revenue: 0, cash: 0, deposit: 0, delivery: 0, orderNumbers: [] as number[],
        posOrders: 0, posRevenue: 0, websiteOrders: 0, websiteRevenue: 0
    });

    const searchRef = useRef<HTMLInputElement>(null);
    const receiptRef = useRef<HTMLDivElement>(null);
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

        let cats = await posDb.categories.where("restaurant_id").equals(restaurantId).sortBy("sort_order");
        let items = await posDb.menu_items.where("restaurant_id").equals(restaurantId).toArray();

        if ((cats.length === 0 || items.length === 0) && navigator.onLine) {
            const { data: remoteCats } = await supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('sort_order');
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
        setMenuItems(items.filter(i => i.is_available !== false));

        const todayStr = new Date().toISOString().split("T")[0];
        const allOrders = await posDb.orders.where("restaurant_id").equals(restaurantId).toArray();
        const validToday = allOrders
            .filter(o => o.created_at.startsWith(todayStr) && o.status !== "cancelled" && !o.is_draft)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setTodayOrders(validToday);

        const held = allOrders.filter(o => o.is_draft === true);
        setHeldOrders(held);

        const pendingOnline = allOrders.filter(o => o.created_at.startsWith(todayStr) && o.source === "website" && o.status === "pending");
        setOnlineOrders(pendingOnline);

        let driverList = await posDb.pos_users.where("restaurant_id").equals(restaurantId).and(u => u.role === "delivery" && u.is_active !== false).toArray();
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

    /* ── Cart Operations ── */
    const addItemToCart = useCallback((item: PosMenuItem, sizeIdx: number = 0, specificQty?: number, specificPrice?: number) => {
        const price = specificPrice !== undefined ? specificPrice : (item.prices[sizeIdx] || item.prices[0]);
        const qty = specificQty !== undefined ? specificQty : (parseFloat(inputQty) || 1);
        const catName = categories.find(c => c.id === item.category_id)?.name_ar || "";
        const weightUnit = item.sell_by_weight ? (item.weight_unit || (isAr ? 'كجم' : 'kg')) : undefined;

        setCart(prev => {
            const idx = prev.findIndex(c => c.menuItem.id === item.id && c.selectedSizeIdx === sizeIdx);
            if (idx >= 0) {
                const updated = prev.map((c, i) => i === idx ? { ...c, qty: c.qty + qty, unitPrice: price } : c);
                setSelectedCartIdx(idx);
                return updated;
            }
            const next = [...prev, { menuItem: item, qty, selectedSizeIdx: sizeIdx, unitPrice: price, categoryName: catName, weightUnit }];
            setSelectedCartIdx(next.length - 1);
            return next;
        });

        // Reset fast input row
        setInputQty("1");
        setInputPrice(price.toString());
        setSelectedMenuItem(item);
        setSelectedSizeIdx(sizeIdx);
        playBeep();
    }, [inputQty, categories, isAr, playBeep]);

    const handleSelectMenuItem = (item: PosMenuItem, sizeIdx: number = 0) => {
        setSelectedMenuItem(item);
        setSelectedSizeIdx(sizeIdx);
        const p = item.prices[sizeIdx] || item.prices[0];
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
        setOrderNotes("");
        setPaymentMethod("cash");
        setNumpadBuffer("");
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

    /* ── Physical Keyboard Bindings (Classic POS Style) ── */
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
                setShowReceipt(false);
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
                delivery_driver_id: selectedDriver || undefined,
                delivery_driver_name: driverObj?.name,
                delivery_fee: deliveryTotalFee || undefined,
                notes: orderNotes || undefined,
                cashier_id: cashierId || undefined,
                cashier_name: cashierName || undefined,
                deposit_amount: paymentMethod === "deposit" ? tenderedCash : 0,
                status: initialStatus,
                is_draft: isHold,
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
                setLastOrderData(orderData);

                if (printOnSave) {
                    const html = renderReceiptHtml(orderData, restaurant, isAr);
                    const currentSettings = getPrinterSettings();
                    executePrint(html, currentSettings, modalHtml => setPrintModalHtml(modalHtml));
                    triggerCashDrawerIfEnabled(currentSettings);
                }

                toast.success(isAr ? `تم حفظ الفاتورة #${orderNumber} بنجاح` : `Invoice #${orderNumber} saved`);
            }

            clearCart();
            setEditingOrderId(null);
            setOriginalOrderNumber(null);
            setOriginalCreatedAt(null);
            loadData();
        } catch (err) {
            console.error("Order save error:", err);
            toast.error(isAr ? "حدث خطأ أثناء حفظ الفاتورة" : "Error saving invoice");
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Filtered Today Invoices ── */
    const filteredTodayInvoices = useMemo(() => {
        return todayOrders.filter(o => {
            if (invoicesFilterType !== "all" && o.order_type !== invoicesFilterType) return false;
            if (invoicesFilterPayment !== "all" && o.payment_method !== invoicesFilterPayment) return false;
            if (invoicesSearchQ) {
                const q = invoicesSearchQ.toLowerCase();
                const matchNum = o.order_number.toString().includes(q);
                const matchCust = (o.customer_name || "").toLowerCase().includes(q);
                const matchPhone = (o.customer_phone || "").includes(q);
                if (!matchNum && !matchCust && !matchPhone) return false;
            }
            return true;
        });
    }, [todayOrders, invoicesFilterType, invoicesFilterPayment, invoicesSearchQ]);

    const totalInvoicesSum = useMemo(() => filteredTodayInvoices.reduce((s, o) => s + (o.total || 0), 0), [filteredTodayInvoices]);
    const totalDeliveryFeesSum = useMemo(() => filteredTodayInvoices.reduce((s, o) => s + (o.delivery_fee || 0), 0), [filteredTodayInvoices]);

    /* ═══════════════════════════ RENDER ═══════════════════════════ */
    return (
        <div className="flex flex-col h-[calc(100vh-84px)] bg-[#c9d4e2] dark:bg-[#111923] text-slate-900 dark:text-slate-100 select-none font-sans text-xs border-2 border-[#54799e] rounded-md shadow-2xl overflow-hidden" dir="rtl">
            
            {/* ═══ 1. CLASSIC DESKTOP WINDOW TITLE BAR ═══ */}
            <div className="flex items-center justify-between px-2.5 py-1 bg-gradient-to-r from-[#1b4363] via-[#245780] to-[#1b4363] text-white border-b-2 border-[#0e273c] shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-cyan-300 drop-shadow" />
                    <span className="font-bold text-sm tracking-wide text-white drop-shadow">
                        مبيعات - كاشير ASN الكلاسيكي ({restaurant?.name || "مطعم"})
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">
                        v2.0 Classic
                    </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                    {/* Status Lights */}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/30 rounded border border-white/10 font-mono text-[11px]">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
                        <span>{isOnline ? "متصل" : "أوفلاين"}</span>
                        {pendingSyncCount > 0 && <span className="text-amber-300">({pendingSyncCount})</span>}
                    </div>

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
                        className="px-2 py-0.5 bg-[#316999] hover:bg-[#3d83bd] border border-[#7fb3dd] text-white rounded text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                    >
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>النمط العصري</span>
                    </Link>
                </div>
            </div>

            {/* ═══ 2. CLASSIC MENU STRIP (ملف | القائمة | الحركات | تقارير | الورديات) ═══ */}
            <div className="flex items-center justify-between px-2 py-0.5 bg-[#e4ebf3] dark:bg-[#1a2330] border-b border-[#a9bad0] dark:border-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={clearCart} className="hover:text-blue-700 dark:hover:text-cyan-400 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800">ملف</button>
                    <button onClick={() => setActiveTab("menu")} className="hover:text-blue-700 dark:hover:text-cyan-400 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800">القائمة</button>
                    <button onClick={() => setActiveTab("today_invoices")} className="hover:text-blue-700 dark:hover:text-cyan-400 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800">الحركات</button>
                    <button onClick={() => setShowShiftReport(true)} className="hover:text-blue-700 dark:hover:text-cyan-400 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800">الورديات</button>
                    <button onClick={() => { triggerCashDrawerIfEnabled(getPrinterSettings()); toast.info("تم فتح الدرج"); }} className="hover:text-blue-700 dark:hover:text-cyan-400 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800">فتح الدرج</button>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-slate-600 dark:text-slate-300">
                        {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono">ASN POS System 2026</span>
                </div>
            </div>

            {/* ═══ 3. TOP HORIZONTAL NAVIGATION TABS (فواتير اليوم، الطاولات، القائمة...) ═══ */}
            <div className="flex items-center gap-1 px-2 pt-1.5 bg-[#b9cbe0] dark:bg-[#151e2b] border-b-2 border-[#486e92] shrink-0 overflow-x-auto hide-scrollbar">
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
                                    ? "bg-white dark:bg-[#1a2332] text-[#1b4363] dark:text-cyan-300 border-[#486e92] shadow font-black -mb-[2px] pb-2 z-10"
                                    : "bg-[#8ea8c4] dark:bg-[#202c3d] text-slate-800 dark:text-slate-300 border-[#6c8aa8] hover:bg-[#a2bad3]"
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className="mr-1 text-[10px] px-1 rounded-full bg-black/10 dark:bg-white/10 font-mono">
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ═══ 4. SPLIT SCREEN (LEFT: INVOICE TAPE & ENTRY | RIGHT: MENU / TABLES / INVOICES) ═══ */}
            <div className="flex-1 grid grid-cols-12 gap-1.5 p-1.5 min-h-0 bg-[#d8e2ed] dark:bg-[#0d141e] overflow-hidden">
                
                {/* ══════════════════════════════════════════════════════════
                    LEFT PANEL: CLASSIC CURRENT INVOICE (5 COLS)
                ══════════════════════════════════════════════════════════ */}
                <div className="col-span-12 lg:col-span-5 flex flex-col h-full bg-[#f4f7fa] dark:bg-[#151c27] border-2 border-[#7693b1] dark:border-slate-800 rounded shadow-md overflow-hidden min-h-0">
                    
                    {/* Top Row: Date, User station, Order Sequence Numbers */}
                    <div className="p-1.5 bg-[#e5ecf5] dark:bg-[#1b2535] border-b border-[#a8bbd1] dark:border-slate-800 flex items-center justify-between gap-1 text-[11px] shrink-0 font-bold">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-700 dark:text-cyan-400" />
                            <input
                                type="text"
                                readOnly
                                value={new Date().toLocaleDateString("en-GB")}
                                className="w-20 px-1 py-0.5 bg-white dark:bg-black border border-slate-400 text-center font-mono font-bold"
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            <span className="text-slate-600 dark:text-slate-400">الكاشير:</span>
                            <span className="px-2 py-0.5 bg-white dark:bg-black border border-slate-400 text-blue-900 dark:text-cyan-300 font-bold truncate max-w-[100px]">
                                {cashierName || "مبيعات"}
                            </span>
                        </div>

                        <div className="flex items-center gap-1 font-mono">
                            <span className="px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-400 text-cyan-900 dark:text-cyan-200 font-black">
                                #{lastOrderNumber || 1}
                            </span>
                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 border border-amber-400 text-amber-900 dark:text-amber-200 font-black">
                                {cart.length} صنف
                            </span>
                        </div>
                    </div>

                    {/* Quick Item Input Row: [السعر] [الكمية] [إضافة] [وزن] [إلغاء صنف] */}
                    <div className="p-1.5 bg-[#dbe5f2] dark:bg-[#18212e] border-b border-[#a3b8cf] dark:border-slate-800 flex items-center gap-1.5 shrink-0 text-xs font-bold">
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
                                className="w-16 px-1 py-1 bg-white dark:bg-black border-2 border-slate-400 text-center font-black font-mono text-blue-900 dark:text-cyan-300"
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
                                className="w-14 px-1 py-1 bg-white dark:bg-black border-2 border-slate-400 text-center font-black font-mono text-slate-900 dark:text-white"
                            />
                        </div>

                        <button
                            onClick={handleAddCurrentInput}
                            className="px-2.5 py-1 bg-[#1e5885] hover:bg-[#256ea6] text-white border border-[#0d3452] font-black rounded shadow-sm text-[11px] active:scale-95 transition"
                        >
                            إضافة للفاتورة
                        </button>

                        <button
                            onClick={() => {
                                if (selectedMenuItem) {
                                    setWeightPrompt({ item: selectedMenuItem, sizeIdx: selectedSizeIdx });
                                } else {
                                    toast.info("اختر صنفاً أولاً");
                                }
                            }}
                            className="px-2 py-1 bg-[#476882] hover:bg-[#5881a2] text-white border border-[#2d4457] font-bold rounded text-[11px] active:scale-95 transition"
                        >
                            وزن
                        </button>

                        <button
                            onClick={removeSelectedItem}
                            className="px-2 py-1 bg-[#a33939] hover:bg-[#c24444] text-white border border-[#6b2222] font-bold rounded text-[11px] active:scale-95 transition"
                        >
                            إلغاء صنف
                        </button>
                    </div>

                    {/* Middle: Order Type Selector + INVOICE ITEMS SPREADSHEET TABLE */}
                    <div className="flex-1 flex min-h-0 bg-white dark:bg-black/40">
                        {/* Vertical Order Type Selector Bar (صالة | دليفري | تيك أواي) */}
                        <div className="w-16 bg-[#c5d5e7] dark:bg-[#1a2535] border-l-2 border-[#839cb5] flex flex-col p-1 gap-1 shrink-0">
                            {[
                                { key: "dine_in", label: "صالة" },
                                { key: "takeaway", label: "تيك أواي" },
                                { key: "delivery", label: "دليفري" },
                            ].map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setOrderType(t.key as any)}
                                    className={`flex-1 flex items-center justify-center font-black text-xs rounded transition-all border shadow-sm ${
                                        orderType === t.key
                                            ? "bg-[#18486e] text-white border-[#0c283f] ring-2 ring-cyan-400"
                                            : "bg-[#e5ecf5] dark:bg-[#243347] text-slate-700 dark:text-slate-300 border-[#9bb1c7] hover:bg-[#d0deee]"
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
                                <thead className="bg-[#cbdcf0] dark:bg-[#1c293c] text-slate-800 dark:text-slate-200 border-b-2 border-[#839cb5] sticky top-0 font-black shadow-sm">
                                    <tr>
                                        <th className="p-1.5 border-l border-[#9cb3cc]">اسم الصنف</th>
                                        <th className="p-1.5 border-l border-[#9cb3cc] text-center w-12">العدد</th>
                                        <th className="p-1.5 border-l border-[#9cb3cc] text-center w-14">السعر</th>
                                        <th className="p-1.5 text-center w-16">الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-slate-400">
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
                                                            ? "bg-[#b8d6f5] dark:bg-[#1c3857] text-[#0a2f55] dark:text-cyan-200 font-bold"
                                                            : i % 2 === 0
                                                                ? "bg-white dark:bg-[#151d29]"
                                                                : "bg-[#eaf1f8] dark:bg-[#192331]"
                                                    }`}
                                                >
                                                    <td className="p-1.5 border-l border-slate-300 dark:border-slate-800 font-bold truncate max-w-[130px]">
                                                        {c.menuItem.title_ar}
                                                        {c.menuItem.size_labels && c.menuItem.size_labels.length > 1 && (
                                                            <span className="text-[10px] text-blue-600 dark:text-cyan-400 mr-1">
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
                                                    <td className="p-1.5 text-center font-mono font-black text-blue-900 dark:text-cyan-300">
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

                    {/* Bottom Invoice Calculations & Checkboxes Panel (Exact Replica of image) */}
                    <div className="p-2 bg-[#d7e3f1] dark:bg-[#17212e] border-t-2 border-[#839cb5] shrink-0 text-xs space-y-1.5">
                        <div className="grid grid-cols-12 gap-2 items-center">
                            
                            {/* Left Calculations Box (الإجمالي، الخصم، الصافي، المدفوع، الباقي) */}
                            <div className="col-span-7 bg-white dark:bg-black/30 border border-slate-400 p-1.5 space-y-1 font-mono font-bold">
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
                                            className="w-12 px-1 py-0.5 bg-slate-100 dark:bg-black border border-slate-400 text-center text-xs font-black text-rose-600"
                                        />
                                        <span className="text-[10px]">ج.م</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-slate-900 dark:text-white pt-0.5 border-t border-slate-300">
                                    <span className="font-sans font-black text-blue-900 dark:text-cyan-300">الصافي:</span>
                                    <span className="text-base font-black text-blue-900 dark:text-cyan-300">{total}</span>
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
                                        className="w-16 px-1 py-0.5 bg-emerald-50 dark:bg-black border border-emerald-500 text-center font-black text-emerald-800 dark:text-emerald-400"
                                    />
                                </div>
                                <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 pt-0.5 border-t border-slate-300">
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
                                        className="w-3.5 h-3.5 rounded text-blue-600"
                                    />
                                    <span>طباعة مع الحفظ</span>
                                </label>

                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={printKitchen}
                                        onChange={e => setPrintKitchen(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-blue-600"
                                    />
                                    <span>طباعة المطبخ</span>
                                </label>

                                <div className="flex items-center gap-1">
                                    <span>خدمة توصيل:</span>
                                    <input
                                        type="number"
                                        value={deliveryFee || ""}
                                        onChange={e => setDeliveryFee(Number(e.target.value))}
                                        placeholder="0"
                                        className="w-12 px-1 py-0.5 bg-white dark:bg-black border border-slate-400 text-center font-bold"
                                    />
                                </div>

                                <div className="flex items-center gap-1">
                                    <span>طريقة الدفع:</span>
                                    <select
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                        className="px-1 py-0.5 bg-white dark:bg-black border border-slate-400 text-[11px] font-bold"
                                    >
                                        <option value="cash">نقدي</option>
                                        <option value="visa">فيزا</option>
                                        <option value="deposit">عربون</option>
                                    </select>
                                </div>

                                <button
                                    onClick={() => setShowCustomerModal(true)}
                                    className="w-full py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 border border-slate-400 rounded text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate"
                                >
                                    {customerName || customerPhone ? `👤 ${customerName || customerPhone}` : "بيانات العميل"}
                                </button>
                            </div>
                        </div>

                        {/* Big Bottom Action Buttons (جديد | حفظ | تعليق | حذف) */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                            <button
                                onClick={clearCart}
                                className="py-2.5 bg-[#2b6cb0] hover:bg-[#3182ce] text-white font-black rounded border-2 border-[#1a4971] text-xs shadow active:scale-95 transition"
                            >
                                جديد (F2)
                            </button>

                            <button
                                onClick={() => handleSubmitOrder(false)}
                                disabled={cart.length === 0 || submitting}
                                className="col-span-2 py-2.5 bg-[#0d826a] hover:bg-[#0f9b7e] text-white font-black rounded border-2 border-[#065041] text-sm shadow-md active:scale-95 transition disabled:opacity-50"
                            >
                                {submitting ? "جاري الحفظ..." : "حفظ وطباعة (F12)"}
                            </button>

                            <button
                                onClick={removeSelectedItem}
                                className="py-2.5 bg-[#c53030] hover:bg-[#e53e3e] text-white font-black rounded border-2 border-[#742a2a] text-xs shadow active:scale-95 transition"
                            >
                                حذف صنف
                            </button>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    RIGHT PANEL: WORKSPACE (MENU / TODAY INVOICES / NUMPAD) (7 COLS)
                ══════════════════════════════════════════════════════════ */}
                <div className="col-span-12 lg:col-span-7 flex flex-col h-full bg-[#f4f7fa] dark:bg-[#151c27] border-2 border-[#7693b1] dark:border-slate-800 rounded shadow-md overflow-hidden min-h-0">
                    
                    {/* ═══ VIEW A: MENU & TACTILE NUMPAD (WHEN activeTab === "menu") ═══ */}
                    {activeTab === "menu" && (
                        <div className="flex-1 flex flex-col min-h-0 p-1.5 space-y-1.5">
                            
                            {/* Top Search & Filter Bar */}
                            <div className="flex items-center gap-2 p-1.5 bg-[#e5ecf5] dark:bg-[#1b2535] border border-[#a8bbd1] dark:border-slate-800 rounded shrink-0">
                                <div className="relative flex-1">
                                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        ref={searchRef}
                                        value={searchQ}
                                        onChange={e => setSearchQ(e.target.value)}
                                        placeholder="بحث عن صنف بالاسم أو السعر..."
                                        className="w-full pr-8 pl-2 py-1 bg-white dark:bg-black border border-slate-400 rounded text-xs font-bold text-slate-900 dark:text-white outline-none"
                                    />
                                    {searchQ && (
                                        <button onClick={() => setSearchQ("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={() => setActiveCategory("all")}
                                    className={`px-2.5 py-1 rounded text-xs font-bold border ${activeCategory === "all" ? "bg-[#18486e] text-white border-[#0c283f]" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-400"}`}
                                >
                                    الكل ({menuItems.length})
                                </button>
                            </div>

                            {/* Categories Horizontal Buttons Strip */}
                            <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar shrink-0 py-0.5">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`px-3 py-1.5 rounded font-bold text-xs shrink-0 border transition-all ${
                                            activeCategory === cat.id
                                                ? "bg-[#18486e] text-white border-[#0c283f] shadow font-black"
                                                : "bg-[#e5ecf5] dark:bg-[#1f2c3d] text-slate-700 dark:text-slate-200 border-[#9bb1c7] hover:bg-[#d0deee]"
                                        }`}
                                    >
                                        {cat.name_ar}
                                    </button>
                                ))}
                            </div>

                            {/* Middle Split: Product Buttons Grid (Left) + Tactile POS Numpad (Right) */}
                            <div className="flex-1 grid grid-cols-12 gap-1.5 min-h-0">
                                
                                {/* Product Tiles Grid (8 Cols) */}
                                <div className="col-span-12 md:col-span-8 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 content-start min-h-0 p-1 bg-[#eaf1f8] dark:bg-[#111822] border border-slate-300 dark:border-slate-800 rounded">
                                    {menuItems
                                        .filter(item => {
                                            if (activeCategory !== "all" && item.category_id !== activeCategory) return false;
                                            if (searchQ) {
                                                const q = searchQ.toLowerCase();
                                                return item.title_ar.toLowerCase().includes(q) || (item.title_en || "").toLowerCase().includes(q);
                                            }
                                            return true;
                                        })
                                        .map(item => {
                                            const isItemSelected = selectedMenuItem?.id === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleSelectMenuItem(item, 0)}
                                                    className={`p-2 rounded border-2 transition-all flex flex-col justify-between text-right active:scale-95 cursor-pointer shadow-sm ${
                                                        isItemSelected
                                                            ? "bg-[#c1e0fc] dark:bg-[#1d3d61] border-[#18486e] dark:border-cyan-400 font-bold"
                                                            : "bg-white dark:bg-[#192230] border-[#9bb1c7] dark:border-slate-700 hover:border-blue-600 hover:bg-[#f0f6fc]"
                                                    }`}
                                                >
                                                    <span className="font-extrabold text-[13px] leading-snug text-slate-900 dark:text-white line-clamp-2">
                                                        {item.title_ar}
                                                    </span>

                                                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                                                        {item.sell_by_weight ? (
                                                            <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold">⚖️ وزن</span>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-500 font-bold">قطعة</span>
                                                        )}
                                                        <span className="font-black text-sm text-[#006090] dark:text-cyan-400 font-mono">
                                                            {formatCurrency(item.prices[0])}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>

                                {/* Tactile Classic Numpad (4 Cols) */}
                                <div className="col-span-12 md:col-span-4 bg-[#e5ecf5] dark:bg-[#17212f] border-2 border-[#7693b1] dark:border-slate-800 rounded p-1.5 flex flex-col justify-between shadow-inner">
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
                                                        className={`py-1 rounded transition-colors ${numpadTarget === m.id ? "bg-[#18486e] text-white font-black" : "text-slate-700 dark:text-slate-300"}`}
                                                    >
                                                        {m.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Digital Display */}
                                            <div className="px-2 py-1.5 bg-black text-emerald-400 font-mono font-black text-xl rounded text-left border border-slate-600 truncate shadow-inner tracking-wider">
                                                {numpadBuffer || "0"}
                                            </div>
                                        </div>

                                        {/* Quick Cash Buttons */}
                                        <div className="grid grid-cols-4 gap-1 mb-1 text-[10px] font-bold font-mono">
                                            <button onClick={() => { setNumpadTarget("tendered"); setTenderedCash(total); setNumpadBuffer(total.toString()); }} className="py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-sans font-black">بالضبط</button>
                                            <button onClick={() => { setNumpadTarget("tendered"); setTenderedCash(50); setNumpadBuffer("50"); }} className="py-1 bg-white dark:bg-slate-800 border rounded font-black">+50</button>
                                            <button onClick={() => { setNumpadTarget("tendered"); setTenderedCash(100); setNumpadBuffer("100"); }} className="py-1 bg-white dark:bg-slate-800 border rounded font-black">+100</button>
                                            <button onClick={() => { setNumpadTarget("tendered"); setTenderedCash(200); setNumpadBuffer("200"); }} className="py-1 bg-white dark:bg-slate-800 border rounded font-black">+200</button>
                                        </div>

                                        {/* Classic Keypad 4x4 Grid */}
                                        <div className="grid grid-cols-4 gap-1 font-mono text-sm font-black">
                                            <button onClick={() => handleNumpadKey("7")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded border border-slate-400 active:scale-95 shadow-sm">7</button>
                                            <button onClick={() => handleNumpadKey("8")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded border border-slate-400 active:scale-95 shadow-sm">8</button>
                                            <button onClick={() => handleNumpadKey("9")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded border border-slate-400 active:scale-95 shadow-sm">9</button>
                                            <button onClick={() => { if (selectedCartIdx !== null && cart[selectedCartIdx]) setCart(prev => prev.map((c, i) => i === selectedCartIdx ? { ...c, qty: c.qty + 1 } : c)); }} className="py-2.5 bg-[#8da5be] hover:bg-[#a1b8d0] rounded border border-[#647c94] text-slate-900 active:scale-95 shadow-sm flex items-center justify-center font-bold">
                                                <Plus className="w-4 h-4" />
                                            </button>

                                            <button onClick={() => handleNumpadKey("4")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded border border-slate-400 active:scale-95 shadow-sm">4</button>
                                            <button onClick={() => handleNumpadKey("5")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded border border-slate-400 active:scale-95 shadow-sm">5</button>
                                            <button onClick={() => handleNumpadKey("6")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded border border-slate-400 active:scale-95 shadow-sm">6</button>
                                            <button onClick={() => { if (selectedCartIdx !== null && cart[selectedCartIdx] && cart[selectedCartIdx].qty > 1) setCart(prev => prev.map((c, i) => i === selectedCartIdx ? { ...c, qty: c.qty - 1 } : c)); }} className="py-2.5 bg-[#8da5be] hover:bg-[#a1b8d0] rounded border border-[#647c94] text-slate-900 active:scale-95 shadow-sm flex items-center justify-center font-bold">
                                                <Minus className="w-4 h-4" />
                                            </button>

                                            <button onClick={() => handleNumpadKey("1")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded border border-slate-400 active:scale-95 shadow-sm">1</button>
                                            <button onClick={() => handleNumpadKey("2")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded border border-slate-400 active:scale-95 shadow-sm">2</button>
                                            <button onClick={() => handleNumpadKey("3")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded border border-slate-400 active:scale-95 shadow-sm">3</button>
                                            <button onClick={() => handleNumpadKey("BACKSPACE")} className="py-2.5 bg-[#e08b8b] hover:bg-[#ec9e9e] rounded border border-[#b46565] text-red-950 active:scale-95 shadow-sm flex items-center justify-center">
                                                <Delete className="w-4 h-4" />
                                            </button>

                                            <button onClick={() => handleNumpadKey("C")} className="py-2.5 bg-[#6c859e] hover:bg-[#7e99b4] text-white rounded border border-[#4d6379] active:scale-95 shadow-sm">C</button>
                                            <button onClick={() => handleNumpadKey("0")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded border border-slate-400 active:scale-95 shadow-sm">0</button>
                                            <button onClick={() => handleNumpadKey("00")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded border border-slate-400 active:scale-95 shadow-sm">00</button>
                                            <button onClick={() => handleNumpadKey(".")} className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded border border-slate-400 active:scale-95 shadow-sm">.</button>
                                        </div>
                                    </div>

                                    {/* Direct Enter & Pay Button */}
                                    <button
                                        onClick={() => handleSubmitOrder(false)}
                                        disabled={cart.length === 0 || submitting}
                                        className="w-full mt-2 py-2.5 bg-[#0d826a] hover:bg-[#0f9b7e] text-white font-black rounded border-2 border-[#065041] text-xs shadow-md active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    >
                                        <CheckSquare className="w-4 h-4" />
                                        <span>تنفيذ الفاتورة (ENTER)</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ VIEW B: TODAY'S INVOICES TABLE (EXACT REPLICA OF USER'S SCREENSHOT) ═══ */}
                    {activeTab !== "menu" && (
                        <div className="flex-1 flex flex-col min-h-0 p-1.5 space-y-1.5">
                            
                            {/* Filter and Search Bar matching screenshot */}
                            <div className="p-1.5 bg-[#dbe5f2] dark:bg-[#18212e] border-2 border-[#8da5bf] dark:border-slate-800 rounded flex items-center justify-between gap-1.5 text-xs font-bold shrink-0 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-slate-800 dark:text-slate-200">عرض الفواتير:</span>
                                    <button
                                        onClick={() => setInvoicesFilterType("all")}
                                        className={`px-3 py-1 rounded border ${invoicesFilterType === "all" ? "bg-[#18486e] text-white font-black" : "bg-white dark:bg-slate-800 border-slate-400"}`}
                                    >
                                        كل الفواتير
                                    </button>
                                    <button
                                        onClick={() => setInvoicesFilterType("takeaway")}
                                        className={`px-3 py-1 rounded border ${invoicesFilterType === "takeaway" ? "bg-[#18486e] text-white font-black" : "bg-white dark:bg-slate-800 border-slate-400"}`}
                                    >
                                        فواتير التك اواي
                                    </button>
                                    <button
                                        onClick={() => setInvoicesFilterType("delivery")}
                                        className={`px-3 py-1 rounded border ${invoicesFilterType === "delivery" ? "bg-[#18486e] text-white font-black" : "bg-white dark:bg-slate-800 border-slate-400"}`}
                                    >
                                        فواتير الدليفرى
                                    </button>
                                    <button
                                        onClick={() => setInvoicesFilterType("dine_in")}
                                        className={`px-3 py-1 rounded border ${invoicesFilterType === "dine_in" ? "bg-[#18486e] text-white font-black" : "bg-white dark:bg-slate-800 border-slate-400"}`}
                                    >
                                        فواتير الصالة
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span>نوع الدفع:</span>
                                    <select
                                        value={invoicesFilterPayment}
                                        onChange={e => setInvoicesFilterPayment(e.target.value)}
                                        className="px-2 py-1 bg-white dark:bg-black border border-slate-400 rounded text-xs font-bold"
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
                                        className="w-48 px-2 py-1 bg-white dark:bg-black border border-slate-400 rounded text-xs font-bold"
                                    />
                                </div>
                            </div>

                            {/* Invoices Spreadsheet Table (Replica of Screenshot) */}
                            <div className="flex-1 overflow-y-auto border-2 border-[#8da5bf] dark:border-slate-800 rounded bg-white dark:bg-[#0f1722] min-h-0">
                                <table className="w-full border-collapse text-right text-xs">
                                    <thead className="bg-[#cbdcf0] dark:bg-[#1a2638] text-slate-900 dark:text-slate-100 border-b-2 border-[#7693b1] sticky top-0 font-black shadow-sm">
                                        <tr>
                                            <th className="p-2 border-l border-[#9cb3cc] text-center w-24">رقم_الفاتورة</th>
                                            <th className="p-2 border-l border-[#9cb3cc] text-center w-28">الإجمالي</th>
                                            <th className="p-2 border-l border-[#9cb3cc] text-center w-28">المستخدم</th>
                                            <th className="p-2 border-l border-[#9cb3cc] text-center w-24">الدفع</th>
                                            <th className="p-2 border-l border-[#9cb3cc] text-center w-32">الوقت</th>
                                            <th className="p-2 text-center w-32">التاريخ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-300 dark:divide-slate-800 font-bold">
                                        {filteredTodayInvoices.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-16 text-center text-slate-400">
                                                    لا توجد فواتير مسجلة اليوم ضمن هذا التصنيف
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredTodayInvoices.map((o, idx) => (
                                                <tr
                                                    key={o.id}
                                                    onClick={() => {
                                                        const html = renderReceiptHtml(o, restaurant, isAr);
                                                        executePrint(html, getPrinterSettings(), modalHtml => setPrintModalHtml(modalHtml));
                                                    }}
                                                    className={`hover:bg-[#d8e8f8] dark:hover:bg-[#1c2e44] cursor-pointer transition-colors ${
                                                        idx % 2 === 0 ? "bg-white dark:bg-[#121a26]" : "bg-[#f2f7fc] dark:bg-[#151f2e]"
                                                    }`}
                                                >
                                                    <td className="p-2 border-l border-slate-300 dark:border-slate-800 text-center font-mono font-black text-blue-900 dark:text-cyan-300 text-sm">
                                                        {o.order_number}
                                                    </td>
                                                    <td className="p-2 border-l border-slate-300 dark:border-slate-800 text-center font-mono font-black text-sm">
                                                        {o.total}
                                                    </td>
                                                    <td className="p-2 border-l border-slate-300 dark:border-slate-800 text-center">
                                                        {o.cashier_name || "مدير"}
                                                    </td>
                                                    <td className="p-2 border-l border-slate-300 dark:border-slate-800 text-center">
                                                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px]">
                                                            {o.payment_method === "cash" ? "نقدي" : o.payment_method === "visa" ? "فيزا" : o.payment_method}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 border-l border-slate-300 dark:border-slate-800 text-center font-mono text-[11px]" dir="ltr">
                                                        {new Date(o.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                                    </td>
                                                    <td className="p-2 text-center font-mono text-[11px]" dir="ltr">
                                                        {new Date(o.created_at).toLocaleDateString("en-GB")}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bottom Classic Invoices Summary Strip (Replica of Screenshot) */}
                            <div className="p-2 bg-[#c5d6e8] dark:bg-[#172230] border-2 border-[#7693b1] dark:border-slate-800 rounded flex items-center justify-between text-xs font-bold shrink-0">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-1.5 font-mono">
                                        <span className="font-sans font-bold text-slate-700 dark:text-slate-300">إجمالي الفواتير:</span>
                                        <span className="px-3 py-1 bg-white dark:bg-black border border-slate-400 font-black text-sm text-blue-900 dark:text-cyan-300">
                                            {totalInvoicesSum}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 font-mono">
                                        <span className="font-sans font-bold text-slate-700 dark:text-slate-300">إجمالي خدمة التوصيل:</span>
                                        <span className="px-3 py-1 bg-white dark:bg-black border border-slate-400 font-black text-sm text-slate-800 dark:text-slate-200">
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
                    <div className="bg-[#e9f1f8] dark:bg-slate-900 border-2 border-[#18486e] rounded-lg w-full max-w-md shadow-2xl p-4 text-xs font-bold" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-400">
                            <span className="font-black text-sm text-[#18486e] dark:text-cyan-300 flex items-center gap-1.5">
                                <Users className="w-4 h-4" /> بيانات العميل والتوصيل
                            </span>
                            <button onClick={() => setShowCustomerModal(false)} className="text-slate-500 hover:text-slate-800">
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
                                    onChange={e => setCustomerPhone(e.target.value)}
                                    placeholder="01xxxxxxxxx"
                                    className="w-full p-1.5 bg-white dark:bg-black border border-slate-400 rounded font-mono font-bold"
                                />
                            </div>

                            <div className="relative">
                                <label className="block mb-1 text-slate-700 dark:text-slate-300">اسم العميل:</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder="اسم العميل..."
                                    className="w-full p-1.5 bg-white dark:bg-black border border-slate-400 rounded"
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-slate-700 dark:text-slate-300">العنوان بالتفصيل:</label>
                                <input
                                    type="text"
                                    value={customerAddress}
                                    onChange={e => setCustomerAddress(e.target.value)}
                                    placeholder="الشارع، العمارة، الشقة..."
                                    className="w-full p-1.5 bg-white dark:bg-black border border-slate-400 rounded"
                                />
                            </div>

                            {orderType === "delivery" && (
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-300">
                                    <div>
                                        <label className="block mb-1">الطيار:</label>
                                        <select
                                            value={selectedDriver}
                                            onChange={e => setSelectedDriver(e.target.value)}
                                            className="w-full p-1 bg-white dark:bg-black border border-slate-400 rounded"
                                        >
                                            <option value="">اختر الطيار...</option>
                                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1">رسوم التوصيل:</label>
                                        <input
                                            type="number"
                                            value={deliveryFee || ""}
                                            onChange={e => setDeliveryFee(Number(e.target.value))}
                                            placeholder="0"
                                            className="w-full p-1 bg-white dark:bg-black border border-slate-400 rounded font-black text-blue-900"
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
                                    className="w-full p-1.5 bg-white dark:bg-black border border-slate-400 rounded"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setShowCustomerModal(false)}
                                className="w-full py-2 bg-[#18486e] hover:bg-[#205b8a] text-white rounded font-black text-xs transition"
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
                    <div className="bg-[#e9f1f8] dark:bg-slate-900 border-2 border-[#18486e] rounded-lg w-full max-w-sm shadow-2xl p-5 text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-black mb-1">⚖️ وزن الصنف المطلوب</h3>
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
                            className="w-full py-2 text-center text-3xl font-black font-mono bg-white dark:bg-black border-2 border-slate-500 rounded mb-3"
                        />

                        <div className="grid grid-cols-4 gap-1.5 mb-3 font-mono text-xs font-bold">
                            {[0.25, 0.5, 1, 1.5].map(w => (
                                <button
                                    key={w}
                                    onClick={() => setWeightInput(w.toString())}
                                    className="py-1.5 bg-white dark:bg-slate-800 border rounded"
                                >
                                    {w}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setWeightPrompt(null)} className="flex-1 py-2 bg-slate-300 text-slate-800 rounded font-bold">إلغاء</button>
                            <button
                                onClick={() => {
                                    const w = parseFloat(weightInput);
                                    if (w > 0) {
                                        addItemToCart(weightPrompt.item, weightPrompt.sizeIdx, w);
                                        setWeightPrompt(null);
                                    }
                                }}
                                className="flex-1 py-2 bg-[#18486e] text-white rounded font-black"
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
                    <div className="bg-[#e9f1f8] dark:bg-slate-900 border-2 border-[#18486e] rounded-lg w-full max-w-sm shadow-2xl p-4 text-xs font-bold" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-400">
                            <span className="font-black text-sm text-[#18486e] dark:text-cyan-300 flex items-center gap-1.5">
                                <Banknote className="w-4 h-4" /> تقفيل وإيرادات الوردية
                            </span>
                            <button onClick={() => setShowShiftReport(false)} className="text-slate-500 hover:text-slate-800">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="py-4 space-y-3">
                            <div className="text-center pb-2 border-b border-slate-300">
                                <span className="text-slate-600 block text-[11px]">الكاشير الحالي</span>
                                <span className="text-base font-black text-blue-900 dark:text-cyan-300">{cashierName}</span>
                            </div>

                            <div className="bg-white dark:bg-black p-3 border border-slate-400 text-center rounded">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">إجمالي مبيعات اليوم</span>
                                <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                                    {todayOrders.reduce((s, o) => s + (o.total || 0), 0)} ج.م
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-center font-mono">
                                <div className="p-2 bg-white dark:bg-black border border-slate-300 rounded">
                                    <span className="text-[10px] text-slate-500 block font-sans">عدد الفواتير</span>
                                    <span className="text-base font-black">{todayOrders.length}</span>
                                </div>
                                <div className="p-2 bg-white dark:bg-black border border-slate-300 rounded">
                                    <span className="text-[10px] text-slate-500 block font-sans">خدمات التوصيل</span>
                                    <span className="text-base font-black">{todayOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex gap-2">
                            <button
                                onClick={() => {
                                    const html = renderShiftReceiptHtml({
                                        cashierName,
                                        shiftStats: {
                                            count: todayOrders.length,
                                            revenue: todayOrders.reduce((s, o) => s + (o.total || 0), 0),
                                            cash: todayOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (o.total || 0), 0),
                                            deposit: 0,
                                            delivery: todayOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0),
                                            orderNumbers: todayOrders.map(o => o.order_number),
                                            posOrders: todayOrders.length,
                                            posRevenue: todayOrders.reduce((s, o) => s + (o.total || 0), 0),
                                            websiteOrders: 0,
                                            websiteRevenue: 0
                                        },
                                        restaurantName: restaurant?.name || "",
                                        isAr
                                    });
                                    executePrint(html, getPrinterSettings(), modalHtml => setPrintModalHtml(modalHtml));
                                }}
                                className="flex-1 py-2 bg-[#18486e] text-white rounded font-black text-xs"
                            >
                                طباعة تقرير الوردية
                            </button>
                            <button onClick={() => setShowShiftReport(false)} className="px-3 py-2 bg-slate-300 text-slate-800 rounded font-bold">
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
