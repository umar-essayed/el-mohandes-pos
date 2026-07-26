import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { ShiftModal } from '../Shift/ShiftModal';
import { PhoneDevice, InventoryItem } from '../../types';
import { ShoppingCart, Barcode, Trash2, Zap, X, ChevronUp, Clock, CreditCard } from 'lucide-react';

interface CartItem {
  itemId: string;
  type: 'PHONE' | 'ACCESSORY';
  name: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  imei?: string;
  maxStock?: number;
}

export const POSView: React.FC<{ initialImei?: string }> = ({ initialImei }) => {
  const { phones, inventory, wallets, createInvoice, currentUser, currentShift, setActivePrintDocument, creditCustomers } = useApp();
  const toast = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState(initialImei || '');
  const [activeCategory, setActiveCategory] = useState<string>('الكل');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showMobileCartModal, setShowMobileCartModal] = useState(false);
  const [showShiftPromptModal, setShowShiftPromptModal] = useState(false);

  const [customerName, setCustomerName] = useState('زبون عام');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState<number | ''>(0);
  const [paidCash, setPaidCash] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'WALLET' | 'CREDIT'>('CASH');
  const [selectedWalletId, setSelectedWalletId] = useState(wallets[0]?.id || '');
  const [selectedCreditCustomerId, setSelectedCreditCustomerId] = useState('');

  useEffect(() => {
    searchInputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        const submitBtn = document.getElementById('pos-checkout-btn');
        submitBtn?.click();
      } else if (e.key === 'F8') {
        e.preventDefault();
        setCart([]);
        toast.info('تم تفريغ السلة');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (initialImei) {
      const foundPhone = phones.find(p => p.imei === initialImei && p.status === 'AVAILABLE');
      if (foundPhone) addToCartPhone(foundPhone);
    }
  }, [initialImei]);

  const availablePhones = phones.filter(p => p.status === 'AVAILABLE');

  const filteredAccessories = inventory.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.barcode.includes(searchQuery);
    const matchCat = activeCategory === 'الكل' || activeCategory === 'إكسسوارات' || i.category === activeCategory;
    return matchSearch && matchCat;
  });

  const filteredPhones = availablePhones.filter(p => {
    const matchSearch = p.model.toLowerCase().includes(searchQuery.toLowerCase()) || p.imei.includes(searchQuery) || p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCategory === 'الكل' || activeCategory === 'تلفونات';
    return matchSearch && matchCat;
  });

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      e.preventDefault();
      // If exactly 1 accessory or phone matches, add it immediately
      if (filteredAccessories.length === 1 && filteredPhones.length === 0) {
        addToCartAccessory(filteredAccessories[0]);
      } else if (filteredPhones.length === 1 && filteredAccessories.length === 0) {
        addToCartPhone(filteredPhones[0]);
      } else {
        const exactBarcodeAcc = filteredAccessories.find(a => a.barcode === searchQuery.trim());
        if (exactBarcodeAcc) {
          addToCartAccessory(exactBarcodeAcc);
          return;
        }
        const exactImeiPhone = filteredPhones.find(p => p.imei === searchQuery.trim());
        if (exactImeiPhone) {
          addToCartPhone(exactImeiPhone);
          return;
        }
      }
    }
  };

  const addToCartAccessory = (acc: InventoryItem) => {
    const existing = cart.find(c => c.itemId === acc.id && c.type === 'ACCESSORY');
    if (existing) {
      if (existing.quantity >= acc.stockQuantity) { toast.warning('المخزون نفد'); return; }
      setCart(cart.map(c => c.itemId === acc.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if (acc.stockQuantity < 1) { toast.warning('صنف غير متوفر بالمخزن'); return; }
      setCart([...cart, { itemId: acc.id, type: 'ACCESSORY', name: acc.name, unitPrice: acc.sellPrice, costPrice: acc.costPrice, quantity: 1, maxStock: acc.stockQuantity }]);
    }
    setSearchQuery('');
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const addToCartPhone = (phone: PhoneDevice) => {
    if (cart.find(c => c.itemId === phone.id)) { toast.warning('هاتف مضاف بالفعل'); return; }
    setCart([...cart, { itemId: phone.id, type: 'PHONE', name: `${phone.brand} ${phone.model} (${phone.storage})`, unitPrice: phone.sellPrice, costPrice: phone.costPrice, quantity: 1, imei: phone.imei }]);
    setSearchQuery('');
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.itemId === itemId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null as any;
        if (item.maxStock && newQty > item.maxStock) { toast.warning('حد المخزون المتاح'); return item; }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (itemId: string) => setCart(cart.filter(c => c.itemId !== itemId));

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const numDiscount = Number(discount || 0);
  const finalTotal = Math.max(0, subtotal - numDiscount);
  const numPaidCash = Number(paidCash || 0);
  const changeDue = Math.max(0, numPaidCash - finalTotal);

  const handleLightningCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift || currentShift.status !== 'OPEN') {
      setShowShiftPromptModal(true);
      toast.warning('افتتاح الشيفت أولاً ⏱️');
      return;
    }
    if (cart.length === 0) { toast.warning('السلة فارغة'); return; }
    if (paymentMethod === 'CREDIT' && !selectedCreditCustomerId) {
      toast.warning('اختر العميل الآجل أولاً 📋');
      return;
    }

    const paymentSplit = {
      cashAmount: paymentMethod === 'CASH' ? finalTotal : 0,
      walletAmount: paymentMethod === 'WALLET' ? finalTotal : 0,
      walletId: paymentMethod === 'WALLET' ? (selectedWalletId || wallets[0]?.id) : undefined,
      creditAmount: paymentMethod === 'CREDIT' ? finalTotal : 0,
      creditCustomerId: paymentMethod === 'CREDIT' ? selectedCreditCustomerId : undefined
    };

    const createdInvoice = createInvoice(cart, customerName, customerPhone, numDiscount, paymentSplit);
    setActivePrintDocument({ type: 'INVOICE', data: createdInvoice });
    toast.success(`فاتورة #${createdInvoice.invoiceNumber} ⚡`, `${paymentMethod === 'CREDIT' ? 'آجل' : 'تم الدفع'}: ${finalTotal.toLocaleString('ar-EG')} ج.م`);

    setCart([]);
    setDiscount(0);
    setCustomerName('زبون عام');
    setCustomerPhone('');
    setSelectedCreditCustomerId('');
    setShowMobileCartModal(false);
    searchInputRef.current?.focus();
  };

  const renderCartContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {(!currentShift || currentShift.status !== 'OPEN') && (
        <div onClick={() => setShowShiftPromptModal(true)} style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.5rem', borderRadius: 8, fontSize: '0.78rem', color: '#fbbf24', fontWeight: 800, marginBottom: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={16} /> تنبيه: الشيفت مغلق! اضغط لافتتاح الشيفت وبدء البيع
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ShoppingCart size={18} color="#f59e0b" /> الفاتورة ({cart.length})
        </h3>
        {cart.length > 0 && <button onClick={() => setCart([])} style={{ background: 'transparent', border: 'none', color: '#f43f5e', fontSize: '0.75rem', cursor: 'pointer' }}>تفريغ 🗑️</button>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.6rem', maxHeight: '280px' }}>
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>اضغط على أي صنف لإضافته فوراً ⚡</div>
        ) : (
          cart.map(item => (
            <div key={item.itemId} style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.5rem 0.7rem', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, paddingLeft: 6 }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff' }}>{item.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#fbbf24' }}>{item.unitPrice} × {item.quantity} = {(item.quantity * item.unitPrice).toLocaleString('ar-EG')} ج.م</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {item.type === 'ACCESSORY' && (
                  <><button className="btn btn-secondary" style={{ padding: '1px 5px', fontSize: '0.75rem' }} onClick={() => updateQuantity(item.itemId, -1)}>-</button>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{item.quantity}</span>
                  <button className="btn btn-secondary" style={{ padding: '1px 5px', fontSize: '0.75rem' }} onClick={() => updateQuantity(item.itemId, 1)}>+</button></>
                )}
                <button onClick={() => removeFromCart(item.itemId)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: 2 }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleLightningCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
        {/* Payment Method Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem' }}>
          {[
            { id: 'CASH', label: '💵 كاش', color: '#10b981', bg: 'rgba(16,185,129,0.2)' },
            { id: 'WALLET', label: '📲 محفظة', color: '#6366f1', bg: 'rgba(99,102,241,0.2)' },
            { id: 'CREDIT', label: '📋 آجل', color: '#f59e0b', bg: 'rgba(245,158,11,0.2)' }
          ].map(pm => (
            <button key={pm.id} type="button" onClick={() => setPaymentMethod(pm.id as any)}
              style={{ padding: '0.4rem', borderRadius: 8, border: paymentMethod === pm.id ? `1px solid ${pm.color}` : '1px solid var(--border-color)', background: paymentMethod === pm.id ? pm.bg : 'rgba(15,23,42,0.6)', color: paymentMethod === pm.id ? pm.color : 'var(--text-muted)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
              {pm.label}
            </button>
          ))}
        </div>

        {/* Credit Customer Selector */}
        {paymentMethod === 'CREDIT' && (
          <div>
            {creditCustomers.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: '#fda4af', padding: '0.4rem', background: 'rgba(244,63,94,0.1)', borderRadius: 8 }}>
                ⚠️ لا يوجد عملاء آجل - أضف عميلاً من صفحة الآجل أولاً
              </div>
            ) : (
              <select className="input-field" style={{ fontSize: '0.85rem' }} value={selectedCreditCustomerId} onChange={e => setSelectedCreditCustomerId(e.target.value)} required>
                <option value="">-- اختر العميل الآجل --</option>
                {creditCustomers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (دين: {c.remainingDebt.toLocaleString('ar-EG')} ج.م)</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
          <input type="number" className="input-field" style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem' }} placeholder="الخصم (ج.م)" value={discount} onChange={e => setDiscount(e.target.value !== '' ? Number(e.target.value) : '')} />
          <input type="text" className="input-field" style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem' }} placeholder="تليفون (اختياري)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
        </div>

        {paymentMethod === 'CASH' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', background: 'rgba(16,185,129,0.08)', padding: '0.4rem', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: 2 }}>المدفوع نقدياً (ج.م):</label>
              <input type="number" className="input-field" style={{ padding: '0.3rem 0.5rem', fontSize: '0.82rem', height: '34px' }} placeholder="المدفوع..." value={paidCash} onChange={e => setPaidCash(e.target.value !== '' ? Number(e.target.value) : '')} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: 2 }}>الباقي للزبون:</label>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: numPaidCash >= finalTotal ? '#34d399' : '#fda4af', paddingTop: 4 }}>
                {numPaidCash > 0 ? `${changeDue.toLocaleString('ar-EG')} ج.م` : '0 ج.م'}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: paymentMethod === 'CREDIT' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', padding: '0.6rem 0.8rem', borderRadius: 8 }}>
          <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>{paymentMethod === 'CREDIT' ? 'إجمالي الآجل:' : 'الصافي المطلوب:'}</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: paymentMethod === 'CREDIT' ? '#fbbf24' : '#34d399' }}>{finalTotal.toLocaleString('ar-EG')} ج.م</span>
        </div>

        <button id="pos-checkout-btn" type="submit" className={paymentMethod === 'CREDIT' ? 'btn btn-primary' : 'btn btn-emerald'}
          style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Zap size={20} fill="#fff" /> {paymentMethod === 'CREDIT' ? 'تسجيل بالآجل (F4)' : 'دفع وطباعة الفاتورة ⚡ (F4)'}
        </button>
      </form>
    </div>
  );

  return (
    <div className="pos-grid-container" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1rem', height: 'calc(100vh - 110px)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto' }}>
        <div style={{ position: 'relative' }}>
          <Barcode size={22} color="#fbbf24" style={{ position: 'absolute', right: 14, top: 12 }} />
          <input ref={searchInputRef} type="text" className="input-field"
            style={{ paddingRight: 46, fontSize: '1.05rem', padding: '0.75rem 2.8rem 0.75rem 1rem', border: '2px solid rgba(245,158,11,0.3)', background: '#0f172a' }}
            placeholder="امسح الباركود أو ابحث باسم السلعة / الـ IMEI... (F2)"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown} />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: 4 }}>
          {['الكل', 'تلفونات', 'إكسسوارات', 'جرابات', 'شواحن', 'كابلات', 'سماعات', 'شاشات وحماية'].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{ padding: '0.4rem 0.85rem', borderRadius: 9999, border: activeCategory === cat ? '1px solid #10b981' : '1px solid var(--border-color)', background: activeCategory === cat ? 'rgba(16,185,129,0.2)' : 'rgba(15,23,42,0.6)', color: activeCategory === cat ? '#34d399' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
          {filteredPhones.map(phone => (
            <div key={phone.id} onClick={() => addToCartPhone(phone)}
              style={{ cursor: 'pointer', padding: '0.8rem', borderRadius: 12, background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', flexDirection: 'column' }}>
              <span className="badge badge-gold" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>📱 {phone.condition === 'NEW' ? 'جديد' : 'مستعمل'}</span>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.85rem', marginTop: 4 }}>{phone.brand} {phone.model}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{phone.storage} - {phone.color}</div>
              <div style={{ fontWeight: 900, color: '#fbbf24', fontSize: '1rem', marginTop: 8, textAlign: 'left' }}>{phone.sellPrice.toLocaleString('ar-EG')} ج.م</div>
            </div>
          ))}
          {filteredAccessories.map(acc => (
            <div key={acc.id} onClick={() => addToCartAccessory(acc)}
              style={{ cursor: 'pointer', padding: '0.8rem', borderRadius: 12, background: 'rgba(21,28,44,0.85)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{acc.category}</span>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.83rem', margin: '2px 0' }}>{acc.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: '0.7rem', color: acc.stockQuantity > 2 ? '#34d399' : '#fda4af' }}>متبقي {acc.stockQuantity}</span>
                <span style={{ fontWeight: 900, color: '#fbbf24', fontSize: '0.98rem' }}>{acc.sellPrice.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card pos-cart-panel" style={{ padding: '0.9rem', height: '100%' }}>{renderCartContent()}</div>

      {cart.length > 0 && (
        <div className="mobile-only" style={{ position: 'fixed', bottom: '68px', left: '0.85rem', right: '0.85rem', zIndex: 890, background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: 12, padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 20px rgba(16,185,129,0.35)', cursor: 'pointer' }}
          onClick={() => setShowMobileCartModal(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontWeight: 800, fontSize: '0.88rem' }}><ShoppingCart size={18} /><span>السلة ({cart.length})</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff', fontWeight: 900, fontSize: '1rem' }}><span>{finalTotal.toLocaleString('ar-EG')} ج.م</span><ChevronUp size={16} /></div>
        </div>
      )}

      {showMobileCartModal && (
        <div className="modal-overlay" style={{ alignItems: 'flex-end', padding: 0 }}>
          <div className="modal-content" style={{ borderRadius: '24px 24px 0 0', maxHeight: '90vh', width: '100%', maxWidth: 'none', padding: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#fbbf24' }}>استكمال ومراجعة الفاتورة 🛒</h3>
              <button onClick={() => setShowMobileCartModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {renderCartContent()}
          </div>
        </div>
      )}

      <ShiftModal isOpen={showShiftPromptModal} onClose={() => setShowShiftPromptModal(false)} />
    </div>
  );
};
