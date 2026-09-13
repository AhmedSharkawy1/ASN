/**
 * WhatsApp Service - Handles message sending via wa.me links
 * and optional WhatsApp Business Cloud API integration.
 */

// Clean phone number - remove all non-digit chars except leading +
export function cleanPhoneNumber(phone: string): string {
    if (!phone) return '';
    // Keep + at the start, remove all other non-digits
    return phone.replace(/[^\d+]/g, '');
}

// Validate a phone number (basic check)
export function isValidPhone(phone: string): boolean {
    const cleaned = cleanPhoneNumber(phone);
    // Basic validation: length between 8 and 15 digits (excluding optional +)
    return /^\+?\d{8,15}$/.test(cleaned);
}

// Generate a wa.me link for a single phone number with pre-filled message
export function buildWhatsAppLink(phone: string, message: string): string {
    const cleanPhone = cleanPhoneNumber(phone).replace('+', ''); // wa.me usually prefers no + sign
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

// For future: WhatsApp Cloud API send (when user gets API account)
export async function sendViaCloudAPI(params: {
    token: string;
    phoneNumberId: string;
    to: string;
    message: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const url = `https://graph.facebook.com/v18.0/${params.phoneNumberId}/messages`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${params.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: cleanPhoneNumber(params.to).replace('+', ''),
                type: 'text',
                text: { body: params.message }
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to send WhatsApp message via Cloud API');
        }
        
        return { 
            success: true, 
            messageId: data.messages?.[0]?.id 
        };
    } catch (error: unknown) {
        console.error('WhatsApp Cloud API send error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error sending message';
        return { 
            success: false, 
            error: message 
        };
    }
}

// For future: Test WhatsApp Cloud API connection
export async function testCloudAPIConnection(params: {
    token: string;
    phoneNumberId: string;
}): Promise<{ success: boolean; error?: string }> {
    // A simple test is to try sending a message to a test number or just fetching business profile
    // Here we'll try to fetch the phone number details
    try {
        const url = `https://graph.facebook.com/v18.0/${params.phoneNumberId}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${params.token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to connect to WhatsApp Cloud API');
        }
        
        return { success: true };
    } catch (error: unknown) {
        console.error('WhatsApp Cloud API test error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error testing connection';
        return { 
            success: false, 
            error: message 
        };
    }
}
