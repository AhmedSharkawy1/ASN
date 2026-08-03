import { supabase } from '@/lib/supabase/client';
import { processOrderInventory } from '@/lib/helpers/inventoryService';
import { calculateOrderCost } from '@/lib/helpers/costService';
import { parseCurrency } from '@/lib/currency';

/** RFC 4122 v4, with a fallback for non-secure contexts where crypto.randomUUID is absent. */
function newUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const b = crypto.getRandomValues(new Uint8Array(16));
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
        return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

export type OrderItemExtra = {
    name: string;
    qty: number;
    price: number;
};

export type OrderItem = {
    id: string;
    title: string;
    qty: number;
    price: number;
    size?: string;
    category?: string;
    extras?: OrderItemExtra[];
    notes?: string;
};

export type SubmitOrderParams = {
    restaurantId: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    notes?: string;
    orderType: 'delivery' | 'pickup';
    deliveryZoneId?: string;
    deliveryZoneName?: string;
    deliveryFee?: number;
    items: OrderItem[];
    subtotal: number;
    total: number;
    paymentMethod?: string;
    restaurantName?: string;
    promotionId?: string;
    promotionName?: string;
    discountAmount?: number;
    discountType?: string;
    branchName?: string;
    currency?: string;
};

export type SubmitOrderResult = {
    success: boolean;
    orderNumber?: number;
    orderId?: string;
    error?: string;
};

/**
 * Strip Unicode Variation Selector-16 (U+FE0F) from messages.
 * Some browsers (especially Chrome on desktop) corrupt compound emojis
 * containing VS16 when they pass through encodeURIComponent for WhatsApp URLs.
 * Stripping VS16 keeps the base emoji intact and prevents question marks.
 */
function stripVS16(text: string): string {
    return text.replace(/\uFE0F/g, '');
}

/**
 * Build beautifully formatted WhatsApp message matching the user's template.
 */
