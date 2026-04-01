export interface MenuPartner {
    id: string;
    name: string;
    logoPath: string; // e.g. "/images/brands/brand-1.png"
    menuUrl: string; // The URL to the demo menu
    themeColor: string; // A hex color or tailwind color to use for the glow effect
}

export const menuPartners: MenuPartner[] = [
    {
        id: "brand-1",
        name: "بابب الحارة",
        logoPath: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=200&auto=format&fit=crop", // ضع مسار صورتك هنا (مثال: /brands/logo1.png)
        menuUrl: "https://babelhara.vercel.app/", // ضع رابط المنيو هنا
        themeColor: "#2ea3ff",
    },
    {
        id: "brand-2",
        name: "عز الشام",
        logoPath: "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=200&auto=format&fit=crop",
        menuUrl: "https://ezz-elsham.vercel.app/",
        themeColor: "#ff4757",
    },
    {
        id: "brand-3",
        name: "فطاطرى اطياب",
        logoPath: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=200&auto=format&fit=crop",
        menuUrl: "https://atiab.vercel.app/",
        themeColor: "#10ac84",
    },
    {
        id: "brand-4",
        name: "بيتزا باستا",
        logoPath: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=200&auto=format&fit=crop",
        menuUrl: "https://pizza-pasta1.vercel.app/",
        themeColor: "#ff9f43",
    },
    {
        id: "brand-5",  
        name: "بع",
        logoPath: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=200&auto=format&fit=crop",
        menuUrl: "#",
        themeColor: "#8e44ad",
    },
    {
        id: "brand-6",
        name: "براند 6",
        logoPath: "https://images.unsplash.com/photo-1498837167922-41c46b3f0ac2?q=80&w=200&auto=format&fit=crop",
        menuUrl: "#",
        themeColor: "#e1b12c",
    }
];
