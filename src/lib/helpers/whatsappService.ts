/**
 * WhatsApp Service - Handles message sending via:
 * 1. Background Automated Gateway (UltraMsg / QR Gateway / Meta Cloud API) - No click on Send needed!
 * 2. Fallback wa.me links
 */

// Clean phone number - remove all non-digit chars except leading +
export function cleanPhoneNumber(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d]/g, '');
    // Standardize Egyptian numbers starting with 01
    if (cleaned.startsWith('01') && cleaned.length === 11) {
        cleaned = '2' + cleaned;
    }
    return cleaned;
}

// Validate a phone number (basic check)
export function isValidPhone(phone: string): boolean {
    const cleaned = cleanPhoneNumber(phone);
    return cleaned.length >= 10 && cleaned.length <= 15;
}

// Generate a wa.me link for a single phone number with pre-filled message (Fallback)
export function buildWhatsAppLink(phone: string, message: string): string {
    const cleanPhone = cleanPhoneNumber(phone);
    // Strip Unicode VS16 (\uFE0F) from message to prevent glitchy characters
    const cleanMessage = message.replace(/\uFE0F/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(cleanMessage)}`;
}

// Format a bulk marketing message with variable substitution
// Variables: {customer_name}, {restaurant_name}
export function formatWhatsAppMessage(template: string, variables: Record<string, string>): string {
    let formatted = template;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{${key}}`, 'g');
        formatted = formatted.replace(regex, value || '');
    }
    return formatted;
}

// Automated background sending via /api/whatsapp/send (No manual send click needed!)
export async function sendAutomatedMessage(params: {
    restaurantId: string;
    phone: string;
    message: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const res = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
            return {
                success: false,
                error: data.error || 'فشل الإرسال التلقائي'
            };
        }

        return {
            success: true,
            messageId: data.messageId
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'فشل في الاتصال بالخادم';
        return { success: false, error: message };
    }
}

// Test connection via /api/whatsapp/test
export async function testConnection(restaurantId: string): Promise<{
    connected: boolean;
    provider?: string;
    phone?: string;
    error?: string;
}> {
    try {
        const res = await fetch('/api/whatsapp/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurantId })
        });

        const data = await res.json().catch(() => ({}));
        return data;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'فشل في الاتصال بالخادم';
        return { connected: false, error: message };
    }
}
