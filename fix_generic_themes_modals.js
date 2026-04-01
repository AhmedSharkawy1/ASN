const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/Theme*.tsx');

let changedAnyFile = false;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const oldContent = content;

    // Fix CSS
    content = content.replace(
        /\.modal-\s*overlay\s*\{[\s\S]*?align-items:\s*flex-end;[\s\S]*?\}/,
        `.modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 9998;
                    display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(8px);
                    padding: 1rem;
                }`
    );

    content = content.replace(
        /\.modal-\s*content-\s*sheet\s*\{[\s\S]*?transform:\s*translateY\s*\(100%\);[\s\S]*?\}/,
        `.modal-content-sheet {
                    background: white; width: 100%; max-width: 400px;
                    border-radius: 2rem;
                    transform: scale(0.95); opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }`
    );

    content = content.replace(
        /\.modal-\s*overlay\.open\s*\.modal-\s*content-\s*sheet\s*\{[\s\S]*?transform:\s*translateY\s*\(0\);[\s\S]*?\}/,
        `.modal-overlay.open .modal-content-sheet { transform: scale(1); opacity: 1; }`
    );

    // Fix hardcoded JSX classes that might override the width or corners
    content = content.replace(/max-w-\[450px\]/g, 'max-w-sm w-full');
    content = content.replace(/max-w-\[500px\]/g, 'max-w-sm w-full');
    content = content.replace(/rounded-t-lg/g, ''); // the parent has overflow: hidden and rounded-[2rem] so image doesn't need it
    content = content.replace(/rounded-t-xl/g, '');
    
    // For cart modals which might not use `.modal-content-sheet`, let's check:
    // <div className="bg-white w-full max-w-[450px] h-[90vh] rounded-2xl
    content = content.replace(
        /<div className="bg-white w-full max-w-\[.*?\] h-\[90vh\] rounded-2xl shadow-2xl flex flex-col transform transition-transform"(.*?)>/g,
        `<div className="modal-content-sheet" $1>`
    );
    
    content = content.replace(
        /<div className="bg-white w-full max-w-\[.*?\] max-h-\[90vh\] rounded-2xl shadow-2xl flex flex-col transform transition-transform"(.*?)>/g,
        `<div className="modal-content-sheet" $1>`
    );

    if (content !== oldContent) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log('Fixed Generic Theme Modals in: ', file);
        changedAnyFile = true;
    }
});

if (!changedAnyFile) {
    console.log('No generic themes needed fixing.');
}
