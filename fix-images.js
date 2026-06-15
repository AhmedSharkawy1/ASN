const fs = require('fs');
const path = require('path');

// Simple fix: only change object-cover to object-contain on lines that contain selectedItem
// This targets ONLY the modal popup images, not the list/grid thumbnails

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
            let modified = false;

            for (let i = 0; i < lines.length; i++) {
                // Only change lines that have selectedItem AND object-cover (modal images)
                if (lines[i].includes('selectedItem') && lines[i].includes('object-cover')) {
                    lines[i] = lines[i].replace('object-cover', 'object-contain');
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
                console.log('Modified:', fullPath);
            }
        }
    }
}

processDir(path.join(__dirname, 'src', 'components', 'menu'));
processDir(path.join(__dirname, 'src', 'components', 'Theme12Menu'));
processDir(path.join(__dirname, 'src', 'app', 'menu'));
