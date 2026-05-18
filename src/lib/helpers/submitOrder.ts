import { supabase } from '@/lib/supabase/client';
import { processOrderInventory } from '@/lib/helpers/inventoryService';
import { calculateOrderCost } from '@/lib/helpers/costService';

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

    let msg = `🧾 *${isAr ? 'فاتورة طلب جديدة' : 'New Order Invoice'} - ${restaurantName} 🍕🍝*\n`;
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
        msg += `   💵 ${isAr ? 'السعر:' : 'Price:'} ${item.price} ${currency}\n`;
        if (item.size && item.size !== 'عادي' && item.size !== 'Default') {
            msg += `   📏 ${isAr ? 'الحجم:' : 'Size:'} ${item.size}\n`;
        }
        if (item.extras && item.extras.length > 0) {
            msg += `   ➕ ${isAr ? 'الإضافات:' : 'Extras:'}\n`;
            item.extras.forEach(e => {
                msg += `      🔹 ${e.name} (×${e.qty}) ${isAr ? 'بقيمة' : 'worth'} ${e.price * e.qty} ${currency}\n`;
            });
        }
        msg += `   🔢 ${isAr ? 'الكمية:' : 'Qty:'} ${item.qty}\n`;
        msg += `   💰 ${isAr ? 'المجموع:' : 'Total:'} *${itemTotal} ${currency}*\n\n`;
    });

    if (notes) {
        msg += `📝 *${isAr ? 'ملاحظات:' : 'Notes:'}* ${notes}\n`;
    }
    msg += `------------------------------\n`;
    if (deliveryFee && deliveryFee > 0) {
        msg += `🛒 ${isAr ? 'مجموع الأصناف:' : 'Items Subtotal:'} ${subtotal} ${currency}\n`;
        msg += `🚚 ${isAr ? 'خدمة التوصيل:' : 'Delivery Fee:'} ${deliveryFee} ${currency}\n`;
    }
    if (promotionName && discountAmount && discountAmount > 0) {
        msg += `🎁 *${isAr ? 'عرض مطبق:' : 'Promotion:'}* ${promotionName}\n`;
        msg += `💰 *${isAr ? 'الخصم:' : 'Discount:'}* -${discountAmount} ${currency}${discountType === 'free_shipping' ? ` (${isAr ? 'شحن مجاني' : 'Free Shipping'})` : ''}\n`;
    }
    msg += `💵 *${isAr ? 'الإجمالي المطلوب:' : 'Total Due:'} ${total} ${currency}*\n`;
    msg += `------------------------------\n`;

    msg += `✅ *${isAr ? 'تأكيد:' : 'Confirmation:'}* ${isAr ? 'سيتم مراجعة الطلب من قبل المطعم وتأكيده معكم فوراً.' : 'Your order will be reviewed and confirmed shortly.'}\n`;
    msg += `❤️ ${isAr ? 'مع تحيات إدارة مطعم' : 'With love from'} *${restaurantName}*\n`;
    msg += `------------------------------\n`;
    msg += `${isAr ? 'شكراً لاختياركم' : 'Thank you for choosing'} ${restaurantName} 🍕🍝`;

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
        msg += `   💵 السعر: ${item.price} ${currency}\n`;
        if (item.size && item.size !== 'عادي' && item.size !== 'Default') {
            msg += `   📏 الحجم: ${item.size}\n`;
        }
        if (item.extras && item.extras.length > 0) {
            msg += `   ➕ الإضافات:\n`;
            item.extras.forEach(e => {
                msg += `      🔹 ${e.name} (×${e.qty}) بقيمة ${e.price * e.qty} ${currency}\n`;
            });
        }
        msg += `   🔢 الكمية: ${item.qty}\n`;
        msg += `   💰 المجموع: *${itemTotal} ${currency}*\n\n`;
    });

    if (notes) {
        msg += `📝 *ملاحظات:* ${notes}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (deliveryFee && deliveryFee > 0) {
        msg += `🛒 مجموع الأصناف: ${subtotal} ${currency}\n`;
        msg += `🚚 خدمة التوصيل: ${deliveryFee} ${currency}\n`;
    }
    if (promotionName && discountAmount && discountAmount > 0) {
        msg += `🎁 *عرض مطبق:* ${promotionName}\n`;
        msg += `💰 *الخصم:* -${discountAmount} ${currency}${discountType === 'free_shipping' ? ' (شحن مجاني)' : ''}\n`;
    }
    msg += `💵 *الإجمالي المطلوب: ${total} ${currency}*\n`;
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
        // Fetch Telegram credentials for this restaurant
        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('telegram_bot_token, telegram_chat_id')
            .eq('id', params.restaurantId)
            .single();

        if (!restaurant?.telegram_bot_token || !restaurant?.telegram_chat_id) {
            return; // Telegram not configured, skip silently
        }

        const message = buildTelegramMessage(params);

        // Call the server-side API route to send via Telegram Bot API
        await fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                botToken: restaurant.telegram_bot_token,
                chatId: restaurant.telegram_chat_id,
                message,
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

        // 1. Upsert customer — find by phone + restaurant, or create new
        let customerId: string | undefined;
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

        // 1.5 Calculate sequential order number for this specific restaurant
        const { data: maxOrderData } = await supabase
            .from('orders')
            .select('order_number')
            .eq('restaurant_id', restaurantId)
            .order('order_number', { ascending: false })
            .limit(1)
            .maybeSingle();

        const nextOrderNumber = (maxOrderData?.order_number || 0) + 1;

        // 2. Insert Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
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
                status: 'pending',
                is_draft: false,
                source: 'website',
                promotion_id: promotionId || null,
                promotion_name: promotionName || null,
                discount_amount: discountAmount || 0,
                discount_type: discountType || null,
                branch_name: branchName || null,
            })
            .select('id, order_number')
            .single();

        if (orderError || !order) {
            return { success: false, error: orderError?.message || 'Failed to create order' };
        }

        // 3. Create notification for restaurant owner
        await supabase.from('notifications').insert({
            restaurant_id: restaurantId,
            title: `طلب جديد #${order.order_number}`,
            body: `${customerName} — ${items.length} أصناف — ${total} ${currency || 'ج.م'} — ${orderType === 'delivery' ? 'دليفري' : 'استلام'}`,
            type: 'order',
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
            new_status: 'pending',
            performed_by: customerName,
        });

        // 6. Process inventory deduction (blocking for status determination)
        const { data: restaurantData } = await supabase
            .from('restaurants')
            .select('auto_approve_website_orders')
            .eq('id', restaurantId)
            .maybeSingle();
            
        const autoApprove = restaurantData?.auto_approve_website_orders === true;
        let finalStatus = autoApprove ? 'completed' : 'pending';
        
        try {
            const invResult = await processOrderInventory(restaurantId, items, order.id);
            if (!invResult.allDeducted && !autoApprove) {
                finalStatus = 'pending'; // Needs factory production, stay pending unless auto-approve is forced
                // Add a note or handle messages if needed
                console.log('Order deferred to factory:', invResult.messages);
            }
        } catch (err) {
            console.error('[Inventory] deduction error:', err);
            finalStatus = autoApprove ? 'completed' : 'pending'; // Fallback
        }

        // 6.5 Update the order with its calculated status
        await supabase.from('orders').update({
            status: finalStatus,
            updated_at: new Date().toISOString()
        }).eq('id', order.id);

        // Optional log for initial status assignment
        await supabase.from('order_logs').insert({
            order_id: order.id,
            action: 'status_assigned_auto',
            old_status: 'pending',
            new_status: finalStatus,
            performed_by: 'system',
        });

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
