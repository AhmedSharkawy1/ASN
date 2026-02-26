"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { statusLabel, statusColor, nextStatuses, elapsedTime } from "@/lib/helpers/formatters";
import { ChefHat, Clock, Volume2, VolumeX } from "lucide-react";

type OrderItem = { title: string; qty: number; price: number; size?: string };
type Order = { id: string; order_number: number; status: string; items: OrderItem[]; total: number; table_id?: string; customer_name?: string; notes?: string; created_at: string; is_draft?: boolean };

export default function KitchenPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const fetchActiveOrders = useCallback(async () => {
        if (!restaurantId) return;
        const { data } = await supabase.from('orders').select('*')
            .eq('restaurant_id', restaurantId)
            .in('status', ['pending', 'accepted', 'preparing', 'ready'])
            .eq('is_draft', false)
            .order('created_at', { ascending: true });
        setOrders((data as Order[]) || []);
        setLoading(false);
    }, [restaurantId]);

    useEffect(() => { fetchActiveOrders(); }, [fetchActiveOrders]);

    // Realtime subscription
    useEffect(() => {
        if (!restaurantId) return;
        const channel = supabase.channel('kitchen-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newOrder = payload.new as Order;
                        if (!newOrder.is_draft && ['pending', 'accepted', 'preparing', 'ready'].includes(newOrder.status)) {
                            setOrders(prev => [...prev, newOrder]);
                            if (soundEnabled) playNotification();
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as Order;
                        if (['completed', 'cancelled'].includes(updated.status)) {
                            setOrders(prev => prev.filter(o => o.id !== updated.id));
                        } else {
                            setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setOrders(prev => prev.filter(o => o.id !== (payload.old as Order).id));
                    }
                }
            ).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [restaurantId, soundEnabled]);

    const playNotification = () => {
        try {
            if (!audioRef.current) {
                audioRef.current = new Audio("data:audio/wav;base64,UklGRl9vT19telerik=");
                // Fallback: use Web Audio API for a beep
                const ctx = new AudioContext();
                const osc = ctx.createOscillator(); const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = 800; gain.gain.value = 0.3;
                osc.start(); osc.stop(ctx.currentTime + 0.3);
            }
        } catch (e) { console.error(e); }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
        await supabase.from('order_logs').insert({ order_id: orderId, action: 'status_change', old_status: order.status, new_status: newStatus, performed_by: 'kitchen' });
        // Optimistic update
        if (['completed', 'cancelled'].includes(newStatus)) {
            setOrders(prev => prev.filter(o => o.id !== orderId));
        } else {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        }
    };

    const statusGroups = [
        { status: 'pending', label: isAr ? 'قيد الانتظار' : 'Pending', color: 'border-amber-500/50' },
        { status: 'accepted', label: isAr ? 'مقبول' : 'Accepted', color: 'border-blue-500/50' },
        { status: 'preparing', label: isAr ? 'قيد التحضير' : 'Preparing', color: 'border-violet-500/50' },
        { status: 'ready', label: isAr ? 'جاهز' : 'Ready', color: 'border-emerald-500/50' },
    ];

    if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

    return (
        <div className="flex flex-col gap-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
                    <ChefHat className="w-7 h-7 text-emerald-400" />
                    {isAr ? "شاشة المطبخ" : "Kitchen Display"}
                    <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">{orders.length} {isAr ? "طلب نشط" : "active"}</span>
                </h1>
                <button onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-2.5 rounded-xl border transition ${soundEnabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-zinc-800 text-zinc-500 border-zinc-700/50"}`}>
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
            </div>

            {/* Status Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {statusGroups.map(group => {
                    const groupOrders = orders.filter(o => o.status === group.status);
                    return (
                        <div key={group.status} className={`bg-[#0d1117] border-2 ${group.color} rounded-xl overflow-hidden`}>
                            <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
                                <h3 className="font-bold text-zinc-300 text-sm">{group.label}</h3>
                                <span className="text-xs font-extrabold text-zinc-500">{groupOrders.length}</span>
                            </div>
                            <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                {groupOrders.length === 0 ? (
                                    <p className="text-center py-8 text-zinc-600 text-xs">{isAr ? "لا يوجد طلبات" : "No orders"}</p>
                                ) : groupOrders.map(order => {
                                    const elapsed = elapsedTime(order.created_at, isAr);
                                    const validNext = nextStatuses(order.status);
                                    return (
                                        <div key={order.id} className={`bg-black/30 rounded-xl p-3 border ${elapsed.isDelayed ? "border-red-500/50 animate-pulse" : "border-zinc-800/30"}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-lg font-extrabold text-white">#{order.order_number}</span>
                                                <span className={`text-[9px] font-bold flex items-center gap-1 ${elapsed.isDelayed ? "text-red-400" : "text-zinc-500"}`}>
                                                    <Clock className="w-3 h-3" /> {elapsed.text}
                                                </span>
                                            </div>
                                            {order.customer_name && <p className="text-[10px] text-zinc-400 mb-1">👤 {order.customer_name}</p>}
                                            <div className="space-y-1 mb-3">
                                                {order.items.map((item, i) => (
                                                    <div key={i} className="flex justify-between text-xs">
                                                        <span className="text-zinc-300">{item.qty}× {item.title} {item.size ? `(${item.size})` : ""}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {order.notes && <p className="text-[9px] bg-amber-500/10 text-amber-400 rounded-lg px-2 py-1 mb-2">📝 {order.notes}</p>}
                                            <div className="flex gap-1.5">
                                                {validNext.map(ns => (
                                                    <button key={ns} onClick={() => updateOrderStatus(order.id, ns)}
                                                        className={`flex-1 text-[10px] font-bold py-2 rounded-lg border transition-all hover:scale-105 active:scale-95 ${statusColor(ns)}`}>
                                                        {statusLabel(ns, isAr)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