export function buildWhatsAppMessage(params: {
    orderNumber: number;
    restaurantName: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    orderType: 'delivery' | 'pickup';
    deliveryZoneName?: string;
    deliveryFee?: number;
    items: OrderItem[];
    subtotal: number;
    total: number;
    notes?: string;
    currency?: string;
    language?: string;
    promotionName?: string;
    discountAmount?: number;
    discountType?: string;
    branchName?: string;
}): string {
    const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        orderNumber, restaurantName, customerName, customerPhone,
        customerAddress, orderType, deliveryZoneName, deliveryFee,
        items, subtotal, total, notes, currency = 'ج', language = 'ar',
        promotionName, discountAmount, discountType, branchName
    } = params;
    const isAr = language === 'ar';
    const cur = parseCurrency(currency, isAr);

    let msg = `🧾 *${isAr ? 'الطلب رقم' : 'Order No.'} #${orderNumber} - ${restaurantName}*\n`;
    msg += `------------------------------\n`;
    msg += `👤 *${isAr ? 'الاسم:' : 'Name:'}* ${customerName}\n`;
    msg += `📞 *${isAr ? 'الموبايل:' : 'Phone:'}* ${customerPhone}\n`;
    if (orderType === 'delivery' && customerAddress) {
        msg += `📍 *${isAr ? 'العنوان:' : 'Address:'}* ${customerAddress}\n`;
    }
    if (orderType === 'pickup') {
        msg += `🏪 *${isAr ? 'استلام من المطعم' : 'Pickup from restaurant'}*\n`;
    }
    if (orderType === 'delivery' && deliveryZoneName) {
        msg += `📍 *${isAr ? 'منطقة التوصيل:' : 'Delivery Zone:'}* ${deliveryZoneName}\n`;
    }
    if (branchName) {
        msg += `🏢 *${isAr ? 'الفرع:' : 'Branch:'}* ${branchName}\n`;
    }
    msg += `------------------------------\n`;
    msg += `📋 *${isAr ? 'الأصناف المطلوبة:' : 'Ordered Items:'}*\n\n`;

    items.forEach((item, idx) => {
        const itemExtrasTotal = (item.extras || []).reduce((s, e) => s + e.price * e.qty, 0);
        const itemTotal = (item.price * item.qty) + (itemExtrasTotal * item.qty);

        msg += `${idx + 1}. ✨ *${item.title}*\n`;
        if (item.category) {
            msg += `   🗂️ ${isAr ? 'القسم:' : 'Category:'} ${item.category}\n`;
        }
        msg += `   💵 ${isAr ? 'السعر:' : 'Price:'} ${item.price} ${cur}\n`;
        if (item.size && item.size !== 'عادي' && item.size !== 'Default') {
            msg += `   📏 ${isAr ? 'الحجم:' : 'Size:'} ${item.size}\n`;
        }
        if (item.extras && item.extras.length > 0) {
            msg += `   ➕ ${isAr ? 'الإضافات:' : 'Extras:'}\n`;
            item.extras.forEach(e => {
                msg += `      🔹 ${e.name} (×${e.qty}) ${isAr ? 'بقيمة' : 'worth'} ${e.price * e.qty} ${cur}\n`;
            });
        }
        msg += `   🔢 ${isAr ? 'الكمية:' : 'Qty:'} ${item.qty}\n`;
        // Per-item note: the kitchen needs it beside the item it belongs to.
        if (item.notes && item.notes.trim()) {
            msg += `   📝 ${isAr ? 'ملاحظة:' : 'Note:'} _${item.notes.trim()}_\n`;
        }
        msg += `   💰 ${isAr ? 'المجموع:' : 'Total:'} *${itemTotal} ${cur}*\n\n`;
    });

    if (notes) {
        msg += `📝 *${isAr ? 'ملاحظات:' : 'Notes:'}* ${notes}\n`;
    }
    msg += `------------------------------\n`;
    if (deliveryFee && deliveryFee > 0) {
        msg += `🛒 ${isAr ? 'مجموع الأصناف:' : 'Items Subtotal:'} ${subtotal} ${cur}\n`;
        msg += `🚚 ${isAr ? 'خدمة التوصيل:' : 'Delivery Fee:'} ${deliveryFee} ${cur}\n`;
    } else if (orderType === 'delivery' && !deliveryZoneName) {
        msg += `⚠️ *${isAr ? 'ملاحظة: السعر غير شامل خدمة التوصيل' : 'Note: Price does not include delivery fee'}*\n`;
    }
    if (promotionName && discountAmount && discountAmount > 0) {
        msg += `🎁 *عرض مطبق:* ${promotionName}\n`;
        msg += `💰 *الخصم:* -${discountAmount} ${cur}${discountType === 'free_shipping' ? ` (${isAr ? 'شحن مجاني' : 'Free Shipping'})` : ''}\n`;
    }
    msg += `💵 *${isAr ? 'الإجمالي المطلوب:' : 'Total Due:'} ${total} ${cur}*\n`;
    msg += `------------------------------\n`;

    msg += `✅ *${isAr ? 'تأكيد:' : 'Confirmation:'}* ${isAr ? 'سيتم تأكيد الطلب وتأكيده معكم فوراً.' : 'Your order will be confirmed shortly.'}\n`;
    msg += `❤️ ${isAr ? 'مع تحيات إدارة' : 'With greetings from the management of'} *${restaurantName}*\n`;
    msg += `------------------------------\n`;
    msg += `${isAr ? 'شكراً لاختياركم' : 'Thank you for choosing'} ${restaurantName}`;

    return stripVS16(msg);
}

/**
 * Build a formatted Telegram message for the order notification.
 */
