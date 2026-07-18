const fs = require('fs');

function parseCurrency(currencyValue, isAr = true) {
    if (!currencyValue) return isAr ? "ج.م" : "EGP";

    let curStr = String(currencyValue).trim();

    let parsedObj = null;
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

const testValue = '{"en":" EGP ","ar":" جنيه "}';
console.log("Raw value:", testValue);
console.log("Parsed AR:", parseCurrency(testValue, true));
console.log("Parsed EN:", parseCurrency(testValue, false));
