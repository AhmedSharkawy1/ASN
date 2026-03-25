import { formatCurrency, formatQuantity } from "./formatters";
import { getReceiptStyles } from "./printerSettings";

export function renderReceiptHtml(order: any, restaurant: any, isAr: boolean = true) {
    const orderTypeLabel = order.order_type === 'dine_in' ? 'صالة' : order.order_type === 'delivery' ? 'دليفري' : 'تيك أواي';
    const fmtPrice = (num: number) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);

    const groupedItems: Record<string, any[]> = {};
    order.items.forEach((item: any) => {
        const cat = item.category || (isAr ? 'أصناف متنوعة' : 'Miscellaneous');
        if (!groupedItems[cat]) groupedItems[cat] = [];
        groupedItems[cat].push(item);
    });

    const itemsHtml = Object.entries(groupedItems).map(([category, items]) => {
        const categoryHeader = `<tr><td colspan="3" style="padding:10px 0 5px 0;border-bottom:1.5px solid #000;font-size:16px;font-weight:900;text-align:center;color:#000">${category}</td></tr>`;
        const rows = items.map(item => {
            const unit = item.weight_unit || item.unit || (isAr ? 'قطعة' : 'unit');
            const fmt = formatQuantity(item.qty, unit, isAr);
            
            // For branch supplies, show the unit in the quantity column clearly
            const isWeight = !!(item.weight_unit || (order.source === 'branch_supply' && item.unit));
            const title = isWeight
                ? `(${fmt.qty} ${fmt.unit}) ${item.title}`
                : item.title + (item.size && item.size !== 'عادي' ? ` (${item.size})` : '');
            
            // Use the formatted quantity which handles kg -> gram, etc.
            const qtyStr = isWeight ? '1' : `${fmt.qty} ${order.source === 'branch_supply' ? fmt.unit : ''}`.trim();
            
            return `<tr>
                <td style="padding:4px 0;font-size:14px;font-weight:900;color:#000">
                    <div>${title}</div>
                    ${item.notes ? `<div style="font-size:11px;font-weight:700;color:#000;margin-top:2px">— ${item.notes}</div>` : ''}
                </td>
                <td style="text-align:center;padding:4px 0;font-size:15px;font-weight:900;color:#000">${qtyStr}</td>
                <td style="text-align:left;padding:4px 0;font-size:15px;font-weight:900;color:#000">${fmtPrice(item.price * item.qty)}</td>
            </tr>`;
        }).join('');
        return categoryHeader + rows;
    }).join('');

    return `<html><head><title>Receipt</title><style>${getReceiptStyles()}</style></head><body>
        <div class="receipt-wrapper">
            <div style="text-align:center;margin-bottom:15px;color:#000;font-weight:900">
                ${(restaurant?.receipt_logo_url || restaurant?.logo_url) ? `<img src="${restaurant.receipt_logo_url || restaurant.logo_url}" alt="Logo" style="width:150px;height:150px;object-fit:contain;margin-bottom:10px;margin-left:auto;margin-right:auto;display:block" />` : ''}
                <p style="font-weight:900;font-size:22px;margin:0 0 5px 0;color:#000">${restaurant?.name || 'Restaurant'}</p>
                ${restaurant?.phone ? `<p style="font-size:14px;margin:0 0 5px 0;font-weight:900;color:#000" dir="ltr">${restaurant.phone}</p>` : ''}
                ${restaurant?.phone_numbers?.map((p: any) => `<p style="font-size:14px;margin:0 0 5px 0;font-weight:900;color:#000" dir="ltr">${p.number}</p>`).join('') || ''}
                ${restaurant?.address ? `<p style="font-size:14px;margin:0 0 5px 0;font-weight:900;color:#000">${restaurant.address}</p>` : ''}
                <p style="font-size:14px;margin:0 0 5px 0;font-weight:900;color:#000">${new Date(order.created_at).toLocaleDateString('ar-EG')} - ${new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                <p style="font-weight:900;font-size:18px;margin:0 0 5px 0;color:#000">${order.source === 'branch_supply' ? (isAr ? 'إذن توريد رقم #' : 'Supply ID #') : order.source === 'supplier_supply' ? (isAr ? 'فاتورة مشتريات رقم #' : 'Purchase ID #') : (isAr ? 'فاتورة رقم #' : 'Order ID #')}${order.order_number || order.id?.split('-')[0].toUpperCase()}</p>
                <p style="font-size:16px;font-weight:900;margin:0;display:inline-block;border:2px solid #000;padding:2px 6px;border-radius:4px;color:#000">${order.source === 'branch_supply' ? (isAr ? 'توريد فرع' : 'Branch Supply') : order.source === 'supplier_supply' ? (isAr ? 'مشتريات مورد' : 'Supplier Purchase') : orderTypeLabel}</p>
            </div>
            ${(order.customer_name || order.customer_phone) ? `<div style="border-top:2px dashed #000;margin:12px 0"></div><div style="font-size:14px;font-weight:900;color:#000">
                ${order.customer_name ? `<p style="margin:2px 0;font-weight:900">${order.source === 'branch_supply' ? (isAr ? 'المستلم: ' : 'Receiver: ') : order.source === 'supplier_supply' ? (isAr ? 'المورد: ' : 'Supplier: ') : (isAr ? 'العميل: ' : 'Customer: ')}${order.customer_name}</p>` : ''}
                ${order.customer_phone ? `<p style="margin:2px 0;font-weight:900" dir="ltr">${order.customer_phone}</p>` : ''}
                ${order.customer_address ? `<p style="margin:2px 0;font-weight:900">${isAr ? 'العنوان: ' : 'Address: '}${order.customer_address}</p>` : ''}
            </div>` : ''}
            ${order.notes ? `<div style="border-top:2px dashed #000;margin:12px 0"></div><div style="font-size:14px;color:#000;font-weight:900"><p style="margin:2px 0;font-weight:900">${isAr ? 'ملاحظات: ' : 'Notes: '}<strong style="font-weight:900">${order.notes}</strong></p></div>` : ''}
            <div style="border-top:2px dashed #000;margin:12px 0"></div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:10px;color:#000;font-weight:900">
                <thead><tr>
                    <td style="font-weight:900;padding-bottom:8px;border-bottom:2px dashed #000;font-size:15px;color:#000">الصنف</td>
                    <td style="font-weight:900;text-align:center;padding-bottom:8px;border-bottom:2px dashed #000;font-size:15px;color:#000">الكمية</td>
                    <td style="font-weight:900;text-align:left;padding-bottom:8px;border-bottom:2px dashed #000;font-size:15px;color:#000">المبلغ</td>
                </tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <div style="border-top:2px dashed #000;margin:12px 0"></div>
            ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:15px;color:#000;font-weight:900"><span>الخصم</span><span>-${fmtPrice(order.discount)}</span></div>` : ''}
            ${(order.delivery_fee || 0) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:#000;font-weight:900"><span>🚚 حساب الدليفري ${order.delivery_driver_name ? `(${order.delivery_driver_name})` : ''}</span><span>+${fmtPrice(order.delivery_fee || 0)}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;font-weight:900;font-size:20px;margin-top:10px;color:#000"><span>الإجمالي</span><span>${fmtPrice(order.total)}</span></div>
            ${order.payment_method === 'deposit' && order.deposit_amount > 0 ? `
                <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:#000;margin-top:8px"><span>المدفوع (عربون)</span><span>${fmtPrice(order.deposit_amount)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900;color:#000;margin-top:4px"><span>الباقي</span><span>${fmtPrice(Math.max(0, order.total - order.deposit_amount))}</span></div>
            ` : ''}
            <div style="border-top:2px dashed #000;margin:12px 0"></div>
            <div style="font-size:14px;font-weight:900;text-align:center;color:#000">طريقة الدفع: <strong>${order.payment_method === 'cash' ? 'كاش' : order.payment_method === 'deposit' ? 'عربون' : order.payment_method}</strong></div>
            <div style="text-align:center;font-size:14px;margin-top:20px;font-weight:900;color:#000"><p style="margin:0">شكرا لطلبكم نتمنى ان ينال اعجابكم ❤️</p></div>
        </div>
    </body></html>`;
}

export function renderShiftReceiptHtml(data: { cashierName: string, shiftStats: any, restaurantName: string, isAr: boolean }) {
    const { cashierName, shiftStats, restaurantName, isAr } = data;
    const fmtPrice = (num: number) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);

    const orderNumbersStr = shiftStats.orderNumbers && shiftStats.orderNumbers.length > 0 
        ? shiftStats.orderNumbers.join(' - ')
        : (isAr ? 'لا يوجد طلبات' : 'No orders');

    return `<html><head><title>Shift Report</title><style>${getReceiptStyles()}</style></head><body>
        <div class="receipt-wrapper">
            <div style="text-align:center;margin-bottom:15px;color:#000;font-weight:900">
                <p style="font-weight:900;font-size:22px;margin:0 0 5px 0;color:#000">${restaurantName}</p>
                <p style="font-size:18px;font-weight:900;border:2px solid #000;padding:4px;border-radius:6px;display:inline-block;margin-top:5px;margin-bottom:10px;">
                    ${isAr ? 'تقارير تسليم الوردية' : 'End of Shift Report'}
                </p>
                <p style="font-size:14px;margin:0 0 5px 0;font-weight:900;color:#000">${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            
            <div style="border-top:2px dashed #000;margin:12px 0"></div>
            
            <table style="width:100%;border-collapse:collapse;margin-bottom:10px;color:#000;font-weight:900;font-size:15px;">
                <tr>
                    <td style="padding:6px 0;font-weight:900">${isAr ? 'اسم الكاشير:' : 'Cashier Name:'}</td>
                    <td style="text-align:left;padding:6px 0;font-weight:900">${cashierName}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-weight:900">${isAr ? 'إجمالي عدد الطلبات:' : 'Total Orders:'}</td>
                    <td style="text-align:left;padding:6px 0;font-weight:900">${shiftStats.count}</td>
                </tr>
            </table>

            <div style="border-top:2px dashed #000;margin:12px 0"></div>

            <table style="width:100%;border-collapse:collapse;margin-bottom:10px;color:#000;font-weight:900;font-size:15px;">
                <tr>
                    <td style="padding:4px 0;">${isAr ? 'كاش (مكتمل ونقدي):' : 'Cash (In):'}</td>
                    <td style="text-align:left;padding:4px 0;">${fmtPrice(shiftStats.cash)}</td>
                </tr>
                <tr>
                    <td style="padding:4px 0;">${isAr ? 'عربون / مقدم:' : 'Deposits (In):'}</td>
                    <td style="text-align:left;padding:4px 0;">${fmtPrice(shiftStats.deposit)}</td>
                </tr>
                <tr>
                    <td style="padding:4px 0;">${isAr ? 'رسوم التوصيل:' : 'Delivery Fees:'}</td>
                    <td style="text-align:left;padding:4px 0;">${fmtPrice(shiftStats.delivery)}</td>
                </tr>
            </table>

            <div style="border-top:2px dashed #000;margin:12px 0"></div>
            
            <div style="display:flex;justify-content:space-between;font-weight:900;font-size:20px;margin-top:10px;color:#000">
                <span>${isAr ? 'إجمالي التحصيل:' : 'Total Handover:'}</span>
                <span>${fmtPrice(shiftStats.revenue)}</span>
            </div>

            <div style="border-top:2px solid #000;border-bottom:2px solid #000;margin:15px 0;padding:10px 0;">
                <p style="font-weight:900;font-size:15px;margin:0 0 5px 0;">${isAr ? 'أرقام الطلبات المنجزة:' : 'Processed Order Numbers:'}</p>
                <p style="font-size:13px;line-height:1.6;margin:0;">${orderNumbersStr}</p>
            </div>

            <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:14px;font-weight:900;">
                <div style="text-align:center;width:45%;border-top:1px solid #000;padding-top:5px;">${isAr ? 'توقيع الكاشير' : 'Cashier Sign'}</div>
                <div style="text-align:center;width:45%;border-top:1px solid #000;padding-top:5px;">${isAr ? 'توقيع المستلم' : 'Manager Sign'}</div>
            </div>
            
            <div style="text-align:center;font-size:14px;margin-top:30px;font-weight:900;color:#000">
                <p style="margin:0">${isAr ? 'تم طباعة التقرير من النظام' : 'Printed securely from System'}</p>
            </div>
        </div>
    </body></html>`;
}
