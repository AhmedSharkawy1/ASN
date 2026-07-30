"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { Palette, Check, Save, Loader2, ExternalLink, Filter, Search, X, RotateCcw, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { posDb } from "@/lib/pos-db";
import { motion } from "framer-motion";

const THEMES = [
    // ===== Theme 1: PizzaPasta Family =====
    { id: "pizzapasta", family: "pizzapasta", name_ar: "ثيم 1 (بيتزا باستا - أزرق)", name_en: "Theme 1 (Pizza Pasta - Blue)", description_ar: "تصميم عصري بخلفية داكنة.", description_en: "Modern dark design.", preview_color: "#3b82f6" },
    { id: "pizzapasta-cyan", family: "pizzapasta", name_ar: "ثيم 1 (بيتزا باستا - سماوي)", name_en: "Theme 1 (Pizza Pasta - Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "PizzaPasta design with Cyan color", preview_color: "#0891b2" },
    { id: "pizzapasta-red", family: "pizzapasta", name_ar: "ثيم 1 (بيتزا باستا - أحمر)", name_en: "Theme 1 (Pizza Pasta - Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "PizzaPasta design with Red color", preview_color: "#dc2626" },
    { id: "pizzapasta-emerald", family: "pizzapasta", name_ar: "ثيم 1 (بيتزا باستا - زمردي)", name_en: "Theme 1 (Pizza Pasta - Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "PizzaPasta design with Emerald color", preview_color: "#059669" },
    { id: "pizzapasta-sky", family: "pizzapasta", name_ar: "ثيم 1 (بيتزا باستا - أزرق sky)", name_en: "Theme 1 (Pizza Pasta - Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "PizzaPasta design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 2: Atyab Oriental Family =====
    { id: "atyab-oriental", family: "atyab-oriental", name_ar: "ثيم 2 (أطياب أورينتال - ذهبي)", name_en: "Theme 2 (Atyab Oriental - Gold)", description_ar: "تصميم احترافي بلمسات ذهبية.", description_en: "High-contrast professional design.", preview_color: "#eab308" },
    { id: "atyab-oriental-cyan", family: "atyab-oriental", name_ar: "ثيم 2 (أطياب أورينتال - سماوي)", name_en: "Theme 2 (Atyab Oriental - Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "AtyabOriental design with Cyan color", preview_color: "#0891b2" },
    { id: "atyab-oriental-red", family: "atyab-oriental", name_ar: "ثيم 2 (أطياب أورينتال - أحمر)", name_en: "Theme 2 (Atyab Oriental - Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "AtyabOriental design with Red color", preview_color: "#dc2626" },
    { id: "atyab-oriental-emerald", family: "atyab-oriental", name_ar: "ثيم 2 (أطياب أورينتال - زمردي)", name_en: "Theme 2 (Atyab Oriental - Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "AtyabOriental design with Emerald color", preview_color: "#059669" },
    { id: "atyab-oriental-sky", family: "atyab-oriental", name_ar: "ثيم 2 (أطياب أورينتال - أزرق sky)", name_en: "Theme 2 (Atyab Oriental - Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "AtyabOriental design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 3: BabAlHara Family =====
    { id: "bab-alhara", family: "bab-alhara", name_ar: "ثيم 3 (باب الحارة - أحمر)", name_en: "Theme 3 (Bab Al-Hara - Red)", description_ar: "تصميم كلاسيكي بطابع سوري.", description_en: "Classic Syrian-style design.", preview_color: "#e31e24" },
    { id: "bab-alhara-cyan", family: "bab-alhara", name_ar: "ثيم 3 (باب الحارة - سماوي)", name_en: "Theme 3 (Bab Al-Hara - Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "BabAlHara design with Cyan color", preview_color: "#0891b2" },
    { id: "bab-alhara-red", family: "bab-alhara", name_ar: "ثيم 3 (باب الحارة - أحمر داكن)", name_en: "Theme 3 (Bab Al-Hara - Dark Red)", description_ar: "نفس التصميم بلون أحمر داكن", description_en: "BabAlHara design with Dark Red color", preview_color: "#dc2626" },
    { id: "bab-alhara-emerald", family: "bab-alhara", name_ar: "ثيم 3 (باب الحارة - زمردي)", name_en: "Theme 3 (Bab Al-Hara - Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "BabAlHara design with Emerald color", preview_color: "#059669" },
    { id: "bab-alhara-sky", family: "bab-alhara", name_ar: "ثيم 3 (باب الحارة - أزرق sky)", name_en: "Theme 3 (Bab Al-Hara - Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "BabAlHara design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 4: AtyabEtoile Family =====
    { id: "atyab-etoile", family: "atyab-etoile", name_ar: "ثيم 4 (أطياب إتوال - ذهبي)", name_en: "Theme 4 (Atyab Etoile - Gold)", description_ar: "تصميم أنيق بشريط متحرك والسلة.", description_en: "Elegant design with marquee bar.", preview_color: "#B89038" },
    { id: "atyab-etoile-cyan", family: "atyab-etoile", name_ar: "ثيم 4 (أطياب إتوال - سماوي)", name_en: "Theme 4 (Atyab Etoile - Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "AtyabEtoile design with Cyan color", preview_color: "#0891b2" },
    { id: "atyab-etoile-red", family: "atyab-etoile", name_ar: "ثيم 4 (أطياب إتوال - أحمر)", name_en: "Theme 4 (Atyab Etoile - Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "AtyabEtoile design with Red color", preview_color: "#dc2626" },
    { id: "atyab-etoile-emerald", family: "atyab-etoile", name_ar: "ثيم 4 (أطياب إتوال - زمردي)", name_en: "Theme 4 (Atyab Etoile - Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "AtyabEtoile design with Emerald color", preview_color: "#059669" },
    { id: "atyab-etoile-sky", family: "atyab-etoile", name_ar: "ثيم 4 (أطياب إتوال - أزرق sky)", name_en: "Theme 4 (Atyab Etoile - Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "AtyabEtoile design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 5 Family =====
    { id: "theme5", family: "theme5", name_ar: "ثيم 5 (برتقالي)", name_en: "Theme 5 (Orange)", description_ar: "تصميم مميز جديد بخاصية تقسيم العناصر.", description_en: "New premium design with item categories.", preview_color: "#ea580c" },
    { id: "theme5-cyan", family: "theme5", name_ar: "ثيم 5 (سماوي)", name_en: "Theme 5 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme5 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme5-red", family: "theme5", name_ar: "ثيم 5 (أحمر)", name_en: "Theme 5 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme5 design with Red color", preview_color: "#dc2626" },
    { id: "theme5-emerald", family: "theme5", name_ar: "ثيم 5 (زمردي)", name_en: "Theme 5 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme5 design with Emerald color", preview_color: "#059669" },
    { id: "theme5-sky", family: "theme5", name_ar: "ثيم 5 (أزرق sky)", name_en: "Theme 5 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme5 design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 6 Family =====
    { id: "theme6", family: "theme6", name_ar: "ثيم 6 (فراندة - تيل)", name_en: "Theme 6 (Veranda - Teal)", description_ar: "تصميم عصري باللون التيل مع سلة عائمة.", description_en: "Modern teal design with floating cart.", preview_color: "#40a798" },
    { id: "theme6-cyan", family: "theme6", name_ar: "ثيم 6 (سماوي)", name_en: "Theme 6 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme6 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme6-red", family: "theme6", name_ar: "ثيم 6 (أحمر)", name_en: "Theme 6 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme6 design with Red color", preview_color: "#dc2626" },
    { id: "theme6-emerald", family: "theme6", name_ar: "ثيم 6 (زمردي)", name_en: "Theme 6 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme6 design with Emerald color", preview_color: "#059669" },
    { id: "theme6-sky", family: "theme6", name_ar: "ثيم 6 (أزرق sky)", name_en: "Theme 6 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme6 design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 7 Family =====
    { id: "theme7", family: "theme7", name_ar: "ثيم 7 (حليم - داكن ذهبي)", name_en: "Theme 7 (Haleem - Dark Gold)", description_ar: "تصميم داكن فاخر بلمسات ذهبية.", description_en: "Premium dark theme with gold accents.", preview_color: "#c9a84c" },
    { id: "theme7-cyan", family: "theme7", name_ar: "ثيم 7 (سماوي)", name_en: "Theme 7 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme7 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme7-red", family: "theme7", name_ar: "ثيم 7 (أحمر)", name_en: "Theme 7 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme7 design with Red color", preview_color: "#dc2626" },
    { id: "theme7-emerald", family: "theme7", name_ar: "ثيم 7 (زمردي)", name_en: "Theme 7 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme7 design with Emerald color", preview_color: "#059669" },
    { id: "theme7-sky", family: "theme7", name_ar: "ثيم 7 (أزرق sky)", name_en: "Theme 7 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme7 design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 8: ASWAN Family =====
    { id: "aswan", family: "aswan", name_ar: "ثيم 8 (أسوان إنجليزي - بيج غامق)", name_en: "Theme 8 (ASWAN EN - Dark Beige)", description_ar: "تصميم أسوان الإنجليزي باللون البيج الغامق الفاخر مع دعم خلفيات الصور.", description_en: "Luxury English design with dark beige accent and custom background images.", preview_color: "#B89B72" },
    { id: "aswan-cyan", family: "aswan", name_ar: "ثيم 8 (أسوان إنجليزي - سماوي)", name_en: "Theme 8 (ASWAN EN - Cyan)", description_ar: "ثيم أسوان الإنجليزي بلون أزرق سماوي منعش.", description_en: "ASWAN English theme with vibrant cyan accent.", preview_color: "#06b6d4" },
    { id: "aswan-emerald", family: "aswan", name_ar: "ثيم 8 (أسوان إنجليزي - زمردي)", name_en: "Theme 8 (ASWAN EN - Emerald)", description_ar: "ثيم أسوان الإنجليزي بلون أخضر زمردي فاخر.", description_en: "ASWAN English theme with emerald green accent.", preview_color: "#10b981" },
    { id: "aswan-red", family: "aswan", name_ar: "ثيم 8 (أسوان إنجليزي - ياقوتي أحمر)", name_en: "Theme 8 (ASWAN EN - Red)", description_ar: "ثيم أسوان الإنجليزي بلون أحمر ياقوتي جذاب.", description_en: "ASWAN English theme with crimson red accent.", preview_color: "#ef4444" },
    { id: "aswan-purple", family: "aswan", name_ar: "ثيم 8 (أسوان إنجليزي - بنفسجي)", name_en: "Theme 8 (ASWAN EN - Purple)", description_ar: "ثيم أسوان الإنجليزي بلون بنفسجي ملكي راقي.", description_en: "ASWAN English theme with royal purple accent.", preview_color: "#8b5cf6" },
    { id: "aswan-gold", family: "aswan", name_ar: "ثيم 8 (أسوان إنجليزي - ذهبي)", name_en: "Theme 8 (ASWAN EN - Gold)", description_ar: "ثيم أسوان الإنجليزي بلون ذهبي ملكي براق.", description_en: "ASWAN English theme with royal gold accent.", preview_color: "#d4af37" },
    { id: "aswan-dark", family: "aswan", name_ar: "ثيم 8 (أسوان إنجليزي - داكن)", name_en: "Theme 8 (ASWAN EN - Dark)", description_ar: "ثيم أسوان الإنجليزي بوضع داكن مع لمسات ذهبية برتقالية.", description_en: "ASWAN English theme with dark background and gold-amber accents.", preview_color: "#f59e0b" },

    // ===== Theme 9: Diablo Family =====
    { id: "theme9", family: "theme9", name_ar: "ثيم 9 (ديابلو - أحمر)", name_en: "Theme 9 (Diablo - Red)", description_ar: "تصميم عصري باللون الأحمر وتأثيرات حيوية.", description_en: "Modern red design with vibrant effects.", preview_color: "#e74c3c" },
    { id: "theme9-cyan", family: "theme9", name_ar: "ثيم 9 (ديابلو - سماوي)", name_en: "Theme 9 (Diablo - Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme9 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme9-red", family: "theme9", name_ar: "ثيم 9 (ديابلو - أحمر داكن)", name_en: "Theme 9 (Diablo - Dark Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme9 design with Red color", preview_color: "#dc2626" },
    { id: "theme9-emerald", family: "theme9", name_ar: "ثيم 9 (ديابلو - زمردي)", name_en: "Theme 9 (Diablo - Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme9 design with Emerald color", preview_color: "#059669" },
    { id: "theme9-sky", family: "theme9", name_ar: "ثيم 9 (ديابلو - أزرق sky)", name_en: "Theme 9 (Diablo - Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme9 design with Sky color", preview_color: "#0284c7" },
    { id: "theme9-pink", family: "theme9", name_ar: "ثيم 9 (ديابلو - وردي)", name_en: "Theme 9 (Diablo - Pink)", description_ar: "نفس التصميم بلون وردي", description_en: "Theme9 design with Pink color", preview_color: "#ec4899" },
    { id: "theme9-gold", family: "theme9", name_ar: "ثيم 9 (ديابلو - ذهبي)", name_en: "Theme 9 (Diablo - Gold)", description_ar: "نفس التصميم بلون ذهبي", description_en: "Theme9 design with Gold color", preview_color: "#D4A017" },

    // ===== Theme 10 Family =====
    { id: "theme10", family: "theme10", name_ar: "ثيم 10 (الوهج البرتقالي)", name_en: "Theme 10 (Orange Glow)", description_ar: "تصميم مشرق باللون البرتقالي.", description_en: "Bright orange design with scrollable categories.", preview_color: "#ea580c" },
    { id: "theme10-cyan", family: "theme10", name_ar: "ثيم 10 (سماوي)", name_en: "Theme 10 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme10 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme10-red", family: "theme10", name_ar: "ثيم 10 (أحمر)", name_en: "Theme 10 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme10 design with Red color", preview_color: "#dc2626" },
    { id: "theme10-emerald", family: "theme10", name_ar: "ثيم 10 (زمردي)", name_en: "Theme 10 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme10 design with Emerald color", preview_color: "#059669" },
    { id: "theme10-sky", family: "theme10", name_ar: "ثيم 10 (أزرق sky)", name_en: "Theme 10 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme10 design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 11 Family =====
    { id: "theme11", family: "theme11", name_ar: "ثيم 11 (عصري أفقي - أحمر)", name_en: "Theme 11 (Luxe Horizontal - Red)", description_ar: "عرض الأصناف والأحجام بشكل أفقي أنيق.", description_en: "Modern Luxe design displaying multiple sizes.", preview_color: "#e54750" },
    { id: "theme11-cyan", family: "theme11", name_ar: "ثيم 11 (سماوي)", name_en: "Theme 11 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme11 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme11-red", family: "theme11", name_ar: "ثيم 11 (أحمر)", name_en: "Theme 11 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme11 design with Red color", preview_color: "#dc2626" },
    { id: "theme11-emerald", family: "theme11", name_ar: "ثيم 11 (زمردي)", name_en: "Theme 11 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme11 design with Emerald color", preview_color: "#059669" },
    { id: "theme11-sky", family: "theme11", name_ar: "ثيم 11 (أزرق sky)", name_en: "Theme 11 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme11 design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 12 Family =====
    { id: "theme12", family: "theme12", name_ar: "ثيم 12 (العام الجديد - RGB)", name_en: "Theme 12 (New Year - RGB)", description_ar: "أنيميشن RGB وسلايدر مميز.", description_en: "RGB animations and unique slider.", preview_color: "#6c63ff" },

    // ===== Theme 13 Family =====
    { id: "theme13", family: "theme13", name_ar: "ثيم 13 (لوكس الذهبي)", name_en: "Theme 13 (Luxe Gold)", description_ar: "تصميم فاخر بلمسات ذهبية.", description_en: "Luxurious design with gold touches.", preview_color: "#d4af37" },
    { id: "theme13-cyan", family: "theme13", name_ar: "ثيم 13 (سماوي)", name_en: "Theme 13 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme13 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme13-red", family: "theme13", name_ar: "ثيم 13 (أحمر)", name_en: "Theme 13 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme13 design with Red color", preview_color: "#dc2626" },
    { id: "theme13-emerald", family: "theme13", name_ar: "ثيم 13 (زمردي)", name_en: "Theme 13 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme13 design with Emerald color", preview_color: "#059669" },
    { id: "theme13-sky", family: "theme13", name_ar: "ثيم 13 (أزرق sky)", name_en: "Theme 13 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme13 design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 14: ASWAN Arabic Family =====
    { id: "aswan-ar", family: "aswan-ar", name_ar: "ثيم 14 (أسوان عربي - بيج غامق)", name_en: "Theme 14 (ASWAN AR - Dark Beige)", description_ar: "تصميم أسوان العربي بالكامل باللون البيج الغامق مع دعم خلفيات الصور.", description_en: "100% Arabic ASWAN design with dark beige accent.", preview_color: "#B89B72" },
    { id: "aswan-ar-cyan", family: "aswan-ar", name_ar: "ثيم 14 (أسوان عربي - سماوي)", name_en: "Theme 14 (ASWAN AR - Cyan)", description_ar: "ثيم أسوان العربي بلون أزرق سماوي.", description_en: "ASWAN Arabic theme with cyan accent.", preview_color: "#06b6d4" },
    { id: "aswan-ar-emerald", family: "aswan-ar", name_ar: "ثيم 14 (أسوان عربي - زمردي)", name_en: "Theme 14 (ASWAN AR - Emerald)", description_ar: "ثيم أسوان العربي بلون أخضر زمردي.", description_en: "ASWAN Arabic theme with emerald accent.", preview_color: "#10b981" },
    { id: "aswan-ar-red", family: "aswan-ar", name_ar: "ثيم 14 (أسوان عربي - ياقوتي أحمر)", name_en: "Theme 14 (ASWAN AR - Red)", description_ar: "ثيم أسوان العربي بلون أحمر ياقوتي.", description_en: "ASWAN Arabic theme with crimson accent.", preview_color: "#ef4444" },
    { id: "aswan-ar-purple", family: "aswan-ar", name_ar: "ثيم 14 (أسوان عربي - بنفسجي)", name_en: "Theme 14 (ASWAN AR - Purple)", description_ar: "ثيم أسوان العربي بلون بنفسجي ملكي.", description_en: "ASWAN Arabic theme with purple accent.", preview_color: "#8b5cf6" },
    { id: "aswan-ar-gold", family: "aswan-ar", name_ar: "ثيم 14 (أسوان عربي - ذهبي)", name_en: "Theme 14 (ASWAN AR - Gold)", description_ar: "ثيم أسوان العربي بلون ذهبي ملكي.", description_en: "ASWAN Arabic theme with gold accent.", preview_color: "#d4af37" },
    { id: "aswan-ar-dark", family: "aswan-ar", name_ar: "ثيم 14 (أسوان عربي - داكن)", name_en: "Theme 14 (ASWAN AR - Dark)", description_ar: "ثيم أسوان العربي بوضع داكن.", description_en: "ASWAN Arabic theme with dark mode accent.", preview_color: "#f59e0b" },

    // ===== Theme 15: ASWAN Dual Family =====
    { id: "aswan-dual", family: "aswan-dual", name_ar: "ثيم 15 (أسوان ثنائي - بيج غامق)", name_en: "Theme 15 (ASWAN Dual - Dark Beige)", description_ar: "تصميم أسوان مزدوج اللغة (عربي وإنجليزي) مع زر تبديل اللغة الفوري.", description_en: "Bilingual AR/EN ASWAN theme with dynamic language switch.", preview_color: "#B89B72" },
    { id: "aswan-dual-cyan", family: "aswan-dual", name_ar: "ثيم 15 (أسوان ثنائي - سماوي)", name_en: "Theme 15 (ASWAN Dual - Cyan)", description_ar: "ثيم أسوان مزدوج اللغة بلون أزرق سماوي.", description_en: "Bilingual ASWAN theme with cyan accent.", preview_color: "#06b6d4" },
    { id: "aswan-dual-emerald", family: "aswan-dual", name_ar: "ثيم 15 (أسوان ثنائي - زمردي)", name_en: "Theme 15 (ASWAN Dual - Emerald)", description_ar: "ثيم أسوان مزدوج اللغة بلون أخضر زمردي.", description_en: "Bilingual ASWAN theme with emerald accent.", preview_color: "#10b981" },
    { id: "aswan-dual-red", family: "aswan-dual", name_ar: "ثيم 15 (أسوان ثنائي - ياقوتي أحمر)", name_en: "Theme 15 (ASWAN Dual - Red)", description_ar: "ثيم أسوان مزدوج اللغة بلون أحمر ياقوتي.", description_en: "Bilingual ASWAN theme with crimson accent.", preview_color: "#ef4444" },
    { id: "aswan-dual-purple", family: "aswan-dual", name_ar: "ثيم 15 (أسوان ثنائي - بنفسجي)", name_en: "Theme 15 (ASWAN Dual - Purple)", description_ar: "ثيم أسوان مزدوج اللغة بلون بنفسجي ملكي.", description_en: "Bilingual ASWAN theme with purple accent.", preview_color: "#8b5cf6" },
    { id: "aswan-dual-gold", family: "aswan-dual", name_ar: "ثيم 15 (أسوان ثنائي - ذهبي)", name_en: "Theme 15 (ASWAN Dual - Gold)", description_ar: "ثيم أسوان مزدوج اللغة بلون ذهبي ملكي.", description_en: "Bilingual ASWAN theme with gold accent.", preview_color: "#d4af37" },
    { id: "aswan-dual-dark", family: "aswan-dual", name_ar: "ثيم 15 (أسوان ثنائي - داكن)", name_en: "Theme 15 (ASWAN Dual - Dark)", description_ar: "ثيم أسوان مزدوج اللغة بوضع داكن.", description_en: "Bilingual ASWAN theme with dark mode accent.", preview_color: "#f59e0b" },

    // ===== Theme 16 Family =====
    { id: "theme16", family: "theme16", name_ar: "ثيم 16 (كلاسيك أحمر)", name_en: "Theme 16 (Classic Red)", description_ar: "واجهة نظيفة بلون أحمر جذاب.", description_en: "Clean interface with red accent.", preview_color: "#af0a13" },

    // ===== Theme 17 Family =====
    { id: "theme17", family: "theme17", name_ar: "ثيم 17 (لوشا - كوفرفلو)", name_en: "Theme 17 (Lusha - Coverflow)", description_ar: "عرض الفئات بنظام التمرير Coverflow.", description_en: "Coverflow categories swiper.", preview_color: "#d32f2f" },

    // ===== Theme 18 Family =====
    { id: "theme18", family: "theme18", name_ar: "ثيم 18 (نكهة الشام - أخضر)", name_en: "Theme 18 (Sham Flavor - Green)", description_ar: "تصميم عصري سريع جداً.", description_en: "Very fast modern design.", preview_color: "#16a34a" },
    { id: "theme18-red", family: "theme18", name_ar: "ثيم 18 (أحمر)", name_en: "Theme 18 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme18 design with Red color", preview_color: "#ef4444" },
    { id: "theme18-cyan", family: "theme18", name_ar: "ثيم 18 (سماوي)", name_en: "Theme 18 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme18 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme18-emerald", family: "theme18", name_ar: "ثيم 18 (زمردي)", name_en: "Theme 18 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme18 design with Emerald color", preview_color: "#059669" },
    { id: "theme18-sky", family: "theme18", name_ar: "ثيم 18 (أزرق sky)", name_en: "Theme 18 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme18 design with Sky color", preview_color: "#0284c7" },
    { id: "theme18-pink", family: "theme18", name_ar: "ثيم 18 (وردي)", name_en: "Theme 18 (Pink)", description_ar: "نفس التصميم بلون وردي", description_en: "Theme18 design with Pink color", preview_color: "#ec4899" },
    { id: "theme18-gold", family: "theme18", name_ar: "ثيم 18 (ذهبي)", name_en: "Theme 18 (Gold)", description_ar: "نفس التصميم بلون ذهبي", description_en: "Theme18 design with Gold color", preview_color: "#D4A017" },

    // ===== Theme 19 Family =====
    { id: "theme19", family: "theme19", name_ar: "ثيم 19 (منيو مصر - أزرق)", name_en: "Theme 19 (MenuMasr - Blue)", description_ar: "تصميم مستوحى من منيو مصر الشهير.", description_en: "Design inspired by MenuMasr.", preview_color: "#2563eb" },
    { id: "theme19-red", family: "theme19", name_ar: "ثيم 19 (أحمر)", name_en: "Theme 19 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme19 design with Red color", preview_color: "#ef4444" },
    { id: "theme19-cyan", family: "theme19", name_ar: "ثيم 19 (سماوي)", name_en: "Theme 19 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme19 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme19-emerald", family: "theme19", name_ar: "ثيم 19 (زمردي)", name_en: "Theme 19 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme19 design with Emerald color", preview_color: "#059669" },
    { id: "theme19-sky", family: "theme19", name_ar: "ثيم 19 (أزرق sky)", name_en: "Theme 19 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme19 design with Sky color", preview_color: "#0284c7" },
    { id: "theme19-pink", family: "theme19", name_ar: "ثيم 19 (وردي)", name_en: "Theme 19 (Pink)", description_ar: "نفس التصميم بلون وردي", description_en: "Theme19 design with Pink color", preview_color: "#ec4899" },

    // ===== Theme 20: Vicino Family =====
    { id: "vicino", family: "vicino", name_ar: "ثيم 20 (فيتشينو - ذهبي معدني)", name_en: "Theme 20 (Vicino - Metallic Gold)", description_ar: "تصميم رائع بصفحة هبوط تحتوي على فيديو ونبذة عن المكان.", description_en: "Amazing design with a landing page containing video and about section.", preview_color: "#B8860B" },

    // ===== Theme 21: UAE Family =====
    { id: "uae", family: "uae", name_ar: "ثيم 21 (الإمارات - ذهبي ملكي)", name_en: "Theme 21 (UAE - Royal Gold)", description_ar: "ثيم الإمارات الفاخر باللغة العربية بالكامل مع دعم خلفيات الصور وصفحة الهبوط التفاعلية.", description_en: "100% Arabic UAE Luxury Theme with landing page & video support.", preview_color: "#d97706" },
    { id: "uae-red", family: "uae", name_ar: "ثيم 21 (الإمارات - أحمر)", name_en: "Theme 21 (UAE - Crimson Red)", description_ar: "ثيم الإمارات باللون الأحمري القاني.", description_en: "UAE Arabic theme with crimson red accent.", preview_color: "#dc2626" },
    { id: "uae-emerald", family: "uae", name_ar: "ثيم 21 (الإمارات - زمردي)", name_en: "Theme 21 (UAE - Emerald Green)", description_ar: "ثيم الإمارات باللون الأخضر الزمردي.", description_en: "UAE Arabic theme with emerald green accent.", preview_color: "#059669" },
    { id: "uae-navy", family: "uae", name_ar: "ثيم 21 (الإمارات - أزرق نيفي)", name_en: "Theme 21 (UAE - Navy Blue)", description_ar: "ثيم الإمارات باللون الأزرق الملوكي.", description_en: "UAE Arabic theme with navy blue accent.", preview_color: "#2563eb" },
    { id: "uae-dark", family: "uae", name_ar: "ثيم 21 (الإمارات - داكن)", name_en: "Theme 21 (UAE - Dark Mode)", description_ar: "ثيم الإمارات بوضع داكن فاخر.", description_en: "UAE Arabic theme with dark mode background.", preview_color: "#1e293b" },

    // ===== Theme 22 Family =====
    { id: "theme22", family: "theme22", name_ar: "ثيم 22 (إضافة للسلة - برتقالي)", name_en: "Theme 22 (Add to Cart - Orange)", description_ar: "نفس ثيم 19 بزر إضافة إلى السلة صريح.", description_en: "Explicit Add to Cart button layout.", preview_color: "#f97316" },
    { id: "theme22-red", family: "theme22", name_ar: "ثيم 22 (أحمر)", name_en: "Theme 22 (Red)", description_ar: "نفس ثيم 22 بلون أحمر", description_en: "Theme 22 design with Red color", preview_color: "#ef4444" },
    { id: "theme22-cyan", family: "theme22", name_ar: "ثيم 22 (سماوي)", name_en: "Theme 22 (Cyan)", description_ar: "نفس ثيم 22 بلون Cyan", description_en: "Theme 22 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme22-emerald", family: "theme22", name_ar: "ثيم 22 (زمردي)", name_en: "Theme 22 (Emerald)", description_ar: "نفس ثيم 22 بلون Emerald", description_en: "Theme 22 design with Emerald color", preview_color: "#059669" },
    { id: "theme22-sky", family: "theme22", name_ar: "ثيم 22 (أزرق sky)", name_en: "Theme 22 (Sky)", description_ar: "نفس ثيم 22 بلون Sky", description_en: "Theme 22 design with Sky color", preview_color: "#0284c7" },
    { id: "theme22-pink", family: "theme22", name_ar: "ثيم 22 (وردي)", name_en: "Theme 22 (Pink)", description_ar: "نفس ثيم 22 بلون وردي", description_en: "Theme 22 design with Pink color", preview_color: "#ec4899" },
    { id: "theme22-gold", family: "theme22", name_ar: "ثيم 22 (ذهبي)", name_en: "Theme 22 (Gold)", description_ar: "نفس ثيم 22 بلون ذهبي", description_en: "Theme 22 design with Gold color", preview_color: "#D4A017" },

    // ===== Theme 23: USA Family =====
    { id: "usa", family: "usa", name_ar: "ثيم 23 (USA أمريكي - أحمر)", name_en: "Theme 23 (USA EN - Crimson Red)", description_ar: "تصميم أمريكي فاخر باللغة الإنجليزية بالكامل شامل صفحة الهبوط والسلة بدون أي كلمة عربية.", description_en: "Premium 100% English design including landing page, menu, cart, and checkout.", preview_color: "#dc2626" },
    { id: "usa-navy", family: "usa", name_ar: "ثيم 23 (USA أمريكي - أزرق نيفي)", name_en: "Theme 23 (USA EN - Navy Blue)", description_ar: "ثيم USA الأمريكي باللون الأزرق النيفي الملوكي.", description_en: "USA English theme with royal navy blue accent.", preview_color: "#2563eb" },
    { id: "usa-emerald", family: "usa", name_ar: "ثيم 23 (USA أمريكي - زمردي)", name_en: "Theme 23 (USA EN - Emerald Green)", description_ar: "ثيم USA الأمريكي باللون الأخضر الزمردي.", description_en: "USA English theme with emerald green accent.", preview_color: "#059669" },
    { id: "usa-gold", family: "usa", name_ar: "ثيم 23 (USA أمريكي - ذهبي)", name_en: "Theme 23 (USA EN - Luxe Gold)", description_ar: "ثيم USA الأمريكي باللون الذهبي الدافئ.", description_en: "USA English theme with luxe gold accent.", preview_color: "#d97706" },
    { id: "usa-dark", family: "usa", name_ar: "ثيم 23 (USA أمريكي - داكن)", name_en: "Theme 23 (USA EN - Midnight Rose)", description_ar: "ثيم USA الأمريكي بوضع داكن مع لمسات وردية ياقوتية.", description_en: "USA English theme with dark midnight background.", preview_color: "#e11d48" },

    // ===== Theme 24: USA Dual Family =====
    { id: "usa-dual", family: "usa-dual", name_ar: "ثيم 24 (USA ثنائي - وردي)", name_en: "Theme 24 (USA Dual - Crimson)", description_ar: "ثيم USA الأمريكي الثنائي لدعم اللغتين العربية والإنجليزية بتبديل فوري.", description_en: "Bilingual English & Arabic USA Theme with dynamic language switch button.", preview_color: "#e11d48" },
    { id: "usa-dual-navy", family: "usa-dual", name_ar: "ثيم 24 (USA ثنائي - أزرق نيفي)", name_en: "Theme 24 (USA Dual - Navy Blue)", description_ar: "ثيم USA الثنائي باللون الأزرق الملوكي.", description_en: "Bilingual USA Theme with navy blue accent.", preview_color: "#2563eb" },
    { id: "usa-dual-emerald", family: "usa-dual", name_ar: "ثيم 24 (USA ثنائي - زمردي)", name_en: "Theme 24 (USA Dual - Emerald Green)", description_ar: "ثيم USA الثنائي باللون الأخضر الزمردي.", description_en: "Bilingual USA Theme with emerald green accent.", preview_color: "#059669" },
    { id: "usa-dual-gold", family: "usa-dual", name_ar: "ثيم 24 (USA ثنائي - ذهبي)", name_en: "Theme 24 (USA Dual - Luxe Gold)", description_ar: "ثيم USA الثنائي باللون الذهبي الدافئ.", description_en: "Bilingual USA Theme with luxe gold accent.", preview_color: "#d97706" },
    { id: "usa-dual-dark", family: "usa-dual", name_ar: "ثيم 24 (USA ثنائي - داكن)", name_en: "Theme 24 (USA Dual - Dark Midnight)", description_ar: "ثيم USA الثنائي بوضع داكن فاخر.", description_en: "Bilingual USA Theme with dark mode background.", preview_color: "#020617" },

    // ===== Theme 25: Lamet Zaman Family =====
    { id: "lamet-zaman", family: "lamet-zaman", name_ar: "ثيم 25 (لمة زمان - برتقالي)", name_en: "Theme 25 (Lamet Zaman - Orange)", description_ar: "ثيم لمة زمان الأصلي بتصميم شرقي دافئ وأقسام دائرية.", description_en: "Original Lamet Zaman warm theme with circular category nav.", preview_color: "#f97316" },
    { id: "lamet-zaman-red", family: "lamet-zaman", name_ar: "ثيم 25 (لمة زمان - أحمر)", name_en: "Theme 25 (Lamet Zaman - Red)", description_ar: "ثيم لمة زمان باللون الأحمر الجذاب.", description_en: "Lamet Zaman theme with crimson red accent.", preview_color: "#ef4444" },
    { id: "lamet-zaman-emerald", family: "lamet-zaman", name_ar: "ثيم 25 (لمة زمان - زمردي)", name_en: "Theme 25 (Lamet Zaman - Emerald)", description_ar: "ثيم لمة زمان باللون الأخضر الزمردي.", description_en: "Lamet Zaman theme with emerald green accent.", preview_color: "#10b981" },
    { id: "lamet-zaman-cyan", family: "lamet-zaman", name_ar: "ثيم 25 (لمة زمان - سماوي)", name_en: "Theme 25 (Lamet Zaman - Cyan)", description_ar: "ثيم لمة زمان باللون الأزرق السماوي.", description_en: "Lamet Zaman theme with cyan accent.", preview_color: "#06b6d4" },
    { id: "lamet-zaman-sky", family: "lamet-zaman", name_ar: "ثيم 25 (لمة زمان - أزرق sky)", name_en: "Theme 25 (Lamet Zaman - Sky)", description_ar: "ثيم لمة زمان باللون الأزرق النقي.", description_en: "Lamet Zaman theme with sky blue accent.", preview_color: "#0284c7" },
    { id: "lamet-zaman-purple", family: "lamet-zaman", name_ar: "ثيم 25 (لمة زمان - بنفسجي)", name_en: "Theme 25 (Lamet Zaman - Purple)", description_ar: "ثيم لمة زمان باللون البنفسجي الملكي.", description_en: "Lamet Zaman theme with purple accent.", preview_color: "#8b5cf6" },
    { id: "lamet-zaman-gold", family: "lamet-zaman", name_ar: "ثيم 25 (لمة زمان - ذهبي)", name_en: "Theme 25 (Lamet Zaman - Gold)", description_ar: "ثيم لمة زمان باللون الذهبي الدافئ.", description_en: "Lamet Zaman theme with gold accent.", preview_color: "#d4af37" },
    { id: "lamet-zaman-pink", family: "lamet-zaman", name_ar: "ثيم 25 (لمة زمان - وردي)", name_en: "Theme 25 (Lamet Zaman - Pink)", description_ar: "ثيم لمة زمان باللون الوردي اللطيف.", description_en: "Lamet Zaman theme with pink accent.", preview_color: "#ec4899" },
    { id: "lamet-zaman-dark", family: "lamet-zaman", name_ar: "ثيم 25 (لمة زمان - داكن)", name_en: "Theme 25 (Lamet Zaman - Dark)", description_ar: "ثيم لمة زمان بوضع داكن فاخر.", description_en: "Lamet Zaman theme with dark mode accent.", preview_color: "#1e293b" },
];

const FAMILIES = [
    { id: 'all', name_ar: 'الكل', name_en: 'All Themes' },
    { id: 'pizzapasta', name_ar: 'ثيم 1 (بيتزا باستا)', name_en: 'Theme 1 (PizzaPasta)' },
    { id: 'atyab-oriental', name_ar: 'ثيم 2 (أطياب أورينتال)', name_en: 'Theme 2 (Atyab Oriental)' },
    { id: 'bab-alhara', name_ar: 'ثيم 3 (باب الحارة)', name_en: 'Theme 3 (Bab Al-Hara)' },
    { id: 'atyab-etoile', name_ar: 'ثيم 4 (أطياب إتوال)', name_en: 'Theme 4 (Atyab Etoile)' },
    { id: 'theme5', name_ar: 'ثيم 5', name_en: 'Theme 5' },
    { id: 'theme6', name_ar: 'ثيم 6 (فراندة)', name_en: 'Theme 6 (Veranda)' },
    { id: 'theme7', name_ar: 'ثيم 7 (حليم)', name_en: 'Theme 7 (Haleem)' },
    { id: 'aswan', name_ar: 'ثيم 8 (أسوان إنجليزي)', name_en: 'Theme 8 (ASWAN EN)' },
    { id: 'theme9', name_ar: 'ثيم 9 (ديابلو)', name_en: 'Theme 9 (Diablo)' },
    { id: 'theme10', name_ar: 'ثيم 10 (الوهج البرتقالي)', name_en: 'Theme 10 (Orange Glow)' },
    { id: 'theme11', name_ar: 'ثيم 11 (عصري أفقي)', name_en: 'Theme 11 (Horizontal)' },
    { id: 'theme12', name_ar: 'ثيم 12 (العام الجديد)', name_en: 'Theme 12 (New Year)' },
    { id: 'theme13', name_ar: 'ثيم 13 (لوكس الذهبي)', name_en: 'Theme 13 (Luxe Gold)' },
    { id: 'aswan-ar', name_ar: 'ثيم 14 (أسوان عربي)', name_en: 'Theme 14 (ASWAN AR)' },
    { id: 'aswan-dual', name_ar: 'ثيم 15 (أسوان ثنائي)', name_en: 'Theme 15 (ASWAN Dual)' },
    { id: 'theme16', name_ar: 'ثيم 16 (كلاسيك أحمر)', name_en: 'Theme 16 (Classic Red)' },
    { id: 'theme17', name_ar: 'ثيم 17 (لوشا)', name_en: 'Theme 17 (Lusha)' },
    { id: 'theme18', name_ar: 'ثيم 18 (نكهة الشام)', name_en: 'Theme 18 (Sham Flavor)' },
    { id: 'theme19', name_ar: 'ثيم 19 (منيو مصر)', name_en: 'Theme 19 (MenuMasr)' },
    { id: 'vicino', name_ar: 'ثيم 20 (فيتشينو)', name_en: 'Theme 20 (Vicino)' },
    { id: 'uae', name_ar: 'ثيم 21 (الإمارات)', name_en: 'Theme 21 (UAE)' },
    { id: 'theme22', name_ar: 'ثيم 22', name_en: 'Theme 22' },
    { id: 'usa', name_ar: 'ثيم 23 (USA إنجليزي)', name_en: 'Theme 23 (USA EN)' },
    { id: 'usa-dual', name_ar: 'ثيم 24 (USA ثنائي)', name_en: 'Theme 24 (USA Dual)' },
    { id: 'lamet-zaman', name_ar: 'ثيم 25 (لمة زمان)', name_en: 'Theme 25 (Lamet Zaman)' },
];

const DEFAULT_COLORS = {
    primary: '#af0a13',
    secondary: '#9b0000',
    background: '#f8f9fa',
    text: '#333333'
};

export default function ThemePage() {
    const { language } = useLanguage();
    const isArabic = language === "ar";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState("");
    const [selectedFamily, setSelectedFamily] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [previewKey, setPreviewKey] = useState(0);
    const [_themeColors, setThemeColors] = useState({ ...DEFAULT_COLORS });
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [themeOverrides, setThemeOverrides] = useState<Record<string, { custom_name_ar?: string; custom_name_en?: string; is_hidden?: boolean }>>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: overridesData } = await supabase.from('theme_settings').select('*');
                if (overridesData) {
                    const map: Record<string, any> = {};
                    overridesData.forEach((row: any) => { map[row.theme_id] = row; });
                    setThemeOverrides(map);
                }

                const { data: restaurant, error } = await supabase
                    .from('restaurants')
                    .select('id, theme, theme_colors, slug')
                    .eq(typeof window !== "undefined" && sessionStorage.getItem('impersonating_tenant') ? 'id' : 'email', typeof window !== "undefined" && sessionStorage.getItem('impersonating_tenant') ? sessionStorage.getItem('impersonating_tenant') : user.email)
                    .single();

                if (error) {
                    const { data: restaurant2 } = await supabase
                        .from('restaurants')
                        .select('id, theme, slug')
                        .eq(typeof window !== "undefined" && sessionStorage.getItem('impersonating_tenant') ? 'id' : 'email', typeof window !== "undefined" && sessionStorage.getItem('impersonating_tenant') ? sessionStorage.getItem('impersonating_tenant') : user.email)
                        .single();
                    if (restaurant2) {
                        setRestaurantId(restaurant2.id);
                        (window as any).rSlug = restaurant2.slug;
                        setSelectedTheme(restaurant2.theme || "pizzapasta");
                    }
                } else if (restaurant) {
                    setRestaurantId(restaurant.id);
                    (window as any).rSlug = restaurant.slug;
                    setSelectedTheme(restaurant.theme || "pizzapasta");
                    if (restaurant.theme_colors) {
                        setThemeColors(prev => ({ ...prev, ...restaurant.theme_colors }));
                    }
                }
            } catch (err) {
                console.error("Error fetching theme:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const searchLower = searchQuery.toLowerCase().trim();
    const visibleThemes = THEMES
        .filter(t => !themeOverrides[t.id]?.is_hidden)
        .filter(t => selectedFamily === 'all' || t.family === selectedFamily)
        .map(t => {
            const ov = themeOverrides[t.id];
            if (!ov) return t;
            return {
                ...t,
                name_ar: ov.custom_name_ar || t.name_ar,
                name_en: ov.custom_name_en || t.name_en,
            };
        })
        .filter(t => {
            if (!searchLower) return true;
            return (
                t.name_ar.toLowerCase().includes(searchLower) ||
                t.name_en.toLowerCase().includes(searchLower) ||
                t.description_ar.toLowerCase().includes(searchLower) ||
                t.description_en.toLowerCase().includes(searchLower) ||
                t.id.toLowerCase().includes(searchLower)
            );
        });

    const getFamilyCount = (familyId: string) => {
        if (familyId === 'all') return THEMES.filter(t => !themeOverrides[t.id]?.is_hidden).length;
        return THEMES.filter(t => !themeOverrides[t.id]?.is_hidden && t.family === familyId).length;
    };

    const activeThemeObj = THEMES.find(t => t.id === selectedTheme);

    const handleSave = async () => {
        if (!restaurantId) return;
        setSaving(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('restaurants')
                .update({ theme: selectedTheme })
                .eq('id', restaurantId);

            if (error) throw error;

            try {
                const currentConfig = await posDb.settings.get('current_config');
                if (currentConfig) {
                    await posDb.settings.put({
                        ...currentConfig,
                        theme: selectedTheme
                    });
                }
            } catch (cacheErr) {
                console.warn("Could not update offline cache:", cacheErr);
            }

            setMessage({
                type: 'success',
                text: isArabic ? "تم حفظ التغييرات بنجاح! سيتم تحديث الصفحة..." : "Changes saved successfully! Reloading..."
            });

            setTimeout(() => {
                setMessage(null);
                window.location.reload();
            }, 1000);
        } catch (err) {
            console.error("Error saving theme:", err);
            const errMessage = err instanceof Error ? err.message : String(err);
            setMessage({
                type: 'error',
                text: isArabic ? `حدث خطأ أثناء الحفظ: ${errMessage}` : `Error occurred while saving: ${errMessage}`
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 w-full mx-auto space-y-6" dir={isArabic ? "rtl" : "ltr"}>
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-5 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue/20 to-blue/5 rounded-2xl flex items-center justify-center border border-blue/20 shadow-inner">
                        <Palette className="w-7 h-7 text-blue" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-foreground">
                                {isArabic ? "تخصيص مظهر المنيو" : "Customize Menu Theme"}
                            </h1>
                            <span className="bg-blue/10 text-blue text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue/20">
                                {THEMES.length} {isArabic ? "ثيم متوفر" : "Themes"}
                            </span>
                        </div>
                        <p className="text-silver text-xs sm:text-sm mt-0.5">
                            {isArabic ? "اختر التصميم والألوان المناسبة لعلامتك التجارية واستعرض المعاينة الحية فوراً." : "Select your brand design & accent colors with instant live preview."}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue hover:bg-blue-hover disabled:opacity-50 text-slate-900 dark:text-white px-6 py-3 rounded-2xl font-black transition-all shadow-lg shadow-blue/20 active:scale-95"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span>{isArabic ? "حفظ مظهر المنيو" : "Save Selected Theme"}</span>
                    </button>
                </div>
            </div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl text-center font-bold border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-50 dark:bg-red-500/10 border-red-500/30 text-red-500'}`}
                >
                    {message.text}
                </motion.div>
            )}

            {/* Selected Theme Active Summary Bar */}
            {activeThemeObj && (
                <div className="bg-gradient-to-r from-blue/10 via-card to-card border border-blue/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-white/20 shadow-md shrink-0 flex items-center justify-center text-white font-bold" style={{ backgroundColor: activeThemeObj.preview_color }}>
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-silver font-semibold">{isArabic ? "المظهر المحدد حالياً:" : "Selected Theme:"}</span>
                                <h3 className="font-extrabold text-sm text-foreground">{isArabic ? activeThemeObj.name_ar : activeThemeObj.name_en}</h3>
                            </div>
                            <p className="text-[11px] text-silver line-clamp-1 mt-0.5">{isArabic ? activeThemeObj.description_ar : activeThemeObj.description_en}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="text-[11px] font-bold px-3 py-1 bg-blue/15 text-blue rounded-xl border border-blue/20">
                            {isArabic ? "جاهز للحفظ" : "Ready to Save"}
                        </span>
                    </div>
                </div>
            )}

            {/* Search & Family Filters */}
            <div className="space-y-3 bg-card border border-border p-4 rounded-3xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-silver absolute right-3.5 top-1/2 -translate-y-1/2 rtl:right-3.5 ltr:left-3.5 ltr:right-auto" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isArabic ? "ابحث باسم الثيم أو اللون (مثل: لمة زمان، أحمر، ذهبي...)" : "Search by theme name or color..."}
                            className="w-full bg-background border border-border rounded-xl text-xs py-2.5 px-9 text-foreground focus:outline-none focus:border-blue transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-silver hover:text-foreground rtl:left-3 ltr:right-3 ltr:left-auto"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-silver font-bold shrink-0">
                        <Filter className="w-3.5 h-3.5 text-blue" />
                        <span>{isArabic ? `عرض ${visibleThemes.length} ثيم` : `Showing ${visibleThemes.length} themes`}</span>
                    </div>
                </div>

                {/* Family Navigation Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
                    {FAMILIES.map((f) => {
                        const count = getFamilyCount(f.id);
                        return (
                            <button
                                key={f.id}
                                onClick={() => setSelectedFamily(f.id)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                                    selectedFamily === f.id
                                        ? 'bg-blue text-white border-blue shadow-md'
                                        : 'bg-background border-border hover:border-blue/40 text-foreground'
                                }`}
                            >
                                <span>{isArabic ? f.name_ar : f.name_en}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${selectedFamily === f.id ? 'bg-white/20 text-white' : 'bg-card text-silver'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="lg:grid lg:grid-cols-12 lg:gap-8 flex flex-col-reverse">
                {/* Left Column (Themes Grid) */}
                <div className="col-span-12 lg:col-span-7 space-y-6">
                    {visibleThemes.length === 0 ? (
                        <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-3">
                            <Palette className="w-12 h-12 text-silver/40 mx-auto" />
                            <h3 className="font-bold text-foreground">{isArabic ? "لم يتم العثور على ثيمات مطابقة" : "No matching themes found"}</h3>
                            <p className="text-silver text-xs">{isArabic ? "جرب البحث عن كلمة أخرى أو تغيير الفلتر." : "Try searching with another keyword or reset filters."}</p>
                            <button
                                onClick={() => { setSearchQuery(""); setSelectedFamily("all"); }}
                                className="px-4 py-2 bg-blue/10 text-blue font-bold text-xs rounded-xl hover:bg-blue/20 transition-all"
                            >
                                {isArabic ? "إعادة ضبط التصفية" : "Reset Filters"}
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                            {visibleThemes.map((theme) => {
                                const isSelected = selectedTheme === theme.id;
                                return (
                                    <motion.div
                                        key={theme.id}
                                        whileHover={{ y: -3 }}
                                        onClick={() => setSelectedTheme(theme.id)}
                                        className={`relative cursor-pointer group rounded-2xl border transition-all p-3.5 overflow-hidden flex flex-col justify-between
                                            ${isSelected
                                                ? 'border-blue bg-blue/5 dark:bg-blue/10 shadow-lg ring-2 ring-blue/40'
                                                : 'border-border bg-card hover:border-blue/50 hover:shadow-md'}`}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-1 mb-2">
                                                <h3 className="font-extrabold text-xs text-foreground line-clamp-1 leading-snug">
                                                    {isArabic ? theme.name_ar : theme.name_en}
                                                </h3>
                                                <div
                                                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border border-white/30 shadow-sm"
                                                    style={{ backgroundColor: theme.preview_color }}
                                                >
                                                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-silver line-clamp-2 leading-relaxed mb-3">
                                                {isArabic ? theme.description_ar : theme.description_en}
                                            </p>
                                        </div>

                                        {/* Theme Visual Swatch Preview Box */}
                                        <div className="w-full h-14 rounded-xl bg-background border border-border p-2 flex flex-col justify-between relative overflow-hidden group-hover:border-blue/30 transition-colors">
                                            <div className="w-full flex justify-between items-center">
                                                <div className="w-1/2 h-1.5 rounded-full" style={{ backgroundColor: theme.preview_color }} />
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.preview_color }} />
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-4 h-4 rounded-md shrink-0 flex items-center justify-center" style={{ backgroundColor: theme.preview_color }}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                                                </div>
                                                <div className="w-full space-y-1">
                                                    <div className="w-3/4 h-1 rounded-full bg-slate-400/20" />
                                                    <div className="w-1/2 h-1 rounded-full bg-slate-400/20" />
                                                </div>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="absolute top-2 right-2 rtl:left-auto rtl:right-2 ltr:right-auto ltr:left-2">
                                                <span className="bg-blue text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                                                    <Check className="w-2.5 h-2.5" />
                                                    {isArabic ? "محدد" : "Selected"}
                                                </span>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* Public Menu Link Banner */}
                    <div className="bg-card border border-border p-5 rounded-3xl flex items-center justify-between gap-4 shadow-sm">
                        <div className="space-y-1">
                            <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                                <ExternalLink className="w-4 h-4 text-blue" />
                                {isArabic ? "رابط المنيو العام المباشر" : "Public Menu Direct Link"}
                            </h4>
                            <p className="text-silver text-xs">
                                {isArabic ? "افتح المنيو في نافذة خاصة لتجربته كما يراه الزوار والعملاء." : "Open menu in a new tab to see how customers view it."}
                            </p>
                        </div>
                        <a
                            href={restaurantId ? ((window as any).rSlug ? `https://${(window as any).rSlug}.asntechnology.net` : `/menu/${restaurantId}`) : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-blue/10 hover:bg-blue/20 text-blue font-black px-4 py-2.5 rounded-xl text-xs transition-all shrink-0"
                        >
                            <span>{isArabic ? "فتح المنيو" : "Open Menu"}</span>
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                {/* Right Column (Live Preview Iframe Simulator) */}
                <div className="col-span-12 lg:col-span-5 hidden lg:block">
                    <div className="sticky top-[90px]">
                        <div className="bg-card border border-border rounded-[3rem] p-4 shadow-xl flex flex-col items-center w-max mx-auto">
                            <div className="w-full flex justify-between items-center mb-4 px-3">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-3 w-3 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    <h3 className="font-extrabold text-foreground text-sm">
                                        {isArabic ? "معاينة حية للمنيو" : "Live Phone Preview"}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPreviewKey(prev => prev + 1)}
                                        title={isArabic ? "إعادة تحميل المعاينة" : "Reload Preview"}
                                        className="p-1.5 hover:bg-background rounded-lg text-silver hover:text-foreground transition-all"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[10px] text-silver font-bold bg-background px-2 py-0.5 rounded-md border border-border">
                                        {selectedTheme}
                                    </span>
                                </div>
                            </div>

                            <div className="w-[390px] h-[810px] border-[10px] border-slate-900 dark:border-slate-800 rounded-[3rem] overflow-hidden bg-white dark:bg-black relative shadow-2xl">
                                {/* Phone Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[24px] bg-slate-900 dark:border-slate-800 rounded-b-2xl z-20"></div>

                                {restaurantId ? (
                                    <iframe
                                        key={`${selectedTheme}-${previewKey}`}
                                        src={`/menu/${restaurantId}?previewTheme=${selectedTheme}&preview_theme=${selectedTheme}&t=${Date.now()}`}
                                        className="w-full h-full border-none pt-4"
                                        title="Live Menu Preview"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-silver text-xs">
                                        {isArabic ? "جاري تحميل المعاينة..." : "Loading preview..."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
