import React, { useState } from 'react';
import { Plus, Minus, Trash2, ChevronDown, ChevronUp, Calendar, FileText, DollarSign } from 'lucide-react';

export default function TradeHistory({ holding, trades = [], onTradeAction, fxRate = 36.5 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tradeType, setTradeType] = useState('buy'); // 'buy', 'sell', 'initial'
  const [form, setForm] = useState({
    quantity: '',
    price: '',
    feePct: '0.15', // ค่าธรรมเนียมเริ่มต้น 0.15%
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [error, setError] = useState('');

  // กรองประวัติเฉพาะของสินทรัพย์ตัวนี้
  const itemTrades = trades.filter((t) => t.holdingId === holding.id);

  // คำนวณค่าธรรมเนียมรวมทั้งหมดของสินทรัพย์ตัวนี้
  const totalFee = itemTrades.reduce((sum, t) => sum + (parseFloat(t.feeAmount) || 0), 0);

  const handleOpenModal = (type) => {
    setTradeType(type);
    setForm({
      quantity: '',
      price: type === 'initial' ? String(holding.avgCost || '') : String(holding.currentPrice || ''),
      feePct: '0.15',
      date: new Date().toISOString().slice(0, 10),
      note: type === 'initial' ? 'ยอดยกมา' : '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = () => {
    const qty = parseFloat(form.quantity);
    const price = parseFloat(form.price);
    const feePct = parseFloat(form.feePct) || 0;

    if (isNaN(qty) || qty <= 0) {
      setError('กรอกจำนวนให้ถูกต้อง');
      return;
    }
    if (tradeType !== 'initial' && (isNaN(price) || price < 0)) {
      setError('กรอกราคาให้ถูกต้อง');
      return;
    }

    // คำนวณมูลค่าและค่าธรรมเนียม
    const subtotal = qty * price;
    const feeAmount = (subtotal * feePct) / 100;

    // ส่งข้อมูลกลับไปจัดการที่ App หลัก
    onTradeAction({
      holdingId: holding.id,
      type: tradeType, // 'buy', 'sell', 'initial'
      quantity: qty,
      price: price,
      feePct: feePct,
      feeAmount: feeAmount,
      date: form.date,
      note: form.note.trim(),
    });

    setShowModal(false);
  };

  return (
    <div className="pf-trade-container" style={{ background: 'var(--surface-alt)', borderRadius: '12px', border: '1px solid var(--divider)', margin: '8px 0', overflow: 'hidden' }}>
      {/* ส่วนหัวแถวหุ้น แตะเพื่อกางออก (Condition 4) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)} 
        style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px' }}>{holding.name}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--muted)' }} className="pf-mono">
            ถืออยู่: {holding.quantity} | ทุน: {holding.avgCost} | ค่าคอมสะสม: ฿{totalFee.toFixed(2)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="pf-btn pf-btn-primary" 
            style={{ padding: '4px 10px', fontSize: '11.5px' }}
            onClick={(e) => { e.stopPropagation(); handleOpenModal('buy'); }}
          >
            ซื้อ/ขาย
          </button>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* ส่วนกางประวัติ (Accordion) */}
      {isExpanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--divider)' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', margin: '10px 0 6px' }}>ประวัติการทำรายการ ({itemTrades.length})</div>
          {itemTrades.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>ยังไม่มีประวัติการซื้อขาย</div>
          ) : (
            itemTrades.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="pf-mono">
                <div>
                  <span style={{ color: t.type === 'buy' ? 'var(--pos)' : 'var(--neg)', fontWeight: '600' }}>
                    {t.type === 'buy' ? 'ซื้อ' : t.type === 'sell' ? 'ขาย' : 'ยอดยกมา'}
                  </span>{' '}
                  {t.quantity} หุ้น @ {t.price} (คอม: ฿{t.feeAmount?.toFixed(2)})
                </div>
                <div style={{ color: 'var(--muted)' }}>{t.date}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal สำหรับบันทึก ซื้อ/ขาย */}
      {showModal && (
        <div className="pf-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="pf-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: '600', marginBottom: '12px' }}>
              {tradeType === 'buy' ? 'บันทึกซื้อเพิ่ม' : tradeType === 'sell' ? 'บันทึกขายออก' : 'ตั้งค่ายอดยกมา'}
            </div>
            {error && <div className="pf-error">{error}</div>}
            
            <div className="pf-field">
              <label className="pf-label">จำนวนหุ้น</label>
              <input className="pf-input pf-mono" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
            </div>

            {tradeType !== 'initial' && (
              <div className="pf-field">
                <label className="pf-label">ราคาซื้อ/ขายต่อหน่วย</label>
                <input className="pf-input pf-mono" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
              </div>
            )}

            <div className="pf-field">
              <label className="pf-label">ค่าธรรมเนียม (%)</label>
              <input className="pf-input pf-mono" type="number" value={form.feePct} onChange={(e) => setForm({ ...form, feePct: e.target.value })} placeholder="0.15" />
            </div>

            <div className="pf-field">
              <label className="pf-label">วันที่</label>
              <input className="pf-input pf-mono" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>

            <div className="pf-field">
              <label className="pf-label">หมายเหตุ</label>
              <input className="pf-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="เช่น เติมพอร์ตเพิ่ม" />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button className="pf-btn pf-btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowModal(false)}>ยกเลิก</button>
              <button className="pf-btn pf-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSubmit}>บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
