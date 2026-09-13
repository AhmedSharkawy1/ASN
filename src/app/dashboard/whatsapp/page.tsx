"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { posDb } from "@/lib/pos-db";
import {
    buildWhatsAppLink,
    formatWhatsAppMessage,
    cleanPhoneNumber,
    isValidPhone,
    sendAutomatedMessage,
    testConnection
} from "@/lib/helpers/whatsappService";
import {
    MessageCircle, Send, Users, Upload, Download, Search, CheckCircle2,
    AlertCircle, Phone, FileSpreadsheet, Zap, Clock,
    ChevronDown, ChevronUp, Loader2, Copy, Check, Play, Pause, RotateCcw,
    User, Lock, ShieldCheck, Key, Save, CheckCircle
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type CustomerEntry = {
    id: string;
    name: string;
    phone: string;
    selected: boolean;
};

type SendStatus = "idle" | "sending" | "paused" | "done";
type MessageLog = {
    phone: string;
    name: string;
    status: "pending" | "opened" | "skipped";
    error?: string;
    timestamp?: string;
};

export default function WhatsAppPage() {
    const { language } = useLanguage();
    const { restaurantId, restaurant } = useRestaurant();
    const isAr = language === "ar";

    // Tab state
    const [activeTab, setActiveTab] = useState<"send" | "bulk" | "import" | "settings">("send");

    // Customer data
    const [customers, setCustomers] = useState<CustomerEntry[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [searchQ, setSearchQ] = useState("");
    const [selectAll, setSelectAll] = useState(false);

    // Message
    const [message, setMessage] = useState("");
    const [quickPhone, setQuickPhone] = useState("");
    const [quickName, setQuickName] = useState("");
    const [sendingQuick, setSendingQuick] = useState(false);

    // Gateway / Automated Send Credentials
    const [instanceId, setInstanceId] = useState("");
    const [apiToken, setApiToken] = useState("");
    const [savingSettings, setSavingSettings] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<{
        connected: boolean;
        message: string;
        phone?: string;
    } | null>(null);

    // Bulk send state
    const [bulkStatus, setBulkStatus] = useState<SendStatus>("idle");
    const [bulkLogs, setBulkLogs] = useState<MessageLog[]>([]);
    const [bulkIndex, setBulkIndex] = useState(0);
    const [bulkDelay, setBulkDelay] = useState(2); // seconds between messages
    const bulkTimerRef = useRef<NodeJS.Timeout | null>(null);
    const bulkIndexRef = useRef(0);

    // Import
    const [importedPhones, setImportedPhones] = useState<CustomerEntry[]>([]);
    const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Copied state
    const [copied, setCopied] = useState(false);

    // Stats
    const [messagesSentToday, setMessagesSentToday] = useState(0);

    // Strict Permission guard: Strictly hidden from everyone unless explicitly true
    const [accessChecked, setAccessChecked] = useState(false);
    const [isPageAllowed, setIsPageAllowed] = useState(false);

    useEffect(() => {
        if (!restaurantId) return;
        const checkAccess = async () => {
            try {
                const { data } = await supabase
                    .from('client_page_access')
                    .select('enabled')
                    .eq('tenant_id', restaurantId)
                    .eq('page_key', 'whatsapp')
                    .maybeSingle();

                if (data && data.enabled === true) {
                    setIsPageAllowed(true);
                } else {
                    setIsPageAllowed(false);
                }
            } catch {
                setIsPageAllowed(false);
            } finally {
                setAccessChecked(true);
            }
        };
        checkAccess();
    }, [restaurantId]);

    // Load credentials from restaurant profile
    useEffect(() => {
        if (!restaurantId) return;
        const loadCredentials = async () => {
            try {
                const { data } = await supabase
                    .from('restaurants')
                    .select('whatsapp_api_token, whatsapp_phone_number_id')
                    .eq('id', restaurantId)
                    .single();

                if (data) {
                    setApiToken(data.whatsapp_api_token || "");
                    setInstanceId(data.whatsapp_phone_number_id || "");
                    if (data.whatsapp_api_token && data.whatsapp_phone_number_id) {
                        setConnectionStatus({
                            connected: true,
                            message: isAr ? "بيانات البوابة محفوظة وجاهزة للإرسال التلقائي" : "Gateway credentials loaded & ready for auto-send"
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to load WhatsApp credentials:", err);
            }
        };
        loadCredentials();
    }, [restaurantId, isAr]);

    const isGatewayConfigured = Boolean(instanceId.trim() && apiToken.trim());

    // Template variables
    const templateVars = useMemo(() => ({
        customer_name: "",
        restaurant_name: restaurant?.name || "",
    }), [restaurant?.name]);

    // Load customers
    const fetchCustomers = useCallback(async () => {
        if (!restaurantId) return;
        setLoadingCustomers(true);

        try {
            // Get from Supabase
            const { data: sbCusts } = await supabase
                .from("customers")
                .select("id, name, phone")
                .eq("restaurant_id", restaurantId);

            // Also get from local POS DB
            const localCusts = await posDb.customers
                .where("restaurant_id")
                .equals(restaurantId)
                .toArray();

            // Merge and dedupe by phone
            const phoneSet = new Set<string>();
            const merged: CustomerEntry[] = [];

            const addCustomer = (c: { id: string; name: string; phone?: string | null }) => {
                if (!c.phone || phoneSet.has(c.phone)) return;
                phoneSet.add(c.phone);
                merged.push({ id: c.id, name: c.name, phone: c.phone, selected: false });
            };

            sbCusts?.forEach(addCustomer);
            localCusts.forEach(addCustomer);

            setCustomers(merged.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (err) {
            console.error("Failed to load customers:", err);
            toast.error(isAr ? "خطأ في تحميل العملاء" : "Failed to load customers");
        } finally {
            setLoadingCustomers(false);
        }
    }, [restaurantId, isAr]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    // Filtered customers
    const filtered = useMemo(() => {
        if (!searchQ) return customers;
        const q = searchQ.toLowerCase();
        return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }, [customers, searchQ]);

    // Toggle select all
    const handleSelectAll = () => {
        const newVal = !selectAll;
        setSelectAll(newVal);
        setCustomers(prev => prev.map(c => {
            const inFiltered = filtered.some(f => f.id === c.id);
            return inFiltered ? { ...c, selected: newVal } : c;
        }));
    };

    // Toggle individual
    const toggleCustomer = (id: string) => {
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
    };

    const selectedCount = customers.filter(c => c.selected).length;

    // ── Save Gateway Settings ──
    const handleSaveSettings = async () => {
        if (!restaurantId) return;
        setSavingSettings(true);
        try {
            const { error } = await supabase
                .from('restaurants')
                .update({
                    whatsapp_api_token: apiToken.trim() || null,
                    whatsapp_phone_number_id: instanceId.trim() || null,
                    whatsapp_integration_enabled: Boolean(apiToken.trim() && instanceId.trim())
                })
                .eq('id', restaurantId);

            if (error) throw error;

            toast.success(isAr ? "تم حفظ إعدادات بوابة واتساب بنجاح ✅" : "WhatsApp settings saved successfully ✅");
            if (instanceId.trim() && apiToken.trim()) {
                handleTestConnection();
            }
        } catch (err: unknown) {
            console.error("Failed to save settings:", err);
            const msg = err instanceof Error ? err.message : 'Error';
            toast.error(isAr ? `خطأ: ${msg}` : `Error: ${msg}`);
        } finally {
            setSavingSettings(false);
        }
    };

    // ── Test Connection ──
    const handleTestConnection = async () => {
        if (!restaurantId) return;
        setTestingConnection(true);
        setConnectionStatus(null);
        try {
            const result = await testConnection(restaurantId);
            if (result.connected) {
                setConnectionStatus({
                    connected: true,
                    message: isAr
                        ? `متصل بنجاح! جاهز للإرسال التلقائي ${result.phone ? `(${result.phone})` : ''} ⚡`
                        : `Connected! Ready for automated sending ${result.phone ? `(${result.phone})` : ''} ⚡`,
                    phone: result.phone
                });
                toast.success(isAr ? "الاتصال بالبوابة نشط ويعمل بكفاءة! ✅" : "WhatsApp connection active! ✅");
            } else {
                setConnectionStatus({
                    connected: false,
                    message: result.error || (isAr ? "فشل الاتصال، يرجى مراجعة الـ Instance ID والـ Token" : "Connection failed, check Instance ID & Token")
                });
                toast.error(result.error || (isAr ? "فشل الاتصال بالبوابة" : "Connection failed"));
            }
        } catch {
            setConnectionStatus({
                connected: false,
                message: isAr ? "خطأ أثناء اختبار الاتصال" : "Error testing connection"
            });
        } finally {
            setTestingConnection(false);
        }
    };

    // ── Quick Send (Automated or wa.me fallback) ──
    const handleQuickSend = async () => {
        if (!quickPhone.trim() || !message.trim()) {
            toast.error(isAr ? "أدخل الرقم والرسالة" : "Enter phone number and message");
            return;
        }
        const formatted = formatWhatsAppMessage(message, { ...templateVars, customer_name: quickName || "" });

        if (isGatewayConfigured) {
            setSendingQuick(true);
            try {
                const res = await sendAutomatedMessage({
                    restaurantId: restaurantId!,
                    phone: quickPhone,
                    message: formatted
                });

                if (res.success) {
                    setMessagesSentToday(prev => prev + 1);
                    toast.success(isAr ? "تم الإرسال تلقائياً بنجاح! 🚀" : "Sent automatically! 🚀");
                    setQuickPhone("");
                } else {
                    toast.error(res.error || (isAr ? "فشل الإرسال التلقائي" : "Failed to send automatically"));
                }
            } finally {
                setSendingQuick(false);
            }
        } else {
            // Fallback to wa.me
            const link = buildWhatsAppLink(quickPhone, formatted);
            window.open(link, "_blank");
            setMessagesSentToday(prev => prev + 1);
            toast.info(isAr ? "تم فتح واتساب (اربط البوابة في الإعدادات للإرسال التلقائي)" : "WhatsApp opened (configure Gateway for auto-send)");
        }
    };

    // ── Send to Selected Customer ──
    const handleSendToOne = async (customer: CustomerEntry) => {
        if (!message.trim()) {
            toast.error(isAr ? "اكتب الرسالة أولاً" : "Write a message first");
            return;
        }
        const formatted = formatWhatsAppMessage(message, { ...templateVars, customer_name: customer.name });

        if (isGatewayConfigured) {
            toast.info(isAr ? `جاري الإرسال تلقائياً لـ ${customer.name}...` : `Sending to ${customer.name}...`);
            const res = await sendAutomatedMessage({
                restaurantId: restaurantId!,
                phone: customer.phone,
                message: formatted
            });

            if (res.success) {
                setMessagesSentToday(prev => prev + 1);
                toast.success(isAr ? `تم الإرسال لـ ${customer.name} تلقائياً بنجاح! ✅` : `Sent to ${customer.name} automatically! ✅`);
            } else {
                toast.error(res.error || (isAr ? `فشل الإرسال لـ ${customer.name}` : `Failed to send to ${customer.name}`));
            }
        } else {
            const link = buildWhatsAppLink(customer.phone, formatted);
            window.open(link, "_blank");
            setMessagesSentToday(prev => prev + 1);
            toast.info(isAr ? `تم فتح واتساب لـ ${customer.name}` : `WhatsApp opened for ${customer.name}`);
        }
    };

    // ── Bulk Send ──
    const getSelectedCustomers = useCallback(() => {
        if (activeTab === "import") {
            return importedPhones.filter(c => c.selected);
        }
        return customers.filter(c => c.selected);
    }, [customers, importedPhones, activeTab]);

    const startBulkSend = () => {
        const selected = getSelectedCustomers();
        if (selected.length === 0) {
            toast.error(isAr ? "اختر عملاء أولاً" : "Select customers first");
            return;
        }
        if (!message.trim()) {
            toast.error(isAr ? "اكتب الرسالة أولاً" : "Write a message first");
            return;
        }

        const logs: MessageLog[] = selected.map(c => ({ phone: c.phone, name: c.name, status: "pending" as const }));
        setBulkLogs(logs);
        setBulkIndex(0);
        bulkIndexRef.current = 0;
        setBulkStatus("sending");

        sendBulkForIndex(0, logs, selected);
    };

    const sendBulkForIndex = async (idx: number, logs: MessageLog[], selected: CustomerEntry[]) => {
        if (idx >= selected.length) {
            setBulkStatus("done");
            toast.success(isAr ? `تم الانتهاء! تم إرسال كافة الرسائل بنجاح 🎉` : `Done! All messages sent successfully 🎉`);
            return;
        }

        const customer = selected[idx];
        const formatted = formatWhatsAppMessage(message, { ...templateVars, customer_name: customer.name });
        const updatedLogs = [...logs];

        if (isGatewayConfigured) {
            // AUTOMATED BACKGROUND SENDING (No tabs, no send click!)
            const res = await sendAutomatedMessage({
                restaurantId: restaurantId!,
                phone: customer.phone,
                message: formatted
            });

            if (res.success) {
                updatedLogs[idx] = { ...updatedLogs[idx], status: "opened", timestamp: new Date().toLocaleTimeString() };
                setMessagesSentToday(prev => prev + 1);
            } else {
                updatedLogs[idx] = {
                    ...updatedLogs[idx],
                    status: "skipped",
                    error: res.error,
                    timestamp: new Date().toLocaleTimeString()
                };
            }
        } else {
            // Fallback to wa.me
            const link = buildWhatsAppLink(customer.phone, formatted);
            window.open(link, "_blank");
            updatedLogs[idx] = { ...updatedLogs[idx], status: "opened", timestamp: new Date().toLocaleTimeString() };
            setMessagesSentToday(prev => prev + 1);
        }

        setBulkLogs(updatedLogs);
        setBulkIndex(idx + 1);
        bulkIndexRef.current = idx + 1;

        if (idx + 1 < selected.length) {
            bulkTimerRef.current = setTimeout(() => {
                sendBulkForIndex(idx + 1, updatedLogs, selected);
            }, bulkDelay * 1000);
        } else {
            setBulkStatus("done");
            toast.success(isAr ? `تم الانتهاء! تم إرسال ${selected.length} رسالة تلقائياً 🎉` : `Done! Sent ${selected.length} messages automatically 🎉`);
        }
    };

    const pauseBulkSend = () => {
        if (bulkTimerRef.current) {
            clearTimeout(bulkTimerRef.current);
            bulkTimerRef.current = null;
        }
        setBulkStatus("paused");
        toast.info(isAr ? "تم إيقاف الإرسال مؤقتاً" : "Sending paused");
    };

    const resumeBulkSend = () => {
        const selected = getSelectedCustomers();
        setBulkStatus("sending");
        sendBulkForIndex(bulkIndexRef.current, bulkLogs, selected);
    };

    const resetBulkSend = () => {
        if (bulkTimerRef.current) {
            clearTimeout(bulkTimerRef.current);
            bulkTimerRef.current = null;
        }
        setBulkStatus("idle");
        setBulkLogs([]);
        setBulkIndex(0);
        bulkIndexRef.current = 0;
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (bulkTimerRef.current) clearTimeout(bulkTimerRef.current);
        };
    }, []);

    // ── Import Excel ──
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportStatus(null);
        try {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(new Uint8Array(data), { type: "array" });
            const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]]);
            if (rows.length === 0) {
                setImportStatus({ type: "error", message: isAr ? "الملف فارغ!" : "File is empty!" });
                return;
            }

            const imported: CustomerEntry[] = [];
            const phoneSet = new Set<string>();
            for (const row of rows) {
                const name = String(row["الاسم"] || row["Name"] || row["name"] || "").trim();
                const phone = String(row["الهاتف"] || row["Phone"] || row["phone"] || row["رقم الهاتف"] || row["الموبايل"] || row["Mobile"] || "").trim();
                if (!phone || phoneSet.has(phone)) continue;
                phoneSet.add(phone);
                imported.push({
                    id: `imp_${imported.length}`,
                    name: name || phone,
                    phone,
                    selected: true,
                });
            }
            setImportedPhones(imported);
            setImportStatus({
                type: "success",
                message: isAr ? `تم استيراد ${imported.length} رقم بنجاح!` : `Imported ${imported.length} numbers successfully!`
            });
        } catch {
            setImportStatus({ type: "error", message: isAr ? "خطأ في قراءة الملف" : "Error reading file" });
        }
        if (fileRef.current) fileRef.current.value = "";
    };

    const downloadTemplate = () => {
        const rows = [
            { "الاسم": "أحمد محمد", "الهاتف": "01001234567" },
            { "الاسم": "سارة علي", "الهاتف": "01111234567" },
        ];
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Contacts");
        XLSX.writeFile(wb, "WhatsApp_Contacts_Template.xlsx");
    };

    // ── Copy all numbers ──
    const copyNumbers = () => {
        const selected = activeTab === "import" ? importedPhones.filter(c => c.selected) : customers.filter(c => c.selected);
        if (selected.length === 0) {
            toast.error(isAr ? "اختر عملاء أولاً" : "Select customers first");
            return;
        }
        const nums = selected.map(c => cleanPhoneNumber(c.phone)).join("\n");
        navigator.clipboard.writeText(nums);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success(isAr ? `تم نسخ ${selected.length} رقم` : `Copied ${selected.length} numbers`);
    };

    // ── Message Preview ──
    const previewMessage = formatWhatsAppMessage(message, { ...templateVars, customer_name: isAr ? "أحمد" : "Ahmed" });

    const tabs = [
        { key: "send" as const, labelAr: "إرسال سريع", labelEn: "Quick Send", icon: Zap },
        { key: "bulk" as const, labelAr: "إرسال جماعي", labelEn: "Bulk Send", icon: Users },
        { key: "import" as const, labelAr: "استيراد أرقام", labelEn: "Import Numbers", icon: Upload },
        { key: "settings" as const, labelAr: "إعدادات الربط التلقائي", labelEn: "Auto-Send Settings", icon: MessageCircle },
    ];

    // Locked screen if not explicitly allowed by Super Admin
    if (accessChecked && !isPageAllowed) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-2xl max-w-xl mx-auto my-12">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4 border border-amber-200 dark:border-amber-500/30">
                    <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    {isAr ? "خدمة واتساب غير مفعلة" : "WhatsApp Messaging Disabled"}
                </h2>
                <p className="text-slate-500 dark:text-zinc-400 text-sm mb-6 leading-relaxed">
                    {isAr 
                        ? "تم إيقاف أو إخفاء خدمة رسائل واتساب لهذا المطعم من قبل إدارة المنصة (السوبر أدمن). يرجى التواصل مع الإدارة لتفعيلها."
                        : "WhatsApp messaging has been disabled for this restaurant by the platform administrator. Please contact support to enable it."}
                </p>
                <Link href="/dashboard" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-md">
                    {isAr ? "العودة للرئيسية" : "Return to Dashboard"}
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <FaWhatsapp className="w-7 h-7 text-[#25D366]" />
                        {isAr ? "رسائل واتساب التلقائية" : "Automated WhatsApp Messaging"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
                        {isAr ? "أرسل رسائل لعملائك تلقائياً في الخلفية بدون الضغط على Send" : "Send messages to your customers automatically in the background"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isGatewayConfigured ? "#25D366" : "#f59e0b" }}></span>
                        {isGatewayConfigured 
                            ? (isAr ? "الوضع: تلقائي ⚡" : "Mode: Auto ⚡") 
                            : (isAr ? "الوضع: يدوي (اربط البوابة)" : "Mode: Manual (Connect Gateway)")}
                    </div>
                    <div className="bg-[#25D366]/10 dark:bg-[#25D366]/20 px-4 py-2 rounded-xl border border-[#25D366]/20 dark:border-[#25D366]/30">
                        <span className="text-xs text-[#25D366] font-bold uppercase">{isAr ? "تم الإرسال اليوم" : "Sent Today"}</span>
                        <p className="text-xl font-extrabold text-[#25D366]">{messagesSentToday}</p>
                    </div>
                </div>
            </div>

            {/* Gateway Status Banner (if not configured) */}
            {!isGatewayConfigured && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                            <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                                {isAr ? "تريد الإرسال التلقائي بدون الضغط على Send في كل رسالة؟" : "Want automated sending without clicking Send?"}
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                {isAr 
                                    ? "انتقل لتبويب \"إعدادات الربط التلقائي\" واربط حسابك بمسح QR Code مرة واحدة ليتم الإرسال تلقائياً في الخلفية!" 
                                    : "Go to Auto-Send Settings and connect via QR Code to send automatically in background!"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveTab("settings")}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition"
                    >
                        {isAr ? "ضبط الربط التلقائي الآن" : "Configure Now"}
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: isAr ? "إجمالي العملاء" : "Total Customers", val: customers.length, color: "text-slate-700 dark:text-zinc-300", icon: Users },
                    { label: isAr ? "بأرقام هاتف" : "With Phone", val: customers.filter(c => isValidPhone(c.phone)).length, color: "text-emerald-600 dark:text-emerald-400", icon: Phone },
                    { label: isAr ? "محدد للإرسال" : "Selected", val: selectedCount, color: "text-blue-600 dark:text-blue-400", icon: CheckCircle2 },
                    { label: isAr ? "أرقام مستوردة" : "Imported", val: importedPhones.length, color: "text-purple-600 dark:text-purple-400", icon: FileSpreadsheet },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <s.icon className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                            <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase">{s.label}</p>
                        </div>
                        <p className={`text-2xl font-extrabold ${s.color}`}>{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-1.5 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.key
                                ? "bg-[#25D366] text-white shadow-md shadow-[#25D366]/20"
                                : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {isAr ? tab.labelAr : tab.labelEn}
                    </button>
                ))}
            </div>

            {/* Message Composer (shared across tabs except settings) */}
            {activeTab !== "settings" && (
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-5 space-y-4">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-[#25D366]" />
                        {isAr ? "الرسالة" : "Message"}
                    </h3>
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder={isAr ? "اكتب رسالتك هنا...\n\nالمتغيرات المتاحة:\n{customer_name} - اسم العميل\n{restaurant_name} - اسم المطعم" : "Write your message here...\n\nAvailable variables:\n{customer_name} - Customer name\n{restaurant_name} - Restaurant name"}
                        dir={isAr ? "rtl" : "ltr"}
                        rows={4}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-zinc-800 rounded-xl text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]/50 resize-none transition"
                    />
                    {/* Quick variable buttons */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { label: isAr ? "اسم العميل" : "Customer Name", var: "{customer_name}" },
                            { label: isAr ? "اسم المطعم" : "Restaurant Name", var: "{restaurant_name}" },
                        ].map(v => (
                            <button
                                key={v.var}
                                onClick={() => setMessage(prev => prev + " " + v.var)}
                                className="px-3 py-1.5 text-xs font-bold bg-[#25D366]/10 dark:bg-[#25D366]/20 text-[#25D366] rounded-lg border border-[#25D366]/20 dark:border-[#25D366]/30 hover:bg-[#25D366]/20 transition"
                            >
                                + {v.label}
                            </button>
                        ))}
                    </div>
                    {/* Preview */}
                    {message && (
                        <div className="bg-[#DCF8C6] dark:bg-[#005C4B] rounded-xl p-4 relative">
                            <p className="text-xs font-bold text-[#075E54] dark:text-[#25D366] mb-1 uppercase">{isAr ? "معاينة الرسالة" : "Message Preview"}</p>
                            <p className="text-sm text-[#303030] dark:text-white whitespace-pre-wrap" dir={isAr ? "rtl" : "ltr"}>
                                {previewMessage}
                            </p>
                            <div className="absolute bottom-2 end-3 text-[10px] text-[#075E54]/50 dark:text-[#25D366]/50">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════ TAB: Quick Send ═══════════ */}
            {activeTab === "send" && (
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-5 space-y-4">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        {isAr ? "إرسال سريع لرقم واحد" : "Quick Send to One Number"}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-500 dark:text-zinc-500 font-bold mb-1 block">{isAr ? "رقم الهاتف" : "Phone Number"}</label>
                            <input
                                value={quickPhone}
                                onChange={e => setQuickPhone(e.target.value)}
                                placeholder={isAr ? "مثال: 01001234567" : "e.g. 01001234567"}
                                dir="ltr"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-zinc-800 rounded-xl text-base text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#25D366]/30"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 dark:text-zinc-500 font-bold mb-1 block">{isAr ? "اسم العميل (اختياري)" : "Customer Name (optional)"}</label>
                            <input
                                value={quickName}
                                onChange={e => setQuickName(e.target.value)}
                                placeholder={isAr ? "أحمد" : "Ahmed"}
                                dir={isAr ? "rtl" : "ltr"}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-zinc-800 rounded-xl text-base text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#25D366]/30"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleQuickSend}
                        disabled={sendingQuick || !quickPhone.trim() || !message.trim()}
                        className="flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-[#25D366]/20 transition active:scale-95"
                    >
                        {sendingQuick ? <Loader2 className="w-5 h-5 animate-spin" /> : <FaWhatsapp className="w-5 h-5" />}
                        {isGatewayConfigured 
                            ? (isAr ? "إرسال تلقائي في الخلفية ⚡" : "Send Automatically ⚡") 
                            : (isAr ? "فتح وإرسال عبر واتساب" : "Send via WhatsApp")}
                    </button>
                </div>
            )}

            {/* ═══════════ TAB: Bulk Send ═══════════ */}
            {activeTab === "bulk" && (
                <div className="space-y-4">
                    {/* Bulk Controls */}
                    <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-500" />
                                {isAr ? `إرسال جماعي (${selectedCount} محدد)` : `Bulk Send (${selectedCount} selected)`}
                            </h3>
                            <div className="flex items-center gap-2">
                                <button onClick={copyNumbers} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg text-sm font-bold border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 transition">
                                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    {isAr ? "نسخ الأرقام" : "Copy Numbers"}
                                </button>
                            </div>
                        </div>

                        {/* Delay setting */}
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-slate-600 dark:text-zinc-400 font-bold">{isAr ? "الفاصل الزمني بين كل رسالة:" : "Delay between messages:"}</label>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setBulkDelay(Math.max(1, bulkDelay - 1))} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-zinc-800 rounded-lg text-slate-500 hover:bg-slate-200 transition">
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                                <span className="w-12 text-center font-bold text-slate-900 dark:text-white">{bulkDelay}s</span>
                                <button onClick={() => setBulkDelay(bulkDelay + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-zinc-800 rounded-lg text-slate-500 hover:bg-slate-200 transition">
                                    <ChevronUp className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2">
                            {bulkStatus === "idle" && (
                                <>
                                    <button
                                        onClick={() => {
                                            setCustomers(prev => prev.map(c => ({ ...c, selected: true })));
                                            setSelectAll(true);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-sm rounded-xl border border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/25 transition"
                                    >
                                        <Users className="w-4 h-4" />
                                        {isAr ? "تحديد الكل" : "Select All"}
                                    </button>
                                    <button
                                        onClick={startBulkSend}
                                        disabled={selectedCount === 0 || !message.trim()}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[#25D366]/20 transition active:scale-95"
                                    >
                                        <Play className="w-4 h-4" />
                                        {isGatewayConfigured
                                            ? (isAr ? `إرسال تلقائي لـ ${selectedCount} عميل ⚡` : `Auto-Send to ${selectedCount} customers ⚡`)
                                            : (isAr ? `إرسال لـ ${selectedCount} عميل` : `Send to ${selectedCount} customers`)}
                                    </button>
                                </>
                            )}
                            {bulkStatus === "sending" && (
                                <button
                                    onClick={pauseBulkSend}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition active:scale-95"
                                >
                                    <Pause className="w-4 h-4" />
                                    {isAr ? "إيقاف مؤقت" : "Pause"}
                                </button>
                            )}
                            {bulkStatus === "paused" && (
                                <>
                                    <button
                                        onClick={resumeBulkSend}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-sm rounded-xl transition active:scale-95"
                                    >
                                        <Play className="w-4 h-4" />
                                        {isAr ? "استمرار الإرسال" : "Resume"}
                                    </button>
                                    <button
                                        onClick={resetBulkSend}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-bold text-sm rounded-xl border border-slate-200 dark:border-zinc-700 transition"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        {isAr ? "إعادة تعيين" : "Reset"}
                                    </button>
                                </>
                            )}
                            {bulkStatus === "done" && (
                                <button
                                    onClick={resetBulkSend}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-sm rounded-xl border border-emerald-200 dark:border-emerald-500/30 transition"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    {isAr ? "حملة إرسال جديدة" : "New Broadcast"}
                                </button>
                            )}
                        </div>

                        {/* Progress Bar */}
                        {bulkStatus !== "idle" && (
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 dark:text-zinc-400 font-bold">
                                        {isGatewayConfigured 
                                            ? (isAr ? "التقدم في الإرسال التلقائي:" : "Automated Sending Progress:")
                                            : (isAr ? "التقدم:" : "Progress:")}
                                    </span>
                                    <span className="font-extrabold text-slate-900 dark:text-white">{bulkIndex} / {bulkLogs.length}</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-[#25D366] to-[#128C7E] h-full rounded-full transition-all duration-500"
                                        style={{ width: `${bulkLogs.length > 0 ? (bulkIndex / bulkLogs.length) * 100 : 0}%` }}
                                    />
                                </div>
                                {bulkStatus === "sending" && (
                                    <div className="flex items-center gap-2 text-sm text-[#25D366] font-bold animate-pulse">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {isGatewayConfigured 
                                            ? (isAr ? "جاري الإرسال التلقائي في الخلفية بدون فتح نوافذ..." : "Sending automatically in background...")
                                            : (isAr ? "جاري فتح المحادثات بالتتابع..." : "Sending...")}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Bulk Logs */}
                        {bulkLogs.length > 0 && (
                            <div className="max-h-60 overflow-y-auto space-y-1.5 border-t border-slate-100 dark:border-zinc-800/50 pt-3">
                                {bulkLogs.map((log, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-900/50 rounded-lg text-sm">
                                        <div className="flex items-center gap-2">
                                            {log.status === "opened" ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            ) : log.status === "pending" ? (
                                                <Clock className="w-4 h-4 text-slate-400" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                            )}
                                            <span className="font-bold text-slate-700 dark:text-zinc-300">{log.name}</span>
                                            <span className="text-slate-400 dark:text-zinc-600" dir="ltr">{log.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-600">
                                            {log.status === "opened" && <span className="text-emerald-500 font-bold">{isAr ? "تم الإرسال بنجاح" : "Sent"}</span>}
                                            {log.status === "skipped" && <span className="text-red-500 font-bold">{log.error || (isAr ? "فشل" : "Failed")}</span>}
                                            {log.timestamp && <span>{log.timestamp}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Customer List */}
                    <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-zinc-800/50 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded border-slate-300 text-[#25D366] focus:ring-[#25D366]"
                                    />
                                    <span className="text-sm font-bold text-slate-600 dark:text-zinc-400">{isAr ? "تحديد الكل" : "Select All"}</span>
                                </label>
                            </div>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    value={searchQ}
                                    onChange={e => setSearchQ(e.target.value)}
                                    placeholder={isAr ? "بحث بالاسم أو الرقم..." : "Search by name or number..."}
                                    className="w-full ps-10 pe-4 py-2 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#25D366]/30"
                                />
                            </div>
                        </div>
                        {loadingCustomers ? (
                            <div className="p-8 text-center text-slate-400 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>
                        ) : filtered.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p className="font-bold">{isAr ? "لا يوجد عملاء" : "No customers"}</p>
                                <p className="text-xs mt-1">{isAr ? "أضف عملاء من صفحة العملاء أو استورد من Excel" : "Add customers from Customers page or import from Excel"}</p>
                            </div>
                        ) : (
                            <div className="max-h-[400px] overflow-y-auto">
                                {filtered.map(c => (
                                    <div
                                        key={c.id}
                                        className={`flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-800/30 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition cursor-pointer ${c.selected ? "bg-[#25D366]/5 dark:bg-[#25D366]/10" : ""}`}
                                        onClick={() => toggleCustomer(c.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={c.selected}
                                                onChange={() => toggleCustomer(c.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-[#25D366] focus:ring-[#25D366]"
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                                                <User className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700 dark:text-zinc-300 text-sm">{c.name}</p>
                                                <p className="text-xs text-slate-400 dark:text-zinc-500" dir="ltr">{c.phone}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleSendToOne(c); }}
                                            disabled={!message.trim()}
                                            className="p-2 text-[#25D366] hover:bg-[#25D366]/10 rounded-lg transition disabled:opacity-30"
                                            title={isAr ? "إرسال فردي" : "Send individually"}
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════ TAB: Import ═══════════ */}
            {activeTab === "import" && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-5 space-y-4">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-purple-500" />
                            {isAr ? "استيراد أرقام من Excel" : "Import Numbers from Excel"}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-zinc-400">
                            {isAr
                                ? "ارفع ملف Excel يحتوي على أعمدة \"الاسم\" و \"الهاتف\" لإرسال رسائل جماعية تلقائية لأرقام جديدة"
                                : "Upload an Excel file with 'Name' and 'Phone' columns to send bulk messages automatically"}
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 active:scale-95 transition"
                            >
                                <Upload className="w-4 h-4" />
                                {isAr ? "رفع ملف Excel" : "Upload Excel File"}
                            </button>
                            <button
                                onClick={downloadTemplate}
                                className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
                            >
                                <Download className="w-4 h-4" />
                                {isAr ? "تحميل نموذج" : "Download Template"}
                            </button>
                        </div>
                        {importStatus && (
                            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${importStatus.type === "success" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
                                {importStatus.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {importStatus.message}
                            </div>
                        )}
                    </div>

                    {/* Imported contacts list */}
                    {importedPhones.length > 0 && (
                        <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-zinc-800/50 flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={importedPhones.every(c => c.selected)}
                                            onChange={() => {
                                                const allSel = importedPhones.every(c => c.selected);
                                                setImportedPhones(prev => prev.map(c => ({ ...c, selected: !allSel })));
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-[#25D366] focus:ring-[#25D366]"
                                        />
                                        <span className="text-sm font-bold text-slate-600 dark:text-zinc-400">
                                            {isAr ? `تحديد الكل (${importedPhones.filter(c => c.selected).length}/${importedPhones.length})` : `Select All (${importedPhones.filter(c => c.selected).length}/${importedPhones.length})`}
                                        </span>
                                    </label>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={copyNumbers} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg text-sm font-bold border border-slate-200 dark:border-zinc-700 transition">
                                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                        {isAr ? "نسخ" : "Copy"}
                                    </button>
                                    <button
                                        onClick={startBulkSend}
                                        disabled={importedPhones.filter(c => c.selected).length === 0 || !message.trim()}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 text-white font-bold text-sm rounded-lg transition active:scale-95"
                                    >
                                        <Send className="w-4 h-4" />
                                        {isGatewayConfigured 
                                            ? (isAr ? "إرسال تلقائي دفعة واحدة ⚡" : "Auto-Send Bulk ⚡") 
                                            : (isAr ? "إرسال جماعي" : "Send Bulk")}
                                    </button>
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {importedPhones.map(c => (
                                    <div
                                        key={c.id}
                                        className={`flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-zinc-800/30 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition ${c.selected ? "bg-[#25D366]/5" : ""}`}
                                        onClick={() => setImportedPhones(prev => prev.map(p => p.id === c.id ? { ...p, selected: !p.selected } : p))}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={c.selected}
                                                readOnly
                                                className="w-4 h-4 rounded border-slate-300 text-[#25D366] focus:ring-[#25D366]"
                                            />
                                            <span className="font-bold text-slate-700 dark:text-zinc-300 text-sm">{c.name}</span>
                                            <span className="text-xs text-slate-400" dir="ltr">{c.phone}</span>
                                        </div>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleSendToOne(c); }}
                                            disabled={!message.trim()}
                                            className="p-2 text-[#25D366] hover:bg-[#25D366]/10 rounded-lg transition disabled:opacity-30"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════ TAB: Settings (Auto-Send Configuration) ═══════════ */}
            {activeTab === "settings" && (
                <div className="space-y-6">
                    {/* Connection Banner */}
                    <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-500" />
                                {isAr ? "إعدادات الإرسال التلقائي المباشر (بدون الضغط على Send)" : "Automated Background Sending Settings"}
                            </h3>
                            {connectionStatus && (
                                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${connectionStatus.connected ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
                                    {connectionStatus.connected ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {connectionStatus.message}
                                </span>
                            )}
                        </div>

                        <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                            {isAr 
                                ? "للإرسال التلقائي في الخلفية بدون فتح نوافذ وبدون الضغط على Send في كل رسالة، قم بربط رقم واتساب الخاص بك عبر بوابة UltraMsg (أو أي بوابة متوافقة بمسح QR Code) وضع الـ Instance ID والـ Token هنا." 
                                : "To send messages completely in the background without clicking Send, connect your WhatsApp via UltraMsg gateway (QR code scan) and enter your Instance ID & Token below."}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-600 dark:text-zinc-400 font-bold mb-1.5 flex items-center gap-1.5">
                                    <Key className="w-3.5 h-3.5 text-[#25D366]" />
                                    {isAr ? "معرّف البوابة (Instance ID)" : "Instance ID / Phone Number ID"}
                                </label>
                                <input
                                    value={instanceId}
                                    onChange={e => setInstanceId(e.target.value)}
                                    placeholder={isAr ? "مثال: instance12345" : "e.g. instance12345"}
                                    dir="ltr"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#25D366]/30 font-mono"
                                />
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    {isAr ? "معرف الجلسة من لوحة تحكم بوابة الواتساب" : "Instance ID from WhatsApp gateway dashboard"}
                                </span>
                            </div>

                            <div>
                                <label className="text-xs text-slate-600 dark:text-zinc-400 font-bold mb-1.5 flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#25D366]" />
                                    {isAr ? "رمز الدخول السري (API Token)" : "API Token"}
                                </label>
                                <input
                                    type="password"
                                    value={apiToken}
                                    onChange={e => setApiToken(e.target.value)}
                                    placeholder="••••••••••••••••••••••••"
                                    dir="ltr"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#25D366]/30 font-mono"
                                />
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    {isAr ? "الرمز السري الخاص بالـ Instance للتحقق من الصلاحية" : "Secret API token to authenticate requests"}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-2">
                            <button
                                onClick={handleSaveSettings}
                                disabled={savingSettings}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-sm rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
                            >
                                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isAr ? "حفظ إعدادات البوابة" : "Save Gateway Settings"}
                            </button>
                            <button
                                onClick={handleTestConnection}
                                disabled={testingConnection || !isGatewayConfigured}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold text-sm rounded-xl border border-slate-200 dark:border-zinc-700 transition active:scale-95 disabled:opacity-50"
                            >
                                {testingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-500" />}
                                {isAr ? "اختبار الاتصال" : "Test Connection"}
                            </button>
                        </div>
                    </div>

                    {/* How to setup steps */}
                    <div className="bg-[#25D366]/5 dark:bg-[#25D366]/10 border border-[#25D366]/20 dark:border-[#25D366]/30 rounded-2xl p-6 flex items-start gap-4">
                        <FaWhatsapp className="w-7 h-7 text-[#25D366] shrink-0 mt-1" />
                        <div className="space-y-3">
                            <h4 className="font-bold text-[#075E54] dark:text-[#25D366] text-base">
                                {isAr ? "كيف تفعل الإرسال التلقائي في دقيقة واحدة؟" : "How to enable automated sending in 1 minute?"}
                            </h4>
                            <ol className="text-sm text-[#075E54]/80 dark:text-[#25D366]/80 space-y-2 list-decimal list-inside">
                                <li>{isAr ? "افتح موقع UltraMsg (أو أي بوابة واتساب بمسح QR) وسجل حساب مجاني." : "Open UltraMsg (or any QR WhatsApp gateway) and create an account."}</li>
                                <li>{isAr ? "امسح الـ QR Code من تطبيق واتساب في هاتفك كما تفعل مع WhatsApp Web." : "Scan the QR code from WhatsApp on your phone just like WhatsApp Web."}</li>
                                <li>{isAr ? "انسخ الـ Instance ID والـ Token من صفحة البوابة والصقهم في الحقول أعلاه." : "Copy your Instance ID & Token and paste them in the fields above."}</li>
                                <li>{isAr ? "اضغط \"حفظ إعدادات البوابة\" ثم \"اختبار الاتصال\"." : "Click 'Save Gateway Settings' and then 'Test Connection'."}</li>
                                <li>{isAr ? "مبروك! الآن كل رسائلك ستُرسل تلقائياً في الخلفية بنقرة واحدة وبدون فتح أي نافذة!" : "Congratulations! All messages will now send automatically in background!"}</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
