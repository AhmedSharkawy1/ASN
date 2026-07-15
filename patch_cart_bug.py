import glob
import os

src_dir = "src/components/menu"
files_18 = glob.glob(os.path.join(src_dir, "Theme18*.tsx"))
files_19 = glob.glob(os.path.join(src_dir, "Theme19*.tsx"))

all_files = files_18 + files_19

old_code = """    const updateQty = (id: string, notes: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.id === id && c.notes === notes) {
                const nq = c.quantity + delta;
                return nq > 0 ? { ...c, quantity: nq } : c;
            }
            return c;
        }).filter(c => c.quantity > 0));
    };"""

new_code = """    const updateQty = (id: string, notes: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.id === id && c.notes === notes) {
                const nq = c.quantity + delta;
                return { ...c, quantity: nq };
            }
            return c;
        }).filter(c => c.quantity > 0));
    };"""

for file in all_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_code in content:
        content = content.replace(old_code, new_code)
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {file}")
    else:
        print(f"Skipped {file} (code not found)")
