import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { PhoneDevice, PhoneCondition } from '../../types';
import { Smartphone, Plus, Search, FileText, Repeat, CheckCircle, Shield, User, CreditCard } from 'lucide-react';

export const PhonesView: React.FC<{ onNavigateToPOS: (imei?: string) => void }> = ({ onNavigateToPOS }) => {
  const { phones, addPhone, currentUser, setActivePrintDocument } = useApp();
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState<'ALL' | 'NEW' | 'USED'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'SOLD'>('AVAILABLE');

  const [showAddModal, setShowAddModal] = useState(false);

  // New Phone form state
  const [brand, setBrand] = useState('Apple');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [storage, setStorage] = useState('128GB');
  const [batteryHealth, setBatteryHealth] = useState<number | ''>('');
  const [condition, setCondition] = useState<PhoneCondition>('NEW');
  const [imei, setImei] = useState('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellPrice, setSellPrice] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  
  // Seller details if USED
  const [sellerName, setSellerName] = useState('');
  const [sellerNationalId, setSellerNationalId] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');

  const filteredPhones = phones.filter(p => {
    const matchesSearch = p.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.imei.includes(searchTerm) ||
                          p.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition = filterCondition === 'ALL' || p.condition === filterCondition;
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
    return matchesSearch && matchesCondition && matchesStatus;
  });

  const handleCreatePhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !imei || !costPrice || !sellPrice) {
      toast.warning('بيانات غير مكتملة', 'من فضلك أكمل البيانات الأساسية للجهاز!');
      return;
    }

    addPhone({
      brand,
      model,
      color,
      storage,
      batteryHealth: batteryHealth !== '' ? Number(batteryHealth) : undefined,
      condition,
      imei,
      costPrice: Number(costPrice),
      sellPrice: Number(sellPrice),
      notes,
      sellerName: condition === 'USED' ? sellerName : undefined,
      sellerNationalId: condition === 'USED' ? sellerNationalId : undefined,
      sellerPhone: condition === 'USED' ? sellerPhone : undefined
    });

    setShowAddModal(false);
    toast.success('تمت إضافة الجهاز', `تم إدراج ${brand} ${model} بنجاح بالمخزن`);

    if (condition === 'USED' && sellerName && sellerNationalId) {
      const createdPhone: PhoneDevice = {
        id: `p-new`,
        brand,
        model,
        color,
        storage,
        batteryHealth: batteryHealth !== '' ? Number(batteryHealth) : undefined,
        condition: 'USED',
        imei,
        costPrice: Number(costPrice),
        sellPrice: Number(sellPrice),
        status: 'AVAILABLE',
        purchaseDate: new Date().toISOString().split('T')[0],
        sellerName,
        sellerNationalId,
        sellerPhone,
        notes
      };
      setActivePrintDocument({ type: 'CONTRACT', data: createdPhone });
    }

    setModel(''); setImei(''); setCostPrice(''); setSellPrice(''); setNotes(''); setSellerName(''); setSellerNationalId(''); setSellerPhone('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header & Quick Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smartphone color="#fbbf24" /> إدارة الأجهزة والتلفونات (سجل السيريال والـ IMEI)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            تسجيل الأجهزة الجديدة والمستعملة وعمل مبايعة رسمية بالرقم القومي
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> إضافة جهاز جديد / مستعمل
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: 12 }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingRight: 38 }}
            placeholder="ابحث بالـ IMEI، الموديل، الماركة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>الحالة:</span>
          <select className="input-field" style={{ width: 'auto' }} value={filterCondition} onChange={(e: any) => setFilterCondition(e.target.value)}>
            <option value="ALL">الكل (جديد ومستعمل)</option>
            <option value="NEW">جديد زيرو 🆕</option>
            <option value="USED">مستعمل 📱</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>التوفر:</span>
          <select className="input-field" style={{ width: 'auto' }} value={filterStatus} onChange={(e: any) => setFilterStatus(e.target.value)}>
            <option value="AVAILABLE">المتاح بالمحل فقط</option>
            <option value="SOLD">المباع فقط</option>
            <option value="ALL">جميع الأجهزة</option>
          </select>
        </div>
      </div>

      {/* Phones Data Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>الجهاز والموديل</th>
              <th>الـ IMEI / السيريال</th>
              <th>الحالة والبطارية</th>
              <th>المساحة واللون</th>
              {currentUser.role === 'ADMIN' && <th>سعر الشراء</th>}
              <th>سعر البيع</th>
              <th>توفر الجهاز</th>
              <th>الإجراءات / عقد الشراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredPhones.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  لا توجد أجهزة مطابقة للبحث حالياً
                </td>
              </tr>
            ) : (
              filteredPhones.map(phone => (
                <tr key={phone.id}>
                  <td>
                    <div style={{ fontWeight: 800, color: '#fff' }}>{phone.brand} {phone.model}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>تاريخ الإضافة: {phone.purchaseDate}</div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4, direction: 'ltr', display: 'inline-block' }}>
                      {phone.imei}
                    </span>
                  </td>
                  <td>
                    {phone.condition === 'NEW' ? (
                      <span className="badge badge-emerald">جديد زيرو</span>
                    ) : (
                      <span className="badge badge-gold">
                        مستعمل {phone.batteryHealth ? `(${phone.batteryHealth}%)` : ''}
                      </span>
                    )}
                  </td>
                  <td>
                    {phone.storage} - {phone.color}
                  </td>
                  {currentUser.role === 'ADMIN' && (
                    <td style={{ color: 'var(--text-muted)' }}>{phone.costPrice.toLocaleString('ar-EG')} ج.م</td>
                  )}
                  <td style={{ fontWeight: 800, color: '#fbbf24' }}>
                    {phone.sellPrice.toLocaleString('ar-EG')} ج.م
                  </td>
                  <td>
                    {phone.status === 'AVAILABLE' && <span className="badge badge-emerald">متاح للبيع</span>}
                    {phone.status === 'SOLD' && <span className="badge badge-rose">مباع</span>}
                    {phone.status === 'TRADED_IN' && <span className="badge badge-indigo">مستبدل</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {phone.status === 'AVAILABLE' && (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => onNavigateToPOS(phone.imei)}
                        >
                          بيع الجهاز
                        </button>
                      )}
                      {phone.condition === 'USED' && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => setActivePrintDocument({ type: 'CONTRACT', data: phone })}
                          title="طباعة عقد مبايعة بالرقم القومي"
                        >
                          <FileText size={14} /> عقد المبايعة
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <h3 style={{ marginBottom: '1.2rem', color: 'var(--accent-gold)' }}>
              تسجيل جهاز جديد / مستعمل بـ الـ IMEI
            </h3>
            <form onSubmit={handleCreatePhone} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>الماركة / الشركة</label>
                  <select className="input-field" value={brand} onChange={e => setBrand(e.target.value)}>
                    <option value="Apple">أبل (iPhone)</option>
                    <option value="Samsung">سامسونج (Samsung)</option>
                    <option value="Xiaomi">شاومي / ريدمي (Xiaomi)</option>
                    <option value="Oppo">أوبو (Oppo)</option>
                    <option value="Realme">ريلمي (Realme)</option>
                    <option value="Vivo">فيفو (Vivo)</option>
                    <option value="Honor">هونر (Honor)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>اسم الموديل الكامل</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="مثال: iPhone 15 Pro Max"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>اللون</label>
                  <input type="text" className="input-field" placeholder="أسود، تيتانيوم..." value={color} onChange={e => setColor(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>المساحة</label>
                  <select className="input-field" value={storage} onChange={e => setStorage(e.target.value)}>
                    <option value="64GB">64GB</option>
                    <option value="128GB">128GB</option>
                    <option value="256GB">256GB</option>
                    <option value="512GB">512GB</option>
                    <option value="1TB">1TB</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>حالة الجهاز</label>
                  <select className="input-field" value={condition} onChange={e => setCondition(e.target.value as PhoneCondition)}>
                    <option value="NEW">جديد بالكرتونة (زيرو)</option>
                    <option value="USED">مستعمل</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>رقم الـ IMEI / السيريال</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="أدخل 15 رقم الخاص بالـ IMEI"
                    value={imei}
                    onChange={e => setImei(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>نسبة البطارية %</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="مثال: 92"
                    value={batteryHealth}
                    onChange={e => setBatteryHealth(e.target.value !== '' ? Number(e.target.value) : '')}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>تكلفة الشراء علي المحل (ج.م)</label>
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
                    placeholder="سعر البيع المعروض"
                    value={sellPrice}
                    onChange={e => setSellPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                    required
                  />
                </div>
              </div>

              {condition === 'USED' && (
                <div style={{ background: 'rgba(245,158,11,0.08)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#fbbf24', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Shield size={16} /> بيانات البائع لحفظ حقوق المحل (طباعة المبايعة)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.2rem' }}>اسم البائع الرباعي</label>
                      <input type="text" className="input-field" placeholder="اسم البائع" value={sellerName} onChange={e => setSellerName(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.2rem' }}>الرقم القومي (14 رقم)</label>
                      <input type="text" className="input-field" placeholder="298..." value={sellerNationalId} onChange={e => setSellerNationalId(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.2rem' }}>رقم التليفون</label>
                      <input type="text" className="input-field" placeholder="010..." value={sellerPhone} onChange={e => setSellerPhone(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>ملاحظات الجهاز</label>
                <input type="text" className="input-field" placeholder="حالة الكرتونة، خدوش، ضمان..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ الجهاز بالمخزن</button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