function buildTelegramMessage(params: {
    orderNumber: number;
    restaurantName: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    orderType: 'delivery' | 'pickup';
    deliveryZoneName?: string;
    deliveryFee?: number;
    items: OrderItem[];
    subtotal: number;
    total: number;
    notes?: string;
    currency?: string;
    promotionName?: string;
    discountAmount?: number;
    discountType?: string;
    branchName?: string;
}): string {
    const {
        orderNumber, restaurantName, customerName, customerPhone,
        customerAddress, orderType, deliveryZoneName, deliveryFee,
        items, subtotal, total, notes, currency = 'ج',
        promotionName, discountAmount, discountType, branchName
    } = params;
    const cur = parseCurrency(currency, true);

    let msg = `🧾 *فاتورة طلب جديد #${orderNumber} — ${restaurantName}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *الاسم:* ${customerName}\n`;
    msg += `📞 *الموبايل:* ${customerPhone}\n`;
    if (orderType === 'delivery' && customerAddress) {
        msg += `📍 *العنوان:* ${customerAddress}\n`;
    }
    if (orderType === 'pickup') {
        msg += `🏪 *استلام من المطعم*\n`;
    }
    if (orderType === 'delivery' && deliveryZoneName) {
        msg += `📍 *منطقة التوصيل:* ${deliveryZoneName}\n`;
    }
    if (branchName) {
        msg += `🏢 *الفرع:* ${branchName}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 *الأصناف المطلوبة:*\n\n`;

    items.forEach((item, idx) => {
        const itemExtrasTotal = (item.extras || []).reduce((s, e) => s + e.price * e.qty, 0);
        const itemTotal = (item.price * item.qty) + (itemExtrasTotal * item.qty);

        msg += `${idx + 1}. ✨ *${item.title}*\n`;
        if (item.category) {
            msg += `   🗂️ القسم: ${item.category}\n`;
        }
        msg += `   💵 السعر: ${item.price} ${cur}\n`;
        if (item.size && item.size !== 'عادي' && item.size !== 'Default') {
            msg += `   📏 الحجم: ${item.size}\n`;
        }
        if (item.extras && item.extras.length > 0) {
            msg += `   ➕ الإضافات:\n`;
            item.extras.forEach(e => {
                msg += `      🔹 ${e.name} (×${e.qty}) بقيمة ${e.price * e.qty} ${cur}\n`;
            });
        }
        msg += `   🔢 الكمية: ${item.qty}\n`;
        // Per-item note, shown with the item rather than lumped into order notes.
        if (item.notes && item.notes.trim()) {
            msg += `   📝 ملاحظة: _${item.notes.trim()}_\n`;
        }
        msg += `   💰 المجموع: *${itemTotal} ${cur}*\n\n`;
    });

    if (notes) {
        msg += `📝 *ملاحظات:* ${notes}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (deliveryFee && deliveryFee > 0) {
        msg += `🛒 مجموع الأصناف: ${subtotal} ${cur}\n`;
        msg += `🚚 خدمة التوصيل: ${deliveryFee} ${cur}\n`;
    } else if (orderType === 'delivery' && !deliveryZoneName) {
        msg += `⚠️ *ملاحظة: السعر غير شامل خدمة التوصيل*\n`;
    }
    if (promotionName && discountAmount && discountAmount > 0) {
        msg += `🎁 *عرض مطبق:* ${promotionName}\n`;
        msg += `💰 *الخصم:* -${discountAmount} ${cur}${discountType === 'free_shipping' ? ' (شحن مجاني)' : ''}\n`;
    }
    msg += `💵 *الإجمالي المطلوب: ${total} ${cur}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `⏰ ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}\n`;
    msg += `❤️ مع تحيات إدارة مطعم *${restaurantName}*`;

    return msg;
}

/**
 * Send a Telegram notification for a new order.
 * Fetches the restaurant's Telegram credentials from the database,
 * then sends the message via the /api/telegram API route.
 * Fails silently — errors are logged but never block the order flow.
 */
async function sendTelegramNotification(params: {
    restaurantId: string;
    orderNumber: number;
    restaurantName: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    orderType: 'delivery' | 'pickup';
    deliveryZoneName?: string;
    deliveryFee?: number;
    items: OrderItem[];
    subtotal: number;
    total: number;
    notes?: string;
    currency?: string;
    promotionName?: string;
    discountAmount?: number;
    discountType?: string;
    branchName?: string;
}): Promise<void> {
    try {
        // The bot token is deliberately NOT read here. It used to be fetched
        // from the restaurants table in the browser and posted to the API,
        // which made it readable by anyone holding the anon key — anyone who
        // opened the site — and a Telegram bot token is enough to take over the
        // restaurant's bot. The route now looks it up server-side from the
        // restaurantId, so the token never reaches the client at all.
        await fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                restaurantId: params.restaurantId,
                message: buildTelegramMessage(params),
            }),
        });
    } catch (err) {
        console.error('Telegram notification error (non-blocking):', err);
    }
}

