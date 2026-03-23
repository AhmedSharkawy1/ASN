const fs = require('fs');

async function test() {
    try {
        const filePath = 'public/backups/backup_70616b30-1414-4952-be79-91ef91a46b49.json';
        const fileContent = fs.readFileSync(filePath);
        
        // Create a File object
        const file = new File([fileContent], "real_backup.json", { type: "application/json" });

        const form = new FormData();
        form.append('file', file);
        // Use a valid UUID format
        form.append('target_tenant_id', '5fc9baf2-4246-4612-8ba9-377fc6cd8215');
        form.append('modules', JSON.stringify(["menu", "kitchen", "inventory", "settings", "customers"]));

        console.log("Sending request...");

        if (typeof fetch === 'undefined') {
            console.log("Node version too old, fetch undefined");
            return;
        }

        const res = await fetch('http://localhost:3000/api/backup/clone', {
            method: 'POST',
            body: form
        });

        const text = await res.text();
        const json = JSON.parse(text);
        
        console.log("Clone Response Success:", json.success);
        console.log("System Backups Log Error:", json.log_error);
        if (json.results) {
            for (const [table, data] of Object.entries(json.results)) {
                if (data.errors && data.errors.length > 0) {
                    console.log(`\nERROR IN TABLE: ${table}`);
                    data.errors.forEach(err => console.log(`  - ${err}`));
                } else if (data.cloned > 0) {
                    console.log(`SUCCESS: Cloned ${data.cloned} rows into ${table}`);
                }
            }
        }
    } catch (e) {
        console.error("Crash:", e);
    }
}
test();
