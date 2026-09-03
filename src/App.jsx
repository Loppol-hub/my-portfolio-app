import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, X, TrendingUp, TrendingDown, MoreVertical, Inbox, Zap } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const ASSET_TYPES = [
  { key: 'th_stock', label: 'หุ้นไทย', color: '#C7A344', market: 'th', defaultCurrency: 'THB' },
  { key: 'foreign_stock', label: 'หุ้นต่างประเทศ', color: '#6E8CB0', market: 'us', defaultCurrency: 'USD' },
  { key: 'crypto', label: 'คริปโต', color: '#967ACC', market: 'crypto', defaultCurrency: 'USD' },
  { key: 'gold', label: 'ทองคำ', color: '#D9823F', market: null, defaultCurrency: 'THB' },
  { key: 'fund', label: 'กองทุน', color: '#C17B86', market: null, defaultCurrency: 'THB' },
  { key: 'cash', label: 'เงินสด', color: '#7C8B9E', market: null, defaultCurrency: 'THB' },
  { key: 'other', label: 'อื่นๆ', color: '#4F9E93', market: null, defaultCurrency: 'THB' },
];
const typeInfo = (key) => ASSET_TYPES.find((t) => t.key === key) || ASSET_TYPES[ASSET_TYPES.length - 1];
const TICKER_HINT = {
  th_stock: 'เช่น PTT หรือ PTT.BK',
  foreign_stock: 'เช่น AAPL, MSFT',
  crypto: 'เช่น BTC, ETH',
};

// ---- color-shade helpers (for breaking one asset-type color into per-holding shades) ----
function hexToHsl(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function shadeSet(hex, n) {
  if (n <= 0) return [];
  if (n === 1) return [hex];
  const { h, s, l } = hexToHsl(hex);
  const arr = [];
  for (let i = 0; i < n; i++) {
    const delta = (i - (n - 1) / 2) * (34 / (n - 1 || 1));
    const nl = Math.min(82, Math.max(22, l + delta));
    arr.push(hslToHex(h, Math.max(20, s), nl));
  }
  return arr;
}

function darken(hex, amt) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(8, l - amt));
}

