"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { getProxiedImageUrl } from "@/lib/imageProxy";

export interface PromotionalPopupConfig {
    enabled?: boolean;
    title?: string;
    description?: string;
    image_url?: string;
    button_text?: string;
    target_category_id?: string;
}

interface ThemePromotionalPopupProps {
    config: any;
    categories?: any[];
    restaurantId?: string;
    isAr?: boolean;
    primaryColor?: string;
}

export default function ThemePromotionalPopup({
    config,
    categories = [],
    restaurantId,
    isAr = true,
    primaryColor: propPrimaryColor,
}: ThemePromotionalPopupProps) {
    const [showPopup, setShowPopup] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Extract theme colors
    const tc = (typeof config?.theme_colors === 'string'
        ? (() => { try { return JSON.parse(config.theme_colors); } catch { return {}; } })()
        : config?.theme_colors) || {};

    const primaryColor = propPrimaryColor || tc.primary || config?.primary_color || '#f97316';

    // 1. Universal popup config (from dedicated popup settings page)
    const promoPopup: PromotionalPopupConfig | null = tc.promo_popup || config?.promo_popup || null;

    // 2. Specific theme configs (Theme 27 / Theme 28)
    const theme27Popup: PromotionalPopupConfig | null = tc.theme27_popup || config?.theme27_popup || null;
    const theme28Popup: PromotionalPopupConfig | null = tc.theme28_popup || config?.theme28_popup || null;

    const currentTheme = config?.theme || "";
    const isTheme27 = currentTheme.startsWith("lamet-zaman-compact") || currentTheme.startsWith("theme27");
    const isTheme28 = currentTheme.startsWith("theme28");

    // Enable condition:
    // Disabled by default UNLESS activated by user in the universal popup settings (promoPopup.enabled === true)
    // OR activated in its theme settings (theme27Popup.enabled if theme 27, theme28Popup.enabled if theme 28).
    const isEnabled = Boolean(
        promoPopup?.enabled ||
        (isTheme27 && theme27Popup?.enabled) ||
        (isTheme28 && theme28Popup?.enabled)
    );

    // Consolidated popup details: prefer universal config, fall back to theme-specific config
    const activePopupConfig: PromotionalPopupConfig = {
        enabled: isEnabled,
        title: (promoPopup?.title ?? (isTheme27 ? theme27Popup?.title : isTheme28 ? theme28Popup?.title : undefined)) || promoPopup?.title || theme27Popup?.title || theme28Popup?.title || "",
        description: (promoPopup?.description ?? (isTheme27 ? theme27Popup?.description : isTheme28 ? theme28Popup?.description : undefined)) || promoPopup?.description || theme27Popup?.description || theme28Popup?.description || "",
        image_url: (promoPopup?.image_url ?? (isTheme27 ? theme27Popup?.image_url : isTheme28 ? theme28Popup?.image_url : undefined)) || promoPopup?.image_url || theme27Popup?.image_url || theme28Popup?.image_url || "",
        button_text: (promoPopup?.button_text ?? (isTheme27 ? theme27Popup?.button_text : isTheme28 ? theme28Popup?.button_text : undefined)) || promoPopup?.button_text || theme27Popup?.button_text || theme28Popup?.button_text || (isAr ? "تصفح العرض الآن" : "View Offer Now"),
        target_category_id: (promoPopup?.target_category_id ?? (isTheme27 ? theme27Popup?.target_category_id : isTheme28 ? theme28Popup?.target_category_id : undefined)) || promoPopup?.target_category_id || theme27Popup?.target_category_id || theme28Popup?.target_category_id || ""
    };

    const targetRestId = restaurantId || config?.id || "default";
    const storageKey = `promo_popup_${targetRestId}`;

    useEffect(() => {
        if (typeof window !== "undefined") {
            const checkDark = () => {
                const isHtmlDark = document.documentElement.classList.contains("dark");
                const configDark = config?.default_theme_mode === "dark";
                setIsDarkMode(isHtmlDark || configDark);
            };
            checkDark();
        }
    }, [config?.default_theme_mode]);

    useEffect(() => {
        if (!isEnabled) {
            setShowPopup(false);
            return;
        }

        if (typeof window !== "undefined") {
            const dismissedGlobal = sessionStorage.getItem(storageKey);
            const dismissed27 = isTheme27 ? sessionStorage.getItem(`theme27_popup_${targetRestId}`) : null;
            const dismissed28 = isTheme28 ? sessionStorage.getItem(`theme28_popup_${targetRestId}`) : null;

            if (!dismissedGlobal && !dismissed27 && !dismissed28) {
                const timer = setTimeout(() => setShowPopup(true), 700);
                return () => clearTimeout(timer);
            }
        }
    }, [isEnabled, storageKey, targetRestId, isTheme27, isTheme28]);

    const handleDismiss = () => {
        setShowPopup(false);
        if (typeof window !== "undefined") {
            sessionStorage.setItem(storageKey, "1");
            sessionStorage.setItem(`theme27_popup_${targetRestId}`, "1");
            sessionStorage.setItem(`theme28_popup_${targetRestId}`, "1");
        }
    };

    const handleCtaClick = () => {
        handleDismiss();

        const catId = activePopupConfig.target_category_id;
        if (catId) {
            setTimeout(() => {
                // Find category section in any theme layout
                const targetElement =
                    document.getElementById(`cat-${catId}`) ||
                    document.getElementById(`cat-section-${catId}`) ||
                    document.getElementById(`cat-sec-${catId}`) ||
                    document.getElementById(`category-${catId}`) ||
                    document.getElementById(`cat_section_${catId}`) ||
                    document.getElementById(catId) ||
                    document.querySelector(`[data-category-id="${catId}"]`) ||
                    document.querySelector(`[data-cat-id="${catId}"]`);

                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
                }

                // Also trigger category tab click if available in the theme
                const navButton =
                    document.getElementById(`compact-nav-cat-${catId}`) ||
                    document.getElementById(`nav-cat-${catId}`) ||
                    document.getElementById(`cat-tab-${catId}`) ||
                    document.querySelector(`button[data-category-id="${catId}"]`) ||
                    document.querySelector(`[data-cat-tab="${catId}"]`);

                if (navButton && typeof (navButton as HTMLElement).click === "function") {
                    (navButton as HTMLElement).click();
                }
            }, 100);
        }
    };

    if (!isEnabled) return null;

    const bgCard = isDarkMode ? "#18181b" : "#ffffff";
    const textMain = isDarkMode ? "#ffffff" : "#09090b";
    const textMuted = isDarkMode ? "#a1a1aa" : "#64748b";

    return (
        <>
            <AnimatePresence>
                {showPopup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[600] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                        onClick={handleDismiss}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                            className="w-full max-w-sm sm:max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-white/10 my-auto"
                            style={{ backgroundColor: bgCard }}
                            onClick={(e) => e.stopPropagation()}
                            dir={isAr ? "rtl" : "ltr"}
                        >
                            {/* Close button */}
                            <button
                                onClick={handleDismiss}
                                aria-label={isAr ? "إغلاق" : "Close"}
                                className={`absolute top-3.5 ${isAr ? "left-3.5" : "right-3.5"} z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all backdrop-blur-sm shadow-md active:scale-90`}
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Banner Image or Gradient Header */}
                            {activePopupConfig.image_url ? (
                                <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-black/10">
                                    <img
                                        src={getProxiedImageUrl(activePopupConfig.image_url)}
                                        alt="Special Promo"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                                    <div className={`absolute bottom-3 ${isAr ? "right-4" : "left-4"} text-white`}>
                                        <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full inline-block shadow-sm">
                                            {isAr ? "عرض خاص لفترة محدودة" : "Special Limited Offer"}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="p-4 text-white flex items-center justify-between"
                                    style={{
                                        background: `linear-gradient(135deg, ${primaryColor}, #f59e0b)`
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-amber-200" />
                                        <span className="font-black text-sm">
                                            {isAr ? "عرض اليوم المميز" : "Special Offer of the Day"}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-5 sm:p-6 space-y-4 text-center">
                                <h3 className="font-black text-xl sm:text-2xl leading-snug" style={{ color: textMain }}>
                                    {activePopupConfig.title || (isAr ? "عروض خاصة بانتظارك!" : "Special Offers Await You!")}
                                </h3>

                                {activePopupConfig.description && (
                                    <p className="text-xs sm:text-sm leading-relaxed" style={{ color: textMuted }}>
                                        {activePopupConfig.description}
                                    </p>
                                )}

                                <div className="pt-2 flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCtaClick}
                                        className="w-full py-3 px-5 rounded-2xl font-black text-sm text-white shadow-lg transition-transform active:scale-95 hover:opacity-95"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {activePopupConfig.button_text || (isAr ? "تصفح العرض الآن" : "View Offer Now")}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDismiss}
                                        className="text-xs font-bold py-1.5 opacity-60 hover:opacity-100 transition-opacity"
                                        style={{ color: textMain }}
                                    >
                                        {isAr ? "إغلاق ومتابعة التصفح" : "Close and continue browsing"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Re-open Offers Pill */}
            {!showPopup && (
                <button
                    onClick={() => setShowPopup(true)}
                    className="fixed bottom-24 right-4 z-50 text-white rounded-full px-3.5 py-2 text-xs font-black shadow-xl flex items-center gap-1.5 active:scale-95 hover:scale-105 transition-all"
                    style={{
                        background: `linear-gradient(135deg, ${primaryColor}, #f59e0b)`
                    }}
                    dir={isAr ? "rtl" : "ltr"}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAr ? "العروض المميزة" : "Offers"}</span>
                </button>
            )}
        </>
    );
}
