"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { Palette, Check, Save, Loader2, ExternalLink, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { posDb } from "@/lib/pos-db";
import { motion } from "framer-motion";

const THEMES = [
    // ===== ASWAN Theme Family (100% English & Custom Backgrounds) =====
    {
        id: "aswan",
        family: "aswan",
        name_ar: "أسوان الأنيق (بيج غامق)",
        name_en: "ASWAN Original (Dark Beige)",
        description_ar: "تصميم أسوان الإنجليزي باللون البيج الغامق الفاخر مع دعم خلفيات الصور.",
        description_en: "Luxury English design with dark beige accent and custom background images.",
        preview_color: "#B89B72",
    },
    {
        id: "aswan-cyan",
        family: "aswan",
        name_ar: "أسوان (سماوي Cyan)",
        name_en: "ASWAN (Cyan Blue)",
        description_ar: "ثيم أسوان الإنجليزي بلون أزرق سماوي منعش.",
        description_en: "ASWAN English theme with vibrant cyan accent.",
        preview_color: "#06b6d4",
    },
    {
        id: "aswan-emerald",
        family: "aswan",
        name_ar: "أسوان (زمردي Emerald)",
        name_en: "ASWAN (Emerald Green)",
        description_ar: "ثيم أسوان الإنجليزي بلون أخضر زمردي فاخر.",
        description_en: "ASWAN English theme with emerald green accent.",
        preview_color: "#10b981",
    },
    {
        id: "aswan-red",
        family: "aswan",
        name_ar: "أسوان (ياقوتي Red)",
        name_en: "ASWAN (Crimson Red)",
        description_ar: "ثيم أسوان الإنجليزي بلون أحمر ياقوتي جذاب.",
        description_en: "ASWAN English theme with crimson red accent.",
        preview_color: "#ef4444",
    },
    {
        id: "aswan-purple",
        family: "aswan",
        name_ar: "أسوان (بنفسجي Purple)",
        name_en: "ASWAN (Royal Purple)",
        description_ar: "ثيم أسوان الإنجليزي بلون بنفسجي ملكي راقي.",
        description_en: "ASWAN English theme with royal purple accent.",
        preview_color: "#8b5cf6",
    },
    {
        id: "aswan-gold",
        family: "aswan",
        name_ar: "أسوان (ذهبي Gold)",
        name_en: "ASWAN (Royal Gold)",
        description_ar: "ثيم أسوان الإنجليزي بلون ذهبي ملكي براق.",
        description_en: "ASWAN English theme with royal gold accent.",
        preview_color: "#d4af37",
    },
    {
        id: "aswan-dark",
        family: "aswan",
        name_ar: "أسوان (داكن عالي التباين)",
        name_en: "ASWAN (Dark Amber)",
        description_ar: "ثيم أسوان الإنجليزي بوضع داكن مع لمسات ذهبية برتقالية.",
        description_en: "ASWAN English theme with dark background and gold-amber accents.",
        preview_color: "#f59e0b",
    },

    // ===== ASWAN Arabic Family (100% Arabic) =====
    {
        id: "aswan-ar",
        family: "aswan-ar",
        name_ar: "أسوان عربي (بيج غامق)",
        name_en: "ASWAN Arabic (Dark Beige)",
        description_ar: "تصميم أسوان العربي بالكامل باللون البيج الغامق مع دعم خلفيات الصور.",
        description_en: "100% Arabic ASWAN design with dark beige accent.",
        preview_color: "#B89B72",
    },
    { id: "aswan-ar-cyan", family: "aswan-ar", name_ar: "أسوان عربي (سماوي Cyan)", name_en: "ASWAN Arabic (Cyan)", description_ar: "ثيم أسوان العربي بلون أزرق سماوي.", description_en: "ASWAN Arabic theme with cyan accent.", preview_color: "#06b6d4" },
    { id: "aswan-ar-emerald", family: "aswan-ar", name_ar: "أسوان عربي (زمردي Emerald)", name_en: "ASWAN Arabic (Emerald)", description_ar: "ثيم أسوان العربي بلون أخضر زمردي.", description_en: "ASWAN Arabic theme with emerald accent.", preview_color: "#10b981" },
    { id: "aswan-ar-red", family: "aswan-ar", name_ar: "أسوان عربي (ياقوتي Red)", name_en: "ASWAN Arabic (Crimson)", description_ar: "ثيم أسوان العربي بلون أحمر ياقوتي.", description_en: "ASWAN Arabic theme with crimson accent.", preview_color: "#ef4444" },
    { id: "aswan-ar-purple", family: "aswan-ar", name_ar: "أسوان عربي (بنفسجي Purple)", name_en: "ASWAN Arabic (Purple)", description_ar: "ثيم أسوان العربي بلون بنفسجي ملكي.", description_en: "ASWAN Arabic theme with purple accent.", preview_color: "#8b5cf6" },
    { id: "aswan-ar-gold", family: "aswan-ar", name_ar: "أسوان عربي (ذهبي Gold)", name_en: "ASWAN Arabic (Gold)", description_ar: "ثيم أسوان العربي بلون ذهبي ملكي.", description_en: "ASWAN Arabic theme with gold accent.", preview_color: "#d4af37" },
    { id: "aswan-ar-dark", family: "aswan-ar", name_ar: "أسوان عربي (داكن عالي التباين)", name_en: "ASWAN Arabic (Dark)", description_ar: "ثيم أسوان العربي بوضع داكن.", description_en: "ASWAN Arabic theme with dark mode accent.", preview_color: "#f59e0b" },

    // ===== ASWAN Dual / Bilingual Family (Arabic & English) =====
    {
        id: "aswan-dual",
        family: "aswan-dual",
        name_ar: "أسوان عربي وإنجليزي (بيج غامق)",
        name_en: "ASWAN Dual AR/EN (Dark Beige)",
        description_ar: "تصميم أسوان مزدوج اللغة (عربي وإنجليزي) مع زر تبديل اللغة الفوري.",
        description_en: "Bilingual AR/EN ASWAN theme with dynamic language switch.",
        preview_color: "#B89B72",
    },
    { id: "aswan-dual-cyan", family: "aswan-dual", name_ar: "أسوان مزدوج (سماوي Cyan)", name_en: "ASWAN Dual (Cyan)", description_ar: "ثيم أسوان مزدوج اللغة بلون أزرق سماوي.", description_en: "Bilingual ASWAN theme with cyan accent.", preview_color: "#06b6d4" },
    { id: "aswan-dual-emerald", family: "aswan-dual", name_ar: "أسوان مزدوج (زمردي Emerald)", name_en: "ASWAN Dual (Emerald)", description_ar: "ثيم أسوان مزدوج اللغة بلون أخضر زمردي.", description_en: "Bilingual ASWAN theme with emerald accent.", preview_color: "#10b981" },
    { id: "aswan-dual-red", family: "aswan-dual", name_ar: "أسوان مزدوج (ياقوتي Red)", name_en: "ASWAN Dual (Crimson)", description_ar: "ثيم أسوان مزدوج اللغة بلون أحمر ياقوتي.", description_en: "Bilingual ASWAN theme with crimson accent.", preview_color: "#ef4444" },
    { id: "aswan-dual-purple", family: "aswan-dual", name_ar: "أسوان مزدوج (بنفسجي Purple)", name_en: "ASWAN Dual (Purple)", description_ar: "ثيم أسوان مزدوج اللغة بلون بنفسجي ملكي.", description_en: "Bilingual ASWAN theme with purple accent.", preview_color: "#8b5cf6" },
    { id: "aswan-dual-gold", family: "aswan-dual", name_ar: "أسوان مزدوج (ذهبي Gold)", name_en: "ASWAN Dual (Gold)", description_ar: "ثيم أسوان مزدوج اللغة بلون ذهبي ملكي.", description_en: "Bilingual ASWAN theme with gold accent.", preview_color: "#d4af37" },
    { id: "aswan-dual-dark", family: "aswan-dual", name_ar: "أسوان مزدوج (داكن عالي التباين)", name_en: "ASWAN Dual (Dark)", description_ar: "ثيم أسوان مزدوج اللغة بوضع داكن.", description_en: "Bilingual ASWAN theme with dark mode accent.", preview_color: "#f59e0b" },

    // ===== USA Theme Family (100% English) =====
    {
        id: "usa",
        family: "usa",
        name_ar: "USA الأمريكي (أحمر)",
        name_en: "USA Original (Crimson Red)",
        description_ar: "تصميم أمريكي فاخر باللغة الإنجليزية بالكامل شامل صفحة الهبوط والسلة بدون أي كلمة عربية.",
        description_en: "Premium 100% English design including landing page, menu, cart, and checkout.",
        preview_color: "#dc2626",
    },
    {
        id: "usa-navy",
        family: "usa",
        name_ar: "USA (أزرق نيفي Navy)",
        name_en: "USA (Navy Blue)",
        description_ar: "ثيم USA الأمريكي باللون الأزرق النيفي الملوكي.",
        description_en: "USA English theme with royal navy blue accent.",
        preview_color: "#2563eb",
    },
    {
        id: "usa-emerald",
        family: "usa",
        name_ar: "USA (زمردي Emerald)",
        name_en: "USA (Emerald Green)",
        description_ar: "ثيم USA الأمريكي باللون الأخضر الزمردي.",
        description_en: "USA English theme with emerald green accent.",
        preview_color: "#059669",
    },
    {
        id: "usa-gold",
        family: "usa",
        name_ar: "USA (ذهبي Gold)",
        name_en: "USA (Luxe Gold)",
        description_ar: "ثيم USA الأمريكي باللون الذهبي الدافئ.",
        description_en: "USA English theme with luxe gold accent.",
        preview_color: "#d97706",
    },
    {
        id: "usa-dark",
        family: "usa",
        name_ar: "USA (داكن Midnight)",
        name_en: "USA (Midnight Rose)",
        description_ar: "ثيم USA الأمريكي بوضع داكن مع لمسات وردية ياقوتية.",
        description_en: "USA English theme with dark midnight background.",
        preview_color: "#e11d48",
    },

    // ===== UAE Theme Family (100% Arabic) =====
    {
        id: "uae",
        family: "uae",
        name_ar: "الإمارات UAE (ذهبي ملكي Gold)",
        name_en: "UAE Theme (Royal Gold)",
        description_ar: "ثيم الإمارات الفاخر باللغة العربية بالكامل مع دعم خلفيات الصور وصفحة الهبوط التفاعلية.",
        description_en: "100% Arabic UAE Luxury Theme with landing page & video support.",
        preview_color: "#d97706",
    },
    {
        id: "uae-red",
        family: "uae",
        name_ar: "الإمارات UAE (أحمر Red)",
        name_en: "UAE Theme (Crimson Red)",
        description_ar: "ثيم الإمارات باللون الأحمري القاني.",
        description_en: "UAE Arabic theme with crimson red accent.",
        preview_color: "#dc2626",
    },
    {
        id: "uae-emerald",
        family: "uae",
        name_ar: "الإمارات UAE (زمردي Emerald)",
        name_en: "UAE Theme (Emerald Green)",
        description_ar: "ثيم الإمارات باللون الأخضر الزمردي.",
        description_en: "UAE Arabic theme with emerald green accent.",
        preview_color: "#059669",
    },
    {
        id: "uae-navy",
        family: "uae",
        name_ar: "الإمارات UAE (أزرق نيفي Navy)",
        name_en: "UAE Theme (Navy Blue)",
        description_ar: "ثيم الإمارات باللون الأزرق الملوكي.",
        description_en: "UAE Arabic theme with navy blue accent.",
        preview_color: "#2563eb",
    },
    {
        id: "uae-dark",
        family: "uae",
        name_ar: "الإمارات UAE (داكن عالي التباين)",
        name_en: "UAE Theme (Dark Mode)",
        description_ar: "ثيم الإمارات بوضع داكن فاخر.",
        description_en: "UAE Arabic theme with dark mode background.",
        preview_color: "#1e293b",
    },

    // ===== USA Dual / Bilingual Family (Arabic & English) =====
    {
        id: "usa-dual",
        family: "usa-dual",
        name_ar: "USA Dual الثنائي (عربي/إنجليزي - وردي)",
        name_en: "USA Dual Theme (Bilingual - Crimson)",
        description_ar: "ثيم USA الأمريكي الثنائي لدعم اللغتين العربية والإنجليزية بتبديل فوري.",
        description_en: "Bilingual English & Arabic USA Theme with dynamic language switch button.",
        preview_color: "#e11d48",
    },
    {
        id: "usa-dual-navy",
        family: "usa-dual",
        name_ar: "USA Dual الثنائي (أزرق نيفي Navy)",
        name_en: "USA Dual Theme (Navy Blue)",
        description_ar: "ثيم USA الثنائي باللون الأزرق الملوكي.",
        description_en: "Bilingual USA Theme with navy blue accent.",
        preview_color: "#2563eb",
    },
    {
        id: "usa-dual-emerald",
        family: "usa-dual",
        name_ar: "USA Dual الثنائي (زمردي Emerald)",
        name_en: "USA Dual Theme (Emerald Green)",
        description_ar: "ثيم USA الثنائي باللون الأخضر الزمردي.",
        description_en: "Bilingual USA Theme with emerald green accent.",
        preview_color: "#059669",
    },
    {
        id: "usa-dual-gold",
        family: "usa-dual",
        name_ar: "USA Dual الثنائي (ذهبي Gold)",
        name_en: "USA Dual Theme (Luxe Gold)",
        description_ar: "ثيم USA الثنائي باللون الذهبي الدافئ.",
        description_en: "Bilingual USA Theme with luxe gold accent.",
        preview_color: "#d97706",
    },
    {
        id: "usa-dual-dark",
        family: "usa-dual",
        name_ar: "USA Dual الثنائي (داكن عالي التباين)",
        name_en: "USA Dual Theme (Dark Midnight)",
        description_ar: "ثيم USA الثنائي بوضع داكن فاخر.",
        description_en: "Bilingual USA Theme with dark mode background.",
        preview_color: "#020617",
    },

    // ===== Vicino Family =====
    {
        id: "vicino",
        family: "vicino",
        name_ar: "ثيم فيتشينو المذهل",
        name_en: "Theme Vicino (Metallic Gold)",
        description_ar: "تصميم رائع بصفحة هبوط تحتوي على فيديو ونبذة عن المكان.",
        description_en: "Amazing design with a landing page containing video and about section.",
        preview_color: "#B8860B",
    },

    // ===== PizzaPasta Color Variations =====
    { id: "pizzapasta", family: "pizzapasta", name_ar: "بيتزا باستا (أزرق)", name_en: "Pizza Pasta (Blue)", description_ar: "تصميم عصري بخلفية داكنة.", description_en: "Modern dark design.", preview_color: "#3b82f6" },
    { id: "pizzapasta-cyan", family: "pizzapasta", name_ar: "PizzaPasta (Cyan)", name_en: "PizzaPasta (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "PizzaPasta design with Cyan color", preview_color: "#0891b2" },
    { id: "pizzapasta-red", family: "pizzapasta", name_ar: "PizzaPasta (Red)", name_en: "PizzaPasta (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "PizzaPasta design with Red color", preview_color: "#dc2626" },
    { id: "pizzapasta-emerald", family: "pizzapasta", name_ar: "PizzaPasta (Emerald)", name_en: "PizzaPasta (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "PizzaPasta design with Emerald color", preview_color: "#059669" },
    { id: "pizzapasta-sky", family: "pizzapasta", name_ar: "PizzaPasta (Sky)", name_en: "PizzaPasta (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "PizzaPasta design with Sky color", preview_color: "#0284c7" },

    // ===== Atyab Oriental Color Variations =====
    { id: "atyab-oriental", family: "atyab-oriental", name_ar: "أطياب أورينتال (ذهبي)", name_en: "Atyab Oriental (Gold)", description_ar: "تصميم احترافي بلمسات ذهبية.", description_en: "High-contrast professional design.", preview_color: "#eab308" },
    { id: "atyab-oriental-cyan", family: "atyab-oriental", name_ar: "أطياب أورينتال (Cyan)", name_en: "AtyabOriental (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "AtyabOriental design with Cyan color", preview_color: "#0891b2" },
    { id: "atyab-oriental-red", family: "atyab-oriental", name_ar: "أطياب أورينتال (أحمر)", name_en: "Atyab Oriental (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "AtyabOriental design with Red color", preview_color: "#dc2626" },
    { id: "atyab-oriental-emerald", family: "atyab-oriental", name_ar: "أطياب أورينتال (Emerald)", name_en: "AtyabOriental (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "AtyabOriental design with Emerald color", preview_color: "#059669" },
    { id: "atyab-oriental-sky", family: "atyab-oriental", name_ar: "أطياب أورينتال (Sky)", name_en: "AtyabOriental (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "AtyabOriental design with Sky color", preview_color: "#0284c7" },

    // ===== BabAlHara Color Variations =====
    { id: "bab-alhara", family: "bab-alhara", name_ar: "باب الحارة (أحمر)", name_en: "Bab Al-Hara (Red)", description_ar: "تصميم كلاسيكي بطابع سوري.", description_en: "Classic Syrian-style design.", preview_color: "#e31e24" },
    { id: "bab-alhara-cyan", family: "bab-alhara", name_ar: "باب الحارة (Cyan)", name_en: "BabAlHara (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "BabAlHara design with Cyan color", preview_color: "#0891b2" },
    { id: "bab-alhara-red", family: "bab-alhara", name_ar: "باب الحارة (أحمر داكن)", name_en: "Bab Al Hara (Dark Red)", description_ar: "نفس التصميم بلون أحمر داكن", description_en: "BabAlHara design with Dark Red color", preview_color: "#dc2626" },
    { id: "bab-alhara-emerald", family: "bab-alhara", name_ar: "باب الحارة (Emerald)", name_en: "BabAlHara (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "BabAlHara design with Emerald color", preview_color: "#059669" },
    { id: "bab-alhara-sky", family: "bab-alhara", name_ar: "باب الحارة (Sky)", name_en: "BabAlHara (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "BabAlHara design with Sky color", preview_color: "#0284c7" },

    // ===== AtyabEtoile Color Variations =====
    { id: "atyab-etoile", family: "atyab-etoile", name_ar: "أطياب إتوال (ذهبي)", name_en: "Atyab Etoile (Gold)", description_ar: "تصميم أنيق بشريط متحرك والسلة.", description_en: "Elegant design with marquee bar.", preview_color: "#B89038" },
    { id: "atyab-etoile-cyan", family: "atyab-etoile", name_ar: "أطياب إتوال (Cyan)", name_en: "AtyabEtoile (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "AtyabEtoile design with Cyan color", preview_color: "#0891b2" },
    { id: "atyab-etoile-red", family: "atyab-etoile", name_ar: "أطياب إتوال (أحمر)", name_en: "Atyab Etoile (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "AtyabEtoile design with Red color", preview_color: "#dc2626" },
    { id: "atyab-etoile-emerald", family: "atyab-etoile", name_ar: "أطياب إتوال (Emerald)", name_en: "AtyabEtoile (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "AtyabEtoile design with Emerald color", preview_color: "#059669" },
    { id: "atyab-etoile-sky", family: "atyab-etoile", name_ar: "أطياب إتوال (Sky)", name_en: "AtyabEtoile (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "AtyabEtoile design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 5 Color Variations =====
    { id: "theme5", family: "theme5", name_ar: "ثيم 5 (برتقالي)", name_en: "Theme 5 (Orange)", description_ar: "تصميم مميز جديد بخاصية تقسيم العناصر.", description_en: "New premium design with item categories.", preview_color: "#ea580c" },
    { id: "theme5-cyan", family: "theme5", name_ar: "ثيم 5 (Cyan)", name_en: "Theme5 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme5 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme5-red", family: "theme5", name_ar: "ثيم 5 (أحمر)", name_en: "Theme 5 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme5 design with Red color", preview_color: "#dc2626" },
    { id: "theme5-emerald", family: "theme5", name_ar: "ثيم 5 (Emerald)", name_en: "Theme5 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme5 design with Emerald color", preview_color: "#059669" },
    { id: "theme5-sky", family: "theme5", name_ar: "ثيم 5 (Sky)", name_en: "Theme5 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme5 design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 6 Color Variations =====
    { id: "theme6", family: "theme6", name_ar: "فراندة (تيل)", name_en: "Veranda (Teal)", description_ar: "تصميم عصري باللون التيل مع سلة عائمة.", description_en: "Modern teal design with floating cart.", preview_color: "#40a798" },
    { id: "theme6-cyan", family: "theme6", name_ar: "ثيم 6 (Cyan)", name_en: "Theme6 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme6 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme6-red", family: "theme6", name_ar: "ثيم 6 (أحمر)", name_en: "Theme 6 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme6 design with Red color", preview_color: "#dc2626" },
    { id: "theme6-emerald", family: "theme6", name_ar: "ثيم 6 (Emerald)", name_en: "Theme6 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme6 design with Emerald color", preview_color: "#059669" },
    { id: "theme6-sky", family: "theme6", name_ar: "ثيم 6 (Sky)", name_en: "Theme6 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme6 design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 7 Color Variations =====
    { id: "theme7", family: "theme7", name_ar: "حليم (داكن ذهبي)", name_en: "Haleem (Dark Gold)", description_ar: "تصميم داكن فاخر بلمسات ذهبية.", description_en: "Premium dark theme with gold accents.", preview_color: "#c9a84c" },
    { id: "theme7-cyan", family: "theme7", name_ar: "ثيم 7 (Cyan)", name_en: "Theme7 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme7 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme7-red", family: "theme7", name_ar: "ثيم 7 (أحمر)", name_en: "Theme 7 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme7 design with Red color", preview_color: "#dc2626" },
    { id: "theme7-emerald", family: "theme7", name_ar: "ثيم 7 (Emerald)", name_en: "Theme7 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme7 design with Emerald color", preview_color: "#059669" },
    { id: "theme7-sky", family: "theme7", name_ar: "ثيم 7 (Sky)", name_en: "Theme7 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme7 design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 9 Color Variations =====
    { id: "theme9", family: "theme9", name_ar: "ديابلو (أحمر)", name_en: "Diablo (Red)", description_ar: "تصميم عصري باللون الأحمر وتأثيرات حيوية.", description_en: "Modern red design with vibrant effects.", preview_color: "#e74c3c" },
    { id: "theme9-cyan", family: "theme9", name_ar: "ثيم 9 (Cyan)", name_en: "Theme9 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme9 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme9-red", family: "theme9", name_ar: "ثيم 9 (أحمر داكن)", name_en: "Theme9 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme9 design with Red color", preview_color: "#dc2626" },
    { id: "theme9-emerald", family: "theme9", name_ar: "ثيم 9 (Emerald)", name_en: "Theme9 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme9 design with Emerald color", preview_color: "#059669" },
    { id: "theme9-sky", family: "theme9", name_ar: "ثيم 9 (Sky)", name_en: "Theme9 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme9 design with Sky color", preview_color: "#0284c7" },
    { id: "theme9-pink", family: "theme9", name_ar: "ثيم 9 (وردي)", name_en: "Theme9 (Pink)", description_ar: "نفس التصميم بلون وردي", description_en: "Theme9 design with Pink color", preview_color: "#ec4899" },
    { id: "theme9-gold", family: "theme9", name_ar: "ثيم 9 (ذهبي)", name_en: "Theme9 (Gold)", description_ar: "نفس التصميم بلون ذهبي", description_en: "Theme9 design with Gold color", preview_color: "#D4A017" },

    // ===== Theme 10 Color Variations =====
    { id: "theme10", family: "theme10", name_ar: "الوهج البرتقالي", name_en: "Orange Glow", description_ar: "تصميم مشرق باللون البرتقالي.", description_en: "Bright orange design with scrollable categories.", preview_color: "#ea580c" },
    { id: "theme10-cyan", family: "theme10", name_ar: "ثيم 10 (Cyan)", name_en: "Theme10 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme10 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme10-red", family: "theme10", name_ar: "ثيم 10 (أحمر)", name_en: "Theme 10 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme10 design with Red color", preview_color: "#dc2626" },
    { id: "theme10-emerald", family: "theme10", name_ar: "ثيم 10 (Emerald)", name_en: "Theme10 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme10 design with Emerald color", preview_color: "#059669" },
    { id: "theme10-sky", family: "theme10", name_ar: "ثيم 10 (Sky)", name_en: "Theme10 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme10 design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 11 Color Variations =====
    { id: "theme11", family: "theme11", name_ar: "عصري أفقي (أحمر)", name_en: "Luxe 11 (Red)", description_ar: "عرض الأصناف والأحجام بشكل أفقي أنيق.", description_en: "Modern Luxe design displaying multiple sizes.", preview_color: "#e54750" },
    { id: "theme11-cyan", family: "theme11", name_ar: "ثيم 11 (Cyan)", name_en: "Theme11 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme11 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme11-red", family: "theme11", name_ar: "ثيم 11 (أحمر)", name_en: "Theme 11 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme11 design with Red color", preview_color: "#dc2626" },
    { id: "theme11-emerald", family: "theme11", name_ar: "ثيم 11 (Emerald)", name_en: "Theme11 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme11 design with Emerald color", preview_color: "#059669" },
    { id: "theme11-sky", family: "theme11", name_ar: "ثيم 11 (Sky)", name_en: "Theme11 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme11 design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 13 Color Variations =====
    { id: "theme13", family: "theme13", name_ar: "لوكس الذهبي (ذهبي)", name_en: "Luxe Gold (Gold)", description_ar: "تصميم فاخر بلمسات ذهبية.", description_en: "Luxurious design with gold touches.", preview_color: "#d4af37" },
    { id: "theme13-cyan", family: "theme13", name_ar: "ثيم 13 (Cyan)", name_en: "Theme13 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme13 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme13-red", family: "theme13", name_ar: "ثيم 13 (أحمر)", name_en: "Theme 13 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme13 design with Red color", preview_color: "#dc2626" },
    { id: "theme13-emerald", family: "theme13", name_ar: "ثيم 13 (Emerald)", name_en: "Theme13 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme13 design with Emerald color", preview_color: "#059669" },
    { id: "theme13-sky", family: "theme13", name_ar: "ثيم 13 (Sky)", name_en: "Theme13 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme13 design with Sky color", preview_color: "#0284c7" },

    // ===== Theme 18 & 19 & 22 Color Variations =====
    { id: "theme18", family: "theme18", name_ar: "نكهة الشام (أخضر)", name_en: "Sham Flavor (Green)", description_ar: "تصميم عصري سريع جداً.", description_en: "Very fast modern design.", preview_color: "#16a34a" },
    { id: "theme18-red", family: "theme18", name_ar: "ثيم 18 (أحمر)", name_en: "Theme18 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme18 design with Red color", preview_color: "#ef4444" },
    { id: "theme18-cyan", family: "theme18", name_ar: "ثيم 18 (Cyan)", name_en: "Theme18 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme18 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme18-emerald", family: "theme18", name_ar: "ثيم 18 (Emerald)", name_en: "Theme18 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme18 design with Emerald color", preview_color: "#059669" },
    { id: "theme18-sky", family: "theme18", name_ar: "ثيم 18 (Sky)", name_en: "Theme18 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme18 design with Sky color", preview_color: "#0284c7" },
    { id: "theme18-pink", family: "theme18", name_ar: "ثيم 18 (وردي)", name_en: "Theme18 (Pink)", description_ar: "نفس التصميم بلون وردي", description_en: "Theme18 design with Pink color", preview_color: "#ec4899" },
    { id: "theme18-gold", family: "theme18", name_ar: "ثيم 18 (ذهبي)", name_en: "Theme18 (Gold)", description_ar: "نفس التصميم بلون ذهبي", description_en: "Theme18 design with Gold color", preview_color: "#D4A017" },

    { id: "theme19", family: "theme19", name_ar: "منيو مصر (أزرق)", name_en: "MenuMasr (Blue)", description_ar: "تصميم مستوحى من منيو مصر الشهير.", description_en: "Design inspired by MenuMasr.", preview_color: "#2563eb" },
    { id: "theme19-red", family: "theme19", name_ar: "ثيم 19 (أحمر)", name_en: "Theme19 (Red)", description_ar: "نفس التصميم بلون أحمر", description_en: "Theme19 design with Red color", preview_color: "#ef4444" },
    { id: "theme19-cyan", family: "theme19", name_ar: "ثيم 19 (Cyan)", name_en: "Theme19 (Cyan)", description_ar: "نفس التصميم بلون Cyan", description_en: "Theme19 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme19-emerald", family: "theme19", name_ar: "ثيم 19 (Emerald)", name_en: "Theme19 (Emerald)", description_ar: "نفس التصميم بلون Emerald", description_en: "Theme19 design with Emerald color", preview_color: "#059669" },
    { id: "theme19-sky", family: "theme19", name_ar: "ثيم 19 (Sky)", name_en: "Theme19 (Sky)", description_ar: "نفس التصميم بلون Sky", description_en: "Theme19 design with Sky color", preview_color: "#0284c7" },
    { id: "theme19-pink", family: "theme19", name_ar: "ثيم 19 (وردي)", name_en: "Theme19 (Pink)", description_ar: "نفس التصميم بلون وردي", description_en: "Theme19 design with Pink color", preview_color: "#ec4899" },

    { id: "theme22", family: "theme22", name_ar: "ثيم 22 (برتقالي)", name_en: "Theme 22 (Orange)", description_ar: "نفس ثيم 19 بزر إضافة إلى السلة صريح.", description_en: "Explicit Add to Cart button layout.", preview_color: "#f97316" },
    { id: "theme22-red", family: "theme22", name_ar: "ثيم 22 (أحمر)", name_en: "Theme 22 (Red)", description_ar: "نفس ثيم 22 بلون أحمر", description_en: "Theme 22 design with Red color", preview_color: "#ef4444" },
    { id: "theme22-cyan", family: "theme22", name_ar: "ثيم 22 (Cyan)", name_en: "Theme 22 (Cyan)", description_ar: "نفس ثيم 22 بلون Cyan", description_en: "Theme 22 design with Cyan color", preview_color: "#0891b2" },
    { id: "theme22-emerald", family: "theme22", name_ar: "ثيم 22 (Emerald)", name_en: "Theme 22 (Emerald)", description_ar: "نفس ثيم 22 بلون Emerald", description_en: "Theme 22 design with Emerald color", preview_color: "#059669" },
    { id: "theme22-sky", family: "theme22", name_ar: "ثيم 22 (Sky)", name_en: "Theme 22 (Sky)", description_ar: "نفس ثيم 22 بلون Sky", description_en: "Theme 22 design with Sky color", preview_color: "#0284c7" },
    { id: "theme22-pink", family: "theme22", name_ar: "ثيم 22 (وردي)", name_en: "Theme 22 (Pink)", description_ar: "نفس ثيم 22 بلون وردي", description_en: "Theme 22 design with Pink color", preview_color: "#ec4899" },
    { id: "theme22-gold", family: "theme22", name_ar: "ثيم 22 (ذهبي)", name_en: "Theme 22 (Gold)", description_ar: "نفس ثيم 22 بلون ذهبي", description_en: "Theme 22 design with Gold color", preview_color: "#D4A017" },

    // ===== Other Standalone Themes =====
    { id: "theme12", family: "theme12", name_ar: "العام الجديد (ثيم 12)", name_en: "New Year (Theme 12)", description_ar: "أنيميشن RGB وسلايدر مميز.", description_en: "RGB animations and unique slider.", preview_color: "#6c63ff" },
    { id: "theme16", family: "theme16", name_ar: "كلاسيك أحمر (ثيم 16)", name_en: "Classic Red (Theme 16)", description_ar: "واجهة نظيفة بلون أحمر جذاب.", description_en: "Clean interface with red accent.", preview_color: "#af0a13" },
    { id: "theme17", family: "theme17", name_ar: "لوشا (ثيم 17)", name_en: "Lusha (Theme 17)", description_ar: "عرض الفئات بنظام التمرير Coverflow.", description_en: "Coverflow categories swiper.", preview_color: "#d32f2f" },
    { id: "lamet-zaman", family: "lamet-zaman", name_ar: "ثيم لمة زمان", name_en: "Lamet Zaman", description_ar: "أقسام دائرية وشريط تنقل مثبت.", description_en: "Circular category nav with sticky header.", preview_color: "#f97316" },
];

const FAMILIES = [
    { id: 'all', name_ar: 'الكل', name_en: 'All Themes' },
    { id: 'aswan-ar', name_ar: 'ثيم أسوان (عربي 100%)', name_en: 'ASWAN (100% AR)' },
    { id: 'aswan-dual', name_ar: 'ثيم أسوان (عربي وإنجليزي)', name_en: 'ASWAN (Dual AR/EN)' },
    { id: 'aswan', name_ar: 'ثيم أسوان (إنجليزي 100%)', name_en: 'ASWAN (100% EN)' },
    { id: 'usa', name_ar: 'ثيم USA (إنجليزي 100%)', name_en: 'USA (100% EN)' },
    { id: 'vicino', name_ar: 'فيتشينو Vicino', name_en: 'Vicino' },
    { id: 'pizzapasta', name_ar: 'بيتزا باستا', name_en: 'PizzaPasta' },
    { id: 'atyab-oriental', name_ar: 'أطياب أورينتال', name_en: 'Atyab Oriental' },
    { id: 'atyab-etoile', name_ar: 'أطياب إتوال', name_en: 'Atyab Etoile' },
    { id: 'bab-alhara', name_ar: 'باب الحارة', name_en: 'Bab Al-Hara' },
    { id: 'theme9', name_ar: 'ثيم ديابلو 9', name_en: 'Theme 9' },
    { id: 'theme18', name_ar: 'ثيم الشام 18', name_en: 'Theme 18' },
    { id: 'theme19', name_ar: 'منيو مصر 19', name_en: 'Theme 19' },
    { id: 'theme22', name_ar: 'ثيم 22', name_en: 'Theme 22' },
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
        });

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
        <div className="p-6 w-full mx-auto space-y-8" dir={isArabic ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue/10 rounded-2xl flex items-center justify-center">
                        <Palette className="w-6 h-6 text-blue" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {isArabic ? "اختر مظهر المنيو" : "Choose Menu Theme"}
                        </h1>
                        <p className="text-silver text-sm">
                            {isArabic ? "اختر التصميم والألوان المناسبة لعلامتك التجارية." : "Select the design and color theme for your restaurant."}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue hover:bg-blue-hover disabled:opacity-50 text-slate-900 dark:text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue/20"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isArabic ? "حفظ التغييرات" : "Save Changes"}
                </button>
            </div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl text-center font-bold ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-50 dark:bg-red-500/10 text-red-500'}`}
                >
                    {message.text}
                </motion.div>
            )}

            {/* Theme Family Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-border">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-400 shrink-0 pl-1 pr-2">
                    <Filter className="w-4 h-4" />
                    <span>{isArabic ? "تصفية عائلات الثيمات:" : "Filter Family:"}</span>
                </div>
                {FAMILIES.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setSelectedFamily(f.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                            selectedFamily === f.id
                                ? 'bg-blue text-white border-blue shadow-md'
                                : 'bg-card border-border hover:border-slate-400 text-foreground'
                        }`}
                    >
                        {isArabic ? f.name_ar : f.name_en}
                    </button>
                ))}
            </div>

            <div className="lg:grid lg:grid-cols-12 lg:gap-8 flex flex-col-reverse">
                {/* Left Column (Themes Grid) */}
                <div className="col-span-12 lg:col-span-7 space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        {visibleThemes.map((theme) => (
                            <div
                                key={theme.id}
                                onClick={() => setSelectedTheme(theme.id)}
                                className={`relative cursor-pointer group rounded-2xl border transition-all p-3 overflow-hidden flex flex-col justify-between
                                    ${selectedTheme === theme.id
                                        ? 'border-blue bg-blue/5 shadow-md ring-2 ring-blue/30'
                                        : 'border-border bg-card hover:border-blue/50'}`}
                            >
                                <div>
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-bold text-xs text-foreground line-clamp-1">
                                            {isArabic ? theme.name_ar : theme.name_en}
                                        </h3>
                                        <div
                                            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border border-white/20 shadow-sm"
                                            style={{ backgroundColor: theme.preview_color }}
                                        >
                                            {selectedTheme === theme.id && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-silver line-clamp-2 leading-relaxed mb-3">
                                        {isArabic ? theme.description_ar : theme.description_en}
                                    </p>
                                </div>

                                {/* Theme Color Accent Card Preview */}
                                <div className="w-full h-12 rounded-xl bg-background border border-border p-2 flex flex-col justify-between relative overflow-hidden">
                                    <div className="w-3/4 h-1.5 rounded-full" style={{ backgroundColor: theme.preview_color }} />
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded-md" style={{ backgroundColor: theme.preview_color }} />
                                        <div className="w-full h-1.5 rounded-full bg-slate-400/20" />
                                    </div>
                                </div>

                                {selectedTheme === theme.id && (
                                    <div className="absolute top-2 right-2">
                                        <span className="bg-blue text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                            {isArabic ? "مفعل" : "Active"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="bg-blue/5 border border-blue/10 p-6 rounded-[2rem] flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="font-bold text-foreground">
                                {isArabic ? "رابط المنيو العام" : "Public Menu Link"}
                            </h4>
                            <p className="text-silver text-xs">
                                {isArabic ? "افتح المنيو في نافذة جديدة." : "Open the menu in a new window."}
                            </p>
                        </div>
                        <a
                            href={restaurantId ? ((window as any).rSlug ? `https://${(window as any).rSlug}.asntechnology.net` : `/menu/${restaurantId}`) : "#"}
                            target="_blank"
                            className="flex items-center gap-2 text-blue font-bold hover:underline text-base"
                        >
                            {isArabic ? "فتح المنيو" : "Open Menu"}
                            <ExternalLink className="w-5 h-5" />
                        </a>
                    </div>
                </div>

                {/* Right Column (Live Preview Iframe Simulator) */}
                <div className="col-span-12 lg:col-span-5 hidden lg:block">
                    <div className="sticky top-[90px]">
                        <div className="bg-white dark:bg-glass-dark border border-glass-border rounded-[3rem] p-4 shadow-xl flex flex-col items-center w-max mx-auto">
                            <div className="w-full flex justify-between items-center mb-5 px-3">
                                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                                    <span className="flex h-3 w-3 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    {isArabic ? "معاينة حية" : "Live Preview"}
                                </h3>
                                <p className="text-xs text-silver font-medium">
                                    {isArabic ? "تحديث تلقائي" : "Auto-updating"}
                                </p>
                            </div>

                            <div className="w-[414px] h-[850px] border-[10px] border-slate-900 dark:border-slate-800 rounded-[3rem] overflow-hidden bg-white dark:bg-black relative shadow-2xl">
                                {/* Phone Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[24px] bg-slate-900 dark:border-slate-800 rounded-b-2xl z-20"></div>

                                {restaurantId ? (
                                    <iframe
                                        key={selectedTheme}
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
