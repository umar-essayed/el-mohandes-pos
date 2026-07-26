import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { ShiftModal } from '../Shift/ShiftModal';
import { BarChart3, Plus, DollarSign, Wallet, CreditCard, Users, Clock } from 'lucide-react';

export const FinanceView: React.FC = () => {
  const { expenses, addExpense, suppliers, addSupplier, addSupplierPayment, invoices, walletTransactions, shifts, currentShift } = useApp();
  const toast = useToast();

  const [showShiftPromptModal, setShowShiftPromptModal] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'PL' | 'EXPENSES' | 'SUPPLIERS' | 'SHIFTS'>('PL');

  // Expense Modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<'RENT' | 'ELECTRICITY' | 'SALARIES' | 'FOOD_DRINKS' | 'MAINTENANCE_TOOLS' | 'OTHER'>('FOOD_DRINKS');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseNotes, setExpenseNotes] = useState('');

  // Supplier Payment Modal
  const [showSupplierModal, setShowSupplierModal] = useState<string | null>(null);
  const [supplierPayAmount, setSupplierPayAmount] = useState<number | ''>('');

  // Add Supplier Modal
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [supCompanyName, setSupCompanyName] = useState('');
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supNotes, setSupNotes] = useState('');

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount) return;

    // STRICT SHIFT CHECK
    if (!currentShift || currentShift.status !== 'OPEN') {
      setShowShiftPromptModal(true);
      toast.warning('افتتاح الشيفت أولاً ⏱️', 'يجب افتتاح الشيفت لتسجيل المصروفات!');
      return;
    }

    addExpense({
      title: expenseTitle,
      category: expenseCategory,
      amount: Number(expenseAmount),
      notes: expenseNotes
    });

    setShowExpenseModal(false);
    toast.success('تم تسجيل المصروف', `خصم ${expenseAmount} ج.م من الدرج`);
    setExpenseTitle(''); setExpenseAmount(''); setExpenseNotes('');
  };

  const handlePaySupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSupplierModal || !supplierPayAmount) return;

    addSupplierPayment(showSupplierModal, Number(supplierPayAmount));
    setShowSupplierModal(null);
    toast.success('تسديد المورد', `تم دفع ${supplierPayAmount} ج.م للمورد`);
    setSupplierPayAmount('');
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supCompanyName || !supName || !supPhone) return;

    addSupplier({
      companyName: supCompanyName,
      name: supName,
      phone: supPhone,
      address: supAddress || undefined,
      notes: supNotes || undefined
    });

    setShowAddSupplierModal(false);
    toast.success('تم إضافة المورد بنجاح ✅');
    setSupCompanyName(''); setSupName(''); setSupPhone(''); setSupAddress(''); setSupNotes('');
  };

  const totalSalesRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalSalesCost = invoices.reduce((sum, inv) => {
    return sum + inv.items.reduce((s, i) => s + (i.costPrice * i.quantity), 0);
  }, 0);
  const totalSalesProfit = totalSalesRevenue - totalSalesCost;
  const totalWalletCommissions = walletTransactions.reduce((sum, tx) => sum + tx.netStoreProfit, 0);
  const totalExpensesAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfitTotal = (totalSalesProfit + totalWalletCommissions) - totalExpensesAmount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Header & Mobile-Scrollable Sub-tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <BarChart3 color="#a855f7" size={20} /> الحسابات والتقارير المالية
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            صافي الأرباح، تقارير الشيفتات، المصروفات، والديون
          </p>
        </div>

        {/* Scrollable Sub-tabs Pill Bar */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: 4 }}>
          <button
            className={`btn ${activeSubTab === 'PL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
            onClick={() => setActiveSubTab('PL')}
          >
            📊 تقرير الأرباح (P&L)
          </button>
          <button
            className={`btn ${activeSubTab === 'EXPENSES' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
            onClick={() => setActiveSubTab('EXPENSES')}
          >
            💸 المصروفات والنثريات
          </button>
          <button
            className={`btn ${activeSubTab === 'SUPPLIERS' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
            onClick={() => setActiveSubTab('SUPPLIERS')}
          >
            🤝 الموردين والآجل
          </button>
          <button
            className={`btn ${activeSubTab === 'SHIFTS' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
            onClick={() => setActiveSubTab('SHIFTS')}
          >
            ⏱️ تقفيل الشيفتات
          </button>
        </div>
      </div>

      {/* 1. Profit & Loss Tab */}
      {activeSubTab === 'PL' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem' }}>
            <div className="card" style={{ borderRight: '4px solid #34d399', padding: '0.8rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>أرباح البضائع</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399', marginTop: 2 }}>
                {totalSalesProfit.toLocaleString('ar-EG')} ج.م
              </div>
            </div>

            <div className="card" style={{ borderRight: '4px solid #818cf8', padding: '0.8rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>أرباح المحافظ</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#818cf8', marginTop: 2 }}>
                {totalWalletCommissions.toLocaleString('ar-EG')} ج.م
              </div>
            </div>

            <div className="card" style={{ borderRight: '4px solid #fda4af', padding: '0.8rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>إجمالي المصروفات</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fda4af', marginTop: 2 }}>
                {totalExpensesAmount.toLocaleString('ar-EG')} ج.م
              </div>
            </div>

            <div className="card" style={{ borderRight: '4px solid #fbbf24', background: 'rgba(245,158,11,0.08)', padding: '0.8rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fbbf24' }}>صافي الأرباح الكلي</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24', marginTop: 2 }}>
                {netProfitTotal.toLocaleString('ar-EG')} ج.م
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '0.9rem' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff', marginBottom: '0.6rem' }}>
              معادلة حساب صافي الأرباح
            </h3>
            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '0.8rem', borderRadius: 10, lineHeight: 1.7, fontSize: '0.82rem' }}>
              <div>➕ أرباح مبيعات التلفونات والإكسسوارات: <strong>{totalSalesProfit.toLocaleString('ar-EG')} ج.م</strong></div>
              <div>➕ عمولات خدمات التحويل والسحب: <strong>{totalWalletCommissions.toLocaleString('ar-EG')} ج.م</strong></div>
              <div style={{ borderBottom: '1px dashed var(--border-color)', paddingBottom: 4 }}>
                ➖ المصروفات النثرية والعمومية: <strong>{totalExpensesAmount.toLocaleString('ar-EG')} ج.م</strong>
              </div>
              <div style={{ paddingTop: 6, fontSize: '1rem', color: '#34d399', fontWeight: 800 }}>
                = الصافي النهائي: {netProfitTotal.toLocaleString('ar-EG')} ج.م
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 2. Expenses Tab */}
      {activeSubTab === 'EXPENSES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff' }}>سجل المصروفات والنثريات</h3>
            <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              <Plus size={16} /> مصروف جديد
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>البند</th>
                  <th>التصنيف</th>
                  <th>المبلغ</th>
                  <th>المسؤول</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>لا توجد مصروفات مسجلة</td>
                  </tr>
                ) : (
                  expenses.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{e.date}</td>
                      <td style={{ fontWeight: 700, color: '#fff' }}>{e.title}</td>
                      <td><span className="badge badge-rose">{e.category}</span></td>
                      <td style={{ fontWeight: 800, color: '#fda4af' }}>{e.amount.toLocaleString('ar-EG')} ج.م</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{e.loggedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Suppliers Tab */}
      {activeSubTab === 'SUPPLIERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff' }}>حسابات الشركات والموردين والديون</h3>
            <button className="btn btn-primary" onClick={() => setShowAddSupplierModal(true)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              <Plus size={16} /> إضافة مورد
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.8rem' }}>
            {suppliers.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', width: '100%', color: 'var(--text-muted)' }}>
                لا يوجد موردين مسجلين حالياً. اضغط "إضافة مورد" للبدء.
              </div>
            ) : (
              suppliers.map(s => (
                <div key={s.id} className="card" style={{ borderRight: '4px solid #a855f7', padding: '0.85rem' }}>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>{s.companyName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.name} ({s.phone})</div>
                  
                  <div style={{ margin: '0.6rem 0', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: 8, fontSize: '0.78rem' }}>
                    <div>إجمالي المدفوع: {(s.totalPaid || 0).toLocaleString('ar-EG')} ج.م</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#c084fc', marginTop: 2 }}>
                      المتبقي ديون: {(s.remainingDebt || 0).toLocaleString('ar-EG')} ج.م
                    </div>
                  </div>

                  {s.remainingDebt > 0 && (
                    <button className="btn btn-indigo" style={{ padding: '0.45rem', fontSize: '0.78rem', width: '100%' }} onClick={() => setShowSupplierModal(s.id)}>
                      تسديد دفعة مالية
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. Shifts Tab */}
      {activeSubTab === 'SHIFTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff' }}>تقارير تقفيل الشيفتات</h3>
          
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الشيفت</th>
                  <th>الكاشير</th>
                  <th>البدء</th>
                  <th>بداية الكاش</th>
                  <th>الكاش المتوقع</th>
                  <th>الفعلي بالدرج</th>
                  <th>العجز / الزيادة</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 800, color: '#fbbf24' }}>#{s.shiftNumber}</td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{s.cashierName}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.startTime}</td>
                    <td>{s.initialDrawerCash.toLocaleString('ar-EG')} ج.م</td>
                    <td style={{ fontWeight: 700 }}>{s.expectedDrawerCash.toLocaleString('ar-EG')} ج.م</td>
                    <td>{s.actualDrawerCash !== undefined ? `${s.actualDrawerCash.toLocaleString('ar-EG')} ج.م` : '-'}</td>
                    <td>
                      {s.cashDifference !== undefined ? (
                        s.cashDifference === 0 ? (
                          <span className="badge badge-emerald">مطابق</span>
                        ) : s.cashDifference > 0 ? (
                          <span className="badge badge-indigo">+{s.cashDifference}</span>
                        ) : (
                          <span className="badge badge-rose">{s.cashDifference}</span>
                        )
                      ) : <span className="badge badge-emerald">مستمر الآن</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>تسجيل مصروف جديد</h3>
            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>عنوان المصروف</label>
                <input type="text" className="input-field" placeholder="مثال: فاتورة كهرباء" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>التصنيف</label>
                  <select className="input-field" value={expenseCategory} onChange={(e: any) => setExpenseCategory(e.target.value)}>
                    <option value="FOOD_DRINKS">مأكولات ومشروبات</option>
                    <option value="ELECTRICITY">كهرباء ومرافق</option>
                    <option value="RENT">إيجار المحل</option>
                    <option value="SALARIES">رواتب وسلف</option>
                    <option value="MAINTENANCE_TOOLS">مستلزمات صيانة</option>
                    <option value="OTHER">نثريات أخرى</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>المبلغ المخصوم (ج.م)</label>
                  <input type="number" className="input-field" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value !== '' ? Number(e.target.value) : '')} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ المصروف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {showSupplierModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem', color: '#c084fc' }}>تسديد دفعة لمورد</h3>
            <form onSubmit={handlePaySupplier} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>المبلغ المسدد (ج.م)</label>
                <input type="number" className="input-field" value={supplierPayAmount} onChange={e => setSupplierPayAmount(e.target.value !== '' ? Number(e.target.value) : '')} required />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSupplierModal(null)}>إلغاء</button>
                <button type="submit" className="btn btn-indigo">تأكيد التسديد</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem', color: '#fbbf24' }}>إضافة مورد جديد 🤝</h3>
            <form onSubmit={handleAddSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>اسم الشركة/المحل *</label>
                <input type="text" className="input-field" placeholder="شركة الرواد للتوزيع" value={supCompanyName} onChange={e => setSupCompanyName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>اسم المندوب/المورد *</label>
                  <input type="text" className="input-field" placeholder="أحمد سعيد" value={supName} onChange={e => setSupName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>التليفون *</label>
                  <input type="tel" className="input-field" placeholder="010..." value={supPhone} onChange={e => setSupPhone(e.target.value)} required />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>العنوان</label>
                <input type="text" className="input-field" placeholder="اختياري" value={supAddress} onChange={e => setSupAddress(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>ملاحظات</label>
                <input type="text" className="input-field" placeholder="مثال: مورد إكسسوارات الجملة الرئيسي" value={supNotes} onChange={e => setSupNotes(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddSupplierModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">إضافة المورد</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHIFT OPEN PROMPT MODAL */}
      <ShiftModal isOpen={showShiftPromptModal} onClose={() => setShowShiftPromptModal(false)} />

    </div>
  );
};
