"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { QrCode, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type TableQR = { id: string; label: string };

export default function QRPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [tables, setTables] = useState<TableQR[]>([]);
    const [qrColor, setQrColor] = useState("#020617");
    const [qrBg, setQrBg] = useState("#ffffff");
    const [selectedItem, setSelectedItem] = useState<string>("menu");
    const qrRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!restaurantId) return;
        supabase.from('tables').select('id, label').eq('restaurant_id', restaurantId).then(({ data }) => setTables((data as TableQR[]) || []));
    }, [restaurantId]);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const getQRUrl = () => {
        if (selectedItem === "menu") return `${baseUrl}/menu/${restaurantId}`;
        return `${baseUrl}/menu/${restaurantId}?table=${selectedItem}`;
    };

    const downloadQR = (label: string) => {
        if (!qrRef.current) return;
        const svg = qrRef.current;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width + 40; canvas.height = img.height + 40;
            if (ctx) {
                ctx.fillStyle = qrBg; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 20, 20);
                const pngFile = canvas.toDataURL("image/png");
                const a = document.createElement("a"); a.download = `QR-${label}.png`; a.href = pngFile; a.click();
            }
        };
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    };

    const qrItems = [
        { id: "menu", label: isAr ? "المنيو الرئيسي" : "Main Menu" },
        ...tables.map(t => ({ id: t.id, label: `${isAr ? "طاولة" : "Table"} ${t.label}` }))
    ];

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
            <div>
                <h1 className="text-2xl font-extrabold text-white flex items-center gap-3"><QrCode className="w-7 h-7 text-emerald-400" />{isAr ? "إدارة أكواد QR" : "QR Code Management"}</h1>
                <p className="text-zinc-400 text-sm mt-1">{isAr ? "أنشئ أكواد QR للمنيو والطاولات بألوان مخصصة" : "Generate QR codes for menu and tables with custom colors"}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* QR Preview */}
                <div className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-6 flex flex-col items-center">
                    <div className="p-4 rounded-2xl shadow-xl mb-4" style={{ backgroundColor: qrBg }}>
                        <QRCodeSVG value={getQRUrl()} size={220} bgColor={qrBg} fgColor={qrColor} level="H" ref={qrRef} />
                    </div>
                    <p className="text-sm font-bold text-zinc-300 mb-1">{qrItems.find(q => q.id === selectedItem)?.label || ""}</p>
                    <p className="text-[10px] text-zinc-500 mb-4 break-all" dir="ltr">{getQRUrl()}</p>
                    <button onClick={() => downloadQR(qrItems.find(q => q.id === selectedItem)?.label || "QR")}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl transition active:scale-95">
                        <Download className="w-5 h-5" /> {isAr ? "تحميل الكود" : "Download QR"}
                    </button>
                </div>

                {/* Settings */}
                <div className="space-y-4">
                    {/* Target selector */}
                    <div className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-zinc-300 mb-3">{isAr ? "اختر الهدف" : "Select Target"}</h3>
                        <div className="flex flex-wrap gap-2">
                            {qrItems.map(q => (
                                <button key={q.id} onClick={() => setSelectedItem(q.id)}
                                    className={`text-xs font-bold px-3 py-2 rounded-lg border transition ${selectedItem === q.id ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-800/50 text-zinc-500 border-zinc-700/30 hover:text-white"}`}>
                                    {q.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color customization */}
                    <div className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-zinc-300 mb-3">{isAr ? "تخصيص الألوان" : "Customize Colors"}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase">{isAr ? "لون الكود" : "QR Color"}</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={qrColor} onChange={e => setQrColor(e.target.value)} className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer" />
                                    <input value={qrColor} onChange={e => setQrColor(e.target.value)} className="flex-1 px-2 py-1.5 bg-black/30 border border-zinc-800 rounded-lg text-xs font-mono text-white uppercase outline-none" dir="ltr" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase">{isAr ? "لون الخلفية" : "Background"}</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={qrBg} onChange={e => setQrBg(e.target.value)} className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer" />
                                    <input value={qrBg} onChange={e => setQrBg(e.target.value)} className="flex-1 px-2 py-1.5 bg-black/30 border border-zinc-800 rounded-lg text-xs font-mono text-white uppercase outline-none" dir="ltr" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick presets */}
                    <div className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-zinc-300 mb-3">{isAr ? "ألوان جاهزة" : "Quick Presets"}</h3>
                        <div className="flex gap-2">
                            {[
                                { fg: "#020617", bg: "#ffffff", label: "Classic" },
                                { fg: "#16a34a", bg: "#ffffff", label: "Green" },
                                { fg: "#2563eb", bg: "#ffffff", label: "Blue" },
                                { fg: "#ffffff", bg: "#020617", label: "Inverted" },
                                { fg: "#e11d48", bg: "#fef2f2", label: "Red" },
                            ].map((p, i) => (
                                <button key={i} onClick={() => { setQrColor(p.fg); setQrBg(p.bg); }}
                                    className="w-10 h-10 rounded-lg border border-zinc-700 overflow-hidden hover:scale-110 transition" title={p.label}>
                                    <div className="w-full h-1/2" style={{ backgroundColor: p.fg }} />
                                    <div className="w-full h-1/2" style={{ backgroundColor: p.bg }} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
