"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/context/LanguageContext";
import { Palette, Save, Loader2, Eye, EyeOff, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Master list of all themes (same as dashboard/theme/page.tsx)
const ALL_THEMES = [
    // ===== Theme 1: PizzaPasta Family =====
    { id: "pizzapasta", name_ar: "ثيم 1 (بيتزا باستا - أزرق)", name_en: "Theme 1 (Pizza Pasta - Blue)", preview_color: "#3b82f6" },
    { id: "pizzapasta-cyan", name_ar: "ثيم 1 (بيتزا باستا - سماوي)", name_en: "Theme 1 (Pizza Pasta - Cyan)", preview_color: "#0891b2" },
    { id: "pizzapasta-red", name_ar: "ثيم 1 (بيتزا باستا - أحمر)", name_en: "Theme 1 (Pizza Pasta - Red)", preview_color: "#dc2626" },
    { id: "pizzapasta-emerald", name_ar: "ثيم 1 (بيتزا باستا - زمردي)", name_en: "Theme 1 (Pizza Pasta - Emerald)", preview_color: "#059669" },
    { id: "pizzapasta-sky", name_ar: "ثيم 1 (بيتزا باستا - أزرق sky)", name_en: "Theme 1 (Pizza Pasta - Sky)", preview_color: "#0284c7" },

    // ===== Theme 2: Atyab Oriental Family =====
    { id: "atyab-oriental", name_ar: "ثيم 2 (أطياب أورينتال - ذهبي)", name_en: "Theme 2 (Atyab Oriental - Gold)", preview_color: "#eab308" },
    { id: "atyab-oriental-cyan", name_ar: "ثيم 2 (أطياب أورينتال - سماوي)", name_en: "Theme 2 (Atyab Oriental - Cyan)", preview_color: "#0891b2" },
    { id: "atyab-oriental-red", name_ar: "ثيم 2 (أطياب أورينتال - أحمر)", name_en: "Theme 2 (Atyab Oriental - Red)", preview_color: "#dc2626" },
    { id: "atyab-oriental-emerald", name_ar: "ثيم 2 (أطياب أورينتال - زمردي)", name_en: "Theme 2 (Atyab Oriental - Emerald)", preview_color: "#059669" },
    { id: "atyab-oriental-sky", name_ar: "ثيم 2 (أطياب أورينتال - أزرق sky)", name_en: "Theme 2 (Atyab Oriental - Sky)", preview_color: "#0284c7" },

    // ===== Theme 3: BabAlHara Family =====
    { id: "bab-alhara", name_ar: "ثيم 3 (باب الحارة - أحمر)", name_en: "Theme 3 (Bab Al-Hara - Red)", preview_color: "#e31e24" },
    { id: "bab-alhara-cyan", name_ar: "ثيم 3 (باب الحارة - سماوي)", name_en: "Theme 3 (Bab Al-Hara - Cyan)", preview_color: "#0891b2" },
    { id: "bab-alhara-red", name_ar: "ثيم 3 (باب الحارة - أحمر داكن)", name_en: "Theme 3 (Bab Al-Hara - Dark Red)", preview_color: "#dc2626" },
    { id: "bab-alhara-emerald", name_ar: "ثيم 3 (باب الحارة - زمردي)", name_en: "Theme 3 (Bab Al-Hara - Emerald)", preview_color: "#059669" },
    { id: "bab-alhara-sky", name_ar: "ثيم 3 (باب الحارة - أزرق sky)", name_en: "Theme 3 (Bab Al-Hara - Sky)", preview_color: "#0284c7" },

    // ===== Theme 4: AtyabEtoile Family =====
    { id: "atyab-etoile", name_ar: "ثيم 4 (أطياب إتوال - ذهبي)", name_en: "Theme 4 (Atyab Etoile - Gold)", preview_color: "#B89038" },
    { id: "atyab-etoile-cyan", name_ar: "ثيم 4 (أطياب إتوال - سماوي)", name_en: "Theme 4 (Atyab Etoile - Cyan)", preview_color: "#0891b2" },
    { id: "atyab-etoile-red", name_ar: "ثيم 4 (أطياب إتوال - أحمر)", name_en: "Theme 4 (Atyab Etoile - Red)", preview_color: "#dc2626" },
    { id: "atyab-etoile-emerald", name_ar: "ثيم 4 (أطياب إتوال - زمردي)", name_en: "Theme 4 (Atyab Etoile - Emerald)", preview_color: "#059669" },
    { id: "atyab-etoile-sky", name_ar: "ثيم 4 (أطياب إتوال - أزرق sky)", name_en: "Theme 4 (Atyab Etoile - Sky)", preview_color: "#0284c7" },

    // ===== Theme 5 Family =====
    { id: "theme5", name_ar: "ثيم 5 (برتقالي)", name_en: "Theme 5 (Orange)", preview_color: "#ea580c" },
    { id: "theme5-cyan", name_ar: "ثيم 5 (سماوي)", name_en: "Theme 5 (Cyan)", preview_color: "#0891b2" },
    { id: "theme5-red", name_ar: "ثيم 5 (أحمر)", name_en: "Theme 5 (Red)", preview_color: "#dc2626" },
    { id: "theme5-emerald", name_ar: "ثيم 5 (زمردي)", name_en: "Theme 5 (Emerald)", preview_color: "#059669" },
    { id: "theme5-sky", name_ar: "ثيم 5 (أزرق sky)", name_en: "Theme 5 (Sky)", preview_color: "#0284c7" },

    // ===== Theme 6 Family =====
    { id: "theme6", name_ar: "ثيم 6 (فراندة - تيل)", name_en: "Theme 6 (Veranda - Teal)", preview_color: "#40a798" },
    { id: "theme6-cyan", name_ar: "ثيم 6 (سماوي)", name_en: "Theme 6 (Cyan)", preview_color: "#0891b2" },
    { id: "theme6-red", name_ar: "ثيم 6 (أحمر)", name_en: "Theme 6 (Red)", preview_color: "#dc2626" },
    { id: "theme6-emerald", name_ar: "ثيم 6 (زمردي)", name_en: "Theme 6 (Emerald)", preview_color: "#059669" },
    { id: "theme6-sky", name_ar: "ثيم 6 (أزرق sky)", name_en: "Theme 6 (Sky)", preview_color: "#0284c7" },

    // ===== Theme 7 Family =====
    { id: "theme7", name_ar: "ثيم 7 (حليم - داكن ذهبي)", name_en: "Theme 7 (Haleem - Dark Gold)", preview_color: "#c9a84c" },
    { id: "theme7-cyan", name_ar: "ثيم 7 (سماوي)", name_en: "Theme 7 (Cyan)", preview_color: "#0891b2" },
    { id: "theme7-red", name_ar: "ثيم 7 (أحمر)", name_en: "Theme 7 (Red)", preview_color: "#dc2626" },
    { id: "theme7-emerald", name_ar: "ثيم 7 (زمردي)", name_en: "Theme 7 (Emerald)", preview_color: "#059669" },
    { id: "theme7-sky", name_ar: "ثيم 7 (أزرق sky)", name_en: "Theme 7 (Sky)", preview_color: "#0284c7" },

    // ===== Theme 8: ASWAN Family =====
    { id: "aswan", name_ar: "ثيم 8 (أسوان إنجليزي - بيج غامق)", name_en: "Theme 8 (ASWAN EN - Dark Beige)", preview_color: "#B89B72" },
    { id: "aswan-cyan", name_ar: "ثيم 8 (أسوان إنجليزي - سماوي)", name_en: "Theme 8 (ASWAN EN - Cyan)", preview_color: "#06b6d4" },
    { id: "aswan-emerald", name_ar: "ثيم 8 (أسوان إنجليزي - زمردي)", name_en: "Theme 8 (ASWAN EN - Emerald)", preview_color: "#10b981" },
    { id: "aswan-red", name_ar: "ثيم 8 (أسوان إنجليزي - ياقوتي أحمر)", name_en: "Theme 8 (ASWAN EN - Red)", preview_color: "#ef4444" },
    { id: "aswan-purple", name_ar: "ثيم 8 (أسوان إنجليزي - بنفسجي)", name_en: "Theme 8 (ASWAN EN - Purple)", preview_color: "#8b5cf6" },
    { id: "aswan-gold", name_ar: "ثيم 8 (أسوان إنجليزي - ذهبي)", name_en: "Theme 8 (ASWAN EN - Gold)", preview_color: "#d4af37" },
    { id: "aswan-dark", name_ar: "ثيم 8 (أسوان إنجليزي - داكن)", name_en: "Theme 8 (ASWAN EN - Dark)", preview_color: "#f59e0b" },

    // ===== Theme 9: Diablo Family =====
    { id: "theme9", name_ar: "ثيم 9 (ديابلو - أحمر)", name_en: "Theme 9 (Diablo - Red)", preview_color: "#e74c3c" },
    { id: "theme9-cyan", name_ar: "ثيم 9 (ديابلو - سماوي)", name_en: "Theme 9 (Diablo - Cyan)", preview_color: "#0891b2" },
    { id: "theme9-red", name_ar: "ثيم 9 (ديابلو - أحمر داكن)", name_en: "Theme 9 (Diablo - Dark Red)", preview_color: "#dc2626" },
    { id: "theme9-emerald", name_ar: "ثيم 9 (ديابلو - زمردي)", name_en: "Theme 9 (Diablo - Emerald)", preview_color: "#059669" },
    { id: "theme9-sky", name_ar: "ثيم 9 (ديابلو - أزرق sky)", name_en: "Theme 9 (Diablo - Sky)", preview_color: "#0284c7" },
    { id: "theme9-pink", name_ar: "ثيم 9 (ديابلو - وردي)", name_en: "Theme 9 (Diablo - Pink)", preview_color: "#ec4899" },
    { id: "theme9-gold", name_ar: "ثيم 9 (ديابلو - ذهبي)", name_en: "Theme 9 (Diablo - Gold)", preview_color: "#D4A017" },

    // ===== Theme 10 Family =====
    { id: "theme10", name_ar: "ثيم 10 (الوهج البرتقالي)", name_en: "Theme 10 (Orange Glow)", preview_color: "#ea580c" },
    { id: "theme10-cyan", name_ar: "ثيم 10 (سماوي)", name_en: "Theme 10 (Cyan)", preview_color: "#0891b2" },
    { id: "theme10-red", name_ar: "ثيم 10 (أحمر)", name_en: "Theme 10 (Red)", preview_color: "#dc2626" },
    { id: "theme10-emerald", name_ar: "ثيم 10 (زمردي)", name_en: "Theme 10 (Emerald)", preview_color: "#059669" },
    { id: "theme10-sky", name_ar: "ثيم 10 (أزرق sky)", name_en: "Theme 10 (Sky)", preview_color: "#0284c7" },

    // ===== Theme 11 Family =====
    { id: "theme11", name_ar: "ثيم 11 (عصري أفقي - أحمر)", name_en: "Theme 11 (Luxe Horizontal - Red)", preview_color: "#e54750" },
    { id: "theme11-cyan", name_ar: "ثيم 11 (سماوي)", name_en: "Theme 11 (Cyan)", preview_color: "#0891b2" },
    { id: "theme11-red", name_ar: "ثيم 11 (أحمر)", name_en: "Theme 11 (Red)", preview_color: "#dc2626" },
    { id: "theme11-emerald", name_ar: "ثيم 11 (زمردي)", name_en: "Theme 11 (Emerald)", preview_color: "#059669" },
    { id: "theme11-sky", name_ar: "ثيم 11 (أزرق sky)", name_en: "Theme 11 (Sky)", preview_color: "#0284c7" },

    // ===== Theme 12 Family =====
    { id: "theme12", name_ar: "ثيم 12 (العام الجديد - RGB)", name_en: "Theme 12 (New Year - RGB)", preview_color: "#6c63ff" },

    // ===== Theme 13 Family =====
    { id: "theme13", name_ar: "ثيم 13 (لوكس الذهبي)", name_en: "Theme 13 (Luxe Gold)", preview_color: "#d4af37" },
    { id: "theme13-cyan", name_ar: "ثيم 13 (سماوي)", name_en: "Theme 13 (Cyan)", preview_color: "#0891b2" },
    { id: "theme13-red", name_ar: "ثيم 13 (أحمر)", name_en: "Theme 13 (Red)", preview_color: "#dc2626" },
    { id: "theme13-emerald", name_ar: "ثيم 13 (زمردي)", name_en: "Theme 13 (Emerald)", preview_color: "#059669" },
    { id: "theme13-sky", name_ar: "ثيم 13 (أزرق sky)", name_en: "Theme 13 (Sky)", preview_color: "#0284c7" },

    // ===== Theme 14: ASWAN Arabic Family =====
    { id: "aswan-ar", name_ar: "ثيم 14 (أسوان عربي - بيج غامق)", name_en: "Theme 14 (ASWAN AR - Dark Beige)", preview_color: "#B89B72" },
    { id: "aswan-ar-cyan", name_ar: "ثيم 14 (أسوان عربي - سماوي)", name_en: "Theme 14 (ASWAN AR - Cyan)", preview_color: "#06b6d4" },
    { id: "aswan-ar-emerald", name_ar: "ثيم 14 (أسوان عربي - زمردي)", name_en: "Theme 14 (ASWAN AR - Emerald)", preview_color: "#10b981" },
    { id: "aswan-ar-red", name_ar: "ثيم 14 (أسوان عربي - ياقوتي أحمر)", name_en: "Theme 14 (ASWAN AR - Red)", preview_color: "#ef4444" },
    { id: "aswan-ar-purple", name_ar: "ثيم 14 (أسوان عربي - بنفسجي)", name_en: "Theme 14 (ASWAN AR - Purple)", preview_color: "#8b5cf6" },
    { id: "aswan-ar-gold", name_ar: "ثيم 14 (أسوان عربي - ذهبي)", name_en: "Theme 14 (ASWAN AR - Gold)", preview_color: "#d4af37" },
    { id: "aswan-ar-dark", name_ar: "ثيم 14 (أسوان عربي - داكن)", name_en: "Theme 14 (ASWAN AR - Dark)", preview_color: "#f59e0b" },

    // ===== Theme 15: ASWAN Dual Family =====
    { id: "aswan-dual", name_ar: "ثيم 15 (أسوان ثنائي - بيج غامق)", name_en: "Theme 15 (ASWAN Dual - Dark Beige)", preview_color: "#B89B72" },
    { id: "aswan-dual-cyan", name_ar: "ثيم 15 (أسوان ثنائي - سماوي)", name_en: "Theme 15 (ASWAN Dual - Cyan)", preview_color: "#06b6d4" },
    { id: "aswan-dual-emerald", name_ar: "ثيم 15 (أسوان ثنائي - زمردي)", name_en: "Theme 15 (ASWAN Dual - Emerald)", preview_color: "#10b981" },
    { id: "aswan-dual-red", name_ar: "ثيم 15 (أسوان ثنائي - ياقوتي أحمر)", name_en: "Theme 15 (ASWAN Dual - Red)", preview_color: "#ef4444" },
    { id: "aswan-dual-purple", name_ar: "ثيم 15 (أسوان ثنائي - بنفسجي)", name_en: "Theme 15 (ASWAN Dual - Purple)", preview_color: "#8b5cf6" },
    { id: "aswan-dual-gold", name_ar: "ثيم 15 (أسوان ثنائي - ذهبي)", name_en: "Theme 15 (ASWAN Dual - Gold)", preview_color: "#d4af37" },
    { id: "aswan-dual-dark", name_ar: "ثيم 15 (أسوان ثنائي - داكن)", name_en: "Theme 15 (ASWAN Dual - Dark)", preview_color: "#f59e0b" },

    // ===== Theme 16 Family =====
    { id: "theme16", name_ar: "ثيم 16 (كلاسيك أحمر)", name_en: "Theme 16 (Classic Red)", preview_color: "#af0a13" },

    // ===== Theme 17 Family =====
    { id: "theme17", name_ar: "ثيم 17 (لوشا - كوفرفلو)", name_en: "Theme 17 (Lusha - Coverflow)", preview_color: "#d32f2f" },

    // ===== Theme 18 Family =====
    { id: "theme18", name_ar: "ثيم 18 (نكهة الشام - أخضر)", name_en: "Theme 18 (Sham Flavor - Green)", preview_color: "#16a34a" },
    { id: "theme18-red", name_ar: "ثيم 18 (أحمر)", name_en: "Theme 18 (Red)", preview_color: "#ef4444" },
    { id: "theme18-cyan", name_ar: "ثيم 18 (سماوي)", name_en: "Theme 18 (Cyan)", preview_color: "#0891b2" },
    { id: "theme18-emerald", name_ar: "ثيم 18 (زمردي)", name_en: "Theme 18 (Emerald)", preview_color: "#059669" },
    { id: "theme18-sky", name_ar: "ثيم 18 (أزرق sky)", name_en: "Theme 18 (Sky)", preview_color: "#0284c7" },
    { id: "theme18-pink", name_ar: "ثيم 18 (وردي)", name_en: "Theme 18 (Pink)", preview_color: "#ec4899" },
    { id: "theme18-gold", name_ar: "ثيم 18 (ذهبي)", name_en: "Theme 18 (Gold)", preview_color: "#D4A017" },

    // ===== Theme 19 Family =====
    { id: "theme19", name_ar: "ثيم 19 (منيو مصر - أزرق)", name_en: "Theme 19 (MenuMasr - Blue)", preview_color: "#2563eb" },
    { id: "theme19-red", name_ar: "ثيم 19 (أحمر)", name_en: "Theme 19 (Red)", preview_color: "#ef4444" },
    { id: "theme19-cyan", name_ar: "ثيم 19 (سماوي)", name_en: "Theme 19 (Cyan)", preview_color: "#0891b2" },
    { id: "theme19-emerald", name_ar: "ثيم 19 (زمردي)", name_en: "Theme 19 (Emerald)", preview_color: "#059669" },
    { id: "theme19-sky", name_ar: "ثيم 19 (أزرق sky)", name_en: "Theme 19 (Sky)", preview_color: "#0284c7" },
    { id: "theme19-pink", name_ar: "ثيم 19 (وردي)", name_en: "Theme 19 (Pink)", preview_color: "#ec4899" },

    // ===== Theme 20: Vicino Family =====
    { id: "vicino", name_ar: "ثيم 20 (فيتشينو - ذهبي معدني)", name_en: "Theme 20 (Vicino - Metallic Gold)", preview_color: "#B8860B" },

    // ===== Theme 21: UAE Family =====
    { id: "uae", name_ar: "ثيم 21 (الإمارات - ذهبي ملكي)", name_en: "Theme 21 (UAE - Royal Gold)", preview_color: "#d97706" },
    { id: "uae-red", name_ar: "ثيم 21 (الإمارات - أحمر)", name_en: "Theme 21 (UAE - Crimson Red)", preview_color: "#dc2626" },
    { id: "uae-emerald", name_ar: "ثيم 21 (الإمارات - زمردي)", name_en: "Theme 21 (UAE - Emerald Green)", preview_color: "#059669" },
    { id: "uae-navy", name_ar: "ثيم 21 (الإمارات - أزرق نيفي)", name_en: "Theme 21 (UAE - Navy Blue)", preview_color: "#2563eb" },
    { id: "uae-dark", name_ar: "ثيم 21 (الإمارات - داكن)", name_en: "Theme 21 (UAE - Dark Mode)", preview_color: "#1e293b" },

    // ===== Theme 22 Family =====
    { id: "theme22", name_ar: "ثيم 22 (إضافة للسلة - برتقالي)", name_en: "Theme 22 (Add to Cart - Orange)", preview_color: "#f97316" },
    { id: "theme22-red", name_ar: "ثيم 22 (أحمر)", name_en: "Theme 22 (Red)", preview_color: "#ef4444" },
    { id: "theme22-cyan", name_ar: "ثيم 22 (سماوي)", name_en: "Theme 22 (Cyan)", preview_color: "#0891b2" },
    { id: "theme22-emerald", name_ar: "ثيم 22 (زمردي)", name_en: "Theme 22 (Emerald)", preview_color: "#059669" },
    { id: "theme22-sky", name_ar: "ثيم 22 (أزرق sky)", name_en: "Theme 22 (Sky)", preview_color: "#0284c7" },
    { id: "theme22-pink", name_ar: "ثيم 22 (وردي)", name_en: "Theme 22 (Pink)", preview_color: "#ec4899" },
    { id: "theme22-gold", name_ar: "ثيم 22 (ذهبي)", name_en: "Theme 22 (Gold)", preview_color: "#D4A017" },

    // ===== Theme 23: USA Family =====
    { id: "usa", name_ar: "ثيم 23 (USA أمريكي - أحمر)", name_en: "Theme 23 (USA EN - Crimson Red)", preview_color: "#dc2626" },
    { id: "usa-navy", name_ar: "ثيم 23 (USA أمريكي - أزرق نيفي)", name_en: "Theme 23 (USA EN - Navy Blue)", preview_color: "#2563eb" },
    { id: "usa-emerald", name_ar: "ثيم 23 (USA أمريكي - زمردي)", name_en: "Theme 23 (USA EN - Emerald Green)", preview_color: "#059669" },
    { id: "usa-gold", name_ar: "ثيم 23 (USA أمريكي - ذهبي)", name_en: "Theme 23 (USA EN - Luxe Gold)", preview_color: "#d97706" },
    { id: "usa-dark", name_ar: "ثيم 23 (USA أمريكي - داكن)", name_en: "Theme 23 (USA EN - Midnight Rose)", preview_color: "#e11d48" },

    // ===== Theme 24: USA Dual Family =====
    { id: "usa-dual", name_ar: "ثيم 24 (USA ثنائي - وردي)", name_en: "Theme 24 (USA Dual - Crimson)", preview_color: "#e11d48" },
    { id: "usa-dual-navy", name_ar: "ثيم 24 (USA ثنائي - أزرق نيفي)", name_en: "Theme 24 (USA Dual - Navy Blue)", preview_color: "#2563eb" },
    { id: "usa-dual-emerald", name_ar: "ثيم 24 (USA ثنائي - زمردي)", name_en: "Theme 24 (USA Dual - Emerald Green)", preview_color: "#059669" },
    { id: "usa-dual-gold", name_ar: "ثيم 24 (USA ثنائي - ذهبي)", name_en: "Theme 24 (USA Dual - Luxe Gold)", preview_color: "#d97706" },
    { id: "usa-dual-dark", name_ar: "ثيم 24 (USA ثنائي - داكن)", name_en: "Theme 24 (USA Dual - Dark Midnight)", preview_color: "#020617" },

    // ===== Theme 25: Lamet Zaman Family =====
    { id: "lamet-zaman", name_ar: "ثيم 25 (لمة زمان - برتقالي)", name_en: "Theme 25 (Lamet Zaman - Orange)", preview_color: "#f97316" },
    { id: "lamet-zaman-red", name_ar: "ثيم 25 (لمة زمان - أحمر)", name_en: "Theme 25 (Lamet Zaman - Red)", preview_color: "#ef4444" },
    { id: "lamet-zaman-emerald", name_ar: "ثيم 25 (لمة زمان - زمردي)", name_en: "Theme 25 (Lamet Zaman - Emerald)", preview_color: "#10b981" },
    { id: "lamet-zaman-cyan", name_ar: "ثيم 25 (لمة زمان - سماوي)", name_en: "Theme 25 (Lamet Zaman - Cyan)", preview_color: "#06b6d4" },
    { id: "lamet-zaman-sky", name_ar: "ثيم 25 (لمة زمان - أزرق sky)", name_en: "Theme 25 (Lamet Zaman - Sky)", preview_color: "#0284c7" },
    { id: "lamet-zaman-purple", name_ar: "ثيم 25 (لمة زمان - بنفسجي)", name_en: "Theme 25 (Lamet Zaman - Purple)", preview_color: "#8b5cf6" },
    { id: "lamet-zaman-gold", name_ar: "ثيم 25 (لمة زمان - ذهبي)", name_en: "Theme 25 (Lamet Zaman - Gold)", preview_color: "#d4af37" },
    { id: "lamet-zaman-pink", name_ar: "ثيم 25 (لمة زمان - وردي)", name_en: "Theme 25 (Lamet Zaman - Pink)", preview_color: "#ec4899" },
    { id: "lamet-zaman-dark", name_ar: "ثيم 25 (لمة زمان - داكن)", name_en: "Theme 25 (Lamet Zaman - Dark)", preview_color: "#1e293b" },
];

interface ThemeOverride {
    theme_id: string;
    custom_name_ar: string;
    custom_name_en: string;
    is_hidden: boolean;
}

export default function SuperAdminThemesPage() {
    const { language } = useLanguage();
    const isArabic = language === "ar";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [overrides, setOverrides] = useState<Record<string, ThemeOverride>>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Stats
    const hiddenCount = Object.values(overrides).filter(o => o.is_hidden).length;
    const visibleCount = ALL_THEMES.length - hiddenCount;
    const renamedCount = Object.values(overrides).filter(o => o.custom_name_ar || o.custom_name_en).length;

    const fetchOverrides = useCallback(async () => {
        try {
            const { data, error } = await supabase.from("theme_settings").select("*");
            if (error) {
                console.error("Error fetching theme_settings:", error);
                // Table might not exist yet
                return;
            }
            if (data) {
                const map: Record<string, ThemeOverride> = {};
                data.forEach((row: ThemeOverride) => {
                    map[row.theme_id] = row;
                });
                setOverrides(map);
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOverrides();
    }, [fetchOverrides]);

    const getOverride = (themeId: string): ThemeOverride => {
        return overrides[themeId] || { theme_id: themeId, custom_name_ar: "", custom_name_en: "", is_hidden: false };
    };

    const updateOverride = (themeId: string, field: keyof ThemeOverride, value: string | boolean) => {
        setOverrides(prev => ({
            ...prev,
            [themeId]: {
                ...getOverride(themeId),
                theme_id: themeId,
                [field]: value,
            }
        }));
        setHasChanges(true);
    };

    const toggleVisibility = (themeId: string) => {
        const current = getOverride(themeId);
        updateOverride(themeId, "is_hidden", !current.is_hidden);
    };

    const resetTheme = (themeId: string) => {
        setOverrides(prev => {
            const updated = { ...prev };
            delete updated[themeId];
            return updated;
        });
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Collect all overrides that have actual changes
            const toUpsert = Object.values(overrides).filter(o => 
                o.is_hidden || o.custom_name_ar || o.custom_name_en
            ).map(o => ({
                theme_id: o.theme_id,
                custom_name_ar: o.custom_name_ar || null,
                custom_name_en: o.custom_name_en || null,
                is_hidden: o.is_hidden,
                updated_at: new Date().toISOString(),
            }));

            // Delete rows that are back to default
            const toDelete = Object.values(overrides).filter(o =>
                !o.is_hidden && !o.custom_name_ar && !o.custom_name_en
            ).map(o => o.theme_id);

            // Also find previously saved overrides that are no longer in our state (were reset)
            const allIds = ALL_THEMES.map(t => t.id);
            const existingIds = Object.keys(overrides);
            const resetIds = allIds.filter(id => !existingIds.includes(id));

            const deleteIds = [...toDelete, ...resetIds].filter(id => id);

            if (deleteIds.length > 0) {
                await supabase.from("theme_settings").delete().in("theme_id", deleteIds);
            }
            if (toUpsert.length > 0) {
                const { error } = await supabase.from("theme_settings").upsert(toUpsert, { onConflict: "theme_id" });
                if (error) throw error;
            }

            toast.success(isArabic ? "تم حفظ إعدادات الثيمات بنجاح!" : "Theme settings saved successfully!");
            setHasChanges(false);
            // Re-fetch to sync
            await fetchOverrides();
        } catch (err) {
            console.error("Error saving:", err);
            toast.error(isArabic ? "حدث خطأ أثناء الحفظ" : "Error saving theme settings");
        } finally {
            setSaving(false);
        }
    };

    // Filter themes by search
    const filteredThemes = ALL_THEMES.filter(theme => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return theme.id.toLowerCase().includes(q) ||
            theme.name_ar.toLowerCase().includes(q) ||
            theme.name_en.toLowerCase().includes(q) ||
            (getOverride(theme.id).custom_name_ar || "").toLowerCase().includes(q) ||
            (getOverride(theme.id).custom_name_en || "").toLowerCase().includes(q);
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full" dir={isArabic ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                            <Palette className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                                {isArabic ? "إدارة الثيمات" : "Themes Management"}
                            </h1>
                            <p className="text-slate-500 dark:text-zinc-400 mt-0.5">
                                {isArabic
                                    ? "تحكم في ظهور الثيمات وأسمائها عند العملاء"
                                    : "Control theme visibility and naming for clients"}
                            </p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className={`flex items-center gap-2 px-6 py-2.5 font-bold rounded-xl shadow-md transition-all active:scale-95 ${
                        hasChanges
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                            : "bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500 cursor-not-allowed"
                    }`}
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isArabic ? "حفظ التغييرات" : "Save Changes"}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <Eye className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">{visibleCount}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold">{isArabic ? "ثيم ظاهر" : "Visible Themes"}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                        <EyeOff className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">{hiddenCount}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold">{isArabic ? "ثيم مخفي" : "Hidden Themes"}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                        <Palette className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">{renamedCount}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold">{isArabic ? "ثيم تم تغيير اسمه" : "Renamed Themes"}</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className={`w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isArabic ? "right-4" : "left-4"}`} />
                <input
                    type="text"
                    placeholder={isArabic ? "ابحث عن ثيم بالاسم أو المعرف..." : "Search themes by name or ID..."}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full ${isArabic ? "pr-12 pl-4" : "pl-12 pr-4"} py-3 bg-white dark:bg-[#131b26] border border-stone-200 dark:border-stone-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium`}
                />
            </div>

            {/* Themes Table */}
            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-stone-100 dark:border-stone-800 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    <div className="col-span-1">{isArabic ? "لون" : "Color"}</div>
                    <div className="col-span-2">{isArabic ? "المعرف" : "ID"}</div>
                    <div className="col-span-3">{isArabic ? "الاسم العربي" : "Arabic Name"}</div>
                    <div className="col-span-3">{isArabic ? "الاسم الإنجليزي" : "English Name"}</div>
                    <div className="col-span-1 text-center">{isArabic ? "الحالة" : "Status"}</div>
                    <div className="col-span-2 text-center">{isArabic ? "إجراءات" : "Actions"}</div>
                </div>

                {/* Table Body */}
                <AnimatePresence>
                    {filteredThemes.map((theme, index) => {
                        const override = getOverride(theme.id);
                        const isHidden = override.is_hidden;
                        const hasCustomAr = !!override.custom_name_ar;
                        const hasCustomEn = !!override.custom_name_en;
                        const isModified = isHidden || hasCustomAr || hasCustomEn;

                        return (
                            <motion.div
                                key={theme.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.01 }}
                                className={`grid grid-cols-12 gap-4 p-4 items-center border-b border-stone-50 dark:border-stone-800/50 transition-all hover:bg-stone-50 dark:hover:bg-white/[0.02] ${
                                    isHidden ? "opacity-50" : ""
                                } ${isModified ? "bg-blue-50/30 dark:bg-blue-500/[0.03]" : ""}`}
                            >
                                {/* Color Dot */}
                                <div className="col-span-1">
                                    <div
                                        className="w-7 h-7 rounded-lg shadow-inner border border-white/20"
                                        style={{ backgroundColor: theme.preview_color }}
                                    />
                                </div>

                                {/* ID */}
                                <div className="col-span-2">
                                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400 bg-stone-100 dark:bg-white/5 px-2 py-1 rounded-lg">
                                        {theme.id}
                                    </span>
                                </div>

                                {/* Arabic Name */}
                                <div className="col-span-3">
                                    <input
                                        type="text"
                                        dir="rtl"
                                        placeholder={theme.name_ar}
                                        value={override.custom_name_ar || ""}
                                        onChange={e => updateOverride(theme.id, "custom_name_ar", e.target.value)}
                                        className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none transition-all ${
                                            hasCustomAr
                                                ? "border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 text-slate-900 dark:text-white"
                                                : "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#0a0f16] text-slate-500 dark:text-zinc-400"
                                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    />
                                </div>

                                {/* English Name */}
                                <div className="col-span-3">
                                    <input
                                        type="text"
                                        dir="ltr"
                                        placeholder={theme.name_en}
                                        value={override.custom_name_en || ""}
                                        onChange={e => updateOverride(theme.id, "custom_name_en", e.target.value)}
                                        className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none transition-all ${
                                            hasCustomEn
                                                ? "border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 text-slate-900 dark:text-white"
                                                : "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#0a0f16] text-slate-500 dark:text-zinc-400"
                                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    />
                                </div>

                                {/* Visibility Toggle */}
                                <div className="col-span-1 flex justify-center">
                                    <button
                                        onClick={() => toggleVisibility(theme.id)}
                                        className={`p-2 rounded-lg transition-all ${
                                            isHidden
                                                ? "bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20"
                                                : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                                        }`}
                                        title={isHidden ? (isArabic ? "مخفي" : "Hidden") : (isArabic ? "ظاهر" : "Visible")}
                                    >
                                        {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="col-span-2 flex justify-center gap-2">
                                    {isModified && (
                                        <button
                                            onClick={() => resetTheme(theme.id)}
                                            className="p-2 rounded-lg bg-stone-100 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-white/10 transition-all"
                                            title={isArabic ? "إعادة للأصلي" : "Reset to default"}
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {filteredThemes.length === 0 && (
                    <div className="p-12 text-center text-slate-400 dark:text-zinc-500">
                        <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        <p className="font-bold">{isArabic ? "لا توجد نتائج" : "No themes found"}</p>
                    </div>
                )}
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-6 flex items-start gap-4">
                <Palette className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
                <div>
                    <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-1">
                        {isArabic ? "ملاحظة عن إدارة الثيمات" : "About Theme Management"}
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        {isArabic
                            ? "إخفاء ثيم يمنع ظهوره في صفحة اختيار الثيم للعملاء. تغيير الاسم يُظهر الاسم الجديد بدلاً من الأصلي. العملاء اللي عندهم ثيم مخفي مفعل حالياً لن يتأثروا."
                            : "Hiding a theme removes it from the client's theme selection page. Renaming shows the new name instead of the default. Clients who already have a hidden theme active will not be affected."}
                    </p>
                </div>
            </div>
        </div>
    );
}