// ---- "3D" exploded pie: hand-built SVG geometry (elliptical top face + extruded
// side walls + slight per-slice separation), percentage printed on each wedge ----
function ExplodedPie3D({ data, rx = 88, depth = 20, explode = 7 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const ry = rx * 0.55;
  const pad = explode + 12;
  const width = rx * 2 + pad * 2;
  const height = ry * 2 + depth + pad * 2;
  const cx = rx + pad;
  const cy = ry + pad;

  if (total <= 0 || data.length === 0) {
    return <div className="pf-pie-empty" style={{ width, height }} />;
  }

  const topPt = (theta, ox, oy) => ({ x: ox + rx * Math.sin(theta), y: oy - ry * Math.cos(theta) });
  const botPt = (theta, ox, oy) => { const p = topPt(theta, ox, oy); return { x: p.x, y: p.y + depth }; };

  let cursor = 0;
  const slices = data.map((d) => {
    const frac = d.value / total;
    const a0 = cursor;
    const a1 = cursor + frac * Math.PI * 2;
    cursor = a1;
    const mid = (a0 + a1) / 2;
    const ox = cx + Math.sin(mid) * explode;
    const oy = cy - Math.cos(mid) * explode * (ry / rx);
    return { ...d, a0, a1, mid, frac, ox, oy };
  });

  const FRONT_START = Math.PI / 2, FRONT_END = Math.PI * 1.5;
  const sidePaths = slices.map((sl) => {
    const s = Math.max(sl.a0, FRONT_START);
    const e = Math.min(sl.a1, FRONT_END);
    if (e <= s) return null;
    const large = (e - s) > Math.PI ? 1 : 0;
    const tS = topPt(s, sl.ox, sl.oy), tE = topPt(e, sl.ox, sl.oy);
    const bS = botPt(s, sl.ox, sl.oy), bE = botPt(e, sl.ox, sl.oy);
    const path = `M ${tS.x} ${tS.y} A ${rx} ${ry} 0 ${large} 1 ${tE.x} ${tE.y} L ${bE.x} ${bE.y} A ${rx} ${ry} 0 ${large} 0 ${bS.x} ${bS.y} Z`;
    return { key: sl.key, path, fill: darken(sl.color, 20) };
  }).filter(Boolean);

  const topPaths = slices.map((sl) => {
    const large = (sl.a1 - sl.a0) > Math.PI ? 1 : 0;
    const p0 = topPt(sl.a0, sl.ox, sl.oy), p1 = topPt(sl.a1, sl.ox, sl.oy);
    const path = `M ${sl.ox} ${sl.oy} L ${p0.x} ${p0.y} A ${rx} ${ry} 0 ${large} 1 ${p1.x} ${p1.y} Z`;
    const pct = sl.frac * 100;
    const labelR = rx * 0.58;
    const lx = sl.ox + Math.sin(sl.mid) * labelR;
    const ly = sl.oy - Math.cos(sl.mid) * (ry * 0.58) + depth * 0.32;
    return { key: sl.key, path, fill: sl.color, pct, lx, ly, showLabel: pct >= 5 };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="pf-pie3d-svg" style={{ background: 'transparent' }}>
      {sidePaths.map((s) => <path key={`side-${s.key}`} d={s.path} fill={s.fill} />)}
      {topPaths.map((s) => <path key={`top-${s.key}`} d={s.path} fill={s.fill} stroke="var(--bg)" strokeWidth="2" />)}
      {topPaths.map((s) => s.showLabel && (
        <text key={`label-${s.key}`} x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle" className="pf-pie3d-label">
          {Math.round(s.pct)}%
        </text>
      ))}
    </svg>
  );
}


const fmt = (n, digits = 2) => {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
};
const todayStr = () => new Date().toISOString().slice(0, 10);
const thaiDate = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
};
const emptyForm = { name: '', ticker: '', type: 'th_stock', quantity: '', avgCost: '', currentPrice: '', currency: 'THB', industry: '' };

export default function PortfolioApp() {
  const [holdings, setHoldings] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [panel, setPanel] = useState(null); // 'form' | 'update' | null
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [updateDraft, setUpdateDraft] = useState({});
  const [toast, setToast] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);
  const [chartModeByType, setChartModeByType] = useState({});
  const toggleChartMode = (typeKey) => {
    setChartModeByType((prev) => ({ ...prev, [typeKey]: prev[typeKey] === 'industry' ? 'holding' : 'industry' }));
  };
  const [backendUrl, setBackendUrl] = useState('');
  const [backendDraft, setBackendDraft] = useState('');
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [fxRate, setFxRate] = useState(36.5);
  const [fxDraft, setFxDraft] = useState('36.5');
  const [fetchingFx, setFetchingFx] = useState(false);
  const [initialCapital, setInitialCapital] = useState(0);
  const [initialCapitalDraft, setInitialCapitalDraft] = useState('');
  const [ledger, setLedger] = useState([]);
  const [ledgerType, setLedgerType] = useState(null);
  const [ledgerAmount, setLedgerAmount] = useState('');
  const [ledgerError, setLedgerError] = useState('');

  useEffect(() => { load(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      let h = [];
      let hist = [];
      try {
        const r = await window.storage.get('holdings', false);
        if (r && r.value) h = JSON.parse(r.value);
      } catch (e) { /* no data yet */ }
      try {
        const r2 = await window.storage.get('portfolio-history', false);
        if (r2 && r2.value) hist = JSON.parse(r2.value);
      } catch (e) { /* no data yet */ }
      let url = '';
      try {
        const r3 = await window.storage.get('backend-url', false);
        if (r3 && r3.value) url = r3.value;
      } catch (e) { /* not set yet */ }
      let fx = 36.5;
      try {
        const r4 = await window.storage.get('fx-usdthb', false);
        if (r4 && r4.value) fx = parseFloat(r4.value) || 36.5;
      } catch (e) { /* not set yet */ }
      let capital = 0;
      try {
        const r5 = await window.storage.get('initial-capital', false);
        if (r5 && r5.value) capital = parseFloat(r5.value) || 0;
      } catch (e) { /* not set yet */ }
      let ledgerData = [];
      try {
        const r6 = await window.storage.get('cash-ledger', false);
        if (r6 && r6.value) ledgerData = JSON.parse(r6.value);
      } catch (e) { /* not set yet */ }
      setHoldings(Array.isArray(h) ? h : []);
      setHistory(Array.isArray(hist) ? hist : []);
      setBackendUrl(url);
      setBackendDraft(url);
      setFxRate(fx);
      setFxDraft(String(fx));
      setInitialCapital(capital);
      setInitialCapitalDraft(capital > 0 ? String(capital) : '');
      setLedger(Array.isArray(ledgerData) ? ledgerData : []);
    } catch (e) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const saveHoldings = async (next) => {
    setHoldings(next);
    try { await window.storage.set('holdings', JSON.stringify(next), false); }
    catch (e) { showToast('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'); }
  };

  const saveHistory = async (next) => {
    setHistory(next);
    try { await window.storage.set('portfolio-history', JSON.stringify(next), false); }
    catch (e) { showToast('บันทึกประวัติไม่สำเร็จ'); }
  };

  // หุ้นต่างประเทศและทองคำ: ธนาคาร/แอพอ้างอิง (Dime) มักใช้เรตซื้อที่ต่ำกว่าเรตกลางเล็กน้อย
  // จึงหักออก 0.05 บาทจากอัตราแลกเปลี่ยนก่อนคำนวณมูลค่าเฉพาะสองประเภทนี้
  // คริปโต: เทียบกับ Bitkub ที่ซื้อขายเป็นบาทตรงๆ หักออก 0.1 บาทเมื่อบันทึกเป็น USD
  const getEffectiveRate = (type, rate) => {
    if (type === 'foreign_stock' || type === 'gold') return Math.max(0, rate - 0.05);
    if (type === 'crypto') return Math.max(0, rate - 0.1);
    return rate;
  };

  const enriched = useMemo(() => holdings.map((h) => {
    const qty = parseFloat(h.quantity) || 0;
    const avg = parseFloat(h.avgCost) || 0;
    const price = parseFloat(h.currentPrice) || 0;
    const currency = h.currency === 'USD' ? 'USD' : 'THB';
    const rate = currency === 'USD' ? getEffectiveRate(h.type, fxRate) : 1;
    const marketValue = qty * price * rate;
    const costValue = qty * avg * rate;
    const gain = marketValue - costValue;
    const gainPct = costValue > 0 ? (gain / costValue) * 100 : 0;
    return { ...h, qty, avg, price, currency, marketValue, costValue, gain, gainPct };
  }), [holdings, fxRate]);

  // เงินสดตอนนี้เป็นค่าที่คำนวณอัตโนมัติ ไม่ต้องกรอกเอง:
  // เงินสด = (ทุนเริ่มต้น + เพิ่มทุน - ลดทุน) - ต้นทุนที่ลงทุนไปแล้ว (ไม่รวมเงินสด) + กำไร - ขาดทุน + ปันผล
  const totalInvestedValue = useMemo(() => enriched.filter((h) => h.type !== 'cash').reduce((s, h) => s + h.marketValue, 0), [enriched]);
  const totalInvestedCost = useMemo(() => enriched.filter((h) => h.type !== 'cash').reduce((s, h) => s + h.costValue, 0), [enriched]);
  const capitalAdjTotal = useMemo(() => (
    ledger.filter((e) => e.type === 'capital_add').reduce((s, e) => s + e.amount, 0)
    - ledger.filter((e) => e.type === 'capital_reduce').reduce((s, e) => s + e.amount, 0)
  ), [ledger]);
  const cashAdjTotal = useMemo(() => (
    ledger.filter((e) => e.type === 'profit').reduce((s, e) => s + e.amount, 0)
    - ledger.filter((e) => e.type === 'loss').reduce((s, e) => s + e.amount, 0)
    + ledger.filter((e) => e.type === 'dividend').reduce((s, e) => s + e.amount, 0)
  ), [ledger]);
  const totalCapital = initialCapital + capitalAdjTotal;
  const cashActive = initialCapital > 0 || ledger.length > 0;
  const computedCash = cashActive ? (totalCapital - totalInvestedCost + cashAdjTotal) : 0;

  const totalValue = totalInvestedValue + (cashActive ? Math.max(0, computedCash) : 0);
  const totalCost = totalInvestedCost;
  const totalGain = totalInvestedValue - totalInvestedCost;
  const totalGainPct = totalInvestedCost > 0 ? (totalGain / totalInvestedCost) * 100 : 0;

  const byType = useMemo(() => {
    const map = {};
    enriched.forEach((h) => { if (h.type !== 'cash') map[h.type] = (map[h.type] || 0) + h.marketValue; });
    const list = ASSET_TYPES.filter((t) => t.key !== 'cash').map((t) => ({ ...t, value: map[t.key] || 0 })).filter((t) => t.value > 0);
    if (cashActive && computedCash > 0) {
      const cashType = ASSET_TYPES.find((t) => t.key === 'cash');
      list.push({ ...cashType, value: computedCash });
    }
    return list.sort((a, b) => b.value - a.value);
  }, [enriched, cashActive, computedCash]);

  const lastUpdated = useMemo(() => {
    const dates = holdings.map((h) => h.lastUpdated).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : null;
  }, [holdings]);

  const chartData = useMemo(() => history.slice(-30).map((p) => ({ date: p.date, value: p.value })), [history]);

  // ---- form handlers ----
  const openAdd = () => { setForm(emptyForm); setEditingId(null); setFormError(''); setPanel('form'); };
  const openEdit = (h) => {
    setForm({ name: h.name, ticker: h.ticker || '', type: h.type, quantity: String(h.quantity), avgCost: String(h.avgCost), currentPrice: String(h.currentPrice), currency: h.currency === 'USD' ? 'USD' : 'THB', industry: h.industry || '' });
    setEditingId(h.id); setFormError(''); setPanel('form');
  };
  const closePanel = () => { setPanel(null); setEditingId(null); setUpdateDraft({}); };
  const onFormTypeChange = (type) => {
    setForm((f) => ({ ...f, type, currency: editingId ? f.currency : typeInfo(type).defaultCurrency }));
  };

  const submitForm = () => {
    const isCash = form.type === 'cash';
    const qty = parseFloat(form.quantity);
    const avg = isCash ? 1 : parseFloat(form.avgCost);
    const price = isCash ? 1 : parseFloat(form.currentPrice);
    if (!form.name.trim()) { setFormError('กรอกชื่อสินทรัพย์ก่อนนะ'); return; }
    if (isNaN(qty) || qty <= 0) { setFormError(isCash ? 'จำนวนเงินต้องมากกว่า 0' : 'จำนวนต้องเป็นตัวเลขมากกว่า 0'); return; }
    if (!isCash && (isNaN(avg) || avg < 0)) { setFormError('ราคาต้นทุนไม่ถูกต้อง'); return; }
    if (!isCash && (isNaN(price) || price < 0)) { setFormError('ราคาปัจจุบันไม่ถูกต้อง'); return; }
    const currency = form.currency === 'USD' ? 'USD' : 'THB';
    const industry = form.industry.trim();
    if (editingId) {
      const next = holdings.map((h) => h.id === editingId ? { ...h, name: form.name.trim(), ticker: form.ticker.trim(), type: form.type, quantity: qty, avgCost: avg, currentPrice: price, currency, industry } : h);
      saveHoldings(next);
      showToast('แก้ไขรายการแล้ว');
    } else {
      const next = [...holdings, { id: Date.now().toString(), name: form.name.trim(), ticker: form.ticker.trim(), type: form.type, quantity: qty, avgCost: avg, currentPrice: price, currency, industry, lastUpdated: todayStr() }];
      saveHoldings(next);
      showToast('เพิ่มสินทรัพย์แล้ว');
    }
    closePanel();
  };

  const deleteHolding = (id) => {
    saveHoldings(holdings.filter((h) => h.id !== id));
    showToast('ลบรายการแล้ว');
  };

  const openUpdatePrices = () => {
    const draft = {};
    holdings.filter((h) => h.type !== 'cash').forEach((h) => { draft[h.id] = String(h.currentPrice); });
    setUpdateDraft(draft);
    setPanel('update');
  };

  const fetchFxRateValue = async () => {
    if (!backendUrl) return null;
    try {
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: '__fx__', ticker: 'USDTHB', market: 'fx' }] }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const r = (data.results || []).find((x) => x.id === '__fx__');
      return r && typeof r.price === 'number' ? r.price : null;
    } catch (e) {
      return null;
    }
  };

  const submitUpdatePrices = async () => {
    const today = todayStr();
    const next = holdings.map((h) => {
      const v = parseFloat(updateDraft[h.id]);
      if (isNaN(v) || v < 0) return h;
      return { ...h, currentPrice: v, lastUpdated: today };
    });
    saveHoldings(next);

    // ดึงอัตราแลกเปลี่ยนล่าสุดมาพร้อมกันในขั้นตอนบันทึกเดียว ไม่ต้องกดแยกในเมนูตั้งค่า
    let rate = fxRate;
    if (backendUrl) {
      const fetched = await fetchFxRateValue();
      if (fetched) {
        rate = fetched;
        setFxRate(fetched);
        setFxDraft(String(fetched));
        try { await window.storage.set('fx-usdthb', String(fetched), false); } catch (e) { /* ignore */ }
      }
    }

    const newTotal = next.reduce((s, h) => {
      const currency = h.currency === 'USD' ? 'USD' : 'THB';
      const effRate = currency === 'USD' ? getEffectiveRate(h.type, rate) : 1;
      return s + (parseFloat(h.quantity) || 0) * (parseFloat(h.currentPrice) || 0) * effRate;
    }, 0);
    const histNext = [...history.filter((p) => p.date !== today), { date: today, value: newTotal }].sort((a, b) => a.date.localeCompare(b.date));
    saveHistory(histNext);
    showToast(backendUrl ? 'บันทึกราคาและอัตราแลกเปลี่ยนวันนี้แล้ว' : 'บันทึกราคาวันนี้แล้ว');
    closePanel();
  };

  const saveBackendUrl = async () => {
    const url = backendDraft.trim();
    const fx = parseFloat(fxDraft);
    const capital = parseFloat(initialCapitalDraft);
    setBackendUrl(url);
    try { await window.storage.set('backend-url', url, false); }
    catch (e) { showToast('บันทึก Backend URL ไม่สำเร็จ'); }
    if (!isNaN(fx) && fx > 0) {
      setFxRate(fx);
      try { await window.storage.set('fx-usdthb', String(fx), false); }
      catch (e) { showToast('บันทึกอัตราแลกเปลี่ยนไม่สำเร็จ'); }
    }
    const nextCapital = !isNaN(capital) && capital >= 0 ? capital : 0;
    setInitialCapital(nextCapital);
    try { await window.storage.set('initial-capital', String(nextCapital), false); }
    catch (e) { showToast('บันทึกทุนเริ่มต้นไม่สำเร็จ'); }
    showToast('บันทึกการตั้งค่าแล้ว');
    closePanel();
  };

  const fetchAutoPrices = async () => {
    if (!backendUrl) { showToast('ยังไม่ได้ตั้งค่า Backend URL ในเมนู'); return; }
    const items = holdings
      .filter((h) => typeInfo(h.type).market && h.ticker)
      .map((h) => ({ id: h.id, ticker: h.ticker, market: typeInfo(h.type).market }));
    if (items.length === 0) { showToast('ไม่มีรายการที่ใส่สัญลักษณ์ไว้สำหรับดึงราคาอัตโนมัติ'); return; }
    setFetchingPrices(true);
    try {
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      const next = { ...updateDraft };
      let okCount = 0, failCount = 0;
      (data.results || []).forEach((r) => {
        if (typeof r.price === 'number') { next[r.id] = String(r.price); okCount += 1; }
        else failCount += 1;
      });
      setUpdateDraft(next);
      showToast(`ดึงราคาอัตโนมัติสำเร็จ ${okCount} รายการ${failCount ? ` · พลาด ${failCount} รายการ` : ''}`);
    } catch (e) {
      showToast('เชื่อมต่อ Backend ไม่สำเร็จ');
    } finally {
      setFetchingPrices(false);
    }
  };

  const fetchFxRate = async () => {
    if (!backendUrl) { showToast('ยังไม่ได้ตั้งค่า Backend URL'); return; }
    setFetchingFx(true);
    const price = await fetchFxRateValue();
    if (price) {
      setFxDraft(String(price));
      showToast(`ดึงอัตราแลกเปลี่ยนแล้ว: 1 USD ≈ ฿${fmt(price)}`);
    } else {
      showToast('เชื่อมต่อ Backend ไม่สำเร็จ');
    }
    setFetchingFx(false);
  };

  const exportData = () => {
    const payload = {
      app: 'portfolio-tracker',
      version: 2,
      exportedAt: new Date().toISOString(),
      holdings,
      history,
      fxRate,
      backendUrl,
      initialCapital,
      ledger,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-backup-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMenuOpen(false);
    showToast('ส่งออกไฟล์สำรองข้อมูลแล้ว');
  };

  const triggerImport = () => {
    setMenuOpen(false);
    setImportError('');
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.holdings)) throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
        setPendingImport(data);
        setImportError('');
      } catch (err) {
        setImportError('อ่านไฟล์ไม่สำเร็จ — ตรวจสอบว่าเป็นไฟล์สำรองข้อมูลของแอพนี้จริงๆ');
      }
    };
    reader.onerror = () => setImportError('อ่านไฟล์ไม่สำเร็จ');
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    await saveHoldings(Array.isArray(pendingImport.holdings) ? pendingImport.holdings : []);
    await saveHistory(Array.isArray(pendingImport.history) ? pendingImport.history : []);
    if (typeof pendingImport.fxRate === 'number' && pendingImport.fxRate > 0) {
      setFxRate(pendingImport.fxRate);
      try { await window.storage.set('fx-usdthb', String(pendingImport.fxRate), false); } catch (e) { /* ignore */ }
    }
    if (typeof pendingImport.backendUrl === 'string') {
      setBackendUrl(pendingImport.backendUrl);
      setBackendDraft(pendingImport.backendUrl);
      try { await window.storage.set('backend-url', pendingImport.backendUrl, false); } catch (e) { /* ignore */ }
    }
    if (typeof pendingImport.initialCapital === 'number' && pendingImport.initialCapital >= 0) {
      setInitialCapital(pendingImport.initialCapital);
      setInitialCapitalDraft(pendingImport.initialCapital > 0 ? String(pendingImport.initialCapital) : '');
      try { await window.storage.set('initial-capital', String(pendingImport.initialCapital), false); } catch (e) { /* ignore */ }
    }
    if (Array.isArray(pendingImport.ledger)) {
      await saveLedger(pendingImport.ledger);
    }
    setPendingImport(null);
    showToast('นำเข้าข้อมูลสำเร็จ');
  };

  const LEDGER_LABELS = {
    capital_add: 'เพิ่มทุน',
    capital_reduce: 'ลดทุน',
    profit: 'กำไร',
    loss: 'ขาดทุน',
    dividend: 'ปันผล',
  };

  const saveLedger = async (next) => {
    setLedger(next);
    try { await window.storage.set('cash-ledger', JSON.stringify(next), false); }
    catch (e) { showToast('บันทึกไม่สำเร็จ'); }
  };

  const openLedgerForm = (type) => {
    setLedgerType(type);
    setLedgerAmount('');
    setLedgerError('');
    setPanel('ledger');
  };

  const submitLedger = () => {
    const amt = parseFloat(ledgerAmount);
    if (isNaN(amt) || amt <= 0) { setLedgerError('กรอกจำนวนเงินให้ถูกต้อง (มากกว่า 0)'); return; }
    const entry = { id: Date.now().toString(), type: ledgerType, amount: amt, date: todayStr() };
    saveLedger([...ledger, entry]);
    showToast(`บันทึก${LEDGER_LABELS[ledgerType]}แล้ว`);
    closePanel();
  };

  const deleteLedgerEntry = (id) => {
    saveLedger(ledger.filter((e) => e.id !== id));
  };

  const clearAll = async () => {
    await saveHoldings([]);
    await saveHistory([]);
    await saveLedger([]);
    setConfirmClear(false);
    setMenuOpen(false);
    showToast('ล้างข้อมูลทั้งหมดแล้ว');
  };

  return (
    <div className="pf-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
        .pf-root {
          --bg: #0E1520; --surface: #172233; --surface-alt: #1D2A3D; --divider: #2A3648;
          --text: #EDF1F5; --muted: #8592A6; --gold: #C7A344;
          --pos: #4FA98A; --neg: #D9705A;
          background: var(--bg); color: var(--text); min-height: 100vh;
          font-family: 'Inter', sans-serif; padding: 20px 16px 80px;
          -webkit-font-smoothing: antialiased;
        }
        .pf-root * { box-sizing: border-box; }
        .pf-mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        .pf-display { font-family: 'Fraunces', serif; }
        .pf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .pf-title { font-family: 'Fraunces', serif; font-size: 40px; font-weight: 600; letter-spacing: 0.2px; }
        .pf-icon-btn { background: var(--surface); border: 1px solid var(--divider); color: var(--text); border-radius: 10px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .pf-icon-btn:hover { background: var(--surface-alt); }
        .pf-icon-btn:focus-visible, .pf-btn:focus-visible, .pf-input:focus-visible, .pf-select:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
        .pf-hero { background: var(--surface); border: 1px solid var(--divider); border-radius: 16px; padding: 22px 20px; margin-bottom: 16px; }
        .pf-hero-label { color: var(--muted); font-size: 12px; letter-spacing: 0.4px; margin-bottom: 6px; }
        .pf-hero-value { font-size: 34px; font-weight: 600; line-height: 1.1; }
        .pf-hero-sub { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 13px; }
        .pf-chip-pos { color: var(--pos); } .pf-chip-neg { color: var(--neg); }
        .pf-spark { height: 44px; margin-top: 14px; }
        .pf-updated { color: var(--muted); font-size: 12px; margin-top: 10px; }
        .pf-capital-card { background: var(--surface); border: 1px solid var(--divider); border-radius: 16px; padding: 18px 16px; margin-bottom: 16px; }
        .pf-capital-row { display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; padding: 6px 0; }
        .pf-capital-bar { width: 100%; height: 8px; border-radius: 5px; background: var(--surface-alt); overflow: hidden; margin: 6px 0 2px; }
        .pf-capital-bar-fill { height: 100%; background: var(--gold); border-radius: 5px; }
        .pf-capital-highlight { margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--divider); font-weight: 600; font-size: 14.5px; }
        .pf-cash-ledger { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--divider); }
        .pf-cash-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
        .pf-cash-action-btn { flex: 1; min-width: 90px; background: var(--surface-alt); border: 1px solid var(--divider); color: var(--text); border-radius: 10px; padding: 9px 10px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .pf-cash-action-btn:hover { background: var(--divider); }
        .pf-legacy-note { font-size: 11.5px; color: var(--muted); margin: 12px 0 6px; }
        .pf-section-label { color: var(--muted); font-size: 12px; letter-spacing: 0.6px; text-transform: uppercase; margin: 20px 2px 10px; }
        .pf-donut-row { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; margin-bottom: 4px; }
        .pf-pie3d-svg { overflow: visible; filter: drop-shadow(0 10px 14px rgba(0,0,0,0.45)); flex-shrink: 0; background: transparent; }
        .pf-pie3d-label { font-family: 'Inter', sans-serif; font-weight: 800; font-size: 15px; fill: #fff; paint-order: stroke; stroke: rgba(0,0,0,0.4); stroke-width: 3px; stroke-linejoin: round; }
        .pf-pie-empty { border-radius: 50%; border: 1px dashed var(--divider); flex-shrink: 0; }
        .pf-legend-col { flex-direction: column; gap: 8px; flex: 1; min-width: 170px; }
        .pf-type-section { background: var(--surface); border: 1px solid var(--divider); border-radius: 16px; padding: 18px 16px; margin-bottom: 20px; }
        .pf-type-section-head { display: flex; align-items: center; gap: 18px; }
        .pf-pie-tap { display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; }
        .pf-pie-tap-hint { font-size: 10px; color: var(--muted); text-align: center; }
        .pf-type-breakdown-caption { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
        .pf-type-section-info { flex: 1; min-width: 0; }
        .pf-type-section-title { display: flex; align-items: center; gap: 7px; font-family: 'Fraunces', serif; font-weight: 600; font-size: 15.5px; margin-bottom: 5px; }
        .pf-type-section-value { font-size: 21px; font-weight: 600; }
        .pf-type-section-gain { font-size: 12.5px; margin-top: 3px; }
        .pf-type-section-pct { color: var(--muted); font-size: 12px; margin-top: 5px; }
        .pf-type-breakdown { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--divider); }
        .pf-type-breakdown-scroll { max-height: 240px; overflow-y: auto; padding-right: 4px; }
        .pf-type-breakdown-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .pf-type-breakdown-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); }
        .pf-type-breakdown-pct { color: var(--gold); font-weight: 600; font-size: 13px; }
        .pf-type-section-holdings { border-top: 1px solid var(--divider); margin-top: 16px; padding-top: 6px; }
        .pf-subrow { padding: 14px 0; border-bottom: 1px solid var(--divider); }
        .pf-subrow:last-child { border-bottom: none; padding-bottom: 0; }
        .pf-legend { display: flex; flex-wrap: wrap; gap: 10px 16px; margin-top: 12px; }
        .pf-legend-item { display: flex; align-items: center; gap: 7px; font-size: 12.5px; }
        .pf-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .pf-legend-val { color: var(--muted); }
        .pf-empty { text-align: center; padding: 50px 20px; color: var(--muted); border: 1px dashed var(--divider); border-radius: 16px; }
        .pf-empty-cta { margin-top: 14px; }
        .pf-row { background: var(--surface); border: 1px solid var(--divider); border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; }
        .pf-row-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .pf-row-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .pf-row-name-text { font-family: 'Fraunces', serif; font-weight: 600; font-size: 15.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pf-tag { font-size: 10.5px; color: var(--muted); border: 1px solid var(--divider); border-radius: 20px; padding: 1px 8px; flex-shrink: 0; }
        .pf-row-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .pf-row-actions button { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 6px; }
        .pf-row-actions button:hover { color: var(--text); background: var(--surface-alt); }
        .pf-row-meta { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 10px; font-size: 12.5px; color: var(--muted); }
        .pf-row-meta b { color: var(--text); font-weight: 500; }
        .pf-fab { position: fixed; right: 20px; bottom: 24px; display: flex; gap: 10px; }
        .pf-btn { border-radius: 12px; padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid var(--divider); display: flex; align-items: center; gap: 6px; }
        .pf-btn:disabled { opacity: 0.55; cursor: default; }
        .pf-btn-primary { background: var(--gold); color: #1A1400; border: none; }
        .pf-btn-ghost { background: var(--surface); color: var(--text); }
        .pf-overlay { position: fixed; inset: 0; background: rgba(6,10,16,0.6); display: flex; justify-content: flex-end; z-index: 40; }
        .pf-panel { background: var(--bg); border-left: 1px solid var(--divider); width: 100%; max-width: 400px; height: 100%; overflow-y: auto; padding: 20px; animation: pf-slide 0.18s ease-out; }
        @keyframes pf-slide { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .pf-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .pf-panel-title { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 600; }
        .pf-field { margin-bottom: 14px; }
        .pf-label { font-size: 12.5px; color: var(--muted); display: block; margin-bottom: 6px; }
        .pf-input, .pf-select { width: 100%; background: var(--surface); border: 1px solid var(--divider); color: var(--text); border-radius: 10px; padding: 10px 12px; font-size: 14.5px; font-family: 'Inter', sans-serif; }
        .pf-input.pf-mono { font-family: 'IBM Plex Mono', monospace; }
        .pf-row2 { display: flex; gap: 10px; }
        .pf-row2 > div { flex: 1; }
        .pf-currency-toggle { display: flex; gap: 8px; }
        .pf-currency-toggle button { flex: 1; background: var(--surface); border: 1px solid var(--divider); color: var(--muted); border-radius: 10px; padding: 9px 8px; font-size: 13.5px; cursor: pointer; }
        .pf-currency-toggle button.pf-currency-active { background: var(--gold); color: #1A1400; border-color: var(--gold); font-weight: 600; }
        .pf-currency-hint { color: var(--muted); font-size: 11.5px; margin-top: 6px; line-height: 1.5; }
        .pf-error { color: var(--neg); font-size: 12.5px; margin-bottom: 10px; }
        .pf-panel-actions { display: flex; gap: 10px; margin-top: 18px; }
        .pf-panel-actions .pf-btn { flex: 1; justify-content: center; }
        .pf-update-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--divider); }
        .pf-update-name { font-size: 14px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pf-update-input { width: 110px; }
        .pf-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: var(--surface); border: 1px solid var(--divider); color: var(--text); padding: 10px 18px; border-radius: 30px; font-size: 13.5px; z-index: 60; }
        .pf-menu-wrap { position: relative; }
        .pf-menu { position: absolute; right: 0; top: 46px; background: var(--surface); border: 1px solid var(--divider); border-radius: 10px; padding: 6px; min-width: 170px; z-index: 30; }
        .pf-menu button { width: 100%; text-align: left; background: transparent; border: none; color: var(--text); padding: 9px 10px; border-radius: 7px; font-size: 13.5px; cursor: pointer; }
        .pf-menu button:hover { background: var(--surface-alt); }
        .pf-confirm { background: var(--surface); border: 1px solid var(--divider); border-radius: 14px; padding: 16px; margin-top: 8px; }
        .pf-loading { display: flex; align-items: center; justify-content: center; height: 60vh; color: var(--muted); }
        @media (min-width: 640px) {
          .pf-root { padding: 32px 28px 90px; max-width: 720px; margin: 0 auto; }
          .pf-hero-value { font-size: 40px; }
        }
      `}</style>

      <div className="pf-header">
        <div className="pf-title">Moon Shot</div>
        <div className="pf-menu-wrap">
          <button className="pf-icon-btn" aria-label="เมนู" onClick={() => setMenuOpen((v) => !v)}><MoreVertical size={17} /></button>
          {menuOpen && (
            <div className="pf-menu">
              <button onClick={() => { setBackendDraft(backendUrl); setFxDraft(String(fxRate)); setInitialCapitalDraft(initialCapital > 0 ? String(initialCapital) : ''); setPanel('settings'); setMenuOpen(false); }}>ตั้งค่า</button>
              <button onClick={exportData}>ส่งออกข้อมูล (สำรอง)</button>
              <button onClick={triggerImport}>นำเข้าข้อมูล (กู้คืน)</button>
              <button onClick={() => { setConfirmClear(true); setMenuOpen(false); }}>ล้างข้อมูลทั้งหมด</button>
            </div>
          )}
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleImportFile} />

      {loading ? (
        <div className="pf-loading">กำลังโหลดข้อมูล...</div>
      ) : loadError ? (
        <div className="pf-empty">โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชอีกครั้ง</div>
      ) : (
        <>
          {importError && (
            <div className="pf-confirm">
              <div style={{ marginBottom: 10, fontSize: 14, color: 'var(--neg)' }}>{importError}</div>
              <button className="pf-btn pf-btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setImportError('')}>ปิด</button>
            </div>
          )}

          {pendingImport && (
            <div className="pf-confirm">
              <div style={{ marginBottom: 6, fontSize: 14 }}>
                พบไฟล์สำรองข้อมูล{pendingImport.exportedAt ? ` (ส่งออกเมื่อ ${thaiDate(pendingImport.exportedAt.slice(0, 10))})` : ''} — มีสินทรัพย์ {Array.isArray(pendingImport.holdings) ? pendingImport.holdings.length : 0} รายการ
              </div>
              <div style={{ marginBottom: 10, fontSize: 12.5, color: 'var(--muted)' }}>การนำเข้าจะแทนที่ข้อมูลปัจจุบันทั้งหมดในเครื่องนี้ ถ้าไม่แน่ใจ แนะนำให้กด "ส่งออกข้อมูล" สำรองของปัจจุบันไว้ก่อน</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="pf-btn pf-btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setPendingImport(null)}>ยกเลิก</button>
                <button className="pf-btn pf-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={confirmImport}>ยืนยันนำเข้า</button>
              </div>
            </div>
          )}

          {confirmClear && (
            <div className="pf-confirm">
              <div style={{ marginBottom: 10, fontSize: 14 }}>ล้างข้อมูลสินทรัพย์และประวัติทั้งหมด? ทำแล้วกู้คืนไม่ได้</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="pf-btn pf-btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmClear(false)}>ยกเลิก</button>
                <button className="pf-btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--neg)', color: '#fff', border: 'none' }} onClick={clearAll}>ยืนยันล้างข้อมูล</button>
              </div>
            </div>
          )}

          <div className="pf-hero">
            <div className="pf-hero-label">มูลค่าพอร์ตรวม</div>
            <div className="pf-hero-value pf-mono">฿{fmt(totalValue)}</div>
            <div className={`pf-hero-sub ${totalGain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>
              {totalGain >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              <span className="pf-mono">{totalGain >= 0 ? '+' : ''}{fmt(totalGain)} บาท ({totalGain >= 0 ? '+' : ''}{fmt(totalGainPct)}%)</span>
            </div>
            {chartData.length > 1 && (
              <div className="pf-spark">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Line type="monotone" dataKey="value" stroke="#C7A344" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="pf-updated">อัปเดตล่าสุด: {lastUpdated ? thaiDate(lastUpdated) : 'ยังไม่มีการอัปเดต'}</div>
          </div>

          {holdings.length === 0 && !cashActive ? (
            <div className="pf-empty">
              <Inbox size={26} style={{ marginBottom: 8, opacity: 0.6 }} />
              <div>ยังไม่มีสินทรัพย์ในพอร์ต</div>
              <button className="pf-btn pf-btn-primary pf-empty-cta" onClick={openAdd}><Plus size={16} /> เพิ่มสินทรัพย์แรก</button>
            </div>
          ) : (
            <>
              <div className="pf-section-label">สัดส่วนสินทรัพย์รวม</div>
              <div className="pf-donut-row">
                <ExplodedPie3D data={byType.map((t) => ({ key: t.key, label: t.label, color: t.color, value: t.value }))} rx={100} />
                <div className="pf-legend pf-legend-col">
                  {byType.map((t) => (
                    <div className="pf-legend-item" key={t.key}>
                      <span className="pf-dot" style={{ background: t.color }} />
                      <span>{t.label}</span>
                      <span className="pf-legend-val pf-mono">{fmt((t.value / totalValue) * 100, 1)}% · ฿{fmt(t.value, 0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pf-section-label">แยกตามประเภทสินทรัพย์ ({holdings.length})</div>
              {byType.map((t) => {
                if (t.key === 'cash') {
                  const investedPct = totalCapital > 0 ? Math.min(100, (totalInvestedCost / totalCapital) * 100) : 0;
                  const recentLedger = ledger.slice().sort((a, b) => b.id.localeCompare(a.id));
                  const legacyCashHoldings = holdings.filter((h) => h.type === 'cash');
                  return (
                    <div className="pf-type-section" key="cash">
                      <div className="pf-type-section-head">
                        <div className="pf-type-section-info" style={{ flex: 1 }}>
                          <div className="pf-type-section-title"><span className="pf-dot" style={{ background: t.color }} />{t.label}</div>
                          <div className="pf-type-section-value pf-mono">฿{fmt(computedCash, 0)}</div>
                          <div className="pf-type-section-pct pf-mono">{fmt((t.value / totalValue) * 100, 1)}% ของพอร์ตรวม</div>
                        </div>
                      </div>

                      <div className="pf-cash-ledger">
                        <div className="pf-capital-row">
                          <span>ทุนเริ่มต้น</span>
                          <span className="pf-mono">฿{fmt(initialCapital, 0)}</span>
                        </div>
                        {capitalAdjTotal !== 0 && (
                          <div className="pf-capital-row">
                            <span>ทุนที่เพิ่ม/ลด สะสม</span>
                            <span className={`pf-mono ${capitalAdjTotal >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>{capitalAdjTotal >= 0 ? '+' : ''}฿{fmt(capitalAdjTotal, 0)}</span>
                          </div>
                        )}
                        <div className="pf-capital-row">
                          <span>ลงทุนไปแล้ว (ต้นทุนรวม)</span>
                          <span className="pf-mono">-฿{fmt(totalInvestedCost, 0)}</span>
                        </div>
                        {cashAdjTotal !== 0 && (
                          <div className="pf-capital-row">
                            <span>กำไร/ขาดทุน/ปันผล สะสม</span>
                            <span className={`pf-mono ${cashAdjTotal >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>{cashAdjTotal >= 0 ? '+' : ''}฿{fmt(cashAdjTotal, 0)}</span>
                          </div>
                        )}
                        <div className="pf-capital-bar">
                          <div className="pf-capital-bar-fill" style={{ width: `${investedPct}%` }} />
                        </div>
                        <div className={`pf-capital-row pf-capital-highlight ${computedCash < 0 ? 'pf-chip-neg' : 'pf-chip-pos'}`}>
                          <span>{computedCash < 0 ? 'เงินสดติดลบ (ลงทุนเกินทุน)' : 'เงินสดคงเหลือ'}</span>
                          <span className="pf-mono">฿{fmt(Math.abs(computedCash), 0)}</span>
                        </div>
                      </div>

                      <div className="pf-cash-actions">
                        <button className="pf-cash-action-btn" onClick={() => openLedgerForm('capital_add')}>+ เพิ่มทุน</button>
                        <button className="pf-cash-action-btn" onClick={() => openLedgerForm('capital_reduce')}>- ลดทุน</button>
                        <button className="pf-cash-action-btn" onClick={() => openLedgerForm('profit')}>+ กำไร</button>
                        <button className="pf-cash-action-btn" onClick={() => openLedgerForm('loss')}>- ขาดทุน</button>
                        <button className="pf-cash-action-btn" onClick={() => openLedgerForm('dividend')}>+ ปันผล</button>
                      </div>

                      {legacyCashHoldings.length > 0 && (
                        <div className="pf-type-section-holdings">
                          <div className="pf-legacy-note">รายการเงินสดแบบเก่า (กรอกเองก่อนหน้านี้) — ไม่ถูกนับในยอดคำนวณอัตโนมัติด้านบนแล้ว แนะนำให้ลบแล้วใช้ปุ่ม "เพิ่มทุน" แทน</div>
                          {legacyCashHoldings.map((h) => (
                            <div className="pf-subrow" key={h.id}>
                              <div className="pf-row-top">
                                <div className="pf-row-name">
                                  <span className="pf-row-name-text">{h.name}</span>
                                </div>
                                <div className="pf-row-actions">
                                  <button aria-label="ลบ" onClick={() => deleteHolding(h.id)}><Trash2 size={15} /></button>
                                </div>
                              </div>
                              <div className="pf-row-meta pf-mono">
                                <span>จำนวนเงิน <b>{h.currency === 'USD' ? '$' : '฿'}{fmt(h.quantity)}</b></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {recentLedger.length > 0 && (
                        <div className="pf-type-section-holdings">
                          {recentLedger.map((e) => (
                            <div className="pf-subrow" key={e.id}>
                              <div className="pf-row-top">
                                <div className="pf-row-name">
                                  <span className="pf-row-name-text">{LEDGER_LABELS[e.type]}</span>
                                </div>
                                <div className="pf-row-actions">
                                  <button aria-label="ลบ" onClick={() => deleteLedgerEntry(e.id)}><Trash2 size={15} /></button>
                                </div>
                              </div>
                              <div className="pf-row-meta pf-mono">
                                <span>จำนวน <b>฿{fmt(e.amount)}</b></span>
                                <span style={{ marginLeft: 'auto' }}>{thaiDate(e.date)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                const typeHoldings = enriched.filter((h) => h.type === t.key).sort((a, b) => b.marketValue - a.marketValue);
                const typeCost = typeHoldings.reduce((s, h) => s + h.costValue, 0);
                const typeGain = t.value - typeCost;
                const typeGainPct = typeCost > 0 ? (typeGain / typeCost) * 100 : 0;
                const shades = shadeSet(t.color, typeHoldings.length);
                const colorById = {};
                typeHoldings.forEach((h, i) => { colorById[h.id] = shades[i]; });

                const canToggleIndustry = t.key === 'th_stock' || t.key === 'foreign_stock';
                const viewMode = canToggleIndustry && chartModeByType[t.key] === 'industry' ? 'industry' : 'holding';

                let chartData;
                let breakdownItems;
                if (viewMode === 'industry') {
                  const groups = {};
                  typeHoldings.forEach((h) => {
                    const ind = (h.industry && h.industry.trim()) || 'อื่นๆ';
                    groups[ind] = (groups[ind] || 0) + h.marketValue;
                  });
                  const industryNames = Object.keys(groups).sort((a, b) => groups[b] - groups[a]);
                  const industryColors = shadeSet(t.color, industryNames.length);
                  const industryColorById = {};
                  industryNames.forEach((name, i) => { industryColorById[name] = industryColors[i]; });
                  chartData = industryNames.map((name) => ({ key: name, label: name, color: industryColorById[name], value: groups[name] }));
                  breakdownItems = chartData;
                } else {
                  // Keep the wedge count readable (max 6) — group the smallest holdings into "อื่นๆ" for the chart only;
                  // the full breakdown list below still shows every holding individually.
                  if (typeHoldings.length > 6) {
                    const top = typeHoldings.slice(0, 5);
                    const othersValue = typeHoldings.slice(5).reduce((s, h) => s + h.marketValue, 0);
                    chartData = [
                      ...top.map((h) => ({ key: h.id, label: h.name, color: colorById[h.id], value: h.marketValue })),
                      { key: '__others__', label: `อื่นๆ (${typeHoldings.length - 5} รายการ)`, color: '#5B6779', value: othersValue },
                    ];
                  } else {
                    chartData = typeHoldings.map((h) => ({ key: h.id, label: h.name, color: colorById[h.id], value: h.marketValue }));
                  }
                  breakdownItems = typeHoldings.map((h) => ({ key: h.id, label: h.name, color: colorById[h.id], value: h.marketValue }));
                }
                return (
                  <div className="pf-type-section" key={t.key}>
                    <div className="pf-type-section-head">
                      <div
                        onClick={canToggleIndustry ? () => toggleChartMode(t.key) : undefined}
                        className={canToggleIndustry ? 'pf-pie-tap' : undefined}
                        role={canToggleIndustry ? 'button' : undefined}
                        tabIndex={canToggleIndustry ? 0 : undefined}
                        onKeyDown={canToggleIndustry ? (e) => { if (e.key === 'Enter') toggleChartMode(t.key); } : undefined}
                      >
                        <ExplodedPie3D data={chartData} rx={62} depth={14} explode={5} />
                        {canToggleIndustry && <div className="pf-pie-tap-hint">{viewMode === 'industry' ? 'แตะดูรายตัว' : 'แตะดูอุตสาหกรรม'}</div>}
                      </div>
                      <div className="pf-type-section-info">
                        <div className="pf-type-section-title"><span className="pf-dot" style={{ background: t.color }} />{t.label}</div>
                        <div className="pf-type-section-value pf-mono">฿{fmt(t.value, 0)}</div>
                        {t.key !== 'cash' && typeCost > 0 && (
                          <div className={`pf-type-section-gain pf-mono ${typeGain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>
                            {typeGain >= 0 ? '+' : ''}{fmt(typeGain, 0)} ({typeGain >= 0 ? '+' : ''}{fmt(typeGainPct, 1)}%)
                          </div>
                        )}
                        <div className="pf-type-section-pct pf-mono">{fmt((t.value / totalValue) * 100, 1)}% ของพอร์ตรวม</div>
                      </div>
                    </div>
                    {breakdownItems.length > 1 && (
                      <div className={`pf-type-breakdown ${breakdownItems.length > 8 ? 'pf-type-breakdown-scroll' : ''}`}>
                        {viewMode === 'industry' && <div className="pf-type-breakdown-caption">สัดส่วนตามอุตสาหกรรม</div>}
                        {breakdownItems.map((b) => (
                          <div className="pf-type-breakdown-item" key={b.key}>
                            <span className="pf-dot" style={{ background: b.color }} />
                            <span className="pf-type-breakdown-name">{b.label}</span>
                            <span className="pf-mono pf-type-breakdown-pct">{fmt((b.value / t.value) * 100, 1)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="pf-type-section-holdings">
                      {typeHoldings.map((h) => (
                        <div className="pf-subrow" key={h.id}>
                          <div className="pf-row-top">
                            <div className="pf-row-name">
                              <span className="pf-dot" style={{ background: colorById[h.id] }} />
                              <span className="pf-row-name-text">{h.name}</span>
                            </div>
                            <div className="pf-row-actions">
                              <button aria-label="แก้ไข" onClick={() => openEdit(h)}><Pencil size={15} /></button>
                              <button aria-label="ลบ" onClick={() => deleteHolding(h.id)}><Trash2 size={15} /></button>
                            </div>
                          </div>
                          {h.type === 'cash' ? (
                            <div className="pf-row-meta pf-mono">
                              <span>จำนวนเงิน <b>{h.currency === 'USD' ? '$' : '฿'}{fmt(h.qty)}</b></span>
                              {h.currency === 'USD' && <span>≈ <b>฿{fmt(h.marketValue)}</b></span>}
                              {typeHoldings.length > 1 && <span>สัดส่วนในหมวด <b>{fmt((h.marketValue / t.value) * 100, 1)}%</b></span>}
                              <span style={{ marginLeft: 'auto' }}>อัปเดต {thaiDate(h.lastUpdated)}</span>
                            </div>
                          ) : (
                            <div className="pf-row-meta pf-mono">
                              <span>จำนวน <b>{fmt(h.qty, h.qty % 1 === 0 ? 0 : 2)}</b></span>
                              <span>ทุนเฉลี่ย <b>{h.currency === 'USD' ? '$' : '฿'}{fmt(h.avg)}</b></span>
                              <span>ราคาล่าสุด <b>{h.currency === 'USD' ? '$' : '฿'}{fmt(h.price)}</b></span>
                              <span>ต้นทุนรวม <b>฿{fmt(h.costValue)}</b></span>
                              <span>มูลค่า <b>฿{fmt(h.marketValue)}</b>{h.currency === 'USD' ? <span style={{ opacity: 0.7 }}> (${fmt(h.qty * h.price)})</span> : null}</span>
                              {typeHoldings.length > 1 && <span>สัดส่วนในหมวด <b>{fmt((h.marketValue / t.value) * 100, 1)}%</b></span>}
                              <span className={h.gain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}>
                                {h.gain >= 0 ? '+' : ''}{fmt(h.gain)} ({h.gain >= 0 ? '+' : ''}{fmt(h.gainPct, 1)}%)
                              </span>
                              <span style={{ marginLeft: 'auto' }}>อัปเดต {thaiDate(h.lastUpdated)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <div className="pf-fab">
            {holdings.length > 0 && (
              <button className="pf-btn pf-btn-ghost" onClick={openUpdatePrices}><RefreshCw size={15} /> อัปเดตราคาวันนี้</button>
            )}
            <button className="pf-btn pf-btn-primary" onClick={openAdd}><Plus size={16} /> เพิ่ม</button>
          </div>
        </>
      )}

      {panel === 'form' && (
        <div className="pf-overlay" onClick={closePanel}>
          <div className="pf-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pf-panel-head">
              <div className="pf-panel-title">{editingId ? 'แก้ไขสินทรัพย์' : 'เพิ่มสินทรัพย์'}</div>
              <button className="pf-icon-btn" onClick={closePanel} aria-label="ปิด"><X size={16} /></button>
            </div>
            {formError && <div className="pf-error">{formError}</div>}
            <div className="pf-field">
              <label className="pf-label">ชื่อสินทรัพย์</label>
              <input className="pf-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น PTT, Bitcoin, ทองคำแท่ง" />
            </div>
            {form.type !== 'cash' && (
              <div className="pf-field">
                <label className="pf-label">สัญลักษณ์ {typeInfo(form.type).market ? '(ใส่เพื่อดึงราคาอัตโนมัติได้)' : '(ถ้ามี)'}</label>
                <input className="pf-input" value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })} placeholder={TICKER_HINT[form.type] || 'ไม่บังคับ'} />
              </div>
            )}
            {(form.type === 'th_stock' || form.type === 'foreign_stock') && (
              <div className="pf-field">
                <label className="pf-label">กลุ่มอุตสาหกรรม (ถ้ามี)</label>
                <input className="pf-input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="เช่น พลังงาน, เทคโนโลยี, ธนาคาร" />
                <div className="pf-currency-hint">ใส่ไว้เพื่อดูสัดส่วนพอร์ตแบ่งตามอุตสาหกรรมได้ — แตะที่กราฟวงกลมของหุ้นไทย/หุ้นต่างประเทศเพื่อสลับมุมมอง</div>
              </div>
            )}
            <div className="pf-field">
              <label className="pf-label">ประเภทสินทรัพย์</label>
              <select className="pf-select" value={form.type} onChange={(e) => onFormTypeChange(e.target.value)}>
                {ASSET_TYPES.filter((t) => t.key !== 'cash').map((t) => <option value={t.key} key={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label className="pf-label">สกุลเงิน</label>
              <div className="pf-currency-toggle">
                <button type="button" className={form.currency !== 'USD' ? 'pf-currency-active' : ''} onClick={() => setForm({ ...form, currency: 'THB' })}>บาท (THB)</button>
                <button type="button" className={form.currency === 'USD' ? 'pf-currency-active' : ''} onClick={() => setForm({ ...form, currency: 'USD' })}>ดอลลาร์ (USD)</button>
              </div>
              {form.currency === 'USD' && form.type !== 'cash' && <div className="pf-currency-hint">กรอกทุนและราคาเป็น USD ได้เลย ระบบจะแปลงเป็นบาทให้อัตโนมัติตามอัตราแลกเปลี่ยนที่ตั้งไว้</div>}
            </div>
            {form.type === 'cash' ? (
              <div className="pf-field">
                <label className="pf-label">จำนวนเงิน ({form.currency === 'USD' ? 'USD' : 'บาท'})</label>
                <input className="pf-input pf-mono" inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0.00" />
                <div className="pf-currency-hint">เงินสดใส่แค่จำนวนเงินก็พอ ไม่ต้องกรอกราคาต้นทุนหรือราคาปัจจุบัน บันทึกได้เลย</div>
              </div>
            ) : (
              <>
                <div className="pf-row2">
                  <div className="pf-field">
                    <label className="pf-label">จำนวน</label>
                    <input className="pf-input pf-mono" inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">ราคาต้นทุนเฉลี่ย ({form.currency === 'USD' ? 'USD' : 'บาท'})</label>
                    <input className="pf-input pf-mono" inputMode="decimal" value={form.avgCost} onChange={(e) => setForm({ ...form, avgCost: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <div className="pf-field">
                  <label className="pf-label">ราคาปัจจุบัน ({form.currency === 'USD' ? 'USD' : 'บาท'})</label>
                  <input className="pf-input pf-mono" inputMode="decimal" value={form.currentPrice} onChange={(e) => setForm({ ...form, currentPrice: e.target.value })} placeholder="0.00" />
                </div>
              </>
            )}
            <div className="pf-panel-actions">
              <button className="pf-btn pf-btn-ghost" onClick={closePanel}>ยกเลิก</button>
              <button className="pf-btn pf-btn-primary" onClick={submitForm}>{editingId ? 'บันทึกการแก้ไข' : 'เพิ่มสินทรัพย์'}</button>
            </div>
          </div>
        </div>
      )}

      {panel === 'update' && (
        <div className="pf-overlay" onClick={closePanel}>
          <div className="pf-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pf-panel-head">
              <div className="pf-panel-title">อัปเดตราคาวันนี้</div>
              <button className="pf-icon-btn" onClick={closePanel} aria-label="ปิด"><X size={16} /></button>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 10 }}>ใส่ราคาล่าสุดของแต่ละสินทรัพย์ตามสกุลเงินที่บันทึกไว้ (อ้างอิงราคาตลาดปิดหลัง 1 ทุ่ม) หรือดึงอัตโนมัติสำหรับรายการที่ใส่สัญลักษณ์ไว้ — ระบบแปลงเป็นบาทให้เองด้วยอัตรา 1 USD ≈ ฿{fmt(fxRate)}</div>
            <button className="pf-btn pf-btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }} onClick={fetchAutoPrices} disabled={fetchingPrices}>
              <Zap size={15} /> {fetchingPrices ? 'กำลังดึงราคา...' : 'ดึงราคาอัตโนมัติ'}
            </button>
            {holdings.filter((h) => h.type !== 'cash').map((h) => (
              <div className="pf-update-item" key={h.id}>
                <span className="pf-update-name">{h.name} <span style={{ opacity: 0.6 }}>({h.currency === 'USD' ? 'USD' : 'บาท'})</span></span>
                <input className="pf-input pf-mono pf-update-input" inputMode="decimal" value={updateDraft[h.id] ?? ''} onChange={(e) => setUpdateDraft({ ...updateDraft, [h.id]: e.target.value })} />
              </div>
            ))}
            <div className="pf-panel-actions">
              <button className="pf-btn pf-btn-ghost" onClick={closePanel}>ยกเลิก</button>
              <button className="pf-btn pf-btn-primary" onClick={submitUpdatePrices}>บันทึกราคาวันนี้</button>
            </div>
          </div>
        </div>
      )}

      {panel === 'settings' && (
        <div className="pf-overlay" onClick={closePanel}>
          <div className="pf-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pf-panel-head">
              <div className="pf-panel-title">ตั้งค่า</div>
              <button className="pf-icon-btn" onClick={closePanel} aria-label="ปิด"><X size={16} /></button>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 12 }}>
              ใส่ URL ของ serverless function ที่ดึงราคาจาก Finnhub / Yahoo Finance ให้ (ดูวิธีสร้างในไฟล์ README ที่แนบมา) เช่น https://your-project.vercel.app/api/prices
            </div>
            <div className="pf-field">
              <label className="pf-label">Endpoint URL</label>
              <input className="pf-input pf-mono" value={backendDraft} onChange={(e) => setBackendDraft(e.target.value)} placeholder="https://your-project.vercel.app/api/prices" />
            </div>
            <div className="pf-field">
              <label className="pf-label">อัตราแลกเปลี่ยน 1 USD = ? บาท</label>
              <div className="pf-row2">
                <input className="pf-input pf-mono" inputMode="decimal" value={fxDraft} onChange={(e) => setFxDraft(e.target.value)} placeholder="36.50" />
                <button className="pf-btn pf-btn-ghost" style={{ flex: '0 0 auto' }} onClick={fetchFxRate} disabled={fetchingFx}>
                  <Zap size={15} /> {fetchingFx ? '...' : 'ดึงอัตโนมัติ'}
                </button>
              </div>
              <div className="pf-currency-hint">ใช้แปลงมูลค่าสินทรัพย์ที่บันทึกเป็นดอลลาร์ให้เป็นบาทตอนคำนวณพอร์ตรวม อัปเดตเป็นครั้งคราวก็พอ ไม่จำเป็นต้องเป๊ะทุกวัน</div>
            </div>
            <div className="pf-field">
              <label className="pf-label">ทุนเริ่มต้นทั้งหมด (บาท)</label>
              <input className="pf-input pf-mono" inputMode="decimal" value={initialCapitalDraft} onChange={(e) => setInitialCapitalDraft(e.target.value)} placeholder="เช่น 100000" />
              <div className="pf-currency-hint">ใส่จำนวนเงินทุนทั้งหมดที่ตั้งใจจะลงทุน ระบบจะเอาไปหักลบกับต้นทุนที่ลงทุนไปแล้ว แล้วโชว์ส่วนที่เหลือเป็น "เงินสดที่ยังไม่ได้ลงทุน" ให้อัตโนมัติ ปล่อยว่างไว้ได้ถ้าไม่ต้องการใช้ฟีเจอร์นี้</div>
            </div>
            <div className="pf-panel-actions">
              <button className="pf-btn pf-btn-ghost" onClick={closePanel}>ยกเลิก</button>
              <button className="pf-btn pf-btn-primary" onClick={saveBackendUrl}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {panel === 'ledger' && (
        <div className="pf-overlay" onClick={closePanel}>
          <div className="pf-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pf-panel-head">
              <div className="pf-panel-title">{LEDGER_LABELS[ledgerType]}</div>
              <button className="pf-icon-btn" onClick={closePanel} aria-label="ปิด"><X size={16} /></button>
            </div>
            {ledgerError && <div className="pf-error">{ledgerError}</div>}
            <div className="pf-field">
              <label className="pf-label">จำนวนเงิน (บาท)</label>
              <input className="pf-input pf-mono" inputMode="decimal" value={ledgerAmount} onChange={(e) => setLedgerAmount(e.target.value)} placeholder="0.00" autoFocus />
              <div className="pf-currency-hint">
                {ledgerType === 'capital_add' && 'จะถูกบวกเพิ่มเข้าไปในทุนเริ่มต้น'}
                {ledgerType === 'capital_reduce' && 'จะถูกหักออกจากทุนเริ่มต้น (เช่น ถอนเงินออกจากพอร์ต)'}
                {ledgerType === 'profit' && 'กำไรที่รับรู้แล้ว จะถูกบวกเพิ่มเข้าเงินสด'}
                {ledgerType === 'loss' && 'ขาดทุนที่รับรู้แล้ว จะถูกหักออกจากเงินสด'}
                {ledgerType === 'dividend' && 'เงินปันผลที่ได้รับ จะถูกบวกเพิ่มเข้าเงินสด'}
              </div>
            </div>
            <div className="pf-panel-actions">
              <button className="pf-btn pf-btn-ghost" onClick={closePanel}>ยกเลิก</button>
              <button className="pf-btn pf-btn-primary" onClick={submitLedger}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="pf-toast">{toast}</div>}
    </div>
  );
}
