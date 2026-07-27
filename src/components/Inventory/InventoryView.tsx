import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Headphones, Plus, Search, Barcode, AlertTriangle, PackageCheck, Trash2 } from 'lucide-react';

export const categoriesList = [
  'الكل',
  'جرابات',
  'شواحن',
  'كابلات',
  'سماعات',
  'شاشات وحماية',
  'صيانة وقطع غيار',
  'أخرى'
];

export const InventoryView: React.FC = () => {
  const { inventory, addInventoryItem, updateStockQuantity, deleteInventoryItem, currentUser } = useApp();
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('جرابات');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellPrice, setSellPrice] = useState<number | ''>('');
  const [stockQuantity, setStockQuantity] = useState<number | ''>(10);
  const [minStockAlert, setMinStockAlert] = useState<number | ''>(3);
  const [unit, setUnit] = useState('قطعة');

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'الكل' || item.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || item.stockQuantity <= item.minStockAlert;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !costPrice || !sellPrice) {
      toast.warning('بيانات ناقصة', 'ادخل اسم المنتج والأسعار بشكل صحيح!');
      return;
    }

    const generatedBarcode = barcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    addInventoryItem({
      name,
      barcode: generatedBarcode,
      category,
      costPrice: Number(costPrice),
      sellPrice: Number(sellPrice),
      stockQuantity: Number(stockQuantity || 0),
      minStockAlert: Number(minStockAlert || 2),
      unit
    });

    setShowAddModal(false);
    toast.success('تمت إضافة المنتج', `تم تسجيل ${name} بالمخزن بنجاح`);
    setName(''); setBarcode(''); setCostPrice(''); setSellPrice(''); setStockQuantity(10);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Headphones color="#10b981" /> إدارة الإكسسوارات والمخزن (دعم الباركود والتنبيهات)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            متابعة مخزون الجرابات، الشواحن، الكابلات، الشاشات، وإشعارات النواقص
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-emerald" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> إضافة صنف إكسسوار جديد
          </button>
        </div>
      </div>

      {/* Category Pills & Toolbar */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 9999,
                border: selectedCategory === cat ? '1px solid #10b981' : '1px solid var(--border-color)',
                background: selectedCategory === cat ? 'rgba(16,185,129,0.15)' : 'rgba(15,23,42,0.6)',
                color: selectedCategory === cat ? '#34d399' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Checkbox filter */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: 12 }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingRight: 38 }}
              placeholder="ابحث باسم المنتج أو امسح الباركود..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', color: '#fda4af' }}>
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
            />
            عرض الأصناف التي أوشكت على النفاد فقط ⚠️
          </label>
        </div>

      </div>

      {/* Inventory Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>الباركود</th>
              <th>اسم الصنف</th>
              <th>التصنيف</th>
              {currentUser.role === 'ADMIN' && <th>سعر التكلفة</th>}
              <th>سعر البيع</th>
              <th>المخزون الحالي</th>
              <th>حد النواقص</th>
              <th>تعديل الكمية</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  لا توجد أصناف مطابقة للبحث
                </td>
              </tr>
            ) : (
              filteredInventory.map(item => {
                const isLowStock = item.stockQuantity <= item.minStockAlert;
                return (
                  <tr key={item.id} style={{ background: isLowStock ? 'rgba(244, 63, 94, 0.05)' : 'transparent' }}>
                    <td>
                      <span style={{ fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>
                        <Barcode size={14} color="#a855f7" /> {item.barcode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{item.name}</td>
                    <td><span className="badge badge-indigo">{item.category}</span></td>
                    {currentUser.role === 'ADMIN' && (
                      <td style={{ color: 'var(--text-muted)' }}>{item.costPrice.toLocaleString('ar-EG')} ج.م</td>
                    )}
                    <td style={{ fontWeight: 800, color: '#fbbf24' }}>
                      {item.sellPrice.toLocaleString('ar-EG')} ج.م
                    </td>
                    <td>
                      {isLowStock ? (
                        <span className="badge badge-rose">
                          <AlertTriangle size={12} /> {item.stockQuantity} {item.unit} (ناقص)
                        </span>
                      ) : (
                        <span className="badge badge-emerald">
                          <PackageCheck size={12} /> {item.stockQuantity} {item.unit}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.minStockAlert} {item.unit}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                          onClick={() => {
                            updateStockQuantity(item.id, -1);
                            toast.info('تحديث كمية', `تم خصم قطعة من ${item.name}`);
                          }}
                          title="خصم قطعة"
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 700, padding: '0 4px' }}>{item.stockQuantity}</span>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                          onClick={() => {
                            updateStockQuantity(item.id, 1);
                            toast.info('تحديث كمية', `تمت إضافة قطعة إلى ${item.name}`);
                          }}
                          title="إضافة قطعة"
                        >
                          +
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.8rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#fda4af', cursor: 'pointer' }}
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من حذف المنتج "${item.name}" نهائياً من المخزون؟`)) {
                              deleteInventoryItem(item.id);
                              toast.success('تم حذف المنتج', `تم إزالة ${item.name} من المخزن نهائياً`);
                            }
                          }}
                          title="حذف نهائي للمنتج من المخزن"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Inventory Item Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1.2rem', color: 'var(--accent-emerald)' }}>
              إضافة صنف إكسسوار جديد للمخزن
            </h3>
            <form onSubmit={handleCreateItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>اسم الصنف / المنتج كامل</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="مثال: شاحن سامسونج 25 واط أصلي"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>الباركود (اتركه فارغاً للتوليد التلقائي)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="امسح بالباركود scanner"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>التصنيف</label>
                  <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
                    {categoriesList.filter(c => c !== 'الكل').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>سعر التكلفة (ج.م)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="تكلفة الشراء"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>سعر البيع للزبون (ج.م)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="سعر البيع"
                    value={sellPrice}
                    onChange={e => setSellPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>الكمية المتاحة الآن</label>
                  <input
                    type="number"
                    className="input-field"
                    value={stockQuantity}
                    onChange={e => setStockQuantity(e.target.value !== '' ? Number(e.target.value) : '')}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>حد تنبيه النواقص</label>
                  <input
                    type="number"
                    className="input-field"
                    value={minStockAlert}
                    onChange={e => setMinStockAlert(e.target.value !== '' ? Number(e.target.value) : '')}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>وحدة القياس</label>
                  <select className="input-field" value={unit} onChange={e => setUnit(e.target.value)}>
                    <option value="قطعة">قطعة</option>
                    <option value="جراب">جراب</option>
                    <option value="شاشة">شاشة</option>
                    <option value="علبة">علبة</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-emerald">حفظ المنتج بجدول المخزن</button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
