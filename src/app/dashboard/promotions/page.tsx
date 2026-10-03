"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Plus,
  Trash2,
  Edit2,
  Tag,
  X,
  Save,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Search,
  Layers,
  CheckSquare,
  Ticket,
  Copy,
  Check,
  Gift,
  Percent,
  DollarSign,
  Truck,
  Sparkles,
  Calendar,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Globe,
  Filter,
  CheckCircle2,
} from "lucide-react";
import {
  ALL_ITEMS_ID,
  BOGO_MARKER,
  requiresPromoCode,
  isAllItemsPromotion,
  isBogoPromotion,
  getBogoConfig,
  getTargetItems,
  Promotion,
  RequiredItem,
  PromotionDiscountType,
} from "@/lib/helpers/promotionEngine";
import { useDashboardContext } from "@/lib/context/DashboardContext";

type MenuItem = {
  id: string;
  title_ar: string;
  title_en?: string;
  prices: number[];
  category_name?: string;
  category_id?: string;
};

type Category = {
  id: string;
  name_ar: string;
};

export default function PromotionsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [promos, setPromos] = useState<Promotion[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [currency, setCurrency] = useState("ج");

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "inactive" | "bogo" | "percentage" | "fixed" | "free_shipping" | "coupon"
  >("all");

  // Modal & Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descEn, setDescEn] = useState("");

  const [discountType, setDiscountType] = useState<PromotionDiscountType>("buy_x_get_y");
  const [discountValue, setDiscountValue] = useState(0);

  // BOGO settings: Buy X Get Y Free
  const [bogoBuyQty, setBogoBuyQty] = useState(1);
  const [bogoGetQty, setBogoGetQty] = useState(1);

  const [bundlePrice, setBundlePrice] = useState<number | undefined>();
  const [minOrder, setMinOrder] = useState(0);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  // Targets
  const [allItems, setAllItems] = useState(false);
  const [selectedItems, setSelectedItems] = useState<RequiredItem[]>([]);

  // Promo Code
  const [requiresCode, setRequiresCode] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [filterCatId, setFilterCatId] = useState<string | null>(null);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const { restaurantId: ctxRestaurantId } = useDashboardContext();

  useEffect(() => {
    (async () => {
      try {
        let restId = ctxRestaurantId;

        if (!restId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const imp = typeof window !== "undefined" ? sessionStorage.getItem("impersonating_tenant") : null;
        const { getResolvedRestaurant } = await import("@/lib/helpers/authHelper");
        const rest = await getResolvedRestaurant(supabase, user, imp);
        if (!rest) {
          setLoading(false);
          return;
        }
        restId = rest.id;
        if (rest.currency) setCurrency(rest.currency);
        } // end if (!restId) — context fast-path

        setRestaurantId(restId);

        const [{ data: p }, { data: cats }] = await Promise.all([
          supabase
            .from("promotions")
            .select("*")
            .eq("restaurant_id", restId)
            .order("created_at", { ascending: false }),
          supabase.from("categories").select("id, name_ar").eq("restaurant_id", restId),
        ]);

        setPromos((p as Promotion[]) || []);

        if (cats && cats.length > 0) {
          setCategories(cats as Category[]);
          const { data: items } = await supabase
            .from("items")
            .select("id, title_ar, title_en, prices, category_id")
            .in(
              "category_id",
              cats.map((c) => c.id)
            );
          setMenuItems(
            (items || []).map((i) => ({
              ...i,
              category_name: cats.find((c) => c.id === i.category_id)?.name_ar,
            }))
          );
        }
      } catch (err) {
        console.error("Error loading promotions page data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [ctxRestaurantId]);

  const resetForm = () => {
    setNameAr("");
    setNameEn("");
    setDescAr("");
    setDescEn("");
    setDiscountType("buy_x_get_y");
    setDiscountValue(0);
    setBogoBuyQty(1);
    setBogoGetQty(1);
    setBundlePrice(undefined);
    setMinOrder(0);
    setStartsAt("");
    setEndsAt("");
    setSelectedItems([]);
    setEditingId(null);
    setRequiresCode(false);
    setPromoCode("");
    setAllItems(false);
    setShowItemPicker(false);
    setItemSearch("");
    setFilterCatId(null);
  };

  const openEdit = (p: Promotion) => {
    setEditingId(p.id);
    setNameAr(p.name_ar);
    setNameEn(p.name_en || "");
    setDescAr(p.description_ar || "");
    setDescEn(p.description_en || "");

    const isBogo = isBogoPromotion(p);
    if (isBogo) {
      setDiscountType("buy_x_get_y");
      const bogo = getBogoConfig(p);
      setBogoBuyQty(bogo.buy_qty);
      setBogoGetQty(bogo.get_qty);
      setDiscountValue(0);
    } else {
      setDiscountType(p.discount_type);
      setDiscountValue(p.discount_value || 0);
      setBogoBuyQty(1);
      setBogoGetQty(1);
    }

    setBundlePrice(p.bundle_price);
    setMinOrder(p.min_order_amount || 0);
    setStartsAt(p.starts_at ? p.starts_at.slice(0, 16) : "");
    setEndsAt(p.ends_at ? p.ends_at.slice(0, 16) : "");

    const items = p.required_items || [];
    setAllItems(items.some((ri) => ri.item_id === ALL_ITEMS_ID));
    // Filter out internal markers so user only sees actual products
    setSelectedItems(items.filter((ri) => ri.item_id !== ALL_ITEMS_ID && ri.item_id !== BOGO_MARKER));

    setRequiresCode(requiresPromoCode(p));
    setPromoCode(p.promo_code || "");
    setShowForm(true);
  };

  const openDuplicate = (p: Promotion) => {
    openEdit(p);
    setEditingId(null);
    setNameAr(`${p.name_ar} (${isAr ? "نسخة" : "Copy"})`);
    if (p.name_en) setNameEn(`${p.name_en} (Copy)`);
    if (p.promo_code) setPromoCode(`${p.promo_code}_COPY`);
  };

  const generateAutoCode = () => {
    const prefix = discountType === "buy_x_get_y" ? "BOGO" : discountType === "free_shipping" ? "FREEDEL" : "SAVE";
    const rand = Math.floor(100 + Math.random() * 900);
    setPromoCode(`${prefix}${rand}`);
  };

  const handleSave = async () => {
    if (!restaurantId || !nameAr.trim()) {
      alert(isAr ? "يرجى كتابة اسم العرض بالعربي" : "Please enter the offer name in Arabic");
      return;
    }

    if (!allItems && selectedItems.length === 0) {
      alert(isAr ? "يرجى تحديد الأصناف المشمولة بالعرض أو تفعيل خيار كل المنيو" : "Pick eligible items, or select the whole menu");
      return;
    }

    if (requiresCode && promoCode.trim().length < 3) {
      alert(isAr ? "اكتب كود الخصم (3 أحرف على الأقل) أو أوقف خيار الكود" : "Enter a promo code (min 3 chars), or disable the code option");
      return;
    }

    if (discountType === "buy_x_get_y" && (bogoBuyQty < 1 || bogoGetQty < 1)) {
      alert(isAr ? "يرجى تحديد كميات صحيحة لعرض اشترى واحصل مجاناً" : "Please specify valid quantities for Buy X Get Y");
      return;
    }

    setSaving(true);

    // Build required items list
    let requiredItemsPayload: RequiredItem[] = [];

    if (discountType === "buy_x_get_y") {
      // Store the BOGO marker for 100% resilient fallback and older clients compatibility
      const bogoMarker: RequiredItem = {
        item_id: BOGO_MARKER,
        item_title_ar: `اشتري ${bogoBuyQty} واحصل على ${bogoGetQty} مجاناً`,
        item_title_en: `Buy ${bogoBuyQty} Get ${bogoGetQty} Free`,
        buy_qty: bogoBuyQty,
        get_qty: bogoGetQty,
        qty: 1,
      };
      if (allItems) {
        requiredItemsPayload = [
          { item_id: ALL_ITEMS_ID, item_title_ar: "كل الأصناف", item_title_en: "All items", qty: 1 },
          bogoMarker,
        ];
      } else {
        requiredItemsPayload = [bogoMarker, ...selectedItems];
      }
    } else {
      if (allItems) {
        requiredItemsPayload = [{ item_id: ALL_ITEMS_ID, item_title_ar: "كل الأصناف", item_title_en: "All items", qty: 1 }];
      } else {
        requiredItemsPayload = selectedItems;
      }
    }

    const payload = {
      restaurant_id: restaurantId,
      name_ar: nameAr.trim(),
      name_en: nameEn.trim() || null,
      description_ar: descAr.trim() || null,
      description_en: descEn.trim() || null,
      discount_type: discountType,
      discount_value: discountType === "buy_x_get_y" ? bogoGetQty : discountValue || 0,
      required_items: requiredItemsPayload,
      bundle_price: bundlePrice || null,
      promo_code: requiresCode && promoCode.trim() ? promoCode.trim().toUpperCase() : null,
      min_order_amount: minOrder || 0,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
    };

    try {
      let savedData: Promotion | null = null;

      if (editingId) {
        let { data, error } = await supabase.from("promotions").update(payload).eq("id", editingId).select().single();

        // Resilient fallback: if database check constraint hasn't been updated yet
        if (error && error.code === "23514" && discountType === "buy_x_get_y") {
          console.warn("[PROMO] Falling back to fixed_amount due to DB constraint:", error.message);
          const fallbackPayload = { ...payload, discount_type: "fixed_amount" };
          const res = await supabase.from("promotions").update(fallbackPayload).eq("id", editingId).select().single();
          data = res.data;
          error = res.error;
        }

        if (error) throw error;
        savedData = data as Promotion;
        setPromos((prev) => prev.map((p) => (p.id === editingId ? savedData! : p)));
      } else {
        let { data, error } = await supabase.from("promotions").insert(payload).select().single();

        // Resilient fallback: if database check constraint hasn't been updated yet
        if (error && error.code === "23514" && discountType === "buy_x_get_y") {
          console.warn("[PROMO] Falling back to fixed_amount due to DB constraint:", error.message);
          const fallbackPayload = { ...payload, discount_type: "fixed_amount" };
          const res = await supabase.from("promotions").insert(fallbackPayload).select().single();
          data = res.data;
          error = res.error;
        }

        if (error) throw error;
        savedData = data as Promotion;
        setPromos((prev) => [savedData!, ...prev]);
      }

      setShowForm(false);
      resetForm();
    } catch (err: any) {
      console.error("[PROMO] Error saving promotion:", err);
      alert((isAr ? "حدث خطأ أثناء حفظ العرض: " : "Error saving offer: ") + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    // Optimistic update
    setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: nextVal } : p)));
    const { error } = await supabase.from("promotions").update({ is_active: nextVal }).eq("id", id);
    if (error) {
      console.error("Error toggling active state:", error);
      // Revert on error
      setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: currentVal } : p)));
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("promotions").delete().eq("id", deletingId);
    if (!error) {
      setPromos((prev) => prev.filter((p) => p.id !== deletingId));
    }
    setDeletingId(null);
  };

  const handleCopyCode = (id: string, code: string) => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  };

  // Item Picker helpers
  const addItem = (item: MenuItem) => {
    if (selectedItems.find((s) => s.item_id === item.id)) return;
    setSelectedItems((prev) => [
      ...prev,
      { item_id: item.id, item_title_ar: item.title_ar, item_title_en: item.title_en, qty: 1 },
    ]);
  };

  const removeItem = (itemId: string) => setSelectedItems((prev) => prev.filter((s) => s.item_id !== itemId));

  const addCategory = (catId: string) => {
    const catItems = menuItems.filter((i) => i.category_id === catId);
    const newItems = catItems.filter((i) => !selectedItems.find((s) => s.item_id === i.id));
    setSelectedItems((prev) => [
      ...prev,
      ...newItems.map((i) => ({ item_id: i.id, item_title_ar: i.title_ar, item_title_en: i.title_en, qty: 1 })),
    ]);
  };

  const removeCategoryItems = (catId: string) => {
    const catItemIds = menuItems.filter((i) => i.category_id === catId).map((i) => i.id);
    setSelectedItems((prev) => prev.filter((s) => !catItemIds.includes(s.item_id)));
  };

  const addAllAvailableItems = () => {
    const newItems = menuItems.filter((i) => !selectedItems.find((s) => s.item_id === i.id));
    setSelectedItems((prev) => [
      ...prev,
      ...newItems.map((i) => ({ item_id: i.id, item_title_ar: i.title_ar, item_title_en: i.title_en, qty: 1 })),
    ]);
  };

  // Badge configuration helper for cards
  const getOfferMeta = (p: Promotion) => {
    if (isBogoPromotion(p)) {
      const { buy_qty, get_qty } = getBogoConfig(p);
      return {
        type: "bogo" as const,
        label: isAr ? `اشتري ${buy_qty} و احصل على ${get_qty} مجاناً` : `Buy ${buy_qty} Get ${get_qty} Free`,
        shortBadge: isAr ? `${buy_qty}+${get_qty} مجاناً` : `${buy_qty}+${get_qty} Free`,
        gradient: "from-emerald-500 to-teal-600",
        badgeBg: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
        icon: Gift,
      };
    }
    if (p.discount_type === "percentage") {
      return {
        type: "percentage" as const,
        label: isAr ? `خصم ${p.discount_value}%` : `${p.discount_value}% OFF`,
        shortBadge: `${p.discount_value}%`,
        gradient: "from-purple-500 to-indigo-600",
        badgeBg: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20",
        icon: Percent,
      };
    }
    if (p.discount_type === "fixed_amount") {
      return {
        type: "fixed" as const,
        label: isAr ? `خصم ${p.discount_value} ${currency}` : `${p.discount_value} ${currency} OFF`,
        shortBadge: `${p.discount_value} ${currency}`,
        gradient: "from-blue-500 to-cyan-600",
        badgeBg: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
        icon: DollarSign,
      };
    }
    return {
      type: "free_shipping" as const,
      label: isAr ? "شحن وتوصيل مجاني" : "Free Delivery",
      shortBadge: isAr ? "توصيل مجاني" : "Free Delivery",
      gradient: "from-amber-500 to-orange-600",
      badgeBg: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
      icon: Truck,
    };
  };

  const getTimingStatus = (p: Promotion) => {
    const now = new Date();
    if (p.ends_at) {
      const end = new Date(p.ends_at);
      end.setHours(23, 59, 59, 999);
      if (end < now) {
        return {
          status: "expired",
          label: isAr ? "منتهي" : "Expired",
          badgeClass: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
        };
      }
    }
    if (p.starts_at) {
      const start = new Date(p.starts_at);
      start.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (start > today) {
        return {
          status: "scheduled",
          label: isAr ? "يبدأ قريباً" : "Scheduled",
          badgeClass: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
        };
      }
    }
    return {
      status: "active",
      label: isAr ? "ساري الآن" : "Active",
      badgeClass: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    };
  };

  // Filtered list
  const filteredPromos = useMemo(() => {
    return promos.filter((p) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNameAr = (p.name_ar || "").toLowerCase().includes(q);
        const matchNameEn = (p.name_en || "").toLowerCase().includes(q);
        const matchCode = (p.promo_code || "").toLowerCase().includes(q);
        const matchDesc = (p.description_ar || "").toLowerCase().includes(q);
        const matchItems = (p.required_items || []).some((ri) =>
          (ri.item_title_ar || "").toLowerCase().includes(q)
        );
        if (!matchNameAr && !matchNameEn && !matchCode && !matchDesc && !matchItems) {
          return false;
        }
      }

      // 2. Tab filter
      if (activeFilter === "all") return true;
      if (activeFilter === "active") return p.is_active && getTimingStatus(p).status !== "expired";
      if (activeFilter === "inactive") return !p.is_active || getTimingStatus(p).status === "expired";
      if (activeFilter === "bogo") return isBogoPromotion(p);
      if (activeFilter === "percentage") return p.discount_type === "percentage" && !isBogoPromotion(p);
      if (activeFilter === "fixed") return p.discount_type === "fixed_amount" && !isBogoPromotion(p);
      if (activeFilter === "free_shipping") return p.discount_type === "free_shipping";
      if (activeFilter === "coupon") return requiresPromoCode(p);

      return true;
    });
  }, [promos, searchQuery, activeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = promos.length;
    const active = promos.filter((p) => p.is_active && getTimingStatus(p).status !== "expired").length;
    const bogo = promos.filter((p) => isBogoPromotion(p)).length;
    const coupons = promos.filter((p) => requiresPromoCode(p)).length;
    return { total, active, bogo, coupons };
  }, [promos]);

  // Filtered menu items for the picker modal
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((i) => {
      if (filterCatId && i.category_id !== filterCatId) return false;
      if (!itemSearch.trim()) return true;
      const q = itemSearch.toLowerCase();
      return (
        i.title_ar.toLowerCase().includes(q) ||
        (i.title_en || "").toLowerCase().includes(q)
      );
    });
  }, [menuItems, filterCatId, itemSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-silver font-bold animate-pulse">{isAr ? "جاري تحميل العروض والخصومات..." : "Loading offers..."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* ── Top Header ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-500/5 dark:via-transparent p-6 rounded-3xl border border-glass-border">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                {isAr ? "العروض والخصومات الذكية" : "Smart Offers & Promotions"}
              </h1>
              <p className="text-xs sm:text-sm text-silver font-medium">
                {isAr
                  ? "أنشئ عروض 1+1 مجاناً، الخصومات المئوية، وكوبونات الخصم وتطبق تلقائياً عند طلب العميل"
                  : "Create BOGO offers, percentage discounts, coupons, and free delivery"}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-extrabold rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95 text-sm"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{isAr ? "إضافة عرض جديد" : "New Offer"}</span>
        </button>
      </div>

      {/* ── Statistics Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Offers */}
        <div className="bg-white dark:bg-card p-4 sm:p-5 rounded-2xl border border-glass-border shadow-sm flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800/80 flex items-center justify-center text-silver shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-silver block">{isAr ? "إجمالي العروض" : "Total Offers"}</span>
            <span className="text-xl sm:text-2xl font-black text-foreground tabular-nums">{stats.total}</span>
          </div>
        </div>

        {/* Active Offers */}
        <div className="bg-white dark:bg-card p-4 sm:p-5 rounded-2xl border border-glass-border shadow-sm flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-silver block">{isAr ? "عروض مفعّلة" : "Active Deals"}</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums">{stats.active}</span>
          </div>
        </div>

        {/* BOGO Offers */}
        <div className="bg-white dark:bg-card p-4 sm:p-5 rounded-2xl border border-glass-border shadow-sm flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-silver block">{isAr ? "عروض 1+1 مجاناً" : "BOGO Offers"}</span>
            <span className="text-xl sm:text-2xl font-black text-teal-600 tabular-nums">{stats.bogo}</span>
          </div>
        </div>

        {/* Coupons */}
        <div className="bg-white dark:bg-card p-4 sm:p-5 rounded-2xl border border-glass-border shadow-sm flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-silver block">{isAr ? "كوبونات خصم" : "Coupon Codes"}</span>
            <span className="text-xl sm:text-2xl font-black text-blue-600 tabular-nums">{stats.coupons}</span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Tabs ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3.5 rtl:right-3.5 ltr:left-3.5 top-3 w-4 h-4 text-silver" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "ابحث باسم العرض، الكود، أو الصنف..." : "Search by offer, code, or item..."}
            className="w-full rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 py-2.5 rounded-xl bg-white dark:bg-card border border-glass-border focus:border-amber-500 outline-none text-sm font-bold text-foreground placeholder:text-silver/60 transition shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute rtl:left-3 ltr:right-3 top-2.5 p-1 text-silver hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full" style={{ scrollbarWidth: "none" }}>
          {[
            { id: "all", label: isAr ? "الكل" : "All", count: stats.total },
            { id: "active", label: isAr ? "النشطة" : "Active", count: stats.active },
            { id: "bogo", label: isAr ? "🎁 اشترى واحصل مجاناً" : "🎁 BOGO", count: stats.bogo },
            { id: "coupon", label: isAr ? "🎟️ كوبونات" : "🎟️ Codes", count: stats.coupons },
            { id: "inactive", label: isAr ? "المتوقفة" : "Inactive" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === tab.id
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                  : "bg-white dark:bg-card border border-glass-border text-silver hover:text-foreground hover:border-amber-400"
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    activeFilter === tab.id
                      ? "bg-white/25 text-white"
                      : "bg-slate-100 dark:bg-zinc-800 text-silver"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Offers Grid ── */}
      {filteredPromos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-glass-border rounded-3xl bg-white/50 dark:bg-card/50 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
            <Gift className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-foreground mb-1.5">
            {searchQuery ? (isAr ? "لا توجد نتائج تطابق بحثك" : "No offers match your search") : (isAr ? "لا توجد عروض حالياً" : "No Offers Yet")}
          </h3>
          <p className="text-silver text-sm max-w-sm mb-6 font-medium">
            {searchQuery
              ? (isAr ? "جرب البحث بكلمات أخرى أو امسح الفلاتر" : "Try searching for a different term")
              : (isAr ? "أنشئ أول عرض لعملائك لزيادة مبيعاتك بنظام اشتري 1 وخد 1 مجاناً أو الخصومات" : "Start creating offers like Buy 1 Get 1 Free to boost your sales")}
          </p>
          {!searchQuery && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white font-bold rounded-xl shadow-lg hover:bg-amber-600 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? "إضافة أول عرض الآن" : "Create First Offer"}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPromos.map((p) => {
            const meta = getOfferMeta(p);
            const timing = getTimingStatus(p);
            const isAll = isAllItemsPromotion(p);
            const targetItems = getTargetItems(p);
            const isExpired = timing.status === "expired";
            const isScheduled = timing.status === "scheduled";
            const MetaIcon = meta.icon;

            return (
              <div
                key={p.id}
                className={`relative flex flex-col justify-between bg-white dark:bg-card rounded-3xl border transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden ${
                  p.is_active && !isExpired
                    ? "border-amber-200/80 dark:border-amber-500/20 shadow-md shadow-amber-500/5"
                    : "border-glass-border opacity-75 shadow-none"
                }`}
              >
                {/* Accent Top Gradient Line */}
                <div
                  className={`h-2 bg-gradient-to-r ${
                    p.is_active && !isExpired ? meta.gradient : "from-gray-300 to-gray-400 dark:from-zinc-700 dark:to-zinc-800"
                  }`}
                />

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Header: Badge + Timing + Switch */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold border ${meta.badgeBg}`}>
                        <MetaIcon className="w-3.5 h-3.5" />
                        <span>{meta.shortBadge}</span>
                      </span>

                      {/* Timing status */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${timing.badgeClass}`}>
                        {timing.label}
                      </span>
                    </div>

                    {/* Active toggle */}
                    <button
                      onClick={() => toggleActive(p.id, p.is_active)}
                      title={p.is_active ? (isAr ? "إيقاف العرض" : "Deactivate") : (isAr ? "تفعيل العرض" : "Activate")}
                      className={`transition-colors shrink-0 p-1 rounded-lg ${
                        p.is_active ? "text-emerald-600 hover:text-emerald-700" : "text-silver hover:text-foreground"
                      }`}
                    >
                      {p.is_active ? <ToggleRight className="w-7 h-7 stroke-[2.2]" /> : <ToggleLeft className="w-7 h-7 stroke-[1.8]" />}
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-black text-lg sm:text-xl text-foreground mb-1 leading-snug">
                      {p.name_ar}
                    </h3>
                    {p.name_en && (
                      <p className="text-xs font-bold text-silver mb-1.5">{p.name_en}</p>
                    )}
                    {p.description_ar ? (
                      <p className="text-xs text-silver line-clamp-2 leading-relaxed">
                        {p.description_ar}
                      </p>
                    ) : (
                      <p className="text-xs text-silver/70 italic">
                        {meta.label}
                      </p>
                    )}
                  </div>

                  {/* Coupon Code Pill */}
                  {requiresPromoCode(p) && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="text-[10px] font-bold text-blue-500 block leading-tight">
                            {isAr ? "كود التفعيل عند الطلب:" : "Promo code:"}
                          </span>
                          <span className="font-black tracking-widest text-sm text-blue-700 dark:text-blue-300">
                            {p.promo_code}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyCode(p.id, p.promo_code!)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 transition"
                      >
                        {copiedCodeId === p.id ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>{isAr ? "تم النسخ" : "Copied"}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{isAr ? "نسخ" : "Copy"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Offer Info Meta Chips */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {p.min_order_amount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 text-foreground px-2.5 py-1 rounded-lg font-bold">
                        <ShoppingBag className="w-3 h-3 text-silver" />
                        <span>{isAr ? `حد أدنى: ${p.min_order_amount} ${currency}` : `Min: ${p.min_order_amount} ${currency}`}</span>
                      </span>
                    )}

                    {p.bundle_price && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg font-bold">
                        <span>{isAr ? `سعر العرض: ${p.bundle_price} ${currency}` : `Bundle: ${p.bundle_price} ${currency}`}</span>
                      </span>
                    )}

                    {(p.starts_at || p.ends_at) && (
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 text-silver px-2.5 py-1 rounded-lg font-bold text-[11px]">
                        <Calendar className="w-3 h-3" />
                        {p.ends_at ? (isAr ? `ينتهي: ${p.ends_at.slice(0, 10)}` : `Ends: ${p.ends_at.slice(0, 10)}`) : (isAr ? "دائم" : "No end date")}
                      </span>
                    )}
                  </div>

                  {/* Target Items Preview */}
                  <div className="pt-2 border-t border-glass-border">
                    {isAll ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                        <Globe className="w-4 h-4 shrink-0" />
                        <span>{isAr ? "العرض يطبّق على جميع أصناف المنيو" : "Applies to the entire menu"}</span>
                      </div>
                    ) : targetItems.length === 0 ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-500/10 p-2 rounded-xl border border-red-200 dark:border-red-500/20">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{isAr ? "⚠️ لم تحدد أي أصناف — لن يُطبَّق العرض" : "⚠️ No items specified — will not apply"}</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-silver mb-1.5">
                          <span>{isAr ? `الأصناف المشمولة (${targetItems.length})` : `Eligible items (${targetItems.length})`}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                          {targetItems.slice(0, 4).map((ri, i) => (
                            <span
                              key={i}
                              className="bg-slate-100 dark:bg-zinc-800/80 text-foreground text-[11px] font-bold px-2 py-0.5 rounded-lg border border-glass-border"
                            >
                              {ri.item_title_ar}
                            </span>
                          ))}
                          {targetItems.length > 4 && (
                            <span className="text-[11px] font-black text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-lg">
                              +{targetItems.length - 4} {isAr ? "أصناف أخرى" : "more"}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-4 bg-slate-50 dark:bg-black/20 border-t border-glass-border flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {/* Duplicate button */}
                    <button
                      onClick={() => openDuplicate(p)}
                      title={isAr ? "تكرار العرض لإنشاء نسخة" : "Duplicate Offer"}
                      className="p-2 text-silver hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    {/* Edit button */}
                    <button
                      onClick={() => openEdit(p)}
                      title={isAr ? "تعديل العرض" : "Edit Offer"}
                      className="p-2 text-silver hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={() => setDeletingId(p.id)}
                      title={isAr ? "حذف العرض" : "Delete Offer"}
                      className="p-2 text-silver hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => openEdit(p)}
                    className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    <span>{isAr ? "تفاصيل وتعديل" : "Edit Details"}</span>
                    <span className="rtl:rotate-180">→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Form Modal (Create / Edit Offer) ── */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-glass-border overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-card/95 backdrop-blur px-6 py-4 border-b border-glass-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-foreground">
                    {editingId ? (isAr ? "تعديل بيانات العرض" : "Edit Promotion") : (isAr ? "إنشاء عرض جديد" : "Create New Promotion")}
                  </h3>
                  <p className="text-xs text-silver">
                    {isAr ? "حدد نوع العرض والشروط وستطبق تلقائياً على طلبات العملاء" : "Configure offer rules, targets, and discounts"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-2 text-silver hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-130px)]">
              {/* ── SECTION 1: Select Offer Type ── */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-silver flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isAr ? "1. اختر نوع العرض *" : "1. Select Offer Type *"}</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* BOGO Option */}
                  <button
                    type="button"
                    onClick={() => setDiscountType("buy_x_get_y")}
                    className={`relative p-4 rounded-2xl border-2 text-start flex flex-col justify-between gap-3 transition-all ${
                      discountType === "buy_x_get_y"
                        ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 shadow-md shadow-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                        : "border-glass-border hover:border-emerald-300 dark:hover:border-emerald-500/30 text-silver hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        discountType === "buy_x_get_y" ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-zinc-800 text-silver"
                      }`}>
                        <Gift className="w-5 h-5" />
                      </div>
                      {discountType === "buy_x_get_y" && (
                        <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                          {isAr ? "مختار" : "Selected"}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-black text-sm block mb-0.5 text-foreground">
                        {isAr ? "اشترى 1 وخد 1 مجاناً" : "Buy X Get Y Free"}
                      </span>
                      <p className="text-[11px] text-silver font-medium leading-snug">
                        {isAr ? "اشترى صنف واحصل على صنف مجاناً" : "Buy 1 get 1 free, buy 2 get 1, etc."}
                      </p>
                    </div>
                  </button>

                  {/* Percentage Option */}
                  <button
                    type="button"
                    onClick={() => setDiscountType("percentage")}
                    className={`relative p-4 rounded-2xl border-2 text-start flex flex-col justify-between gap-3 transition-all ${
                      discountType === "percentage"
                        ? "border-purple-500 bg-purple-50/80 dark:bg-purple-500/10 shadow-md shadow-purple-500/10 text-purple-900 dark:text-purple-200"
                        : "border-glass-border hover:border-purple-300 dark:hover:border-purple-500/30 text-silver hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        discountType === "percentage" ? "bg-purple-500 text-white" : "bg-slate-100 dark:bg-zinc-800 text-silver"
                      }`}>
                        <Percent className="w-5 h-5" />
                      </div>
                      {discountType === "percentage" && (
                        <span className="text-[10px] font-black bg-purple-500 text-white px-2 py-0.5 rounded-full">
                          {isAr ? "مختار" : "Selected"}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-black text-sm block mb-0.5 text-foreground">
                        {isAr ? "نسبة مئوية %" : "Percentage %"}
                      </span>
                      <p className="text-[11px] text-silver font-medium leading-snug">
                        {isAr ? "خصم نسبة مئوية من السعر" : "Discount a % off the order subtotal"}
                      </p>
                    </div>
                  </button>

                  {/* Fixed Amount Option */}
                  <button
                    type="button"
                    onClick={() => setDiscountType("fixed_amount")}
                    className={`relative p-4 rounded-2xl border-2 text-start flex flex-col justify-between gap-3 transition-all ${
                      discountType === "fixed_amount"
                        ? "border-blue-500 bg-blue-50/80 dark:bg-blue-500/10 shadow-md shadow-blue-500/10 text-blue-900 dark:text-blue-200"
                        : "border-glass-border hover:border-blue-300 dark:hover:border-blue-500/30 text-silver hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        discountType === "fixed_amount" ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-zinc-800 text-silver"
                      }`}>
                        <DollarSign className="w-5 h-5" />
                      </div>
                      {discountType === "fixed_amount" && (
                        <span className="text-[10px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full">
                          {isAr ? "مختار" : "Selected"}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-black text-sm block mb-0.5 text-foreground">
                        {isAr ? "مبلغ ثابت نقدياً" : "Fixed Amount"}
                      </span>
                      <p className="text-[11px] text-silver font-medium leading-snug">
                        {isAr ? `خصم قيمة محددة (مثل 30 ${currency})` : `Fixed discount (e.g. 50 ${currency})`}
                      </p>
                    </div>
                  </button>

                  {/* Free Shipping Option */}
                  <button
                    type="button"
                    onClick={() => setDiscountType("free_shipping")}
                    className={`relative p-4 rounded-2xl border-2 text-start flex flex-col justify-between gap-3 transition-all ${
                      discountType === "free_shipping"
                        ? "border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 shadow-md shadow-amber-500/10 text-amber-900 dark:text-amber-200"
                        : "border-glass-border hover:border-amber-300 dark:hover:border-amber-500/30 text-silver hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        discountType === "free_shipping" ? "bg-amber-500 text-white" : "bg-slate-100 dark:bg-zinc-800 text-silver"
                      }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      {discountType === "free_shipping" && (
                        <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">
                          {isAr ? "مختار" : "Selected"}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-black text-sm block mb-0.5 text-foreground">
                        {isAr ? "توصيل مجاني" : "Free Delivery"}
                      </span>
                      <p className="text-[11px] text-silver font-medium leading-snug">
                        {isAr ? "إعفاء العميل من مصاريف الشحن" : "Waive delivery fee for the customer"}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* ── SECTION 2: Offer Value & Parameters ── */}
              <div className="bg-slate-50 dark:bg-black/20 p-5 rounded-2xl border border-glass-border space-y-4">
                {/* When BOGO is selected */}
                {discountType === "buy_x_get_y" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-foreground flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-emerald-600" />
                        <span>{isAr ? "إعدادات كميات عرض (اشترى و احصل مجاناً):" : "BOGO Quantities:"}</span>
                      </span>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5">
                        {[
                          { b: 1, g: 1, label: isAr ? "1+1 مجاناً" : "1+1 Free" },
                          { b: 2, g: 1, label: isAr ? "2+1 مجاناً" : "2+1 Free" },
                          { b: 3, g: 1, label: isAr ? "3+1 مجاناً" : "3+1 Free" },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setBogoBuyQty(preset.b);
                              setBogoGetQty(preset.g);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                              bogoBuyQty === preset.b && bogoGetQty === preset.g
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-white dark:bg-zinc-800 text-silver border border-glass-border hover:border-emerald-400"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Buy Qty */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-silver block">
                          {isAr ? "اشتري عدد (الكمية المطلوب شراؤها) *" : "Buy Quantity (Paid quantity) *"}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={bogoBuyQty}
                            onChange={(e) => setBogoBuyQty(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-glass-border focus:border-emerald-500 outline-none font-black text-lg text-foreground tabular-nums text-center"
                          />
                          <span className="absolute rtl:left-3 ltr:right-3 top-3.5 text-xs font-bold text-silver">
                            {isAr ? "أصناف" : "items"}
                          </span>
                        </div>
                      </div>

                      {/* Get Free Qty */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-silver block">
                          {isAr ? "احصل على عدد (الكمية المجانية) *" : "Get Free Quantity *"}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={bogoGetQty}
                            onChange={(e) => setBogoGetQty(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-glass-border focus:border-emerald-500 outline-none font-black text-lg text-emerald-600 dark:text-emerald-400 tabular-nums text-center"
                          />
                          <span className="absolute rtl:left-3 ltr:right-3 top-3.5 text-xs font-bold text-emerald-600">
                            {isAr ? "مجاناً 🎁" : "FREE 🎁"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Explanatory Banner */}
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {isAr
                          ? `💡 القاعدة: عند طلب كل ${bogoBuyQty + bogoGetQty} أصناف في السلة، يتم خصم ثمن ${bogoGetQty} صنف بالكامل (تلقائياً لأقل سعر)!`
                          : `💡 Rule: For every ${bogoBuyQty + bogoGetQty} eligible items in cart, ${bogoGetQty} item(s) are given 100% free!`}
                      </span>
                    </div>
                  </div>
                )}

                {/* When Percentage is selected */}
                {discountType === "percentage" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-silver">
                        {isAr ? "نسبة الخصم المئوية % *" : "Percentage Discount % *"}
                      </label>
                      <div className="flex items-center gap-1">
                        {[10, 15, 20, 25, 30, 50].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setDiscountValue(pct)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                              discountValue === pct
                                ? "bg-purple-600 text-white"
                                : "bg-white dark:bg-zinc-800 text-silver hover:border-purple-300 border border-glass-border"
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={discountValue || ""}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                        placeholder="20"
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-glass-border focus:border-purple-500 outline-none font-black text-lg text-foreground tabular-nums text-center"
                      />
                      <span className="absolute rtl:left-4 ltr:right-4 top-3.5 text-base font-black text-purple-600">
                        %
                      </span>
                    </div>
                  </div>
                )}

                {/* When Fixed Amount is selected */}
                {discountType === "fixed_amount" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-silver">
                        {isAr ? `مبلغ الخصم (${currency}) *` : `Discount Amount (${currency}) *`}
                      </label>
                      <div className="flex items-center gap-1">
                        {[10, 20, 30, 50, 100].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDiscountValue(val)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                              discountValue === val
                                ? "bg-blue-600 text-white"
                                : "bg-white dark:bg-zinc-800 text-silver hover:border-blue-300 border border-glass-border"
                            }`}
                          >
                            {val} {currency}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={discountValue || ""}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                        placeholder="50"
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-glass-border focus:border-blue-500 outline-none font-black text-lg text-foreground tabular-nums text-center"
                      />
                      <span className="absolute rtl:left-4 ltr:right-4 top-3.5 text-base font-black text-blue-600">
                        {currency}
                      </span>
                    </div>
                  </div>
                )}

                {/* Additional Optional Parameters: Min Order & Bundle Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-glass-border">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-silver">
                      {isAr ? `الحد الأدنى للطلب (${currency}) - اختياري` : `Min Order Amount (${currency}) - optional`}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minOrder || ""}
                      onChange={(e) => setMinOrder(parseFloat(e.target.value) || 0)}
                      placeholder={isAr ? "مثال: 150" : "e.g. 150"}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-glass-border focus:border-amber-500 outline-none text-sm font-bold text-foreground"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-silver">
                      {isAr ? `سعر محدد للباقة (${currency}) - اختياري` : `Bundle Fixed Price (${currency}) - optional`}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={bundlePrice || ""}
                      onChange={(e) => setBundlePrice(parseFloat(e.target.value) || undefined)}
                      placeholder={isAr ? "مثال: 250" : "e.g. 250"}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-glass-border focus:border-amber-500 outline-none text-sm font-bold text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTION 3: Basic Info (Names & Descriptions) ── */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-wider text-silver flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isAr ? "2. تفاصيل العرض *" : "2. Offer Details *"}</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-silver">
                      {isAr ? "اسم العرض (عربي) *" : "Offer Name (Arabic) *"}
                    </label>
                    <input
                      value={nameAr}
                      onChange={(e) => setNameAr(e.target.value)}
                      placeholder={
                        discountType === "buy_x_get_y"
                          ? isAr
                            ? "مثال: عرض اشترى 1 بيتزا وخد 1 مجاناً"
                            : "e.g. Buy 1 Pizza Get 1 Free"
                          : isAr
                          ? "مثال: خصم نهاية الأسبوع 20%"
                          : "e.g. Weekend Deal 20%"
                      }
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none font-bold text-foreground text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-silver">
                      {isAr ? "اسم العرض (إنجليزي) - اختياري" : "Offer Name (English) - optional"}
                    </label>
                    <input
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      dir="ltr"
                      placeholder="Buy 1 Get 1 Free"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none font-bold text-foreground text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-silver">
                      {isAr ? "وصف العرض (عربي)" : "Description (Arabic)"}
                    </label>
                    <textarea
                      value={descAr}
                      onChange={(e) => setDescAr(e.target.value)}
                      rows={2}
                      placeholder={isAr ? "اكتب نبذة توضيحية لعملائك عن العرض..." : "Offer details for customers..."}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none text-xs text-foreground resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-silver">
                      {isAr ? "وصف العرض (إنجليزي)" : "Description (English)"}
                    </label>
                    <textarea
                      value={descEn}
                      onChange={(e) => setDescEn(e.target.value)}
                      rows={2}
                      dir="ltr"
                      placeholder="Offer details in English..."
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none text-xs text-foreground resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTION 4: Eligible Items ── */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-silver flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isAr ? "3. الأصناف المشمولة بالعرض *" : "3. Eligible Menu Items *"}</span>
                </label>

                {/* All Menu Toggle Switch */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-black/20 border border-glass-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      allItems ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-zinc-800 text-silver"
                    }`}>
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-black text-foreground block">
                        {isAr ? "تطبيق العرض على كل أصناف المنيو" : "Apply to the Entire Menu"}
                      </span>
                      <p className="text-[11px] text-silver font-medium">
                        {allItems
                          ? isAr
                            ? "العرض يطبّق على أي صنف حالي وأي صنف يتم إضافته مستقبلاً"
                            : "Applies to all current items and any added in the future"
                          : isAr
                          ? "اختر أصنافاً أو أقساماً محددة من الأسفل"
                          : "Select specific categories or items below"}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={allItems}
                      onChange={(e) => setAllItems(e.target.checked)}
                    />
                    <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Specific Item Selection Picker */}
                {!allItems && (
                  <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-glass-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-silver">
                        {selectedItems.length > 0
                          ? isAr
                            ? `تم تحديد ${selectedItems.length} صنف للعرض`
                            : `${selectedItems.length} items selected`
                          : isAr
                          ? "حدد الأصناف التي يشملها العرض:"
                          : "Select items for this offer:"}
                      </span>

                      <button
                        type="button"
                        onClick={() => setShowItemPicker(!showItemPicker)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white font-bold text-xs rounded-xl shadow hover:bg-amber-600 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{showItemPicker ? (isAr ? "إخفاء القائمة" : "Hide Picker") : (isAr ? "إضافة / اختيار أصناف" : "Pick Items")}</span>
                      </button>
                    </div>

                    {/* Expandable item picker box */}
                    {showItemPicker && (
                      <div className="space-y-3 pt-2 border-t border-glass-border">
                        {/* Quick category buttons */}
                        {categories.length > 0 && (
                          <div>
                            <span className="text-[11px] font-bold text-silver block mb-1.5">
                              {isAr ? "اختيار قسم كامل بضغطة زر:" : "Select full category:"}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={addAllAvailableItems}
                                className="px-3 py-1 rounded-xl text-xs font-bold border border-dashed border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition"
                              >
                                {isAr ? "✨ اختيار كل أصناف المنيو" : "✨ Select All Items"}
                              </button>
                              {categories.map((cat) => {
                                const catItemCount = menuItems.filter((i) => i.category_id === cat.id).length;
                                const selectedCount = menuItems.filter(
                                  (i) => i.category_id === cat.id && selectedItems.find((s) => s.item_id === i.id)
                                ).length;
                                const allSelected = selectedCount === catItemCount && catItemCount > 0;

                                return (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => (allSelected ? removeCategoryItems(cat.id) : addCategory(cat.id))}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                                      allSelected
                                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                        : "bg-white dark:bg-zinc-800 text-foreground border-glass-border hover:border-amber-400"
                                    }`}
                                  >
                                    <span>{cat.name_ar}</span>
                                    <span
                                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                        allSelected ? "bg-white/30 text-white" : "bg-slate-200 dark:bg-zinc-700 text-silver"
                                      }`}
                                    >
                                      {selectedCount}/{catItemCount}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Search & Category Tabs */}
                        <div className="space-y-2">
                          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                            <button
                              type="button"
                              onClick={() => setFilterCatId(null)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                                !filterCatId ? "bg-amber-500 text-white" : "bg-white dark:bg-zinc-800 text-silver border border-glass-border"
                              }`}
                            >
                              {isAr ? "الكل" : "All"}
                            </button>
                            {categories.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setFilterCatId(filterCatId === cat.id ? null : cat.id)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                                  filterCatId === cat.id
                                    ? "bg-amber-500 text-white"
                                    : "bg-white dark:bg-zinc-800 text-silver border border-glass-border"
                                }`}
                              >
                                {cat.name_ar}
                              </button>
                            ))}
                          </div>

                          <div className="relative">
                            <Search className="absolute right-3 rtl:right-3 ltr:left-3 top-2.5 w-4 h-4 text-silver" />
                            <input
                              value={itemSearch}
                              onChange={(e) => setItemSearch(e.target.value)}
                              placeholder={isAr ? "ابحث عن صنف بالاسم..." : "Search item by name..."}
                              className="w-full rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-glass-border text-xs font-bold text-foreground outline-none"
                            />
                          </div>

                          {/* Items List */}
                          <div className="max-h-52 overflow-y-auto rounded-xl border border-glass-border bg-white dark:bg-zinc-900 divide-y divide-glass-border">
                            {filteredMenuItems.map((item) => {
                              const isSelected = !!selectedItems.find((s) => s.item_id === item.id);
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => (isSelected ? removeItem(item.id) : addItem(item))}
                                  className={`w-full text-start px-3.5 py-2.5 transition flex justify-between items-center ${
                                    isSelected
                                      ? "bg-amber-50/70 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200"
                                      : "hover:bg-slate-50 dark:hover:bg-zinc-800/60"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                                        isSelected ? "border-amber-500 bg-amber-500 text-white" : "border-zinc-300 dark:border-zinc-600"
                                      }`}
                                    >
                                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <div>
                                      <span className="font-bold text-xs text-foreground block">{item.title_ar}</span>
                                      {item.category_name && (
                                        <span className="text-[10px] text-silver font-medium">{item.category_name}</span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-xs font-black text-amber-600 tabular-nums">
                                    {item.prices?.[0]} {currency}
                                  </span>
                                </button>
                              );
                            })}
                            {filteredMenuItems.length === 0 && (
                              <p className="text-center text-silver text-xs py-4">{isAr ? "لا توجد أصناف مطابقة" : "No items found"}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Selected Items Tags */}
                    {selectedItems.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-amber-600">
                            {isAr ? `الأصناف المختارة (${selectedItems.length}):` : `Selected items (${selectedItems.length}):`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedItems([])}
                            className="text-[11px] font-bold text-red-500 hover:underline"
                          >
                            {isAr ? "إزالة الكل" : "Clear All"}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {selectedItems.map((si) => (
                            <div
                              key={si.item_id}
                              className="flex items-center gap-1.5 bg-amber-100/70 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 px-2.5 py-1 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-500/30"
                            >
                              <span>{si.item_title_ar}</span>
                              <button
                                type="button"
                                onClick={() => removeItem(si.item_id)}
                                className="p-0.5 text-amber-700 dark:text-amber-300 hover:text-red-500 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── SECTION 5: Coupon Code & Scheduling ── */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-wider text-silver flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isAr ? "4. كود الخصم والمواعيد" : "4. Coupon & Schedule"}</span>
                </label>

                {/* Promo Code Toggle */}
                <div className="space-y-3 bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-glass-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-black text-foreground block">
                        {isAr ? "يتطلب كود خصم (كوبون) للتفعيل" : "Requires Promo Code (Coupon)"}
                      </span>
                      <p className="text-[11px] text-silver font-medium">
                        {requiresCode
                          ? isAr
                            ? "العرض مقفل بكود — يجب على العميل كتابة الكود عند الدفع"
                            : "Offer requires the customer to type this coupon code at checkout"
                          : isAr
                          ? "العرض يُطبق تلقائياً على أي طلب يستوفي الشروط"
                          : "Offer applies automatically to eligible carts"}
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={requiresCode}
                        onChange={(e) => {
                          setRequiresCode(e.target.checked);
                          if (e.target.checked && !promoCode) generateAutoCode();
                        }}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {requiresCode && (
                    <div className="flex items-center gap-2 pt-2 border-t border-glass-border">
                      <div className="relative flex-1">
                        <Ticket className="absolute right-3 rtl:right-3 ltr:left-3 top-3 w-4 h-4 text-silver" />
                        <input
                          type="text"
                          dir="ltr"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.replace(/\s/g, "").toUpperCase().slice(0, 20))}
                          placeholder="SAVE10"
                          className="w-full rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-glass-border focus:border-blue-500 outline-none font-black text-sm tracking-widest uppercase text-foreground"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={generateAutoCode}
                        className="px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 transition whitespace-nowrap"
                      >
                        {isAr ? "توليد كود تلقائي" : "Generate Code"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Scheduling Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-silver">
                      {isAr ? "تاريخ بداية العرض (اختياري)" : "Start Date (optional)"}
                    </label>
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none text-xs font-bold text-foreground"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-silver">
                      {isAr ? "تاريخ نهاية العرض (اختياري)" : "End Date (optional)"}
                    </label>
                    <input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-amber-500 outline-none text-xs font-bold text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTION 6: Live Card Preview ── */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 border border-dashed border-amber-300 dark:border-amber-500/20 space-y-2">
                <span className="text-[11px] font-black uppercase text-amber-600 block">
                  {isAr ? "معاينة حية لشكل العرض:" : "Live Offer Preview:"}
                </span>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-glass-border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                      {discountType === "buy_x_get_y" ? (
                        <Gift className="w-5 h-5" />
                      ) : discountType === "percentage" ? (
                        <Percent className="w-5 h-5" />
                      ) : discountType === "free_shipping" ? (
                        <Truck className="w-5 h-5" />
                      ) : (
                        <DollarSign className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-foreground block">
                        {nameAr.trim() || (isAr ? "اسم العرض هنا" : "Offer Name")}
                      </span>
                      <span className="text-xs text-silver font-medium">
                        {discountType === "buy_x_get_y"
                          ? isAr
                            ? `اشتري ${bogoBuyQty} واحصل على ${bogoGetQty} مجاناً 🎁`
                            : `Buy ${bogoBuyQty} Get ${bogoGetQty} Free 🎁`
                          : discountType === "percentage"
                          ? isAr
                            ? `خصم ${discountValue}% على الطلب`
                            : `${discountValue}% OFF`
                          : discountType === "fixed_amount"
                          ? isAr
                            ? `خصم ${discountValue} ${currency} نقدياً`
                            : `${discountValue} ${currency} OFF`
                          : isAr
                          ? "توصيل وشحن مجاني 🚚"
                          : "Free Delivery 🚚"}
                      </span>
                    </div>
                  </div>

                  {requiresCode && promoCode && (
                    <span className="text-xs font-black tracking-widest bg-blue-50 dark:bg-blue-500/10 text-blue-600 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-500/20">
                      {promoCode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 bg-white dark:bg-card border-t border-glass-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-5 py-2.5 text-silver font-bold text-sm hover:text-foreground transition rounded-xl"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !nameAr.trim()}
                className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100 active:scale-95"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : editingId ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "تأكيد وإنشاء العرض" : "Create Offer")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingId && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-card rounded-3xl shadow-2xl p-6 sm:p-7 max-w-sm w-full text-center border border-glass-border">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black mb-2 text-foreground">
              {isAr ? "حذف هذا العرض؟" : "Delete this promotion?"}
            </h3>
            <p className="text-xs text-silver font-medium mb-6">
              {isAr
                ? "سيتم إيقاف وحذف العرض نهائياً ولن يتم تطبيقه على طلبات العملاء القادمة."
                : "This offer will be permanently removed and no longer applied."}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition shadow-md shadow-red-500/20 text-sm"
              >
                {isAr ? "نعم، حذف العرض" : "Yes, Delete"}
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-silver font-bold hover:text-foreground transition text-sm"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
