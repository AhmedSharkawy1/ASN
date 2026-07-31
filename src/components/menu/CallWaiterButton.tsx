"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { BellRing, Check, Loader2 } from "lucide-react";

/**
 * Floating "call the waiter" button.
 *
 * Rendered by the menu layout, above whichever theme is showing, so adding it
 * needed no change to any of the menu designs.
 *
 * Only appears when the restaurant has switched the feature on *and* the menu
 * was opened from a table's QR code — without a table number there is nowhere
 * to send the waiter, so a takeaway customer scanning the general menu never
 * sees it.
 */
export default function CallWaiterButton({ restaurantId }: { restaurantId: string }) {
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [table, setTable] = useState<string | null>(null);
    const [isAr, setIsAr] = useState(true);
    const [sending, setSending] = useState(false);
    const [sentAt, setSentAt] = useState<number | null>(null);
    const [error, setError] = useState("");

    // Resolve the table from the URL and the switch from the restaurant row.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get("table") || params.get("table_number");
        if (!t || !t.trim()) return;

        (async () => {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                .test(restaurantId);
            // Only the two columns that decide whether to show at all. Asking
            // for anything else risks a column that may not exist, and a failed
            // select would hide the button with no clue why.
            const { data } = await supabase
                .from("restaurants")
                .select("id, waiter_call_enabled")
                .eq(isUUID ? "id" : "slug", restaurantId)
                .maybeSingle();

            if (!data?.waiter_call_enabled) return;
            setTenantId(data.id as string);
            setTable(t.trim());
            // Follow whatever the theme already rendered rather than reading a
            // language setting this component would otherwise have to know.
            setIsAr(document.documentElement.dir !== "ltr" &&
                document.documentElement.lang !== "en");
        })();
    }, [restaurantId]);

    // Stays acknowledged for a while so nobody taps it ten times in a row and
    // buries the staff in alerts.
    const recentlySent = sentAt !== null && Date.now() - sentAt < 90_000;

    const call = async () => {
        if (!tenantId || !table || sending || recentlySent) return;
        setSending(true);
        setError("");

        const { error: insertError } = await supabase
            .from("waiter_calls")
            .insert({ restaurant_id: tenantId, table_number: table });

        setSending(false);
        if (insertError) {
            setError(isAr ? "تعذّر إرسال الطلب، حاول مرة أخرى" : "Could not send, please try again");
            return;
        }
        setSentAt(Date.now());
    };

    if (!tenantId || !table) return null;

    return (
        <div className="fixed bottom-4 left-4 z-[60] flex flex-col items-start gap-1.5 print:hidden">
            {error && (
                <span className="bg-red-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-lg">
                    {error}
                </span>
            )}
            <button
                type="button"
                onClick={call}
                disabled={sending || recentlySent}
                aria-label={isAr ? "نداء الجرسون" : "Call the waiter"}
                className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-xl font-bold text-sm transition
                    ${recentlySent
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-900"}
                    disabled:cursor-default`}
            >
                {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : recentlySent ? (
                    <Check className="w-4 h-4" />
                ) : (
                    <BellRing className="w-4 h-4" />
                )}
                <span>
                    {sending
                        ? (isAr ? "جاري الإرسال..." : "Sending…")
                        : recentlySent
                            ? (isAr ? "تم النداء" : "Waiter called")
                            : (isAr ? "نداء الجرسون" : "Call waiter")}
                </span>
            </button>
        </div>
    );
}
