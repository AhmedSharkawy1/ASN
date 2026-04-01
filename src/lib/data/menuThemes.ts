export const siteSettings = {
    // تفعيل أو تعطيل قسم "النماذج الجاهزة أو الثيمات" في صفحة خدمة المنيو
    showMarketingThemesSection: true,
};

export interface MenuThemeShowcase {
    id: string;
    subdomain: string; // e.g. "pizzapasta"
    name: string;      // e.g. "بيتزا وباستا هب"
    nameEn: string;
    imagePath: string; // The preview image of the theme
    themeColor: string; // To add a matching glow effect dynamically
}

export const menuThemesShowcase: MenuThemeShowcase[] = [
    {
        id: "theme-1",
        subdomain: "theme5",
        name: "الفاخر والأنيق",
        nameEn: "Premium Elegance",
        imagePath: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600&auto=format&fit=crop", // placeholder image 1
        themeColor: "#eab308", // Yellow/Gold
    },
    {
        id: "theme-2",
        subdomain: "bab-alhara",
        name: "باب الحارة",
        nameEn: "Bab Al-Hara",
        imagePath: "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=600&auto=format&fit=crop", // placeholder
        themeColor: "#dc2626", // Red
    },
    {
        id: "theme-3",
        subdomain: "atyab-etoile",
        name: "أطياب إيتوال",
        nameEn: "Atyab Etoile",
        imagePath: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=600&auto=format&fit=crop", // placeholder
        themeColor: "#2563eb", // Blue
    },
    {
        id: "theme-4",
        subdomain: "pizzapasta",
        name: "بيتزا وباستا هب",
        nameEn: "Pizza & Pasta Hub",
        imagePath: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop", // pizza placeholder
        themeColor: "#b91c1c", // Dark Red
    },
    {
        id: "theme-5",
        subdomain: "theme11",
        name: "التصميم البسيط",
        nameEn: "Luxe Minimal",
        imagePath: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop", // placeholder
        themeColor: "#10b981", // Emerald
    },
    {
        id: "theme-6",
        subdomain: "theme13",
        name: "المخبز الطازج",
        nameEn: "Fresh Bakery",
        imagePath: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop", // placeholder
        themeColor: "#d97706", // Amber
    }
];