/**
 * Submit an order to the database, auto-create/update customer, and send notification.
 * Used by all theme checkout flows.
 */
export async function submitOrder(params: SubmitOrderParams): Promise<SubmitOrderResult> {
    try {
        const {
            restaurantId, customerName, customerPhone, customerAddress,
            notes, orderType, deliveryZoneId, deliveryZoneName, deliveryFee,
            items, subtotal, total, paymentMethod, restaurantName,
            promotionId, promotionName, discountAmount, discountType, branchName,
            currency
        } = params;

        // 1. Upsert customer.
        // Done through a SECURITY DEFINER function rather than reading the
        // customers table from the browser. Looking a customer up by phone
        // needed anon SELECT on customers, and no RLS policy can narrow that to
        // "just the phone you typed" — so the whole table stayed readable with
        // the public key. The function returns only the id.
        // It also increments the running totals server-side, which the old
        // read-then-write could lose when two orders overlapped.
        // Both RPCs are created by part 5 of rls_lockdown.sql. Until that has
        // been run they do not exist, so each call falls back to the original
        // table queries. This has to keep working in BOTH states: the code
        // deploys before the SQL is applied, and the SQL closes anon's read
        // access to these tables, which is what breaks the fallback — by which
        // point the function exists and the fallback is never reached.
        let customerId: string | undefined;
        const { data: rpcCustomerId, error: customerRpcError } = await supabase.rpc(
            'upsert_order_customer',
            {
                p_restaurant_id: restaurantId,
                p_phone: customerPhone,
                p_name: customerName,
                p_order_total: total,
            }
        );

        if (!customerRpcError && rpcCustomerId) {
            customerId = rpcCustomerId as string;
        } else {
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id, total_orders, total_spent')
                .eq('restaurant_id', restaurantId)
                .eq('phone', customerPhone)
                .maybeSingle();

            if (existingCustomer) {
                customerId = existingCustomer.id;
                await supabase.from('customers').update({
                    name: customerName,
                    total_orders: (existingCustomer.total_orders || 0) + 1,
                    total_spent: (existingCustomer.total_spent || 0) + total,
                    last_order_date: new Date().toISOString(),
                }).eq('id', customerId);
            } else {
                const { data: newCustomer } = await supabase
                    .from('customers')
                    .insert({
                        restaurant_id: restaurantId,
                        name: customerName,
                        phone: customerPhone,
                        total_orders: 1,
                        total_spent: total,
                        last_order_date: new Date().toISOString(),
                    })
                    .select('id')
                    .single();
                customerId = newCustomer?.id;
            }
        }

        // 1.5 Sequential order number for this restaurant.
        // Same arrangement. Defaulting a missing value to 1 here would give
        // every order in the system the number 1, so the fallback is not
        // optional.
        const { data: rpcOrderNumber, error: orderNumberRpcError } = await supabase.rpc(
            'next_order_number',
            { p_restaurant_id: restaurantId }
        );

        const { data: restaurantData } = await supabase
            .from('restaurants')
            .select('auto_approve_website_orders, starting_order_number')
            .eq('id', restaurantId)
            .maybeSingle();

        // Decided here and written straight onto the insert. It used to be
        // applied by an UPDATE after the row existed, whose error was never
        // checked — and a customer placing an order is anonymous, so RLS lets
        // them insert an order but not modify one. The update silently did
        // nothing and every order stayed pending however this was set.
        const autoApprove = restaurantData?.auto_approve_website_orders === true;
        const initialStatus = autoApprove ? 'completed' : 'pending';

        let nextOrderNumber: number;
        if (!orderNumberRpcError && typeof rpcOrderNumber === 'number') {
            nextOrderNumber = rpcOrderNumber;
        } else {
            const { data: maxOrderData } = await supabase
                .from('orders')
                .select('order_number')
                .eq('restaurant_id', restaurantId)
                .order('order_number', { ascending: false })
                .limit(1)
                .maybeSingle();

            nextOrderNumber = (maxOrderData?.order_number || 0) + 1;
            if (restaurantData?.starting_order_number && nextOrderNumber < restaurantData.starting_order_number) {
                nextOrderNumber = restaurantData.starting_order_number;
            }
        }

        // 2. Insert Order.
        // The id is generated here rather than read back, because reading it
        // back is what broke checkout under RLS: `.insert().select()` makes
        // Postgres apply the SELECT policy to the RETURNING row, and the public
        // menu deliberately has insert-without-read on orders. Granting the
        // read to make RETURNING work would republish all 595 orders. Both
        // values the caller needs are already known here — the number came from
        // next_order_number, and the id is ours to choose.
        // crypto.randomUUID exists only in a secure context, so it is not
        // guaranteed. Falling back to undefined here would leave order.id
        // undefined and silently break the order_logs and inventory writes
        // below, so there is always a value.
        const newOrderId = newUuid();

        const { error: orderError } = await supabase
            .from('orders')
            .insert({
                ...(newOrderId ? { id: newOrderId } : {}),
                restaurant_id: restaurantId,
                order_number: nextOrderNumber,
                customer_id: customerId,
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_address: customerAddress || null,
                notes: notes || null,
                order_type: orderType,
                delivery_zone_id: deliveryZoneId || null,
                delivery_zone_name: deliveryZoneName || null,
                delivery_fee: deliveryFee || 0,
                items: items.map(i => ({
                    title: i.title,
                    qty: i.qty,
                    price: i.price,
                    size: i.size || null,
                    category: i.category || null,
                    extras: (i.extras || []).map(e => ({
                        name: e.name,
                        qty: e.qty,
                        price: e.price,
                    })),
                    notes: i.notes || null,
                })),
                subtotal,
                total,
                payment_method: paymentMethod || 'cash',
                status: initialStatus,
                is_draft: false,
                source: 'website',
                promotion_id: promotionId || null,
                promotion_name: promotionName || null,
                // `discount` is the column the dashboard, the reports and the
                // mobile app all read; `discount_amount` was write-only, so a
                // website offer showed as zero discount everywhere. Both are
                // written to keep anything still reading the old name working.
                discount: discountAmount || 0,
                discount_amount: discountAmount || 0,
                discount_type: discountType || null,
                branch_name: branchName || null,
            });

        if (orderError) {
            return { success: false, error: orderError.message || 'Failed to create order' };
        }

        // Stands in for the row that used to be read back.
        const order = { id: newOrderId as string, order_number: nextOrderNumber };

        // 3. Create notification for restaurant owner
        await supabase.from('notifications').insert({
            restaurant_id: restaurantId,
            title: `طلب جديد #${order.order_number}`,
            body: `${customerName} — ${items.length} أصناف — ${total} ${parseCurrency(currency, true)} — ${orderType === 'delivery' ? 'دليفري' : 'استلام'}`,
            type: 'order',
            target: 'admin',
            is_read: false,
        });

        // 4. Send Telegram notification (non-blocking)
        sendTelegramNotification({
            restaurantId,
            orderNumber: order.order_number,
            restaurantName: restaurantName || '',
            customerName,
            customerPhone,
            customerAddress,
            orderType,
            deliveryZoneName,
            deliveryFee,
            items,
            subtotal,
            total,
            notes,
            promotionName,
            discountAmount,
            discountType,
            branchName,
            currency,
        });

        // 5. Log the order creation
        await supabase.from('order_logs').insert({
            order_id: order.id,
            action: 'order_created',
            new_status: initialStatus,
            performed_by: customerName,
        });

        // 6. Deduct inventory. This no longer decides the status: with
        // auto-approve on the order is completed regardless, and with it off it
        // stays pending regardless, so a shortfall only needs logging.
        try {
            const invResult = await processOrderInventory(restaurantId, items, order.id);
            if (!invResult.allDeducted) {
                console.log('Order deferred to factory:', invResult.messages);
            }
        } catch (err) {
            console.error('[Inventory] deduction error:', err);
        }

        // 7. Calculate order cost & profit (non-blocking)
        calculateOrderCost(order.id).catch(err =>
            console.error('[CostEngine] Non-blocking cost calc error:', err)
        );

        return {
            success: true,
            orderNumber: order.order_number,
            orderId: order.id,
        };
    } catch (err) {
        console.error('submitOrder error:', err);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
}
