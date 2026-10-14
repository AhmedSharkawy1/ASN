import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, restaurantId, reason } = body;

        if (!email || !restaurantId) {
            return NextResponse.json(
                { error: "البريد الإلكتروني ومعرف المطعم مطلوبان" },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json(
                { error: "Server configuration error." },
                { status: 500 }
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Find the team member by email or username
        const cleanEmail = email.trim().toLowerCase();

        const { data: members, error: lookupError } = await supabaseAdmin
            .from("team_members")
            .select("id, username, email, auth_id, restaurant_id, name, is_active")
            .eq("restaurant_id", restaurantId)
            .or(`email.ilike.${cleanEmail},username.ilike.${cleanEmail}`)
            .limit(5);

        if (lookupError) {
            console.error("Delete account lookup error:", lookupError);
            return NextResponse.json(
                { error: "حدث خطأ أثناء البحث عن الحساب" },
                { status: 500 }
            );
        }

        if (!members || members.length === 0) {
            return NextResponse.json(
                { error: "لم يتم العثور على حساب مطابق. تأكد من البريد الإلكتروني ومعرف المطعم." },
                { status: 404 }
            );
        }

        const member = members[0];
        const deletionResults: string[] = [];

        // 1. Delete Supabase Auth user if auth_id exists
        if (member.auth_id) {
            const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
                member.auth_id
            );
            if (authDeleteError) {
                console.error("Auth deletion error:", authDeleteError);
                deletionResults.push("auth_deletion_failed");
            } else {
                deletionResults.push("auth_deleted");
            }
        }

        // 2. Deactivate and anonymize the team member record
        const { error: updateError } = await supabaseAdmin
            .from("team_members")
            .update({
                is_active: false,
                auth_id: null,
                email: `deleted_${Date.now()}@removed.local`,
                username: `deleted_${member.id}`,
                name: "حساب محذوف",
            })
            .eq("id", member.id);

        if (updateError) {
            console.error("Team member deactivation error:", updateError);
            deletionResults.push("deactivation_failed");
        } else {
            deletionResults.push("member_deactivated");
        }

        // 3. Log the deletion request
        try {
            await supabaseAdmin.from("deletion_requests").insert({
                restaurant_id: restaurantId,
                original_email: cleanEmail,
                original_name: member.name,
                member_id: member.id,
                reason: reason || "User requested deletion",
                status: "completed",
                completed_at: new Date().toISOString(),
            });
        } catch {
            // Log table might not exist yet — this is non-critical
            console.warn("Could not log deletion request (table may not exist)");
        }

        // 4. Send Telegram notification (non-blocking)
        const botToken = process.env.TELEGRAM_BOT_TOKEN_CONTACT;
        const chatId = process.env.TELEGRAM_CHAT_ID_CONTACT;

        if (botToken && chatId) {
            const telegramMessage =
                `🗑️ *طلب حذف حساب*\n\n` +
                `🏪 *المطعم:* ${restaurantId}\n` +
                `👤 *الاسم:* ${member.name}\n` +
                `✉️ *البريد:* ${cleanEmail}\n` +
                `📝 *السبب:* ${reason || "لم يُحدد"}\n` +
                `✅ *النتيجة:* ${deletionResults.join(", ")}`;

            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: telegramMessage,
                    parse_mode: "Markdown",
                }),
            }).catch((err) =>
                console.error("Telegram notification error:", err)
            );
        }

        return NextResponse.json({
            success: true,
            message: "تم حذف حسابك بنجاح. سيتم إزالة جميع بياناتك الشخصية.",
            results: deletionResults,
        });
    } catch (err: unknown) {
        console.error("Delete Account API Error:", err);
        return NextResponse.json(
            {
                error: "حدث خطأ غير متوقع",
                details: (err as Error).message,
            },
            { status: 500 }
        );
    }
}
