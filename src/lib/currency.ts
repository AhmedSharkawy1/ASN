export function parseCurrency(currencyValue: any, isAr: boolean = true): string {
    if (!currencyValue) return isAr ? "ج.م" : "EGP";

    let curStr = String(currencyValue).trim();

    // Safely parse JSON even if it's double or triple encoded
    let parsedObj: any = null;
    let attempts = 0;
    let tempStr = curStr;
    
    while (tempStr.startsWith('{') && attempts < 3) {
        try {
            const parsed = JSON.parse(tempStr);
            if (typeof parsed === 'string') {
                tempStr = parsed.trim();
                attempts++;
            } else if (typeof parsed === 'object' && parsed !== null) {
                parsedObj = parsed;
                break;
            } else {
                break;
            }
        } catch {
            break;
        }
    }

    if (parsedObj) {
        if (isAr) {
            return parsedObj.ar || parsedObj.en || curStr;
        } else {
            return parsedObj.en || parsedObj.ar || curStr;
        }
    }

    return curStr;
}
