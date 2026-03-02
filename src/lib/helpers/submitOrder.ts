import { supabase } from '@/lib/supabase/client';

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
};

export type SubmitOrderResult = {
    success: boolean;
    orderNumber?: number;
    orderId?: string;
    error?: string;
};

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
}): string {
    const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        orderNumber, restaurantName, customerName, customerPhone,
        customerAddress, orderType, deliveryZoneName, deliveryFee,
        items, subtotal, total, notes, currency = 'ج', language = 'ar'
    } = params;
    const isAr = language === 'ar';

    let msg = `*🧾 ${isAr ? 'فاتورة طلب جديدة' : 'New Order Invoice'} - ${restaurantName} 🍕🍝*\n`;
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
    msg += `------------------------------\n`;
    msg += `*📋 ${isAr ? 'الأصناف المطلوبة:' : 'Ordered Items:'}*\n\n`;

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
    msg += `*💵 ${isAr ? 'الإجمالي المطلوب:' : 'Total Due:'} ${total} ${currency}*\n`;
    msg += `------------------------------\n`;
    if (orderType === 'delivery') {
        msg += `🚚 *${isAr ? 'تنبيه:' : 'Note:'}* ${isAr ? 'السعر أعلاه غير شامل خدمة التوصيل.' : 'Price above does not include delivery fee.'}\n`;
    }
    msg += `✅ *${isAr ? 'تأكيد:' : 'Confirmation:'}* ${isAr ? 'سيتم مراجعة الطلب من قبل المطعم وتأكيده معكم فوراً.' : 'Your order will be reviewed and confirmed shortly.'}\n`;
    msg += `❤️ ${isAr ? 'مع تحيات إدارة مطعم' : 'With love from'} *${restaurantName}*\n`;
    msg += `------------------------------\n`;
    msg += `${isAr ? 'شكراً لاختياركم' : 'Thank you for choosing'} ${restaurantName} 🍕🍝`;

    return msg;
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
            items, subtotal, total, paymentMethod
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

        // 2. Insert Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                restaurant_id: restaurantId,
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
            body: `${customerName} — ${items.length} أصناف — ${total} ج.م — ${orderType === 'delivery' ? 'دليفري' : 'استلام'}`,
            type: 'order',
            is_read: false,
        });

        // 4. Log the order creation
        await supabase.from('order_logs').insert({
            order_id: order.id,
            action: 'order_created',
            new_status: 'pending',
            performed_by: customerName,
        });

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
