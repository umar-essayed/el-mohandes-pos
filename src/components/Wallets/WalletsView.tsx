import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { ShiftModal } from '../Shift/ShiftModal';
import { WalletTxType, DigitalWallet } from '../../types';
import { Send, ArrowDownLeft, ArrowUpRight, Plus, Smartphone, Wallet, X, Zap, Clock } from 'lucide-react';

export const WalletsView: React.FC = () => {
  const { wallets, walletTransactions, addWallet, executeWalletTransaction, storeSettings, currentShift } = useApp();
  const toast = useToast();

  const [showTxModal, setShowTxModal] = useState(false);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [showShiftPromptModal, setShowShiftPromptModal] = useState(false);

  // Fast Transaction Form (2 Primary Fields Only!)
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [txType, setTxType] = useState<WalletTxType>('SEND');
  const [amount, setAmount] = useState<number | ''>(1000);
  const [targetPhone, setTargetPhone] = useState('');

  // Add Wallet Form
  const [walletName, setWalletName] = useState('');
  const [provider, setProvider] = useState<'VODAFONE_CASH' | 'INSTAPAY' | 'ORANGE_CASH' | 'ETISALAT_CASH'>('VODAFONE_CASH');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState<number | ''>(10000);
  const [dailyLimit, setDailyLimit] = useState<number | ''>(storeSettings.defaultDailyLimit);
  const [monthlyLimit, setMonthlyLimit] = useState<number | ''>(storeSettings.defaultMonthlyLimit);

  // Filters for History Ledger
  const [filterWallet, setFilterWallet] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    if (wallets.length > 0 && (!selectedWalletId || !wallets.some(w => w.id === selectedWalletId))) {
      setSelectedWalletId(wallets[0].id);
    }
  }, [wallets, selectedWalletId]);

  const activeWallet = wallets.find(w => w.id === selectedWalletId) || wallets[0];

  const getWalletStats = (walletId: string) => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayLocaleStr = now.toLocaleDateString('ar-EG');

    const walletTxs = walletTransactions.filter(t => t.walletId === walletId);
    
    const dailyUsed = walletTxs.filter(t => {
      return t.date.includes(todayLocaleStr) || t.date.startsWith(now.toISOString().split('T')[0]);
    }).reduce((sum, t) => sum + t.amount, 0);

    const monthlyUsed = walletTxs.filter(t => {
      return t.date.includes(currentMonthStr) || true;
    }).reduce((sum, t) => sum + t.amount, 0);

    return { dailyUsed, monthlyUsed };
  };

  const handleOpenTxModal = (type: WalletTxType) => {
    // STRICT SHIFT CHECK RULE!
    if (!currentShift || currentShift.status !== 'OPEN') {
      setShowShiftPromptModal(true);
      toast.warning('افتتاح الشيفت أولاً ⏱️', 'يجب افتتاح الشيفت وتأكيد الكاش بالدرج أولاً!');
      return;
    }

    setTxType(type);
    
    if (wallets.length === 0) {
      addWallet({
        name: 'فودافون كاش - الخط الرئيسي للمحل',
        provider: 'VODAFONE_CASH',
        phoneNumber: '01000000000',
        currentBalance: 50000,
        color: '#e60000',
        dailyLimit: storeSettings.defaultDailyLimit,
        monthlyLimit: storeSettings.defaultMonthlyLimit,
        sendCommissionPerThousand: storeSettings.defaultSendCommission,
        receiveCommissionPerThousand: storeSettings.defaultReceiveCommission
      });
    }

    const currentW = activeWallet || wallets[0];
    if (currentW) setSelectedWalletId(currentW.id);

    setAmount(1000);
    setTargetPhone('');
    setShowTxModal(true);
  };

  const handleExecuteTx = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentShift || currentShift.status !== 'OPEN') {
      setShowShiftPromptModal(true);
      toast.warning('افتح الشيفت أولاً ⏱️');
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast.warning('ادخل مبلغ صحيح');
      return;
    }

    const targetW = activeWallet || wallets[0];
    if (!targetW) {
      toast.error('لا توجد محفظة معرفة');
      return;
    }

    const { dailyUsed, monthlyUsed } = getWalletStats(targetW.id);
    const dLimit = targetW.dailyLimit || storeSettings.defaultDailyLimit;
    const mLimit = targetW.monthlyLimit || storeSettings.defaultMonthlyLimit;

    const remainingDaily = Math.max(0, dLimit - dailyUsed);
    const remainingMonthly = Math.max(0, mLimit - monthlyUsed);

    if (numAmount > remainingDaily) {
      toast.warning('تجاوز الليميت اليومي المتبقي');
      return;
    }

    if (numAmount > remainingMonthly) {
      toast.warning('تجاوز الليميت الشهري المتبقي');
      return;
    }

    const ratePerThousand = txType === 'SEND' 
      ? (targetW.sendCommissionPerThousand ?? storeSettings.defaultSendCommission)
      : (targetW.receiveCommissionPerThousand ?? storeSettings.defaultReceiveCommission);

    const custComm = Math.max(ratePerThousand, Math.ceil(numAmount / 1000) * ratePerThousand);
    const sysComm = 0;
    const netProfit = custComm - sysComm;

    const success = executeWalletTransaction({
      walletId: targetW.id,
      walletName: targetW.name,
      type: txType,
      amount: numAmount,
      targetPhone: targetPhone.trim() || 'غير محدد',
      customerCommission: custComm,
      systemCommission: sysComm,
      netStoreProfit: netProfit,
      notes: ''
    });

    if (success) {
      setShowTxModal(false);
      toast.success(`${txType === 'SEND' ? 'تحويل' : 'سحب'} ${numAmount.toLocaleString('ar-EG')} ج.م ⚡`, `العمولة: ${custComm} ج.م`);
      setTargetPhone('');
    } else {
      toast.error('تعذر إتمام العملية (الرصيد أو الكاش غير كافٍ)');
    }
  };

  const handleAddWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName) return;

    let color = '#e60000';
    if (provider === 'INSTAPAY') color = '#6366f1';
    if (provider === 'ORANGE_CASH') color = '#ff6600';
    if (provider === 'ETISALAT_CASH') color = '#76b900';

    addWallet({
      name: walletName,
      provider,
      phoneNumber: phoneNumber || '01000000000',
      currentBalance: Number(initialBalance || 0),
      color,
      dailyLimit: Number(dailyLimit || storeSettings.defaultDailyLimit),
      monthlyLimit: Number(monthlyLimit || storeSettings.defaultMonthlyLimit),
      sendCommissionPerThousand: storeSettings.defaultSendCommission,
      receiveCommissionPerThousand: storeSettings.defaultReceiveCommission
    });

    setShowAddWalletModal(false);
    toast.success('تمت إضافة خط المحفظة');
    setWalletName(''); setPhoneNumber('');
  };

  const filteredTxs = walletTransactions.filter(tx => {
    const matchW = filterWallet === 'ALL' || tx.walletId === filterWallet;
    const matchT = filterType === 'ALL' || tx.type === filterType;
    return matchW && matchT;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Top Main Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <button
          className="btn btn-indigo"
          onClick={() => handleOpenTxModal('SEND')}
          style={{ padding: '0.85rem', fontSize: '1.02rem', fontWeight: 900, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          <ArrowUpRight size={22} /> تحويل نقدية (Send)
        </button>

        <button
          className="btn btn-emerald"
          onClick={() => handleOpenTxModal('RECEIVE')}
          style={{ padding: '0.85rem', fontSize: '1.02rem', fontWeight: 900, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          <ArrowDownLeft size={22} /> سحب كاش (Receive)
        </button>
      </div>

      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Send color="#6366f1" size={18} /> خطوط فودافون كاش والانستا باي
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            التحويل: <strong style={{ color: '#818cf8' }}>{storeSettings.defaultSendCommission}ج/1000</strong> | السحب: <strong style={{ color: '#34d399' }}>{storeSettings.defaultReceiveCommission}ج/1000</strong>
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowAddWalletModal(true)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
          <Plus size={16} /> إضافة خط
        </button>
      </div>

      {/* Wallet Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
        {wallets.map(w => {
          const { dailyUsed, monthlyUsed } = getWalletStats(w.id);
          const dLimit = w.dailyLimit || storeSettings.defaultDailyLimit;
          const mLimit = w.monthlyLimit || storeSettings.defaultMonthlyLimit;
          const dailyRemaining = Math.max(0, dLimit - dailyUsed);
          const monthlyRemaining = Math.max(0, mLimit - monthlyUsed);

          return (
            <div
              key={w.id}
              className="card"
              style={{
                borderTop: `4px solid ${w.color}`,
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>{w.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.phoneNumber}</div>
                </div>
                <span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 6, fontSize: '0.7rem', color: w.color, fontWeight: 700 }}>
                  {w.provider}
                </span>
              </div>

              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: w.color }}>
                {w.currentBalance.toLocaleString('ar-EG')} ج.م
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: 10, fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: 'var(--text-muted)' }}>متبقي يومي:</span>
                    <strong style={{ color: dailyRemaining < 5000 ? '#fda4af' : '#34d399' }}>{dailyRemaining.toLocaleString('ar-EG')} ج.م</strong>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (dailyUsed / dLimit) * 100)}%`, background: dailyUsed / dLimit > 0.8 ? '#f43f5e' : '#10b981', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: 'var(--text-muted)' }}>متبقي شهري:</span>
                    <strong style={{ color: monthlyRemaining < 20000 ? '#fda4af' : '#fbbf24' }}>{monthlyRemaining.toLocaleString('ar-EG')} ج.م</strong>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (monthlyUsed / mLimit) * 100)}%`, background: monthlyUsed / mLimit > 0.8 ? '#f43f5e' : '#f59e0b', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* History Ledger */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff' }}>سجل التحويلات اليومي</h3>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <select className="input-field" style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.78rem' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="ALL">الكل</option>
              <option value="SEND">تحويل</option>
              <option value="RECEIVE">سحب</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>المحفظة</th>
                <th>العملية</th>
                <th>المبلغ</th>
                <th>التليفون</th>
                <th>العمولة المحصلة</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>لا توجد عمليات مسجلة</td>
                </tr>
              ) : (
                filteredTxs.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{tx.date}</td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{tx.walletName}</td>
                    <td>
                      {tx.type === 'SEND' ? (
                        <span className="badge badge-indigo"><ArrowUpRight size={12} /> تحويل</span>
                      ) : (
                        <span className="badge badge-emerald"><ArrowDownLeft size={12} /> سحب</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 800, color: '#fff' }}>{tx.amount.toLocaleString('ar-EG')} ج.م</td>
                    <td style={{ fontFamily: 'monospace' }}>{tx.targetPhone}</td>
                    <td style={{ fontWeight: 800, color: '#34d399' }}>+{tx.customerCommission} ج.م</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ULTRA FAST LIGHTNING TRANSFER / RECEIVE MODAL */}
      {showTxModal && (
        <div className="modal-overlay" style={{ alignItems: 'flex-end', padding: 0 }}>
          <div
            className="modal-content"
            style={{
              borderRadius: '24px 24px 0 0',
              padding: '1.2rem',
              maxWidth: 'none',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: txType === 'SEND' ? '#818cf8' : '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {txType === 'SEND' ? <ArrowUpRight /> : <ArrowDownLeft />}
                {txType === 'SEND' ? 'تحويل نقدية سريعة (Send)' : 'سحب كاش سريع (Receive)'}
              </h3>
              <button onClick={() => setShowTxModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleExecuteTx} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {wallets.length > 1 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>خط المحفظة المستخدم</label>
                  <select
                    className="input-field"
                    style={{ fontSize: '0.88rem' }}
                    value={selectedWalletId || wallets[0]?.id}
                    onChange={e => setSelectedWalletId(e.target.value)}
                  >
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name} - (رصيده: {w.currentBalance.toLocaleString('ar-EG')} ج.م)</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.4rem' }}>
                  1. أدخل المبلغ المراد {txType === 'SEND' ? 'تحويله' : 'سحبه'} (ج.م) ⚡
                </label>
                
                <input
                  type="number"
                  className="input-field"
                  style={{ fontSize: '1.4rem', fontWeight: 900, textAlign: 'center', padding: '0.75rem', border: '2px solid rgba(245,158,11,0.4)', background: '#0f172a' }}
                  placeholder="مثال: 1000"
                  value={amount}
                  onChange={e => setAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                  autoFocus
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.35rem', marginTop: '0.5rem' }}>
                  {[200, 500, 1000, 2000, 5000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      style={{
                        padding: '0.45rem 0',
                        borderRadius: 8,
                        border: amount === val ? '1px solid #fbbf24' : '1px solid var(--border-color)',
                        background: amount === val ? 'rgba(245,158,11,0.2)' : 'rgba(15,23,42,0.8)',
                        color: amount === val ? '#fbbf24' : 'var(--text-muted)',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  2. رقم التليفون (اختياري - يمكنك تركه فارغاً)
                </label>
                <input
                  type="tel"
                  className="input-field"
                  style={{ fontSize: '1.05rem', textAlign: 'center', direction: 'ltr' }}
                  placeholder="010..."
                  value={targetPhone}
                  onChange={e => setTargetPhone(e.target.value)}
                />
              </div>

              {amount && (
                <div style={{ background: 'rgba(16,185,129,0.12)', padding: '0.65rem 0.85rem', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#fff' }}>عمولة المحل الأوتوماتيكية:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#34d399' }}>
                    +{Math.max(
                      (activeWallet?.sendCommissionPerThousand ?? storeSettings.defaultSendCommission),
                      Math.ceil(Number(amount) / 1000) * (txType === 'SEND' ? (activeWallet?.sendCommissionPerThousand ?? storeSettings.defaultSendCommission) : (activeWallet?.receiveCommissionPerThousand ?? storeSettings.defaultReceiveCommission))
                    )} ج.م
                  </span>
                </div>
              )}

              <button
                type="submit"
                className={txType === 'SEND' ? 'btn btn-indigo' : 'btn btn-emerald'}
                style={{ width: '100%', padding: '0.9rem', fontSize: '1.1rem', fontWeight: 900, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.3rem' }}
              >
                <Zap size={20} fill="#fff" /> تأكيد وتحديث الكاش فوراً ⚡
              </button>

            </form>
          </div>
        </div>
      )}

      {/* Add New Wallet Line Modal */}
      {showAddWalletModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>إضافة خط محفظة جديد</h3>
            <form onSubmit={handleAddWallet} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>اسم المحفظة</label>
                <input type="text" className="input-field" placeholder="فودافون كاش - الخط الرئيسي" value={walletName} onChange={e => setWalletName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>المزود</label>
                  <select className="input-field" value={provider} onChange={(e: any) => setProvider(e.target.value)}>
                    <option value="VODAFONE_CASH">فودافون كاش</option>
                    <option value="INSTAPAY">انستا باي</option>
                    <option value="ORANGE_CASH">أورنج كاش</option>
                    <option value="ETISALAT_CASH">اتصالات كاش</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>رقم التليفون</label>
                  <input type="text" className="input-field" placeholder="010..." value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>الرصيد الافتتاحي (ج.م)</label>
                <input type="number" className="input-field" value={initialBalance} onChange={e => setInitialBalance(e.target.value !== '' ? Number(e.target.value) : '')} required />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddWalletModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ الخط</button>
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
