import {
    Smartphone,
    Globe,
    Wand2,
    Megaphone,
    MessageSquare,
    LineChart,
    Palette,
    Code
} from "lucide-react";
import { ReactNode } from "react";

export interface ServiceData {
    id: string;
    slug: string;
    icon: ReactNode;
    iconName: string;
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    features: { ar: string; en: string }[];
    imagePath: string;
}

export const services: ServiceData[] = [
    {
        id: "s-1",
        slug: "digital-menu-systems",
        icon: <Smartphone className="w-8 h-8 text-indigo-500" />,
        iconName: "Smartphone",
        title: "Smart Digital Menu Systems",
        titleAr: "أنظمة المنيو الإلكتروني الذكي",
        description: "Professional QR-based electronic menus designed for restaurants and cafés.",
        descriptionAr: "تصميم منيو QR احترافي للمطاعم والكافيهات.",
        imagePath: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop",
        features: [
            { ar: "تصميم مخصص بهوية مطعمك", en: "Custom branded design" },
            { ar: "أكثر من قالب (Theme)", en: "Multiple themes" },
            { ar: "دعم عربي وإنجليزي", en: "Arabic & English support" },
            { ar: "تحديث الأسعار في أي وقت", en: "Instant price updates" },
            { ar: "استقبال الطلبات عبر واتساب", en: "Order via WhatsApp" },
            { ar: "إرسال الفاتورة تلقائيًا", en: "Invoice sent automatically" },
            { ar: "ربط وسائل التواصل", en: "Social media integration" },
            { ar: "أرقام توصيل بنقرة واحدة", en: "Delivery numbers with one-click call" },
            { ar: "لوحة تحكم كاملة", en: "Admin dashboard" },
            { ar: "تحليلات وتقارير", en: "Analytics & reports" }
        ]
    },
    {
        id: "s-2",
        slug: "website-design-development",
        icon: <Globe className="w-8 h-8 text-teal-500" />,
        iconName: "Globe",
        title: "Website Design & Development",
        titleAr: "تصميم وتطوير المواقع",
        description: "High-performance websites built for conversion.",
        descriptionAr: "مواقع احترافية عالية الأداء لزيادة التحويل.",
        imagePath: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072&auto=format&fit=crop",
        features: [
            { ar: "مواقع شركات", en: "Corporate websites" },
            { ar: "صفحات هبوط", en: "Landing pages" },
            { ar: "أنظمة حجز", en: "Booking systems" },
            { ar: "تطوير WordPress", en: "WordPress development" },
            { ar: "متاجر Shopify", en: "Shopify stores" },
            { ar: "تحسين SEO", en: "SEO optimization" },
            { ar: "سرعة وأداء عالي", en: "Speed optimization" },
            { ar: "تصميم متجاوب", en: "Responsive design" }
        ]
    },
    {
        id: "s-3",
        slug: "ai-content-creation",
        icon: <Wand2 className="w-8 h-8 text-sky-500" />,
        iconName: "Wand2",
        title: "AI-Powered Content & Video Creation",
        titleAr: "إنشاء محتوى وفيديو بالذكاء الاصطناعي",
        description: "We create smart marketing content powered by AI.",
        descriptionAr: "محتوى تسويقي ذكي يعزز مبيعاتك.",
        imagePath: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop",
        features: [
            { ar: "فيديوهات AI", en: "AI video generation" },
            { ar: "كتابة إعلانات احترافية", en: "Ad copywriting" },
            { ar: "تحسين صور المنتجات", en: "Product image enhancement" },
            { ar: "محتوى سوشيال ميديا", en: "Social media content creation" },
            { ar: "أفكار حملات إبداعية", en: "Campaign concept development" }
        ]
    },
    {
        id: "s-4",
        slug: "social-media-marketing",
        icon: <Megaphone className="w-8 h-8 text-violet-500" />,
        iconName: "Megaphone",
        title: "Social Media Marketing",
        titleAr: "التسويق عبر وسائل التواصل الاجتماعي",
        description: "Strategic marketing campaigns that increase engagement and sales.",
        descriptionAr: "حملات احترافية لزيادة التفاعل والمبيعات.",
        imagePath: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop",
        features: [
            { ar: "إدارة صفحات فيسبوك وإنستجرام", en: "Facebook & Instagram management" },
            { ar: "إعلانات ممولة", en: "Paid advertising campaigns" },
            { ar: "إعادة استهداف العملاء", en: "Retargeting systems" },
            { ar: "بناء جمهور", en: "Audience growth strategy" },
            { ar: "تحليل الأداء", en: "Performance tracking" }
        ]
    },
    {
        id: "s-5",
        slug: "whatsapp-automation",
        icon: <MessageSquare className="w-8 h-8 text-fuchsia-500" />,
        iconName: "MessageSquare",
        title: "WhatsApp Automation",
        titleAr: "أتمتة واتساب",
        description: "Turn WhatsApp into a powerful sales engine.",
        descriptionAr: "حوّل واتساب إلى أداة مبيعات قوية.",
        imagePath: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=1974&auto=format&fit=crop",
        features: [
            { ar: "ردود تلقائية", en: "Auto-replies" },
            { ar: "رسائل متابعة", en: "Follow-up messages" },
            { ar: "حملات إعادة تنشيط", en: "Retargeting campaigns" },
            { ar: "كتالوج منتجات", en: "Product catalog integration" },
            { ar: "إشعارات الطلبات", en: "Order notifications" }
        ]
    },
    {
        id: "s-6",
        slug: "smart-analytics",
        icon: <LineChart className="w-8 h-8 text-rose-500" />,
        iconName: "LineChart",
        title: "Smart Analytics & Insights",
        titleAr: "التحليلات الذكية",
        description: "Make data-driven decisions.",
        descriptionAr: "اتخذ قرارات مبنية على البيانات.",
        imagePath: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
        features: [
            { ar: "تتبع المبيعات", en: "Sales tracking" },
            { ar: "تحليل أفضل المنتجات", en: "Product performance reports" },
            { ar: "تقارير الحملات", en: "Campaign analytics" },
            { ar: "تقارير يومية وشهرية", en: "Daily & monthly reports" },
            { ar: "لوحة تحكم احترافية", en: "Business insights dashboard" }
        ]
    },
    {
        id: "s-7",
        slug: "branding-identity",
        icon: <Palette className="w-8 h-8 text-emerald-500" />,
        iconName: "Palette",
        title: "Branding & Identity Design",
        titleAr: "تصميم الهوية والعلامة التجارية",
        description: "Build a strong and recognizable brand.",
        descriptionAr: "بناء علامة تجارية قوية ومميزة.",
        imagePath: "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=2000&auto=format&fit=crop",
        features: [
            { ar: "تصميم لوجو", en: "Logo design" },
            { ar: "هوية بصرية كاملة", en: "Brand identity system" },
            { ar: "دليل ألوان وخطوط", en: "Color & typography guidelines" },
            { ar: "تصميم منشورات", en: "Social media design kits" },
            { ar: "دليل استخدام الهوية", en: "Brand usage guide" }
        ]
    },
    {
        id: "s-8",
        slug: "custom-software",
        icon: <Code className="w-8 h-8 text-cyan-500" />,
        iconName: "Code",
        title: "Custom Software & Strategic Solutions",
        titleAr: "برمجة أنظمة مخصصة وحلول استراتيجية",
        description: "Tailored systems designed around your business needs.",
        descriptionAr: "حلول مصممة خصيصًا لنشاطك.",
        imagePath: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop",
        features: [
            { ar: "منصات مخصصة", en: "Custom platforms" },
            { ar: "أنظمة أتمتة", en: "Automation systems" },
            { ar: "تخطيط استراتيجي للنمو", en: "Business growth strategy" },
            { ar: "استشارات تقنية", en: "Technical consulting" }
        ]
    }
];

export function getServiceBySlug(slug: string): ServiceData | undefined {
    return services.find(service => service.slug === slug);
}
