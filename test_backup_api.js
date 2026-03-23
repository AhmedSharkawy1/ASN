const fetch = require('node-fetch');

async function testBackup() {
    try {
        console.log("Sending POST request to /api/backup/create...");
        const res = await fetch('http://localhost:3000/api/backup/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const text = await res.text();
        console.log("Response status:", res.status);
        console.log("Response body:", text);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testBackup();
