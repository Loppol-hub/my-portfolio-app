import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, X, TrendingUp, TrendingDown, MoreVertical, Inbox, Zap, Wallet, ChevronRight, ArrowDownWideNarrow, ArrowDownAZ, PlusCircle, MinusCircle, Gift, Sliders } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const ASSET_TYPES = [
  { key: 'th_stock', label: 'หุ้นไทย', color: '#C7A344', market: 'th', defaultCurrency: 'THB' },
  { key: 'foreign_stock', label: 'หุ้นต่างประเทศ', color: '#6E8CB0', market: 'us', defaultCurrency: 'USD' },
  { key: 'crypto', label: 'คริปโต', color: '#967ACC', market: 'crypto', defaultCurrency: 'USD' },
  { key: 'gold', label: 'ทองคำ', color: '#D9823F', market: 'gold', defaultCurrency: 'USD' },
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
const emptyForm = { name: '', ticker: '', type: 'th_stock', quantity: '', avgCost: '', currentPrice: '', currency: 'THB', industry: '', instrumentType: 'stock' };
const INSTRUMENT_TYPES = [
  { key: 'stock', label: 'หุ้นรายตัว' },
  { key: 'dr', label: 'DR (Depositary Receipt)' },
  { key: 'etf', label: 'ETF' },
];
const INSTRUMENT_RANK = { stock: 0, dr: 1, etf: 2 };

export default function PortfolioApp() {
  const [activeTab, setActiveTab] = useState(3);
  const [holdings, setHoldings] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [panel, setPanel] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [updateDraft, setUpdateDraft] = useState({});
  const [toast, setToast] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);
  const [chartModeByType, setChartModeByType] = useState({});
  const [sortModeByType, setSortModeByType] = useState({});
  const [excludedTypes, setExcludedTypes] = useState({});
  const toggleChartMode = (typeKey) => {
    setChartModeByType((prev) => ({ ...prev, [typeKey]: prev[typeKey] === 'industry' ? 'holding' : 'industry' }));
  };
  const [backendUrl, setBackendUrl] = useState('');
  const [backendDraft, setBackendDraft] = useState('');
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [fetchIssues, setFetchIssues] = useState([]);
  const [fxRate, setFxRate] = useState(36.5);
  const [fxDraft, setFxDraft] = useState('36.5');
  const [fetchingFx, setFetchingFx] = useState(false);
  const holdingsRef = useRef(holdings);
  const historyRef = useRef(history);
  const fxRateRef = useRef(fxRate);
  const backendUrlRef = useRef(backendUrl);
  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { fxRateRef.current = fxRate; }, [fxRate]);
  useEffect(() => { backendUrlRef.current = backendUrl; }, [backendUrl]);
  const [initialCapital, setInitialCapital] = useState(0);
  const [initialCapitalDraft, setInitialCapitalDraft] = useState('');
  const [ledger, setLedger] = useState([]);
  const [ledgerType, setLedgerType] = useState(null);
  const [ledgerAmount, setLedgerAmount] = useState('');
  const [ledgerError, setLedgerError] = useState('');
  const [ledgerNote, setLedgerNote] = useState('');
  const [ledgerDate, setLedgerDate] = useState('');

  const [graphModeTotal, setGraphModeTotal] = useState('all');
  const [graphYearTotal, setGraphYearTotal] = useState(String(new Date().getFullYear()));
  const [graphModeGain, setGraphModeGain] = useState('all');
  const [graphYearGain, setGraphYearGain] = useState(String(new Date().getFullYear()));
  const [graphModeTh, setGraphModeTh] = useState('all');
  const [graphYearTh, setGraphYearTh] = useState(String(new Date().getFullYear()));
  const [graphModeUs, setGraphModeUs] = useState('all');
  const [graphYearUs, setGraphYearUs] = useState(String(new Date().getFullYear()));

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (loading) return;
    runAutoPriceUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const eveningFiredRef = useRef(null);
  useEffect(() => {
    const checkEvening = () => {
      const now = new Date();
      const todayKey = todayStr();
      if (now.getHours() === 19 && eveningFiredRef.current !== todayKey) {
        eveningFiredRef.current = todayKey;
        runAutoPriceUpdate();
      }
    };
    const interval = setInterval(checkEvening, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      } catch (e) { /* no data */ }
      try {
        const r2 = await window.storage.get('portfolio-history', false);
        if (r2 && r2.value) hist = JSON.parse(r2.value);
      } catch (e) { /* no data */ }
      let url = '';
      try {
        const r3 = await window.storage.get('backend-url', false);
        if (r3 && r3.value) url = r3.value;
      } catch (e) { /* not set */ }
      let fx = 36.5;
      try {
        const r4 = await window.storage.get('fx-usdthb', false);
        if (r4 && r4.value) fx = parseFloat(r4.value) || 36.5;
      } catch (e) { /* not set */ }
      let capital = 0;
      try {
        const r5 = await window.storage.get('initial-capital', false);
        if (r5 && r5.value) capital = parseFloat(r5.value) || 0;
      } catch (e) { /* not set */ }
      let ledgerData = [];
      try {
        const r6 = await window.storage.get('cash-ledger', false);
        if (r6 && r6.value) ledgerData = JSON.parse(r6.value);
      } catch (e) { /* not set */ }
      let excluded = {};
      try {
        const r7 = await window.storage.get('excluded-types', false);
        if (r7 && r7.value) excluded = JSON.parse(r7.value);
      } catch (e) { /* not set */ }
      setHoldings(Array.isArray(h) ? h : []);
      setHistory(Array.isArray(hist) ? hist : []);
      setBackendUrl(url);
      setBackendDraft(url);
      setFxRate(fx);
      setFxDraft(String(fx));
      setInitialCapital(capital);
      setInitialCapitalDraft(capital > 0 ? String(capital) : '');
      setLedger(Array.isArray(ledgerData) ? ledgerData : []);
      setExcludedTypes(excluded && typeof excluded === 'object' ? excluded : {});
    } catch (e) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const saveHoldings = async (next) => {
    setHoldings(next);
    try { await window.storage.set('holdings', JSON.stringify(next), false); }
    catch (e) { showToast('บันทึกไม่สำเร็จ'); }
  };

  const saveHistory = async (next) => {
    setHistory(next);
    try { await window.storage.set('portfolio-history', JSON.stringify(next), false); }
    catch (e) { showToast('บันทึกประวัติไม่สำเร็จ'); }
  };

  const getEffectiveRate = (type, rate) => {
    if (type === 'foreign_stock' || type === 'gold') return Math.max(0, rate - 0.05);
    if (type === 'crypto') return Math.max(0, rate - 0.1);
    return rate;
  };

  const enriched = useMemo(() => holdings.map((h) => {
    const qty = parseFloat(h.quantity) || 0;
    const avg = parseFloat(h.avgCost) || 0;
    let price = parseFloat(h.currentPrice) || 0;
    if (h.type === 'gold') { price = Math.max(0, price - 25); }
    const currency = h.currency === 'USD' ? 'USD' : 'THB';
    const rate = currency === 'USD' ? getEffectiveRate(h.type, fxRate) : 1;
    const marketValue = qty * price * rate;
    const costValue = qty * avg * rate;
    const gain = marketValue - costValue;
    const gainPct = costValue > 0 ? (gain / costValue) * 100 : 0;
    
    let effectiveType = h.type;
    if (effectiveType === 'th_stock' && h.instrumentType === 'dr') {
      effectiveType = 'foreign_stock';
    }
    return { ...h, type: effectiveType, qty, avg, price, currency, marketValue, costValue, gain, gainPct };
  }), [holdings, fxRate]);

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
  const recentLedger = useMemo(() => ledger.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id)), [ledger]);

  const buddhistYear = (y) => (parseInt(y, 10) || 0) + 543;
  const currentYearKey = String(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(currentYearKey);
  const yearOptions = useMemo(() => {
    const set = new Set([currentYearKey, ...ledger.map((e) => (e.date || '').slice(0, 4)).filter(Boolean), ...history.map((h) => (h.date || '').slice(0, 4)).filter(Boolean)]);
    return Array.from(set).sort((a, b) => b.localeCompare(a)).slice(0, 5);
  }, [ledger, history, currentYearKey]);
  
  useEffect(() => {
    if (!yearOptions.includes(selectedYear)) setSelectedYear(yearOptions[0] || currentYearKey);
  }, [yearOptions]);

  const yearSummary = useMemo(() => {
    const d = { capital_add: 0, capital_reduce: 0, profit: 0, loss: 0, dividend: 0 };
    ledger.forEach((e) => { if ((e.date || '').slice(0, 4) === selectedYear) d[e.type] = (d[e.type] || 0) + e.amount; });
    const net = d.capital_add - d.capital_reduce + d.profit - d.loss + d.dividend;
    const totalIn = d.capital_add + d.profit + d.dividend;
    const totalOut = d.capital_reduce + d.loss;
    const totalFlow = totalIn + totalOut;
    const inPct = totalFlow > 0 ? (totalIn / totalFlow) * 100 : 0;
    return { ...d, net, totalIn, totalOut, inPct };
  }, [ledger, selectedYear]);

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

  const displayByType = useMemo(() => byType.filter((t) => !excludedTypes[t.key]), [byType, excludedTypes]);
  const displayTotalValue = useMemo(() => displayByType.reduce((s, t) => s + t.value, 0), [displayByType]);
  const heroProfitAmount = displayTotalValue - totalCapital;
  const heroProfitPct = totalCapital > 0 ? (heroProfitAmount / totalCapital) * 100 : null;

  const lastUpdated = useMemo(() => {
    const dates = holdings.map((h) => h.lastUpdated).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : null;
  }, [holdings]);

  const filterHistoryByMode = (mode, year) => {
    if (mode === 'year') {
      return history.filter((p) => (p.date || '').slice(0, 4) === year);
    }
    return history;
  };

  const chartDataTotal = useMemo(() => {
    const filtered = filterHistoryByMode(graphModeTotal, graphYearTotal);
    return filtered.map((p) => ({ date: p.date, value: p.value, principal: totalCapital }));
  }, [history, graphModeTotal, graphYearTotal, totalCapital]);

  const chartDataGainCard = useMemo(() => {
    const filtered = filterHistoryByMode(graphModeGain, graphYearGain);
    return filtered.map((p) => {
      const gain = p.value - totalInvestedCost;
      return { date: p.date, gain: gain, cost: totalInvestedCost };
    });
  }, [history, graphModeGain, graphYearGain, totalInvestedCost]);

  const chartDataTh = useMemo(() => {
    const filtered = filterHistoryByMode(graphModeTh, graphYearTh);
    const thHoldings = enriched.filter(h => h.type === 'th_stock');
    const thCost = thHoldings.reduce((s, h) => s + h.costValue, 0);
    return filtered.map((p) => {
      const ratio = totalInvestedValue > 0 ? thHoldings.reduce((s,h)=>s+h.marketValue,0) / totalInvestedValue : 0;
      const val = p.value * ratio;
      const gain = val - thCost;
      return { date: p.date, gain: gain, cost: thCost };
    });
  }, [history, graphModeTh, graphYearTh, enriched, totalInvestedValue]);

  const chartDataUs = useMemo(() => {
    const filtered = filterHistoryByMode(graphModeUs, graphYearUs);
    const usHoldings = enriched.filter(h => h.type === 'foreign_stock');
    const usCost = usHoldings.reduce((s, h) => s + h.costValue, 0);
    return filtered.map((p) => {
      const ratio = totalInvestedValue > 0 ? usHoldings.reduce((s,h)=>s+h.marketValue,0) / totalInvestedValue : 0;
      const val = p.value * ratio;
      const gain = val - usCost;
      return { date: p.date, gain: gain, cost: usCost };
    });
  }, [history, graphModeUs, graphYearUs, enriched, totalInvestedValue]);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setFormError(''); setPanel('form'); };
  const openEdit = (h) => {
    setForm({ name: h.name, ticker: h.ticker || '', type: h.type, quantity: String(h.quantity), avgCost: String(h.avgCost), currentPrice: String(h.currentPrice), currency: h.currency === 'USD' ? 'USD' : 'THB', industry: h.industry || '', instrumentType: h.instrumentType || 'stock' });
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
    const instrumentType = (form.type === 'th_stock' || form.type === 'foreign_stock') ? (form.instrumentType || 'stock') : 'stock';
    if (editingId) {
      const next = holdings.map((h) => h.id === editingId ? { ...h, name: form.name.trim(), ticker: form.ticker.trim(), type: form.type, quantity: qty, avgCost: avg, currentPrice: price, currency, industry, instrumentType } : h);
      saveHoldings(next);
      showToast('แก้ไขรายการแล้ว');
    } else {
      const next = [...holdings, { id: Date.now().toString(), name: form.name.trim(), ticker: form.ticker.trim(), type: form.type, quantity: qty, avgCost: avg, currentPrice: price, currency, industry, instrumentType, lastUpdated: todayStr() }];
      saveHoldings(next);
      showToast('เพิ่มสินทรัพย์แล้ว');
    }
    closePanel();
  };

  const deleteHolding = (id) => {
    saveHoldings(holdings.filter((h) => h.id !== id));
    showToast('ลบรายการแล้ว');
  };

  const requestDelete = (type, id, label) => setConfirmDeleteTarget({ type, id, label });

  const performDelete = () => {
    if (!confirmDeleteTarget) return;
    if (confirmDeleteTarget.type === 'holding') deleteHolding(confirmDeleteTarget.id);
    else if (confirmDeleteTarget.type === 'ledger') deleteLedgerEntry(confirmDeleteTarget.id);
    setConfirmDeleteTarget(null);
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

  const runAutoPriceUpdate = async () => {
    const url = backendUrlRef.current;
    if (!url) return;
    const currentHoldings = holdingsRef.current;
    const eligible = currentHoldings.filter((h) => typeInfo(h.type).market && h.ticker);
    if (eligible.length === 0) return;
    try {
      const items = eligible.map((h) => ({ id: h.id, ticker: h.ticker, market: typeInfo(h.type).market }));
      items.push({ id: '__fx__', ticker: 'USDTHB', market: 'fx' });
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      const results = data.results || [];
      const priceById = {};
      const failedNames = [];
      results.forEach((r) => {
        if (r.id === '__fx__') return;
        if (typeof r.price === 'number') priceById[r.id] = r.price;
        else {
          const h = eligible.find((x) => x.id === r.id);
          failedNames.push(h ? h.name : r.id);
        }
      });
      const fxResult = results.find((r) => r.id === '__fx__');
      let rate = fxRateRef.current;
      if (fxResult && typeof fxResult.price === 'number') {
        rate = fxResult.price;
        setFxRate(rate);
        setFxDraft(String(rate));
        try { await window.storage.set('fx-usdthb', String(rate), false); } catch (e) { /* ignore */ }
      }
      const today = todayStr();
      const nextHoldings = currentHoldings.map((h) => {
        if (priceById[h.id] === undefined) return h;
        let updatedPrice = priceById[h.id];
        if (h.type === 'crypto' && h.currency === 'THB') { updatedPrice = updatedPrice * rate; }
        return { ...h, currentPrice: updatedPrice, lastUpdated: today };
      });
      await saveHoldings(nextHoldings);
      const newTotal = nextHoldings.reduce((s, h) => {
        const currency = h.currency === 'USD' ? 'USD' : 'THB';
        const effRate = currency === 'USD' ? getEffectiveRate(h.type, rate) : 1;
        return s + (parseFloat(h.quantity) || 0) * (parseFloat(h.currentPrice) || 0) * effRate;
      }, 0);
      const histNext = [...historyRef.current.filter((p) => p.date !== today), { date: today, value: newTotal }].sort((a, b) => a.date.localeCompare(b.date));
      await saveHistory(histNext);
      setFetchIssues(failedNames);
      
      const okCount = Object.keys(priceById).length;
      showToast(`ดึงราคาสำเร็จ จำนวน ${okCount} ตัว`);
    } catch (e) { /* background silent */ }
  };

  const submitUpdatePrices = async () => {
    const today = todayStr();
    const next = holdings.map((h) => {
      const v = parseFloat(updateDraft[h.id]);
      if (isNaN(v) || v < 0) return h;
      return { ...h, currentPrice: v, lastUpdated: today };
    });
    saveHoldings(next);

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
    showToast(`ดึงราคาสำเร็จ จำนวน ${Object.keys(updateDraft).length} ตัว`);
    closePanel();
  };

  const saveBackendUrl = async () => {
    const url = backendDraft.trim();
    const fx = parseFloat(fxDraft);
    const capital = parseFloat(initialCapitalDraft);
    setBackendUrl(url);
    try { await window.storage.set('backend-url', url, false); } catch (e) { /* ignore */ }
    if (!isNaN(fx) && fx > 0) {
      setFxRate(fx);
      try { await window.storage.set('fx-usdthb', String(fx), false); } catch (e) { /* ignore */ }
    }
    const nextCapital = !isNaN(capital) && capital >= 0 ? capital : 0;
    setInitialCapital(nextCapital);
    try { await window.storage.set('initial-capital', String(nextCapital), false); } catch (e) { /* ignore */ }
    showToast('บันทึกการตั้งค่าแล้ว');
    closePanel();
  };

  const fetchAutoPrices = async () => {
    if (!backendUrl) { showToast('ยังไม่ได้ตั้งค่า Backend URL'); return; }
    const eligible = holdings.filter((h) => typeInfo(h.type).market && h.ticker);
    if (eligible.length === 0) { showToast('ไม่มีรายการที่ใส่สัญลักษณ์ไว้'); return; }
    setFetchingPrices(true);
    try {
      const items = eligible.map((h) => ({ id: h.id, ticker: h.ticker, market: typeInfo(h.type).market }));
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      const next = { ...updateDraft };
      const failedNames = [];
      let okCount = 0;
      (data.results || []).forEach((r) => {
        if (typeof r.price === 'number') {
          okCount++;
          const holding = eligible.find((x) => x.id === r.id);
          let updatedPrice = r.price;
          if (holding && holding.type === 'crypto' && holding.currency === 'THB') { updatedPrice = r.price * fxRate; }
          next[r.id] = String(updatedPrice);
        } else {
          const h = eligible.find((x) => x.id === r.id);
          failedNames.push(h ? h.name : r.id);
        }
      });
      setUpdateDraft(next);
      setFetchIssues(failedNames);
      showToast(`ดึงราคาสำเร็จ จำนวน ${okCount} ตัว`);
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
    const payload = { app: 'portfolio-tracker', version: 2, exportedAt: new Date().toISOString(), holdings, history, fxRate, backendUrl, initialCapital, ledger };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `portfolio-backup-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('ส่งออกไฟล์สำรองข้อมูลแล้ว');
  };

  const triggerImport = () => {
    setImportError('');
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.holdings)) throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
        setPendingImport(data);
        setImportError('');
      } catch (err) {
        setImportError('อ่านไฟล์ไม่สำเร็จ');
      }
    };
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
    if (Array.isArray(pendingImport.ledger)) { await saveLedger(pendingImport.ledger); }
    setPendingImport(null);
    showToast('นำเข้าข้อมูลสำเร็จ');
  };

  const LEDGER_LABELS = { capital_add: 'เพิ่มทุน', capital_reduce: 'ลดทุน', profit: 'กำไร', loss: 'ขาดทุน', dividend: 'ปันผล', rebalance: 'รีบาลานซ์เงินสด' };
  const LEDGER_SIGN = { capital_add: 1, capital_reduce: -1, profit: 1, loss: -1, dividend: 1, rebalance: 1 };

  const saveLedger = async (next) => {
    setLedger(next);
    try { await window.storage.set('cash-ledger', JSON.stringify(next), false); } catch (e) { /* ignore */ }
  };

  const openLedgerForm = (type) => {
    setLedgerType(type); setLedgerAmount(''); setLedgerNote(''); setLedgerDate(todayStr()); setLedgerError(''); setPanel('ledger');
  };

  const submitLedger = () => {
    const rawVal = ledgerAmount.trim();
    let amt = parseFloat(rawVal);
    let typeToSave = ledgerType;

    if (ledgerType === 'rebalance') {
      if (isNaN(amt)) { setLedgerError('กรอกจำนวนเงินให้ถูกต้อง'); return; }
      if (rawVal.startsWith('-')) {
        typeToSave = 'capital_reduce';
        amt = Math.abs(amt);
      } else {
        typeToSave = 'capital_add';
        amt = Math.abs(amt);
      }
    } else {
      if (isNaN(amt) || amt <= 0) { setLedgerError('กรอกจำนวนเงินให้มากกว่า 0'); return; }
    }

    const entry = { id: Date.now().toString(), type: typeToSave, amount: amt, date: ledgerDate || todayStr(), note: ledgerNote.trim() || (ledgerType === 'rebalance' ? 'รีบาลานซ์เงินสดสิ้นปี' : '') };
    saveLedger([...ledger, entry]);
    showToast('บันทึกรายการสำเร็จ');
    setPanel('cashManage');
  };

  const deleteLedgerEntry = (id) => { saveLedger(ledger.filter((e) => e.id !== id)); };

  const toggleTypeInclusion = (typeKey) => {
    setExcludedTypes((prev) => {
      const next = { ...prev, [typeKey]: !prev[typeKey] };
      window.storage.set('excluded-types', JSON.stringify(next), false).catch(() => {});
      return next;
    });
  };

  const clearAll = async () => {
    await saveHoldings([]); await saveHistory([]); await saveLedger([]);
    setConfirmClear(false);
    showToast('ล้างข้อมูลทั้งหมดแล้ว');
  };

  return (
    <div className="pf-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
        .pf-root {
          --bg: #070913; --surface: #111827; --surface-alt: #1f2937; --divider: rgba(255,255,255,0.08);
          --text: #EDF1F5; --muted: #94a3b8; --gold: #fbbf24;
          --pos: #34d399; --neg: #fca5a5;
          background: var(--bg); color: var(--text); min-height: 100vh;
          font-family: 'Inter', sans-serif; padding: 16px 16px 90px;
          -webkit-font-smoothing: antialiased;
        }
        .pf-root * { box-sizing: border-box; }
        .pf-mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        .pf-display { font-family: 'Fraunces', serif; }
        .pf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .pf-icon-btn { background: var(--surface); border: 1px solid var(--divider); color: var(--text); border-radius: 10px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .pf-icon-btn:hover { background: var(--surface-alt); }
        .pf-hero { background: var(--surface); border: 1px solid var(--divider); border-radius: 16px; padding: 22px 20px; margin-bottom: 16px; }
        .pf-hero-label { color: var(--muted); font-size: 12px; letter-spacing: 0.4px; margin-bottom: 6px; }
        .pf-hero-value { font-size: 38px; font-weight: 800; line-height: 1.1; letter-spacing: -0.3px; }
        .pf-hero-sub { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 13px; flex-wrap: wrap; }
        .pf-hero-sub-label { color: var(--muted); font-size: 11.5px; font-weight: 400; }
        .pf-hero-sub-hint { color: var(--muted); font-size: 11.5px; margin-top: 8px; line-height: 1.5; }
        .pf-hero-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
        .pf-invest-chip { display: inline-flex; align-items: center; gap: 5px; background: var(--surface-alt); border-radius: 20px; padding: 4px 10px; font-size: 11.5px; }
        .pf-invest-chip-label { color: var(--muted); font-weight: 400; }
        .pf-chip-pos { color: var(--pos); } .pf-chip-neg { color: var(--neg); }
        .pf-spark { height: 160px; margin-top: 14px; }
        .pf-updated { color: var(--muted); font-size: 12px; }
        .pf-capital-row { display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; padding: 6px 0; }
        .pf-cash-manage-btn { display: inline-flex; align-items: center; gap: 8px; background: var(--surface-alt); border: 1px solid var(--divider); color: var(--text); border-radius: 20px; padding: 6px 14px 6px 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-top: 16px; }
        .pf-cash-manage-icon { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: var(--gold); color: #1A1400; flex-shrink: 0; }
        .pf-year-picker { display: flex; gap: 8px; margin-bottom: 12px; overflow-x: auto; }
        .pf-year-pill, .pf-year-pill-active { flex-shrink: 0; border-radius: 20px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--divider); background: var(--surface-alt); color: var(--muted); }
        .pf-year-pill-active { background: var(--gold); color: #1A1400; border-color: var(--gold); }
        .pf-year-card { background: var(--surface); border: 1px solid var(--divider); border-radius: 16px; padding: 18px 16px; margin-bottom: 10px; }
        .pf-year-net { text-align: center; margin-bottom: 16px; }
        .pf-year-net-label { color: var(--muted); font-size: 12px; letter-spacing: 0.4px; margin-bottom: 4px; }
        .pf-year-net-value { font-size: 32px; font-weight: 800; letter-spacing: -0.3px; }
        .pf-year-flow-bar { display: flex; width: 100%; height: 10px; border-radius: 6px; overflow: hidden; background: var(--surface-alt); }
        .pf-year-flow-in { height: 100%; background: var(--gold); }
        .pf-year-flow-out { height: 100%; background: #5B6779; }
        .pf-year-flow-legend { display: flex; justify-content: space-between; gap: 10px; margin-top: 8px; font-size: 11.5px; color: var(--muted); }
        .pf-year-rows { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--divider); display: flex; flex-direction: column; gap: 10px; }
        .pf-year-row { display: flex; align-items: center; gap: 9px; font-size: 13px; }
        .pf-year-row-icon { color: var(--gold); flex-shrink: 0; }
        .pf-cash-action-btn { flex: 1; min-width: 90px; background: var(--surface-alt); border: 1px solid var(--divider); color: var(--text); border-radius: 10px; padding: 9px 10px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
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
        .pf-type-section-info { flex: 1; min-width: 0; }
        .pf-type-section-title { display: flex; align-items: center; gap: 7px; font-family: 'Fraunces', serif; font-weight: 600; font-size: 15.5px; margin-bottom: 5px; }
        .pf-type-section-value { font-size: 25px; font-weight: 800; letter-spacing: -0.2px; }
        .pf-type-section-gain { font-size: 12.5px; margin-top: 3px; }
        .pf-type-section-cost { color: var(--muted); font-size: 12px; margin-top: 3px; }
        .pf-sort-row { display: flex; align-items: center; justify-content: flex-end; margin-top: 12px; }
        .pf-sort-toggle { display: flex; background: var(--surface-alt); border: 1px solid var(--divider); border-radius: 8px; padding: 2px; gap: 2px; }
        .pf-sort-toggle button { display: flex; align-items: center; justify-content: center; width: 26px; height: 24px; border-radius: 6px; background: transparent; border: none; color: var(--muted); cursor: pointer; }
        .pf-sort-toggle button.pf-sort-toggle-active { background: var(--gold); color: #1A1400; }
        .pf-type-section-holdings { border-top: 1px solid var(--divider); margin-top: 16px; padding-top: 6px; }
        .pf-subrow { padding: 14px 0; border-bottom: 1px solid var(--divider); }
        .pf-subrow:last-child { border-bottom: none; padding-bottom: 0; }
        .pf-legend { display: flex; flex-wrap: wrap; gap: 10px 16px; margin-top: 12px; }
        .pf-legend-item { display: flex; align-items: center; gap: 7px; font-size: 12.5px; }
        .pf-legend-toggle { background: transparent; border: none; padding: 2px 0; cursor: pointer; text-align: left; font-family: inherit; }
        .pf-legend-name-included { color: var(--gold); font-weight: 600; }
        .pf-legend-name-excluded { color: var(--muted); text-decoration: line-through; }
        .pf-legend-hint { color: var(--muted); font-size: 11px; margin: -4px 0 10px; }
        .pf-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .pf-legend-val { color: var(--muted); }
        .pf-empty { text-align: center; padding: 50px 20px; color: var(--muted); border: 1px dashed var(--divider); border-radius: 16px; }
        .pf-empty-cta { margin-top: 14px; }
        .pf-row-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .pf-row-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .pf-row-name-text { font-family: 'Fraunces', serif; font-weight: 600; font-size: 15.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pf-row-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .pf-row-actions button { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 6px; }
        .pf-row-meta { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 10px; font-size: 12.5px; color: var(--muted); }
        .pf-row-meta b { color: var(--text); font-weight: 500; }
        .pf-ledger-amount { font-weight: 700; }
        .pf-fab { position: fixed; right: 20px; bottom: 85px; display: flex; gap: 10px; z-index: 900; }
        .pf-btn { border-radius: 12px; padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid var(--divider); display: flex; align-items: center; gap: 6px; }
        .pf-btn-primary { background: var(--gold); color: #1A1400; border: none; }
        .pf-btn-ghost { background: var(--surface); color: var(--text); }
        .pf-overlay { position: fixed; inset: 0; background: rgba(6,10,16,0.6); display: flex; justify-content: flex-end; z-index: 1200; }
        .pf-modal-overlay { position: fixed; inset: 0; background: rgba(6,10,16,0.65); display: flex; align-items: center; justify-content: center; z-index: 1300; padding: 20px; }
        .pf-confirm-modal { background: var(--surface); border: 1px solid var(--divider); border-radius: 16px; padding: 20px; width: 100%; max-width: 340px; }
        .pf-panel { background: var(--bg); border-left: 1px solid var(--divider); width: 100%; max-width: 400px; height: 100%; overflow-y: auto; padding: 20px; animation: pf-slide 0.18s ease-out; }
        @keyframes pf-slide { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .pf-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .pf-panel-title { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 600; }
        .pf-field { margin-bottom: 14px; }
        .pf-label { font-size: 12.5px; color: var(--muted); display: block; margin-bottom: 6px; }
        .pf-input, .pf-select { width: 100%; background: var(--surface); border: 1px solid var(--divider); color: var(--text); border-radius: 10px; padding: 10px 12px; font-size: 14.5px; font-family: 'Inter', sans-serif; }
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
        .pf-toast { position: fixed; left: 50%; bottom: 85px; transform: translateX(-50%); background: var(--surface); border: 1px solid var(--divider); color: var(--text); padding: 10px 18px; border-radius: 30px; font-size: 13.5px; z-index: 1400; }
        .pf-confirm { background: var(--surface); border: 1px solid var(--divider); border-radius: 14px; padding: 16px; margin-bottom: 16px; }
        .pf-issue-banner { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; background: rgba(252,165,165,0.12); border: 1px solid var(--neg); color: var(--text); border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; font-size: 12.5px; line-height: 1.5; }
        .pf-loading { display: flex; align-items: center; justify-content: center; height: 60vh; color: var(--muted); }
        
        .pf-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          background-color: #0b0f19;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 8px 0;
          z-index: 1000;
        }
        .pf-nav-item {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #94a3b8;
          padding: 4px;
        }
        .pf-nav-item.active {
          color: #fbbf24;
        }
        .pf-nav-label {
          font-size: 10px;
          margin-top: 4px;
          font-family: 'Inter', sans-serif;
        }
        .pf-nav-center {
          background: #1f2937;
          border: none;
          color: #fff;
          cursor: pointer;
          font-size: 24px;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
          margin-top: -18px;
        }
        .pf-nav-center.active {
          background: #fbbf24;
          color: #000;
        }

        .moon-float {
          position: fixed;
          top: 16px;
          right: 20px;
          width: 110px;
          height: 110px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          z-index: 1100;
          animation: moonFloat 2.5s ease-in-out infinite;
          user-select: none;
          touch-action: none;
        }
        .moon-float:active {
          cursor: grabbing;
        }
        @keyframes moonFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }

        @media (min-width: 640px) {
          .pf-root { padding: 32px 28px 90px; max-width: 720px; margin: 0 auto; }
        }
      `}</style>

      <div className="pf-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={new URL('../Logo.jpg', import.meta.url).href} 
            alt="Moon Shot Logo" 
            style={{ height: '80px', width: 'auto', objectFit: 'contain', display: 'block' }} 
          />
        </div>
      </div>

      <div className="moon-float" onPointerDown={(e) => {
        const el = e.currentTarget; el.setPointerCapture(e.pointerId);
        const startX = e.clientX, startY = e.clientY, rect = el.getBoundingClientRect();
        const onPointerMove = (m) => {
          el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.top = 'auto';
          el.style.left = `${rect.left + (m.clientX - startX)}px`;
          el.style.top = `${rect.top + (m.clientY - startY)}px`;
        };
        const onPointerUp = (u) => { el.releasePointerCapture(u.pointerId); window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp); };
        window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerup', onPointerUp);
      }} onClick={(e) => { e.stopPropagation(); showToast('สวัสดีจ้า 🌙 ฉันคือผู้ช่วย Moon Shot'); }}>
        <img src={new URL('../moon.png', import.meta.url).href} alt="Moon Assistant" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.5))' }} />
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
              <div style={{ marginBottom: 10, fontSize: 12.5, color: 'var(--muted)' }}>การนำเข้าจะแทนที่ข้อมูลปัจจุบันทั้งหมดในเครื่องนี้</div>
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

          {fetchIssues.length > 0 && (
            <div className="pf-issue-banner">
              <div><b>ดึงราคาไม่สำเร็จ:</b> {fetchIssues.join(', ')}</div>
              <button aria-label="ปิด" onClick={() => setFetchIssues([])} style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer' }}><X size={15} /></button>
            </div>
          )}

          {/* ================= 1. หุ้นไทย ================= */}
          {activeTab === 1 && (
            <div>
              <div className="pf-section-label" style={{ marginTop: 0 }}>หุ้นไทย (Thai Stocks)</div>
              {holdings.filter((h) => h.type === 'th_stock').length === 0 ? (
                <div className="pf-empty">
                  <Inbox size={26} style={{ marginBottom: 8, opacity: 0.6 }} />
                  <div>ยังไม่มีรายการหุ้นไทยในพอร์ต</div>
                  <button className="pf-btn pf-btn-primary pf-empty-cta" onClick={openAdd}><Plus size={16} /> เพิ่มหุ้นไทย</button>
                </div>
              ) : (
                byType.filter((t) => t.key === 'th_stock').map((t) => {
                  const sortMode = sortModeByType[t.key] || 'value';
                  const typeHoldings = enriched.filter((h) => h.type === t.key).sort((a, b) => {
                    const rankA = INSTRUMENT_RANK[a.instrumentType] ?? 0;
                    const rankB = INSTRUMENT_RANK[b.instrumentType] ?? 0;
                    if (rankA !== rankB) return rankA - rankB;
                    if (sortMode === 'name') return a.name.localeCompare(b.name, 'th');
                    return b.marketValue - a.marketValue;
                  });
                  const typeCost = typeHoldings.reduce((s, h) => s + h.costValue, 0);
                  const typeGain = t.value - typeCost;
                  const typeGainPct = typeCost > 0 ? (typeGain / typeCost) * 100 : 0;
                  const shades = shadeSet(t.color, typeHoldings.length);
                  const colorById = {};
                  typeHoldings.forEach((h, i) => { colorById[h.id] = shades[i]; });
                  const viewMode = chartModeByType[t.key] === 'industry' ? 'industry' : 'holding';

                  let chartData;
                  let displayItemsList = [];
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
                    displayItemsList = industryNames.map((name) => ({ key: name, name: name, value: groups[name], color: industryColorById[name] }));
                  } else {
                    chartData = typeHoldings.map((h) => ({ key: h.id, label: h.name, color: colorById[h.id], value: h.marketValue }));
                    displayItemsList = typeHoldings.map((h) => ({ key: h.id, name: h.name, value: h.marketValue, color: colorById[h.id] }));
                  }

                  return (
                    <div className="pf-type-section" key={t.key}>
                      <div style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--divider)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>กราฟกำไร/ขาดทุน (หุ้นไทย)</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className={graphModeTh === 'all' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphModeTh('all')} style={{ padding: '2px 8px', fontSize: '11px' }}>ตั้งแต่เริ่มต้น</button>
                            <button className={graphModeTh === 'year' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphModeTh('year')} style={{ padding: '2px 8px', fontSize: '11px' }}>รายปี</button>
                          </div>
                        </div>
                        {graphModeTh === 'year' && (
                          <div className="pf-year-picker" style={{ marginBottom: '8px' }}>
                            {yearOptions.map((y) => (
                              <button key={y} className={y === graphYearTh ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphYearTh(y)} style={{ padding: '2px 8px', fontSize: '11px' }}>{buddhistYear(y)}</button>
                            ))}
                          </div>
                        )}
                        <div className="pf-spark">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartDataTh}>
                              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => thaiDate(val)} />
                              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `฿${fmt(val, 0)}`} />
                              <Tooltip contentStyle={{ background: '#111827', border: '1px solid var(--divider)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(val, name) => [`฿${fmt(val)}`, name === 'gain' ? 'กำไร/ขาดทุน' : 'ต้นทุน']} labelFormatter={(l) => thaiDate(l)} />
                              <Line type="monotone" dataKey="gain" stroke="#C7A344" strokeWidth={2} dot={false} name="gain" isAnimationActive={false} />
                              <Line type="monotone" dataKey="cost" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="cost" isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="pf-type-section-head">
                        <div onClick={() => toggleChartMode(t.key)} className="pf-pie-tap" role="button" tabIndex={0}>
                          <ExplodedPie3D data={chartData} rx={62} depth={14} explode={5} />
                          <div className="pf-pie-tap-hint">{viewMode === 'industry' ? 'แตะดูรายตัว' : 'แตะดูอุตสาหกรรม'}</div>
                        </div>
                        <div className="pf-type-section-info">
                          <div className="pf-type-section-title"><span className="pf-dot" style={{ background: t.color }} />{t.label}</div>
                          <div className="pf-type-section-value pf-mono">฿{fmt(t.value, 0)}</div>
                          {typeCost > 0 && <div className="pf-type-section-cost pf-mono">ต้นทุนรวม ฿{fmt(typeCost, 0)}</div>}
                          {typeCost > 0 && (
                            <div className={`pf-type-section-gain pf-mono ${typeGain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>
                              {typeGain >= 0 ? '+' : ''}{fmt(typeGain, 0)} ({typeGain >= 0 ? '+' : ''}{fmt(typeGainPct, 1)}%)
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '14px', paddingRight: '4px' }}>
                        {displayItemsList.map((item) => {
                          const itemPct = t.value > 0 ? (item.value / t.value) * 100 : 0;
                          return (
                            <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="pf-dot" style={{ background: item.color }} />
                                <span>{item.name}</span>
                              </div>
                              <span className="pf-mono" style={{ color: 'var(--gold)', fontWeight: '600' }}>{fmt(itemPct, 1)}%</span>
                            </div>
                          );
                        })}
                      </div>

                      {typeHoldings.length > 1 && (
                        <div className="pf-sort-row">
                          <div className="pf-sort-toggle">
                            <button className={sortMode === 'value' ? 'pf-sort-toggle-active' : ''} onClick={() => setSortModeByType((prev) => ({ ...prev, [t.key]: 'value' }))} title="เรียงตามมูลค่า"><ArrowDownWideNarrow size={14} /></button>
                            <button className={sortMode === 'name' ? 'pf-sort-toggle-active' : ''} onClick={() => setSortModeByType((prev) => ({ ...prev, [t.key]: 'name' }))} title="เรียงตามชื่อ"><ArrowDownAZ size={14} /></button>
                          </div>
                        </div>
                      )}

                      <div className="pf-type-section-holdings">
                        {typeHoldings.map((h) => {
                          const holdingPct = t.value > 0 ? (h.marketValue / t.value) * 100 : 0;
                          return (
                            <div className="pf-subrow" key={h.id}>
                              <div className="pf-row-top">
                                <div className="pf-row-name">
                                  <span className="pf-dot" style={{ background: colorById[h.id] }} />
                                  <span className="pf-row-name-text">{h.name}</span>
                                </div>
                                <div className="pf-row-actions">
                                  <button aria-label="แก้ไข" onClick={() => openEdit(h)}><Pencil size={15} /></button>
                                  <button aria-label="ลบ" onClick={() => requestDelete('holding', h.id, h.name)}><Trash2 size={15} /></button>
                                </div>
                              </div>
                              <div className="pf-row-meta pf-mono">
                                <span>สัดส่วน <b>{fmt(holdingPct, 1)}%</b></span>
                                <span>จำนวน <b>{fmt(h.qty, h.qty % 1 === 0 ? 0 : 2)}</b></span>
                                <span>ทุน <b>฿{fmt(h.avg)}</b></span>
                                <span>ราคา <b>฿{fmt(h.price)}</b></span>
                                <span>มูลค่า <b>฿{fmt(h.marketValue)}</b></span>
                                <span className={h.gain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}>
                                  {h.gain >= 0 ? '+' : ''}{fmt(h.gain)} ({h.gain >= 0 ? '+' : ''}{fmt(h.gainPct, 1)}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================= 2. หุ้นต่างประเทศ & DR & ETF ================= */}
          {activeTab === 2 && (
            <div>
              <div className="pf-section-label" style={{ marginTop: 0 }}>หุ้นต่างประเทศ & DR (Global Stocks & DR & ETF)</div>
              {holdings.filter((h) => h.type === 'foreign_stock').length === 0 ? (
                <div className="pf-empty">
                  <Inbox size={26} style={{ marginBottom: 8, opacity: 0.6 }} />
                  <div>ยังไม่มีรายการหุ้นต่างประเทศในพอร์ต</div>
                  <button className="pf-btn pf-btn-primary pf-empty-cta" onClick={openAdd}><Plus size={16} /> เพิ่มหุ้นต่างประเทศ</button>
                </div>
              ) : (
                byType.filter((t) => t.key === 'foreign_stock').map((t) => {
                  const sortMode = sortModeByType[t.key] || 'value';
                  const typeHoldings = enriched.filter((h) => h.type === t.key).sort((a, b) => {
                    const rankA = INSTRUMENT_RANK[a.instrumentType] ?? 0;
                    const rankB = INSTRUMENT_RANK[b.instrumentType] ?? 0;
                    if (rankA !== rankB) return rankA - rankB;
                    if (sortMode === 'name') return a.name.localeCompare(b.name, 'th');
                    return b.marketValue - a.marketValue;
                  });
                  const typeCost = typeHoldings.reduce((s, h) => s + h.costValue, 0);
                  const typeGain = t.value - typeCost;
                  const typeGainPct = typeCost > 0 ? (typeGain / typeCost) * 100 : 0;
                  const shades = shadeSet(t.color, typeHoldings.length);
                  const colorById = {};
                  typeHoldings.forEach((h, i) => { colorById[h.id] = shades[i]; });
                  const viewMode = chartModeByType[t.key] === 'industry' ? 'industry' : 'holding';

                  let chartData;
                  let displayItemsList = [];
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
                    displayItemsList = industryNames.map((name) => ({ key: name, name: name, value: groups[name], color: industryColorById[name] }));
                  } else {
                    chartData = typeHoldings.map((h) => ({ key: h.id, label: h.name, color: colorById[h.id], value: h.marketValue }));
                    displayItemsList = typeHoldings.map((h) => ({ key: h.id, name: h.name, value: h.marketValue, color: colorById[h.id] }));
                  }

                  return (
                    <div className="pf-type-section" key={t.key}>
                      <div style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--divider)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>กราฟกำไร/ขาดทุน (หุ้นต่างประเทศ)</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className={graphModeUs === 'all' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphModeUs('all')} style={{ padding: '2px 8px', fontSize: '11px' }}>ตั้งแต่เริ่มต้น</button>
                            <button className={graphModeUs === 'year' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphModeUs('year')} style={{ padding: '2px 8px', fontSize: '11px' }}>รายปี</button>
                          </div>
                        </div>
                        {graphModeUs === 'year' && (
                          <div className="pf-year-picker" style={{ marginBottom: '8px' }}>
                            {yearOptions.map((y) => (
                              <button key={y} className={y === graphYearUs ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphYearUs(y)} style={{ padding: '2px 8px', fontSize: '11px' }}>{buddhistYear(y)}</button>
                            ))}
                          </div>
                        )}
                        <div className="pf-spark">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartDataUs}>
                              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => thaiDate(val)} />
                              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `฿${fmt(val, 0)}`} />
                              <Tooltip contentStyle={{ background: '#111827', border: '1px solid var(--divider)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(val, name) => [`฿${fmt(val)}`, name === 'gain' ? 'กำไร/ขาดทุน' : 'ต้นทุน']} labelFormatter={(l) => thaiDate(l)} />
                              <Line type="monotone" dataKey="gain" stroke="#6E8CB0" strokeWidth={2} dot={false} name="gain" isAnimationActive={false} />
                              <Line type="monotone" dataKey="cost" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="cost" isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="pf-type-section-head">
                        <div onClick={() => toggleChartMode(t.key)} className="pf-pie-tap" role="button" tabIndex={0}>
                          <ExplodedPie3D data={chartData} rx={62} depth={14} explode={5} />
                          <div className="pf-pie-tap-hint">{viewMode === 'industry' ? 'แตะดูรายตัว' : 'แตะดูอุตสาหกรรม'}</div>
                        </div>
                        <div className="pf-type-section-info">
                          <div className="pf-type-section-title"><span className="pf-dot" style={{ background: t.color }} />{t.label}</div>
                          <div className="pf-type-section-value pf-mono">฿{fmt(t.value, 0)}</div>
                          {typeCost > 0 && <div className="pf-type-section-cost pf-mono">ต้นทุนรวม ฿{fmt(typeCost, 0)}</div>}
                          {typeCost > 0 && (
                            <div className={`pf-type-section-gain pf-mono ${typeGain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>
                              {typeGain >= 0 ? '+' : ''}{fmt(typeGain, 0)} ({typeGain >= 0 ? '+' : ''}{fmt(typeGainPct, 1)}%)
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '14px', paddingRight: '4px' }}>
                        {displayItemsList.map((item) => {
                          const itemPct = t.value > 0 ? (item.value / t.value) * 100 : 0;
                          return (
                            <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="pf-dot" style={{ background: item.color }} />
                                <span>{item.name}</span>
                              </div>
                              <span className="pf-mono" style={{ color: 'var(--gold)', fontWeight: '600' }}>{fmt(itemPct, 1)}%</span>
                            </div>
                          );
                        })}
                      </div>

                      {typeHoldings.length > 1 && (
                        <div className="pf-sort-row">
                          <div className="pf-sort-toggle">
                            <button className={sortMode === 'value' ? 'pf-sort-toggle-active' : ''} onClick={() => setSortModeByType((prev) => ({ ...prev, [t.key]: 'value' }))} title="เรียงตามมูลค่า"><ArrowDownWideNarrow size={14} /></button>
                            <button className={sortMode === 'name' ? 'pf-sort-toggle-active' : ''} onClick={() => setSortModeByType((prev) => ({ ...prev, [t.key]: 'name' }))} title="เรียงตามชื่อ"><ArrowDownAZ size={14} /></button>
                          </div>
                        </div>
                      )}

                      <div className="pf-type-section-holdings">
                        {typeHoldings.map((h) => {
                          const holdingPct = t.value > 0 ? (h.marketValue / t.value) * 100 : 0;
                          return (
                            <div className="pf-subrow" key={h.id}>
                              <div className="pf-row-top">
                                <div className="pf-row-name">
                                  <span className="pf-dot" style={{ background: colorById[h.id] }} />
                                  <span className="pf-row-name-text">
                                    {h.name} 
                                    {h.instrumentType === 'dr' && <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px', color: '#fbbf24' }}>DR</span>}
                                    {h.instrumentType === 'etf' && <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px', color: '#6E8CB0' }}>ETF</span>}
                                  </span>
                                </div>
                                <div className="pf-row-actions">
                                  <button aria-label="แก้ไข" onClick={() => openEdit(h)}><Pencil size={15} /></button>
                                  <button aria-label="ลบ" onClick={() => requestDelete('holding', h.id, h.name)}><Trash2 size={15} /></button>
                                </div>
                              </div>
                              <div className="pf-row-meta pf-mono">
                                <span>สัดส่วน <b>{fmt(holdingPct, 1)}%</b></span>
                                <span>จำนวน <b>{fmt(h.qty, h.qty % 1 === 0 ? 0 : 2)}</b></span>
                                <span>ทุน <b>{h.currency === 'USD' ? '$' : '฿'}{fmt(h.avg)}</b></span>
                                <span>ราคา <b>{h.currency === 'USD' ? '$' : '฿'}{fmt(h.price)}</b></span>
                                <span>มูลค่า <b>฿{fmt(h.marketValue)}</b></span>
                                <span className={h.gain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}>
                                  {h.gain >= 0 ? '+' : ''}{fmt(h.gain)} ({h.gain >= 0 ? '+' : ''}{fmt(h.gainPct, 1)}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================= 3. พอร์ตรวม ================= */}
          {activeTab === 3 && (
            <div>
              <div className="pf-section-label" style={{ marginTop: 0 }}>พอร์ตรวม (Portfolio Overview)</div>
              
              {/* การ์ดที่ 1: มูลค่าพอร์ตรวม (เอาเปอร์เซ็นต์ออกตามข้อ 2) */}
              <div className="pf-hero" style={{ border: '2px solid rgba(251, 191, 36, 0.3)', background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)' }}>
                <div className="pf-hero-label">มูลค่าพอร์ตรวมทั้งหมด</div>
                <div className="pf-hero-value pf-mono" style={{ fontSize: '44px' }}>฿{fmt(displayTotalValue)}</div>
                
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--divider)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>มูลค่าสินทรัพย์เทียบกับเงินต้น</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className={graphModeTotal === 'all' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphModeTotal('all')} style={{ padding: '2px 8px', fontSize: '11px' }}>ตั้งแต่เริ่มต้น</button>
                      <button className={graphModeTotal === 'year' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphModeTotal('year')} style={{ padding: '2px 8px', fontSize: '11px' }}>รายปี</button>
                    </div>
                  </div>
                  {graphModeTotal === 'year' && (
                    <div className="pf-year-picker" style={{ marginBottom: '8px' }}>
                      {yearOptions.map((y) => (
                        <button key={y} className={y === graphYearTotal ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphYearTotal(y)} style={{ padding: '2px 8px', fontSize: '11px' }}>{buddhistYear(y)}</button>
                      ))}
                    </div>
                  )}
                  <div className="pf-spark">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartDataTotal}>
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => thaiDate(val)} />
                        {/* ข้อ 1: ปรับโดเมนและสเกล YAxis ให้เส้นทองอยู่ด้านบนเส้นเงินต้นถูกต้อง */}
                        <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} tickFormatter={(val) => `฿${fmt(val, 0)}`} />
                        <Tooltip contentStyle={{ background: '#111827', border: '1px solid var(--divider)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(val, name) => [`฿${fmt(val)}`, name === 'value' ? 'มูลค่าพอร์ต' : 'เงินต้น']} labelFormatter={(l) => thaiDate(l)} />
                        <Line type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={2.5} dot={false} name="value" isAnimationActive={false} />
                        <Line type="monotone" dataKey="principal" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="principal" isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="pf-hero-footer">
                  <div className="pf-updated" style={{ marginLeft: 'auto' }}>อัปเดตล่าสุด: {lastUpdated ? thaiDate(lastUpdated) : 'ยังไม่มีการอัปเดต'}</div>
                </div>
              </div>

              {/* ข้อ 2 & 3: การ์ดกำไร/ขาดทุนรวม ปรับดีไซน์และขนาดให้เหมือนการ์ดบน และย้าย % มาไว้ที่นี่ */}
              <div className="pf-hero" style={{ border: '2px solid rgba(52, 211, 153, 0.3)', background: 'linear-gradient(135deg, #111827 0%, #172a3a 100%)' }}>
                <div className="pf-hero-label">กำไร/ขาดทุนรวมทุกสินทรัพย์</div>
                <div className={`pf-hero-value pf-mono ${totalGain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`} style={{ fontSize: '44px' }}>
                  {totalGain >= 0 ? '+' : ''}฿{fmt(totalGain)}
                </div>
                <div className={`pf-hero-sub ${totalGain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`} style={{ fontSize: '15px' }}>
                  {totalGain >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  <span className="pf-mono">{totalGain >= 0 ? '+' : ''}{fmt(totalGainPct, 1)}%</span>
                  <span className="pf-hero-sub-label">เทียบกับทุนสะสม</span>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--divider)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>กราฟกำไร/ขาดทุน เทียบกับต้นทุน</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className={graphModeGain === 'all' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphModeGain('all')} style={{ padding: '2px 8px', fontSize: '11px' }}>ตั้งแต่เริ่มต้น</button>
                      <button className={graphModeGain === 'year' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphModeGain('year')} style={{ padding: '2px 8px', fontSize: '11px' }}>รายปี</button>
                    </div>
                  </div>
                  {graphModeGain === 'year' && (
                    <div className="pf-year-picker" style={{ marginBottom: '8px' }}>
                      {yearOptions.map((y) => (
                        <button key={y} className={y === graphYearGain ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphYearGain(y)} style={{ padding: '2px 8px', fontSize: '11px' }}>{buddhistYear(y)}</button>
                      ))}
                    </div>
                  )}
                  <div className="pf-spark">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartDataGainCard}>
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => thaiDate(val)} />
                        <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} tickFormatter={(val) => `฿${fmt(val, 0)}`} />
                        <Tooltip contentStyle={{ background: '#111827', border: '1px solid var(--divider)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(val, name) => [`฿${fmt(val)}`, name === 'gain' ? 'กำไร/ขาดทุน' : 'ต้นทุน']} labelFormatter={(l) => thaiDate(l)} />
                        <Line type="monotone" dataKey="gain" stroke="#34d399" strokeWidth={2.5} dot={false} name="gain" isAnimationActive={false} />
                        <Line type="monotone" dataKey="cost" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="cost" isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
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
                  <div className="pf-legend-hint">แตะชื่อสินทรัพย์เพื่อเลือก/ไม่นับรวมในมูลค่าพอร์ตรวมและกราฟ</div>
                  <div className="pf-donut-row" style={{ justifyContent: 'center', background: '#111827', padding: '20px', borderRadius: '16px', border: '1px solid var(--divider)' }}>
                    <ExplodedPie3D data={displayByType.map((t) => ({ key: t.key, label: t.label, color: t.color, value: t.value }))} rx={95} />
                    <div className="pf-legend pf-legend-col">
                      {byType.map((t) => {
                        const isExcluded = !!excludedTypes[t.key];
                        return (
                          <button className="pf-legend-item pf-legend-toggle" key={t.key} onClick={() => toggleTypeInclusion(t.key)}>
                            <span className="pf-dot" style={{ background: isExcluded ? '#5B6779' : t.color }} />
                            <span className={isExcluded ? 'pf-legend-name-excluded' : 'pf-legend-name-included'}>{t.label}</span>
                            <span className="pf-legend-val pf-mono">
                              {isExcluded ? `฿${fmt(t.value, 0)}` : `${fmt((t.value / (displayTotalValue || 1)) * 100, 1)}% · ฿${fmt(t.value, 0)}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {byType.find(t => t.key === 'cash') && (
                    <div className="pf-type-section" style={{ marginTop: '20px' }}>
                      <div className="pf-type-section-head">
                        <div className="pf-type-section-info" style={{ flex: 1 }}>
                          <div className="pf-type-section-title"><span className="pf-dot" style={{ background: '#7C8B9E' }} />เงินสด / สภาพคล่อง</div>
                          <div className="pf-type-section-value pf-mono">฿{fmt(computedCash, 0)}</div>
                        </div>
                      </div>
                      <button className="pf-cash-manage-btn" onClick={() => setPanel('cashManage')}>
                        <span className="pf-cash-manage-icon"><Wallet size={16} /></span>
                        <span>จัดการเงินสด & ดูสรุปรายปี</span>
                        <ChevronRight size={14} style={{ opacity: 0.5 }} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ================= 4. สินทรัพย์อื่นๆ ================= */}
          {activeTab === 4 && (
            <div>
              <div className="pf-section-label" style={{ marginTop: 0 }}>สินทรัพย์อื่นๆ (กองทุน ทอง คริปโต)</div>
              {holdings.filter((h) => h.type === 'crypto' || h.type === 'gold' || h.type === 'fund' || h.type === 'other').length === 0 ? (
                <div className="pf-empty">
                  <Inbox size={26} style={{ marginBottom: 8, opacity: 0.6 }} />
                  <div>ยังไม่มีสินทรัพย์อื่นๆ ในพอร์ต</div>
                  <button className="pf-btn pf-btn-primary pf-empty-cta" onClick={openAdd}><Plus size={16} /> เพิ่มสินทรัพย์อื่นๆ</button>
                </div>
              ) : (
                byType.filter((t) => t.key !== 'th_stock' && t.key !== 'foreign_stock' && t.key !== 'cash').map((t) => {
                  const typeHoldings = enriched.filter((h) => h.type === t.key);
                  const typeCost = typeHoldings.reduce((s, h) => s + h.costValue, 0);
                  const typeGain = t.value - typeCost;
                  const typeGainPct = typeCost > 0 ? (typeGain / typeCost) * 100 : 0;
                  const shades = shadeSet(t.color, typeHoldings.length);
                  const colorById = {};
                  typeHoldings.forEach((h, i) => { colorById[h.id] = shades[i]; });

                  return (
                    <div className="pf-type-section" key={t.key}>
                      <div className="pf-type-section-head">
                        <ExplodedPie3D data={typeHoldings.map((h) => ({ key: h.id, label: h.name, color: colorById[h.id], value: h.marketValue }))} rx={55} depth={12} explode={4} />
                        <div className="pf-type-section-info">
                          <div className="pf-type-section-title"><span className="pf-dot" style={{ background: t.color }} />{t.label}</div>
                          <div className="pf-type-section-value pf-mono">฿{fmt(t.value, 0)}</div>
                          {typeCost > 0 && <div className="pf-type-section-cost pf-mono">ต้นทุนรวม ฿{fmt(typeCost, 0)}</div>}
                          {typeCost > 0 && (
                            <div className={`pf-type-section-gain pf-mono ${typeGain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>
                              {typeGain >= 0 ? '+' : ''}{fmt(typeGain, 0)} ({typeGain >= 0 ? '+' : ''}{fmt(typeGainPct, 1)}%)
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '14px', paddingRight: '4px' }}>
                        {typeHoldings.map((h) => {
                          const itemPct = t.value > 0 ? (h.marketValue / t.value) * 100 : 0;
                          return (
                            <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="pf-dot" style={{ background: colorById[h.id] }} />
                                <span>{h.name}</span>
                              </div>
                              <span className="pf-mono" style={{ color: 'var(--gold)', fontWeight: '600' }}>{fmt(itemPct, 1)}%</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pf-type-section-holdings">
                        {typeHoldings.map((h) => {
                          const holdingPct = t.value > 0 ? (h.marketValue / t.value) * 100 : 0;
                          return (
                            <div className="pf-subrow" key={h.id}>
                              <div className="pf-row-top">
                                <div className="pf-row-name">
                                  <span className="pf-dot" style={{ background: colorById[h.id] }} />
                                  <span className="pf-row-name-text">{h.name}</span>
                                </div>
                                <div className="pf-row-actions">
                                  <button aria-label="แก้ไข" onClick={() => openEdit(h)}><Pencil size={15} /></button>
                                  <button aria-label="ลบ" onClick={() => requestDelete('holding', h.id, h.name)}><Trash2 size={15} /></button>
                                </div>
                              </div>
                              <div className="pf-row-meta pf-mono">
                                <span>สัดส่วน <b>{fmt(holdingPct, 1)}%</b></span>
                                <span>จำนวน <b>{fmt(h.qty, h.qty % 1 === 0 ? 0 : 4)}</b></span>
                                <span>มูลค่า <b>฿{fmt(h.marketValue)}</b></span>
                                <span className={h.gain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}>
                                  {h.gain >= 0 ? '+' : ''}{fmt(h.gain)} ({h.gain >= 0 ? '+' : ''}{fmt(h.gainPct, 1)}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================= 5. ตั้งค่า ================= */}
          {activeTab === 5 && (
            <div>
              <div className="pf-section-label" style={{ marginTop: 0 }}>ตั้งค่าระบบ (Settings)</div>
              <div className="pf-type-section">
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>จัดการข้อมูล & อัปเดตราคา</div>
                  <div style={{ color: 'var(--muted)', fontSize: '13px' }}>อัปเดตราคาสินทรัพย์รายวัน, ตั้งค่า API และสำรองข้อมูล</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {holdings.length > 0 && (
                    <button className="pf-btn pf-btn-primary" style={{ justifyContent: 'flex-start', padding: '14px' }} onClick={openUpdatePrices}>
                      <RefreshCw size={16} /> อัปเดตราคาวันนี้ (ราคาตลาด)
                    </button>
                  )}
                  <button className="pf-btn pf-btn-ghost" style={{ justifyContent: 'flex-start', padding: '14px' }} onClick={() => { setBackendDraft(backendUrl); setFxDraft(String(fxRate)); setInitialCapitalDraft(initialCapital > 0 ? String(initialCapital) : ''); setPanel('settings'); }}>
                    ⚙️ ตั้งค่า API Endpoint และอัตราแลกเปลี่ยน
                  </button>
                  <button className="pf-btn pf-btn-ghost" style={{ justifyContent: 'flex-start', padding: '14px' }} onClick={exportData}>
                    📥 ส่งออกข้อมูล (สำรอง Backup JSON)
                  </button>
                  <button className="pf-btn pf-btn-ghost" style={{ justifyContent: 'flex-start', padding: '14px' }} onClick={triggerImport}>
                    📤 นำเข้าข้อมูล (กู้คืน Restore JSON)
                  </button>
                  <button className="pf-btn" style={{ justifyContent: 'flex-start', padding: '14px', background: 'rgba(252,165,165,0.1)', color: 'var(--neg)', border: '1px solid var(--neg)' }} onClick={() => setConfirmClear(true)}>
                    🗑️ ล้างข้อมูลทั้งหมดในพอร์ต
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Action Button */}
          <div className="pf-fab">
            <button className="pf-btn pf-btn-primary" onClick={openAdd}><Plus size={16} /> เพิ่ม</button>
          </div>
        </>
      )}

      {/* แถบเมนูด้านล่าง 5 หน้าต่าง */}
      <div className="pf-bottom-nav">
        <button onClick={() => setActiveTab(1)} className={`pf-nav-item ${activeTab === 1 ? 'active' : ''}`}>
          📊
          <span className="pf-nav-label">หุ้นไทย</span>
        </button>
        <button onClick={() => setActiveTab(2)} className={`pf-nav-item ${activeTab === 2 ? 'active' : ''}`}>
          🌐
          <span className="pf-nav-label">หุ้นนอก</span>
        </button>
        <button onClick={() => setActiveTab(3)} className={`pf-nav-center ${activeTab === 3 ? 'active' : ''}`}>
          🏛️
        </button>
        <button onClick={() => setActiveTab(4)} className={`pf-nav-item ${activeTab === 4 ? 'active' : ''}`}>
          🪙
          <span className="pf-nav-label">สินทรัพย์อื่น</span>
        </button>
        <button onClick={() => setActiveTab(5)} className={`pf-nav-item ${activeTab === 5 ? 'active' : ''}`}>
          ⚙️
          <span className="pf-nav-label">ตั้งค่า</span>
        </button>
      </div>

      {/* Modals & Panels */}
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
              <input className="pf-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น PTT, AAPL, Bitcoin" />
            </div>
            {form.type !== 'cash' && (
              <div className="pf-field">
                <label className="pf-label">สัญลักษณ์ {typeInfo(form.type).market ? '(ใส่เพื่อดึงราคาอัตโนมัติได้)' : '(ถ้ามี)'}</label>
                <input className="pf-input" value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })} placeholder={TICKER_HINT[form.type] || 'ไม่บังคับ'} />
              </div>
            )}
            {(form.type === 'th_stock' || form.type === 'foreign_stock') && (
              <div className="pf-field">
                <label className="pf-label">ประเภทตราสาร</label>
                <select className="pf-select" value={form.instrumentType} onChange={(e) => setForm({ ...form, instrumentType: e.target.value })}>
                  {INSTRUMENT_TYPES.map((it) => <option value={it.key} key={it.key}>{it.label}</option>)}
                </select>
              </div>
            )}
            {(form.type === 'th_stock' || form.type === 'foreign_stock') && (
              <div className="pf-field">
                <label className="pf-label">กลุ่มอุตสาหกรรม (ถ้ามี)</label>
                <input className="pf-input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="เช่น พลังงาน, เทคโนโลยี" />
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
            </div>
            {form.type === 'cash' ? (
              <div className="pf-field">
                <label className="pf-label">จำนวนเงิน</label>
                <input className="pf-input pf-mono" inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0.00" />
              </div>
            ) : (
              <>
                <div className="pf-row2">
                  <div className="pf-field">
                    <label className="pf-label">จำนวน</label>
                    <input className="pf-input pf-mono" inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">ราคาต้นทุนเฉลี่ย</label>
                    <input className="pf-input pf-mono" inputMode="decimal" value={form.avgCost} onChange={(e) => setForm({ ...form, avgCost: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <div className="pf-field">
                  <label className="pf-label">ราคาปัจจุบัน</label>
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
            <button className="pf-btn pf-btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }} onClick={fetchAutoPrices} disabled={fetchingPrices}>
              <Zap size={15} /> {fetchingPrices ? 'กำลังดึงราคา...' : 'ดึงราคาอัตโนมัติ'}
            </button>
            {holdings.filter((h) => h.type !== 'cash').map((h) => (
              <div className="pf-update-item" key={h.id}>
                <span className="pf-update-name">{h.name}</span>
                <input className="pf-input pf-mono pf-update-input" inputMode="decimal" value={updateDraft[h.id] ?? ''} onChange={(e) => setUpdateDraft({ ...updateDraft, [h.id]: e.target.value })} />
              </div>
            ))}
            <div className="pf-panel-actions">
              <button className="pf-btn pf-btn-ghost" onClick={closePanel}>ยกเลิก</button>
              <button className="pf-btn pf-btn-primary" onClick={submitUpdatePrices}>บันทึกราคา</button>
            </div>
          </div>
        </div>
      )}

      {panel === 'settings' && (
        <div className="pf-overlay" onClick={closePanel}>
          <div className="pf-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pf-panel-head">
              <div className="pf-panel-title">ตั้งค่าระบบ</div>
              <button className="pf-icon-btn" onClick={closePanel} aria-label="ปิด"><X size={16} /></button>
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
            </div>
            <div className="pf-field">
              <label className="pf-label">ทุนเริ่มต้นทั้งหมด (บาท)</label>
              <input className="pf-input pf-mono" inputMode="decimal" value={initialCapitalDraft} onChange={(e) => setInitialCapitalDraft(e.target.value)} placeholder="เช่น 100000" />
            </div>
            <div className="pf-panel-actions">
              <button className="pf-btn pf-btn-ghost" onClick={closePanel}>ยกเลิก</button>
              <button className="pf-btn pf-btn-primary" onClick={saveBackendUrl}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {panel === 'ledger' && (
        <div className="pf-overlay" onClick={() => setPanel('cashManage')}>
          <div className="pf-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pf-panel-head">
              <div className="pf-panel-title">{LEDGER_LABELS[ledgerType]}</div>
              <button className="pf-icon-btn" onClick={() => setPanel('cashManage')} aria-label="ปิด"><X size={16} /></button>
            </div>
            {ledgerError && <div className="pf-error">{ledgerError}</div>}
            <div className="pf-field">
              <label className="pf-label">
                {ledgerType === 'rebalance' ? 'จำนวนเงิน (ใส่เครื่องหมาย - หากต้องการลบออก)' : 'จำนวนเงิน (บาท)'}
              </label>
              <input className="pf-input pf-mono" inputMode="decimal" value={ledgerAmount} onChange={(e) => setLedgerAmount(e.target.value)} placeholder={ledgerType === 'rebalance' ? 'เช่น 150 หรือ -50' : '0.00'} autoFocus />
              <div className="pf-currency-hint">
                {ledgerType === 'rebalance' && 'กรอกตัวเลขติดลบ เช่น -150 เพื่อนำไปหักออก หรือกรอกบวกเพื่อเพิ่มเข้า เพื่อปรับแก้ความคลาดเคลื่อนจากค่าธรรมเนียม'}
              </div>
            </div>
            <div className="pf-field">
              <label className="pf-label">วันที่</label>
              <input className="pf-input pf-mono" type="date" value={ledgerDate} onChange={(e) => setLedgerDate(e.target.value)} />
            </div>
            <div className="pf-field">
              <label className="pf-label">รายละเอียด (ถ้ามี)</label>
              <input className="pf-input" value={ledgerNote} onChange={(e) => setLedgerNote(e.target.value)} placeholder="เช่น ปรับสมดุลพอร์ตสิ้นปี" />
            </div>
            <div className="pf-panel-actions">
              <button className="pf-btn pf-btn-ghost" onClick={() => setPanel('cashManage')}>ยกเลิก</button>
              <button className="pf-btn pf-btn-primary" onClick={submitLedger}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {panel === 'cashManage' && (
        <div className="pf-overlay" onClick={closePanel}>
          <div className="pf-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pf-panel-head">
              <div className="pf-panel-title">จัดการเงินสด & สรุปรายปี</div>
              <button className="pf-icon-btn" onClick={closePanel} aria-label="ปิด"><X size={16} /></button>
            </div>

            <div style={{ background: 'var(--surface-alt)', padding: '14px', borderRadius: '12px', marginBottom: '16px' }}>
              <div className="pf-capital-row">
                <span>ทุนสะสม</span>
                <span className="pf-mono">฿{fmt(totalCapital, 0)}</span>
              </div>
              <div className="pf-capital-row">
                <span>ต้นทุนรวมที่ลงทุนไป</span>
                <span className="pf-mono">฿{fmt(totalInvestedCost, 0)}</span>
              </div>
            </div>

            <div className="pf-cash-actions">
              <button className="pf-cash-action-btn" onClick={() => openLedgerForm('capital_add')}>+ เพิ่มทุน</button>
              <button className="pf-cash-action-btn" onClick={() => openLedgerForm('capital_reduce')}>- ลดทุน</button>
              <button className="pf-cash-action-btn" onClick={() => openLedgerForm('rebalance')} style={{ background: 'var(--gold)', color: '#1A1400' }}><Sliders size={13} /> รีบาลานซ์</button>
              <button className="pf-cash-action-btn" onClick={() => openLedgerForm('profit')}>+ กำไร</button>
              <button className="pf-cash-action-btn" onClick={() => openLedgerForm('loss')}>- ขาดทุน</button>
              <button className="pf-cash-action-btn" onClick={() => openLedgerForm('dividend')}>+ ปันผล</button>
            </div>

            <div className="pf-section-label" style={{ margin: '18px 0 8px' }}>สรุปรายปี</div>
            <div className="pf-year-picker">
              {yearOptions.map((y) => (
                <button key={y} className={y === selectedYear ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setSelectedYear(y)}>
                  {buddhistYear(y)}
                </button>
              ))}
            </div>
            <div className="pf-year-card">
              <div className="pf-year-net">
                <div className="pf-year-net-label">รวมสุทธิปี {buddhistYear(selectedYear)}</div>
                <div className="pf-year-net-value pf-mono">{yearSummary.net >= 0 ? '+' : '-'}฿{fmt(Math.abs(yearSummary.net), 0)}</div>
              </div>

              {(yearSummary.totalIn > 0 || yearSummary.totalOut > 0) && (
                <>
                  <div className="pf-year-flow-bar">
                    <div className="pf-year-flow-in" style={{ width: `${yearSummary.inPct}%` }} />
                    <div className="pf-year-flow-out" style={{ width: `${100 - yearSummary.inPct}%` }} />
                  </div>
                  <div className="pf-year-flow-legend">
                    <span><span className="pf-dot" style={{ background: 'var(--gold)' }} /> เงินเข้า ฿{fmt(yearSummary.totalIn, 0)}</span>
                    <span><span className="pf-dot" style={{ background: '#5B6779' }} /> เงินออก ฿{fmt(yearSummary.totalOut, 0)}</span>
                  </div>
                </>
              )}

              <div className="pf-year-rows">
                {yearSummary.capital_add > 0 && (
                  <div className="pf-year-row"><PlusCircle size={15} className="pf-year-row-icon" /><span>เพิ่มทุน / รีบาลานซ์บวก</span><span className="pf-mono">฿{fmt(yearSummary.capital_add, 0)}</span></div>
                )}
                {yearSummary.capital_reduce > 0 && (
                  <div className="pf-year-row"><MinusCircle size={15} className="pf-year-row-icon" /><span>ลดทุน / รีบาลานซ์ลบ</span><span className="pf-mono">฿{fmt(yearSummary.capital_reduce, 0)}</span></div>
                )}
                {yearSummary.profit > 0 && (
                  <div className="pf-year-row"><TrendingUp size={15} className="pf-year-row-icon" /><span>กำไร</span><span className="pf-mono">฿{fmt(yearSummary.profit, 0)}</span></div>
                )}
                {yearSummary.loss > 0 && (
                  <div className="pf-year-row"><TrendingDown size={15} className="pf-year-row-icon" /><span>ขาดทุน</span><span className="pf-mono">฿{fmt(yearSummary.loss, 0)}</span></div>
                )}
                {yearSummary.dividend > 0 && (
                  <div className="pf-year-row"><Gift size={15} className="pf-year-row-icon" /><span>ปันผล</span><span className="pf-mono">฿{fmt(yearSummary.dividend, 0)}</span></div>
                )}
              </div>
            </div>

            <div className="pf-section-label" style={{ margin: '18px 0 8px' }}>ประวัติการทำรายการ</div>
            {recentLedger.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13, padding: '10px 0' }}>ยังไม่มีประวัติ</div>
            ) : (
              <div className="pf-type-section-holdings" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                {recentledger.map((e) => (
                  <div className="pf-subrow" key={e.id}>
                    <div className="pf-row-top">
                      <div className="pf-row-name">
                        <span className="pf-row-name-text">{LEDGER_LABELS[e.type] || e.type}{e.note ? ` · ${e.note}` : ''}</span>
                      </div>
                      <div className="pf-row-actions">
                        <button aria-label="ลบ" onClick={() => requestDelete('ledger', e.id, LEDGER_LABELS[e.type])}><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <div className="pf-row-meta pf-mono">
                      <span className={`pf-ledger-amount ${LEDGER_SIGN[e.type] > 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>
                        {LEDGER_SIGN[e.type] > 0 ? '+' : '-'}฿{fmt(e.amount)}
                      </span>
                      <span style={{ marginLeft: 'auto' }}>{thaiDate(e.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDeleteTarget && (
        <div className="pf-modal-overlay" onClick={() => setConfirmDeleteTarget(null)}>
          <div className="pf-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 16, fontSize: 14.5 }}>ยืนยันลบ "{confirmDeleteTarget.label}"?</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="pf-btn pf-btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDeleteTarget(null)}>ยกเลิก</button>
              <button className="pf-btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--neg)', color: '#fff', border: 'none' }} onClick={performDelete}>ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="pf-toast">{toast}</div>}
    </div>
  );
}
