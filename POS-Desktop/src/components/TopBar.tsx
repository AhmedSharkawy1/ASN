import { useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { AppUser } from '../App';
import { db } from '../lib/db';

type Props = {
    user: AppUser;
    restaurantName: string;
    onLogout: () => void;
};

export default function TopBar({ user, restaurantName, onLogout }: Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isAdmin = user.role === 'admin';

    const handleBackup = async () => {
        try {
            const data = { settings: await db.settings.toArray(), categories: await db.categories.toArray(), menu_items: await db.menu_items.toArray(), orders: await db.orders.toArray(), customers: await db.customers.toArray(), pos_users: await db.pos_users.toArray() };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ASN_POS_Backup_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
            alert('تم أخذ نسخة احتياطية بنجاح!');
        } catch { alert('حدث خطأ أثناء النسخ الاحتياطي'); }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows = XLSX.utils.sheet_to_json<any>(worksheet);

                if (rows.length > 0) {
                    if (confirm('هل أنت متأكد من استيراد المنيو من ملف الإكسيل؟ سيتم استبدال الأقسام والأصناف الحالية.')) {
                        const categoriesMap = new Map<string, any>();
                        const newCategories: any[] = [];
                        const newItems: any[] = [];
                        let catIdCounter = 1;

                        for (const row of rows) {
                            const catName = row['Category AR']?.toString().trim();
                            if (!catName) continue;

                            if (!categoriesMap.has(catName)) {
                                const newCat = {
                                    id: catIdCounter++,
                                    name_ar: catName,
                                    name_en: row['Category EN']?.toString().trim() || '',
                                    emoji: row['Emoji']?.toString().trim() || '🍽️',
                                    sort_order: catIdCounter
                                };
                                categoriesMap.set(catName, newCat);
                                newCategories.push(newCat);
                            }

                            const cat = categoriesMap.get(catName);
                            const itemName = row['Item AR']?.toString().trim();
                            if (itemName) {
                                const sizesStr = row['Sizes']?.toString() || 'عادي';
                                const pricesStr = row['Prices']?.toString() || '0';

                                const sizes = sizesStr.split(',').map((s: string) => s.trim());
                                const prices = pricesStr.split(',').map((p: string) => parseFloat(p.trim()) || 0);

                                newItems.push({
                                    category_id: cat.id,
                                    title_ar: itemName,
                                    title_en: row['Item EN']?.toString().trim() || '',
                                    prices,
                                    size_labels: sizes,
                                    is_available: true,
                                    is_popular: row['Popular']?.toString().toLowerCase() === 'yes' || row['Popular']?.toString() === 'نعم',
                                    sell_by_weight: row['Sold By Weight']?.toString().toLowerCase() === 'yes' || row['Sold By Weight']?.toString() === 'نعم',
                                    weight_unit: row['الوحدة']?.toString().trim() || 'كجم'
                                });
                            }
                        }

                        await db.transaction('rw', db.categories, db.menu_items, async () => {
                            await db.categories.clear();
                            await db.categories.bulkAdd(newCategories);
                            await db.menu_items.clear();
                            await db.menu_items.bulkAdd(newItems);
                        });
                        alert('تم استيراد المنيو بنجاح! سيتم إعادة تحميل الصفحة للتحديث.');
                        window.location.reload();
                    }
                } else { alert('ملف الإكسيل فارغ أو غير صالح.'); }
            } catch (err) { alert('حدث خطأ أثناء قراءة الملف.' + err); }
            finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="classic-topbar no-drag" dir="rtl">
            {/* Right side buttons */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => navigate('/pos')} className="classic-btn-green"
                    style={{ fontSize: 14, padding: '5px 22px', fontWeight: 'bold', border: location.pathname === '/pos' ? '2px solid #fff' : '1px solid #1e7e34' }}>
                    كاشير
                </button>
                <button onClick={handleBackup}
                    style={{ fontSize: 14, padding: '5px 18px', fontWeight: 'bold', background: '#fff', border: '1px solid #999', cursor: 'pointer', color: '#333' }}>
                    BackUp
                </button>
                {isAdmin && (
                    <>
                        <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} ref={fileInputRef} onChange={handleImport} />
                        <button onClick={() => fileInputRef.current?.click()}
                            style={{ fontSize: 14, padding: '5px 18px', fontWeight: 'bold', background: '#e0d8c0', border: '1px solid #999', cursor: 'pointer', color: '#333' }}>
                            استيراد المنيو
                        </button>
                    </>
                )}
            </div>

            {/* Center - Restaurant Name */}
            <h1>
                {restaurantName || 'فطاطري اطياب'}
                <span style={{ fontSize: 11, color: '#ccc', marginRight: 8, fontWeight: 'normal', verticalAlign: 'super' }}>v3.0</span>
            </h1>

            {/* Left side buttons */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {isAdmin && (
                    <>
                        <button onClick={() => navigate('/staff')}
                            style={{ fontSize: 14, padding: '5px 18px', fontWeight: 'bold', background: '#fff', border: location.pathname === '/staff' ? '2px solid #4080c0' : '1px solid #999', cursor: 'pointer', color: '#333' }}>
                            الموظفين
                        </button>
                        <button onClick={() => navigate('/settings')} className="classic-btn-green"
                            style={{ fontSize: 14, padding: '5px 18px', fontWeight: 'bold', border: location.pathname === '/settings' ? '2px solid #fff' : '1px solid #1e7e34' }}>
                            الملحقات
                        </button>
                    </>
                )}
                <button onClick={() => navigate('/orders')}
                    style={{ fontSize: 14, padding: '5px 18px', fontWeight: 'bold', background: '#fff', border: location.pathname === '/orders' || location.pathname === '/reports' || location.pathname === '/customers' ? '2px solid #4080c0' : '1px solid #999', cursor: 'pointer', color: '#333' }}>
                    الاستعلام
                </button>
            </div>
        </div>
    );
}
