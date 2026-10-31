import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, X, TrendingUp, TrendingDown, Inbox, Zap, Wallet, ChevronRight, ArrowUpDown, PlusCircle, MinusCircle, Gift, Sliders, Home, LayoutGrid, BarChart3, Settings, Search, History, RotateCcw, Calendar, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LabelList } from 'recharts';

const ASSET_TYPES = [
  { key: 'th_stock', label: 'หุ้นไทย', color: '#C7A344', market: 'th', defaultCurrency: 'THB' },
  { key: 'foreign_stock', label: 'หุ้นนอก', color: '#38bdf8', market: 'us', defaultCurrency: 'USD' },
  { key: 'fund', label: 'กองทุน', color: '#C17B86', market: null, defaultCurrency: 'THB' },
  { key: 'gold', label: 'ทองคำ', color: '#D9823F', market: 'gold', defaultCurrency: 'USD' },
  { key: 'crypto', label: 'คริปโต', color: '#967ACC', market: 'crypto', defaultCurrency: 'USD' },
  { key: 'cash', label: 'เงินสด', color: '#7C8B9E', market: null, defaultCurrency: 'THB' },
  { key: 'other', label: 'อื่นๆ', color: '#4F9E93', market: null, defaultCurrency: 'THB' },
];
const typeInfo = (key) => ASSET_TYPES.find((t) => t && t.key === key) || ASSET_TYPES[ASSET_TYPES.length - 1];
const TICKER_HINT = {
  th_stock: 'เช่น PTT หรือ PTT.BK',
  foreign_stock: 'เช่น AAPL, MSFT',
  crypto: 'เช่น BTC, ETH',
  gold: 'เช่น XAU (ถ้ามี)',
};

const LEDGER_LABELS = { capital_add: 'เพิ่มทุน', capital_reduce: 'ลดทุน', profit: 'กำไรจากการขาย', loss: 'ขาดทุนจากการขาย', dividend: 'ปันผล', rebalance: 'รีบาลานซ์' };

function hexToHsl(hex) {
  const c = (hex || '').replace('#', '');
  if (c.length < 6) return { h: 0, s: 0, l: 50 };
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
  const total = (data || []).reduce((s, d) => s + (d?.value || 0), 0);
  const ry = rx * 0.55;
  const pad = explode + 12;
  const width = rx * 2 + pad * 2;
  const height = ry * 2 + depth + pad * 2;
  const cx = rx + pad;
  const cy = ry + pad;

  if (isNaN(total) || total <= 0 || !Array.isArray(data) || data.length === 0) {
    return <div className="pf-pie-empty" style={{ width, height }} />;
  }

  const topPt = (theta, ox, oy) => ({ x: ox + rx * Math.sin(theta), y: oy - ry * Math.cos(theta) });
  const botPt = (theta, ox, oy) => { const p = topPt(theta, ox, oy); return { x: p.x, y: p.y + depth }; };

  let cursor = 0;
  const slices = data.map((d) => {
    const val = Number(d?.value) || 0;
    const frac = total > 0 ? val / total : 0;
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

const fmt = (n, digits = 2, isCrypto = false) => {
  const num = parseFloat(n);
  if (n === null || n === undefined || isNaN(num)) return '-';
  if (isCrypto) {
    const absN = Math.abs(num);
    if (absN > 0 && absN < 1) {
      const str = num.toString();
      if (!str.includes('e')) {
        const decimals = str.split('.')[1] || '';
        let firstNonZeroIdx = 0;
        for (let i = 0; i < decimals.length; i++) {
          if (decimals[i] !== '0') {
            firstNonZeroIdx = i + 1;
            break;
          }
        }
        const d = Math.max(2, firstNonZeroIdx);
        return new Intl.NumberFormat('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d }).format(num);
      }
    }
  }
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(num);
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const thaiDateAD = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
};

const calcDaysAgo = (dateStr) => {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - d);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const emptyForm = { 
  name: '', ticker: '', type: 'th_stock', quantity: '', avgCost: '', currentPrice: '', currency: 'THB', industry: '', instrumentType: 'stock',
  feePct: '0', feeCurrency: 'THB', tradeDate: todayStr(), note: '',
  tradeAction: 'none', tradeQty: '', tradePrice: '', tradeFx: ''
};

const INSTRUMENT_TYPES = [
  { key: 'stock', label: 'หุ้นรายตัว' },
  { key: 'dr', label: 'DR (Depositary Receipt)' },
  { key: 'etf', label: 'ETF' },
];
const INSTRUMENT_RANK = { stock: 0, dr: 1, etf: 2 };

const getDynamicDomain = (currentVal, baseVal) => {
  const refVal = parseFloat(currentVal) || parseFloat(baseVal) || 100000;
  const margin = Math.max(refVal * 0.25, 5000);
  const min = Math.max(0, refVal - margin);
  const max = refVal + margin;
  return [Math.floor(min / 5000) * 5000, Math.ceil(max / 5000) * 5000];
};

const getMonthlyAxisData = () => {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYearShort = String(now.getFullYear()).slice(-2);
  const result = [];
  for (let i = 0; i < 12; i++) {
    const idx = (currentMonthIdx - 11 + i + 12) % 12;
    result.push({ date: `${months[idx]} ${currentYearShort}` });
  }
  return result;
};

export default function PortfolioApp() {
  const [activeTab, setActiveTab] = useState(3);
  const [holdings, setHoldings] = useState([]);
  const [tradeLogs, setTradeLogs] = useState([]);
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
  const [confirmRevertTarget, setConfirmRevertTarget] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);
  const [chartModeByType, setChartModeByType] = useState({});

  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeFilterType, setTradeFilterType] = useState('all');
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [tradeSearchQuery, setTradeSearchQuery] = useState('');
  const [tradeStartDate, setTradeStartDate] = useState('');
  const [tradeEndDate, setTradeEndDate] = useState('');

  const [expandedLotsId, setExpandedLotsId] = useState(null);

  const [sortModeByType, setSortModeByType] = useState({});
  const cycleSortMode = (typeKey, maxMode = 2) => {
    setSortModeByType((prev) => {
      const current = prev[typeKey] || 0;
      const next = (current + 1) % (maxMode + 1);
      return { ...prev, [typeKey]: next };
    });
  };

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
  const [ledgerSign, setLedgerSign] = useState('+');
  const [ledgerError, setLedgerError] = useState('');
  const [ledgerNote, setLedgerNote] = useState('');
  const [ledgerDate, setLedgerDate] = useState('');

  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');

  const [graphModeTotal, setGraphModeTotal] = useState('all');
  const [graphYearTotal, setGraphYearTotal] = useState(String(new Date().getFullYear()));
  const [graphModeGain, setGraphModeGain] = useState('all');
  const [graphYearGain, setGraphYearGain] = useState(String(new Date().getFullYear()));
  const [graphModeTh, setGraphModeTh] = useState('all');
  const [graphYearTh, setGraphYearTh] = useState(String(new Date().getFullYear()));
  const [graphModeUs, setGraphModeUs] = useState('all');
  const [graphYearUs, setGraphYearUs] = useState(String(new Date().getFullYear()));

  const [dividendGraphMode, setDividendGraphMode] = useState('year');

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
      let logs = [];
      let hist = [];
      try {
        const r = await window.storage.get('holdings', false);
        if (r && r.value) h = JSON.parse(r.value);
      } catch (e) { /* no data */ }
      try {
        const rLogs = await window.storage.get('trade-logs', false);
        if (rLogs && rLogs.value) logs = JSON.parse(rLogs.value);
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
      setTradeLogs(Array.isArray(logs) ? logs : []);
      setHistory(Array.isArray(hist) ? hist : []);
      setBackendUrl(url);
      setBackendDraft(url);
      setFxRate(isNaN(fx) ? 36.5 : fx);
      setFxDraft(String(isNaN(fx) ? 36.5 : fx));
      setInitialCapital(isNaN(capital) ? 0 : capital);
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

  const saveTradeLogs = async (next) => {
    setTradeLogs(next);
    try { await window.storage.set('trade-logs', JSON.stringify(next), false); }
    catch (e) { showToast('บันทึกประวัติการซื้อขายไม่สำเร็จ'); }
  };

  const saveHistory = async (next) => {
    setHistory(next);
    try { await window.storage.set('portfolio-history', JSON.stringify(next), false); }
    catch (e) { showToast('บันทึกประวัติไม่สำเร็จ'); }
  };

  const saveLedger = async (next) => {
    setLedger(next);
    try { await window.storage.set('cash-ledger', JSON.stringify(next), false); } catch (e) { /* ignore */ }
  };

  const getEffectiveRate = (type, rate) => {
    return parseFloat(rate) || 36.5;
  };

  const enriched = useMemo(() => (holdings || []).map((h) => {
    const qty = parseFloat(h?.quantity) || 0;
    const avg = parseFloat(h?.avgCost) || 0;
    const price = parseFloat(h?.currentPrice) || 0;
    const currency = h?.currency === 'USD' ? 'USD' : 'THB';
    
    const assetBuys = (tradeLogs || []).filter(l => l && l.assetId === h?.id && l.action === 'buy');
    let historicalRate = 1;
    if (currency === 'USD') {
      if (assetBuys.length > 0 && assetBuys[0]?.tradeFx) {
        historicalRate = parseFloat(assetBuys[0].tradeFx) || fxRate;
      } else {
        historicalRate = fxRate;
      }
    }

    const isDr = h?.instrumentType === 'dr';
    const effRate = (currency === 'USD' && !isDr) ? getEffectiveRate(h?.type, fxRate) : 1;
    const marketValue = qty * price * effRate;
    const costValue = qty * avg * ((currency === 'USD' && !isDr) ? historicalRate : 1);
    const gain = marketValue - costValue;
    const gainPct = costValue > 0 ? (gain / costValue) * 100 : 0;

    let effectiveType = h?.type;
    if (effectiveType === 'th_stock' && h?.instrumentType === 'dr') {
      effectiveType = 'foreign_stock';
    }
    return { 
      ...h, 
      type: effectiveType, 
      qty: isNaN(qty) ? 0 : qty, 
      avg: isNaN(avg) ? 0 : avg, 
      price: isNaN(price) ? 0 : price, 
      currency, 
      marketValue: isNaN(marketValue) ? 0 : marketValue, 
      costValue: isNaN(costValue) ? 0 : costValue, 
      gain: isNaN(gain) ? 0 : gain, 
      gainPct: isNaN(gainPct) ? 0 : gainPct 
    };
  }), [holdings, fxRate, tradeLogs]);

  const totalInvestedValue = useMemo(() => enriched.filter((h) => h?.type !== 'cash').reduce((s, h) => s + (h?.marketValue || 0), 0), [enriched]);
  const totalInvestedCost = useMemo(() => enriched.filter((h) => h?.type !== 'cash').reduce((s, h) => s + (h?.costValue || 0), 0), [enriched]);

  const capitalAddTotal = useMemo(() => (ledger || []).filter((e) => e && e.type === 'capital_add').reduce((s, e) => s + (parseFloat(e?.amount) || 0), 0), [ledger]);
  const capitalReduceTotal = useMemo(() => (ledger || []).filter((e) => e && e.type === 'capital_reduce').reduce((s, e) => s + (parseFloat(e?.amount) || 0), 0), [ledger]);
  const capitalAdjTotal = useMemo(() => capitalAddTotal - capitalReduceTotal, [capitalAddTotal, capitalReduceTotal]);

  const combinedLedger = useMemo(() => {
    let list = Array.isArray(ledger) ? ledger.filter(e => e && !e.note?.includes('ค่าธรรมเนียมซื้อ') && !String(e.id).endsWith('_fee')) : [];
    (tradeLogs || []).forEach((log) => {
      if (log && log.action === 'sell' && log.pnl !== undefined) {
        const logFx = (log.currency === 'USD' && log.assetType !== 'th_stock' && log.instrumentType !== 'dr') ? (parseFloat(log.tradeFx) || fxRate) : 1;
        const pnlThb = log.pnlThb !== undefined ? log.pnlThb : ((log.currency === 'USD' || log.assetType === 'foreign_stock') ? ((parseFloat(log.pnl) || 0) * logFx) : (parseFloat(log.pnl) || 0));
        if (!isNaN(pnlThb) && Math.abs(pnlThb) > 0.001) {
          list.push({
            id: 'log_pnl_' + log.id,
            type: pnlThb >= 0 ? 'profit' : 'loss',
            amount: Math.abs(pnlThb),
            date: log.date || todayStr(),
            note: `ขาย ${log.assetName || ''}` + (log.note ? ` (${log.note})` : '')
          });
        }
      }
    });
    return list;
  }, [ledger, tradeLogs, fxRate]);

  const performanceTotal = useMemo(() => (
    combinedLedger.filter((e) => e && e.type === 'profit').reduce((s, e) => s + (parseFloat(e?.amount) || 0), 0)
    - combinedLedger.filter((e) => e && e.type === 'loss').reduce((s, e) => s + (parseFloat(e?.amount) || 0), 0)
  ), [combinedLedger]);

  const rebalanceTotal = useMemo(() => (
    combinedLedger.filter((e) => e && e.type === 'rebalance').reduce((s, e) => s + (parseFloat(e?.amount) || 0), 0)
  ), [combinedLedger]);

  const cashAdjTotal = useMemo(() => (
    performanceTotal + combinedLedger.filter((e) => e && e.type === 'dividend').reduce((s, e) => s + (parseFloat(e?.amount) || 0), 0) + rebalanceTotal
  ), [combinedLedger, performanceTotal, rebalanceTotal]);

  const totalCapital = initialCapital + capitalAdjTotal;
  const cashActive = initialCapital > 0 || combinedLedger.length > 0;
  const computedCash = cashActive ? (totalCapital - totalInvestedCost + cashAdjTotal) : 0;

  const cashRatio = useMemo(() => {
    const invVal = totalInvestedValue;
    if (invVal <= 0) return 0;
    return (Math.max(0, computedCash) / invVal) * 100;
  }, [totalInvestedValue, computedCash]);

  const totalRealizedPnL = performanceTotal;

  const realizedPnLByType = useMemo(() => {
    const pnlMap = { th_stock: 0, foreign_stock: 0, fund: 0, gold: 0, crypto: 0, other: 0 };
    (tradeLogs || []).forEach((log) => {
      if (log && log.action === 'sell' && log.pnl !== undefined) {
        const t = log.assetType || 'th_stock';
        const logFx = (log.currency === 'USD' && log.assetType !== 'th_stock' && log.instrumentType !== 'dr') ? (parseFloat(log.tradeFx) || fxRate) : 1;
        const pnlThb = log.pnlThb !== undefined ? log.pnlThb : ((log.currency === 'USD' || log.assetType === 'foreign_stock') ? ((parseFloat(log.pnl) || 0) * logFx) : (parseFloat(log.pnl) || 0));
        if (!isNaN(pnlThb)) {
          pnlMap[t] = (pnlMap[t] || 0) + pnlThb;
        }
      }
    });
    return pnlMap;
  }, [tradeLogs, fxRate]);

  const recentLedger = useMemo(() => {
    let list = combinedLedger.slice().sort((a, b) => (b?.date || '').localeCompare(a?.date || '') || String(b?.id || '').localeCompare(String(a?.id || '')));
    const q = ledgerSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        if (!e) return false;
        const label = String(LEDGER_LABELS[e.type] || e.type || '').toLowerCase();
        const note = String(e.note || '').toLowerCase();
        const amt = String(e.amount ?? '');
        return label.includes(q) || note.includes(q) || amt.includes(q);
      });
    }
    return list;
  }, [combinedLedger, ledgerSearchQuery]);

  const currentYearKey = String(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(currentYearKey);
  const yearOptions = useMemo(() => {
    const set = new Set([currentYearKey, ...combinedLedger.map((e) => (e?.date || '').slice(0, 4)).filter(Boolean), ...(history || []).map((h) => (h?.date || '').slice(0, 4)).filter(Boolean)]);
    return Array.from(set).sort((a, b) => b.localeCompare(a)).slice(0, 5);
  }, [combinedLedger, history, currentYearKey]);

  useEffect(() => {
    if (!yearOptions.includes(selectedYear)) setSelectedYear(yearOptions[0] || currentYearKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearOptions]);

  const yearSummary = useMemo(() => {
    const d = { capital_add: 0, capital_reduce: 0, profit: 0, loss: 0, dividend: 0, rebalance: 0 };
    combinedLedger.forEach((e) => {
      if (e && (e?.date || '').slice(0, 4) === selectedYear) {
        const amt = parseFloat(e.amount) || 0;
        if (e.type === 'rebalance') {
          d.rebalance = (d.rebalance || 0) + amt;
        } else if (d[e.type] !== undefined) {
          d[e.type] = (d[e.type] || 0) + amt;
        }
      }
    });
    const net = d.capital_add - d.capital_reduce + d.profit - d.loss + d.dividend + d.rebalance;
    const totalIn = d.capital_add + d.profit + d.dividend + (d.rebalance > 0 ? d.rebalance : 0);
    const totalOut = d.capital_reduce + d.loss + (d.rebalance < 0 ? Math.abs(d.rebalance) : 0);
    const totalFlow = totalIn + totalOut;
    const inPct = totalFlow > 0 ? (totalIn / totalFlow) * 100 : 0;
    return { ...d, net, totalIn, totalOut, inPct };
  }, [combinedLedger, selectedYear]);

  const totalGain = totalInvestedValue - totalInvestedCost;
  const totalGainPct = totalInvestedCost > 0 ? (totalGain / totalInvestedCost) * 100 : 0;

  const byType = useMemo(() => {
    const map = {};
    enriched.forEach((h) => { if (h && h.type !== 'cash') map[h.type] = (map[h.type] || 0) + (h.marketValue || 0); });
    const list = ASSET_TYPES.filter((t) => t && t.key !== 'cash').map((t) => ({ ...t, value: map[t.key] || 0 })).filter((t) => t.value > 0);
    if (cashActive && computedCash > 0) {
      const cashType = ASSET_TYPES.find((t) => t && t.key === 'cash');
      list.push({ ...cashType, value: computedCash });
    }
    return list.sort((a, b) => b.value - a.value);
  }, [enriched, cashActive, computedCash]);

  const displayByType = useMemo(() => byType.filter((t) => t && !excludedTypes[t.key]), [byType, excludedTypes]);
  const displayTotalValue = useMemo(() => displayByType.reduce((s, t) => s + (t?.value || 0), 0), [displayByType]);
  const heroProfitAmount = displayTotalValue - totalCapital;
  const heroProfitPct = totalCapital > 0 ? (heroProfitAmount / totalCapital) * 100 : null;

  const lastUpdated = useMemo(() => {
    const dates = holdings.map((h) => h?.lastUpdated).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : null;
  }, [holdings]);

  const monthlyList = useMemo(() => getMonthlyAxisData(), []);

  const chartDataTotal = useMemo(() => {
    const base = monthlyList.map((p) => ({ date: p.date, value: displayTotalValue, principal: totalCapital }));
    if (graphModeTotal === 'year') return base.filter((p) => p.date.includes(String(graphYearTotal).slice(-2)));
    return base;
  }, [monthlyList, graphModeTotal, graphYearTotal, displayTotalValue, totalCapital]);

  const chartDataGainCard = useMemo(() => {
    const currentValForGainChart = totalInvestedCost + totalGain;
    const base = monthlyList.map((p) => ({ date: p.date, gain: currentValForGainChart, cost: totalInvestedCost }));
    if (graphModeGain === 'year') return base.filter((p) => p.date.includes(String(graphYearGain).slice(-2)));
    return base;
  }, [monthlyList, graphModeGain, graphYearGain, totalInvestedCost, totalGain]);

  const dividendYears = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 4, y - 3, y - 2, y - 1, y].map(String);
  }, []);

  const dividendByYear = useMemo(() => {
    return dividendYears.map((y) => {
      const entries = combinedLedger.filter((e) => e && e.type === 'dividend' && (e?.date || '').slice(0, 4) === y);
      const divSum = entries.reduce((s, e) => s + (parseFloat(e?.amount) || 0), 0);
      const snaps = entries.map((e) => e?.invested).filter((v) => typeof v === 'number' && v > 0);
      const investedSnap = snaps.length ? snaps[snaps.length - 1] : totalInvestedCost;
      return {
        year: y,
        dividend: divSum,
        invested: divSum > 0 ? investedSnap : 0,
        yieldPct: divSum > 0 && investedSnap > 0 ? (divSum / investedSnap) * 100 : 0,
      };
    });
  }, [dividendYears, combinedLedger, totalInvestedCost]);

  const dividendChartData = useMemo(() => {
    if (dividendGraphMode === 'all') {
      const totalDiv = combinedLedger.filter((e) => e && e.type === 'dividend').reduce((s, e) => s + (parseFloat(e?.amount) || 0), 0);
      const yearsWithDiv = dividendByYear.filter((d) => d && d.dividend > 0);
      const avgInvested = yearsWithDiv.length
        ? yearsWithDiv.reduce((s, d) => s + d.invested, 0) / yearsWithDiv.length
        : totalInvestedCost;
      return [{
        year: 'ตั้งแต่เริ่มต้น',
        dividend: totalDiv,
        invested: totalDiv > 0 ? avgInvested : 0,
        yieldPct: totalDiv > 0 && avgInvested > 0 ? (totalDiv / avgInvested) * 100 : 0,
      }];
    }
    return dividendByYear;
  }, [dividendGraphMode, dividendByYear, combinedLedger, totalInvestedCost]);

  const totalDividendAmount = useMemo(() => {
    return combinedLedger.filter((e) => e && e.type === 'dividend').reduce((s, e) => s + (parseFloat(e?.amount) || 0), 0);
  }, [combinedLedger]);

  const dividendMaxVal = useMemo(() => {
    const rawMax = Math.max(...dividendChartData.map((d) => Math.max(d?.dividend || 0, d?.invested || 0)), 1000);
    const step = Math.ceil(rawMax / 4 / 500) * 500 || 1000;
    return step * 4;
  }, [dividendChartData]);

  const chartDataTh = useMemo(() => {
    const thHoldings = enriched.filter((h) => h && h.type === 'th_stock');
    const thCost = thHoldings.reduce((s, h) => s + (h?.costValue || 0), 0);
    const thVal = thHoldings.reduce((s, h) => s + (h?.marketValue || 0), 0);
    const base = monthlyList.map((p) => ({ date: p.date, gain: thVal, cost: thCost }));
    if (graphModeTh === 'year') return base.filter((p) => p.date.includes(String(graphYearTh).slice(-2)));
    return base;
  }, [monthlyList, graphModeTh, graphYearTh, enriched]);

  const chartDataUs = useMemo(() => {
    const usHoldings = enriched.filter((h) => h && h.type === 'foreign_stock');
    const usCost = usHoldings.reduce((s, h) => s + (h?.costValue || 0), 0);
    const usVal = usHoldings.reduce((s, h) => s + (h?.marketValue || 0), 0);
    const base = monthlyList.map((p) => ({ date: p.date, gain: usVal, cost: usCost }));
    if (graphModeUs === 'year') return base.filter((p) => p.date.includes(String(graphYearUs).slice(-2)));
    return base;
  }, [monthlyList, graphModeUs, graphYearUs, enriched]);

  const openAdd = () => { 
    setForm({ 
      ...emptyForm, 
      feePct: '0', 
      feeCurrency: 'THB',
      tradeDate: todayStr(),
      note: '',
      tradeFx: ''
    }); 
    setEditingId(null); 
    setFormError(''); 
    setPanel('form'); 
  };

  const openEdit = (h) => {
    if (!h) return;
    setForm({ 
      name: h.name || '', 
      ticker: h.ticker || '', 
      type: h.type || 'th_stock', 
      quantity: String(h.quantity || ''), 
      avgCost: String(h.avgCost || ''), 
      currentPrice: String(h.currentPrice || ''), 
      currency: h.currency === 'USD' ? 'USD' : 'THB', 
      industry: h.industry || '', 
      instrumentType: h.instrumentType || 'stock',
      feePct: '0',
      feeCurrency: 'THB',
      tradeDate: todayStr(),
      note: '',
      tradeAction: 'none',
      tradeQty: '',
      tradePrice: String(h.currentPrice || ''),
      tradeFx: ''
    });
    setEditingId(h.id); 
    setFormError(''); 
    setPanel('form');
  };

  const closePanel = () => { setPanel(null); setEditingId(null); setUpdateDraft({}); setLedgerSearchQuery(''); };
  const onFormTypeChange = (type) => {
    setForm((f) => ({ ...f, type, currency: editingId ? f.currency : typeInfo(type).defaultCurrency }));
  };

  const getAssetLots = (assetId, currentQty, currentPrice, assetCurrency, assetType, instrumentType) => {
    try {
      const logs = (tradeLogs || []).filter(l => l && l.assetId === assetId).sort((a, b) => (a?.date || '').localeCompare(b?.date || ''));
      let lots = [];
      logs.forEach(l => {
        if (l && l.action === 'buy') {
          lots.push({ date: l.date, qty: l.quantity, price: l.price, currency: l.currency, tradeFx: l.tradeFx, instrumentType: l.instrumentType });
        } else if (l && l.action === 'sell') {
          let remSell = l.quantity;
          while (remSell > 0 && lots.length > 0) {
            if (lots[0].qty <= remSell) {
              remSell -= lots[0].qty;
              lots.shift();
            } else {
              lots[0].qty -= remSell;
              remSell = 0;
            }
          }
        }
      });
      if (lots.length === 0) {
        const targetHolding = holdings.find(h => h && h.id === assetId);
        if (targetHolding) {
          lots.push({
            date: targetHolding.lastUpdated || todayStr(),
            qty: targetHolding.quantity,
            price: targetHolding.avgCost,
            currency: targetHolding.currency,
            tradeFx: fxRate,
            instrumentType: targetHolding.instrumentType
          });
        }
      }
      const isDr = instrumentType === 'dr';
      const isUsd = assetCurrency === 'USD' && !isDr;
      return lots.map(lot => {
        const days = calcDaysAgo(lot?.date);
        const lotCurPrice = currentPrice;
        const lotBuyPrice = lot?.price || 0;
        const lotQty = lot?.qty || 0;

        const lotIsUsd = lot?.currency === 'USD' && lot?.instrumentType !== 'dr';
        const lotFx = lotIsUsd ? (lot?.tradeFx || fxRate) : 1;

        const lotValThb = lotQty * lotCurPrice * (isUsd ? getEffectiveRate(assetType, fxRate) : 1);
        const lotCostThb = lotQty * lotBuyPrice * lotFx;

        const lotGain = lotValThb - lotCostThb;
        const lotGainPct = lotCostThb > 0 ? (lotGain / lotCostThb) * 100 : 0;

        return { ...lot, days, gainPct: lotGainPct, isUsd: lotIsUsd };
      });
    } catch (e) {
      return [];
    }
  };

  const submitForm = () => {
    const isCash = form.type === 'cash';
    const name = (form.name || '').trim();
    if (!name) { setFormError('กรอกชื่อสินทรัพย์ก่อนนะ'); return; }

    const currency = form.currency === 'USD' ? 'USD' : 'THB';
    const industry = (form.industry || '').trim();
    const instrumentType = (form.type === 'th_stock' || form.type === 'foreign_stock') ? (form.instrumentType || 'stock') : 'stock';
    const isDirectFee = ['foreign_stock', 'gold', 'crypto'].includes(form.type) || ['dr', 'etf'].includes(instrumentType);

    if (editingId) {
      const target = holdings.find((h) => h && h.id === editingId);
      if (!target) return;

      let currentQty = parseFloat(target.quantity) || 0;
      let currentAvg = parseFloat(target.avgCost) || 0;
      let currentPrice = parseFloat(target.currentPrice) || parseFloat(form.currentPrice) || 0;
      let newLedgerEntries = [...ledger];
      let newLogs = [...tradeLogs];

      if (form.tradeAction === 'buy') {
        const addQty = parseFloat(form.tradeQty);
        const addPrice = parseFloat(form.tradePrice);
        const feeInputVal = parseFloat(form.feePct) || 0;
        if (isNaN(addQty) || addQty <= 0 || isNaN(addPrice) || addPrice < 0) {
          setFormError('กรอกจำนวนและราคาซื้อเพิ่มให้ถูกต้อง');
          return;
        }
        const subtotal = addQty * addPrice;
        const customFx = form.tradeFx && parseFloat(form.tradeFx) > 0 ? parseFloat(form.tradeFx) : fxRate;

        let feeAmount = 0;
        if (isDirectFee) {
          if (currency === 'USD' && instrumentType !== 'dr') {
            feeAmount = form.feeCurrency === 'THB' ? (customFx > 0 ? feeInputVal / customFx : feeInputVal) : feeInputVal;
          } else {
            feeAmount = form.feeCurrency === 'USD' ? feeInputVal * customFx : feeInputVal;
          }
        } else {
          feeAmount = (subtotal * feeInputVal) / 100;
        }

        const prevQty = currentQty;
        const prevAvgCost = currentAvg;

        const totalCostBefore = currentQty * currentAvg;
        const newQty = currentQty + addQty;
        const totalNewCost = totalCostBefore + subtotal + feeAmount;
        currentAvg = newQty > 0 ? totalNewCost / newQty : 0;
        currentQty = newQty;

        newLogs.unshift({
          id: Date.now().toString(),
          assetId: target.id,
          assetName: name,
          assetType: form.type,
          instrumentType: instrumentType,
          action: 'buy',
          quantity: addQty,
          price: addPrice,
          fee: feeAmount,
          currency: currency,
          tradeFx: customFx,
          date: form.tradeDate || todayStr(),
          note: (form.note || '').trim(),
          prevQty: prevQty,
          prevAvgCost: prevAvgCost
        });
      } else if (form.tradeAction === 'sell') {
        const sellQty = parseFloat(form.tradeQty);
        const sellPrice = parseFloat(form.tradePrice);
        const feeInputVal = parseFloat(form.feePct) || 0;
        if (isNaN(sellQty) || sellQty <= 0 || sellQty > currentQty || isNaN(sellPrice) || sellPrice < 0) {
          setFormError('จำนวนหรือราคาขายไม่ถูกต้อง (ห้ามขายเกินจำนวนที่มี)');
          return;
        }

        const customFx = form.tradeFx && parseFloat(form.tradeFx) > 0 ? parseFloat(form.tradeFx) : fxRate;
        const isUsdAsset = currency === 'USD' && instrumentType !== 'dr';
        const saleThb = sellQty * sellPrice * (isUsdAsset ? customFx : 1);
        
        const assetBuys = (tradeLogs || []).filter(l => l.assetId === target.id && l.action === 'buy');
        const costFx = (isUsdAsset && assetBuys.length > 0 && assetBuys[0].tradeFx) ? parseFloat(assetBuys[0].tradeFx) : customFx;
        const costThb = sellQty * currentAvg * (isUsdAsset ? costFx : 1);

        let feeThb = 0;
        if (form.type === 'th_stock' && instrumentType === 'stock') {
          feeThb = (saleThb * feeInputVal) / 100;
        } else if (isDirectFee) {
          feeThb = form.feeCurrency === 'USD' ? (feeInputVal * customFx) : feeInputVal;
        } else {
          feeThb = (saleThb * feeInputVal) / 100;
        }

        const netPnlThb = saleThb - costThb - feeThb;
        const pnlAssetCurrency = isUsdAsset && customFx > 0 ? netPnlThb / customFx : netPnlThb;

        const prevQty = currentQty;
        const prevAvgCost = currentAvg;

        currentQty = currentQty - sellQty;
        const feeDisplayThb = feeThb;
        newLogs.unshift({
          id: Date.now().toString(),
          assetId: target.id,
          assetName: name,
          assetType: form.type,
          instrumentType: instrumentType,
          action: 'sell',
          quantity: sellQty,
          price: sellPrice,
          fee: feeDisplayThb,
          isFeeThb: true,
          pnl: pnlAssetCurrency,
          pnlThb: netPnlThb,
          currency: currency,
          tradeFx: customFx,
          date: form.tradeDate || todayStr(),
          note: form.note.trim(),
          prevQty: prevQty,
          prevAvgCost: prevAvgCost
        });
      } else {
        const qty = parseFloat(form.quantity);
        const avg = isCash ? 1 : parseFloat(form.avgCost);
        const price = isCash ? 1 : parseFloat(form.currentPrice);
        if (isNaN(qty) || qty <= 0) { setFormError('จำนวนต้องเป็นตัวเลขมากกว่า 0'); return; }
        currentQty = qty;
        currentAvg = avg;
        currentPrice = price;
      }

      saveLedger(newLedgerEntries);
      saveTradeLogs(newLogs);

      let next;
      if (form.tradeAction === 'sell' && currentQty <= 0) {
        next = holdings.filter((h) => h && h.id !== editingId);
        showToast('ขายหมดและลบสินทรัพย์ออกจากพอร์ตแล้ว');
      } else {
        next = holdings.map((h) => h && h.id === editingId ? { ...h, name, ticker: (form.ticker || '').trim(), type: form.type, quantity: currentQty, avgCost: Number(currentAvg), currentPrice: currentPrice, currency, industry, instrumentType } : h);
        showToast('บันทึกข้อมูลเรียบร้อย');
      }
      saveHoldings(next);
    } else {
      const qty = parseFloat(form.quantity);
      const avg = isCash ? 1 : parseFloat(form.avgCost);
      const price = isCash ? 1 : parseFloat(form.currentPrice);
      const feeInputVal = parseFloat(form.feePct) || 0;
      if (isNaN(qty) || qty <= 0) { setFormError(isCash ? 'จำนวนเงินต้องมากกว่า 0' : 'จำนวนต้องเป็นตัวเลขมากกว่า 0'); return; }
      if (!isCash && (isNaN(avg) || avg < 0)) { setFormError('ราคาต้นทุนไม่ถูกต้อง'); return; }
      if (!isCash && (isNaN(price) || price < 0)) { setFormError('ราคาปัจจุบันไม่ถูกต้อง'); return; }

      const subtotal = qty * avg;
      const customFx = form.tradeFx && parseFloat(form.tradeFx) > 0 ? parseFloat(form.tradeFx) : fxRate;

      let feeAmount = 0;
      if (!isCash) {
        if (isDirectFee) {
          if (currency === 'USD' && instrumentType !== 'dr') {
            feeAmount = form.feeCurrency === 'THB' ? (customFx > 0 ? feeInputVal / customFx : feeInputVal) : feeInputVal;
          } else {
            feeAmount = form.feeCurrency === 'USD' ? feeInputVal * customFx : feeInputVal;
          }
        } else {
          feeAmount = (subtotal * feeInputVal) / 100;
        }
      }

      const totalInitialCost = subtotal + feeAmount;
      const calculatedAvg = qty > 0 ? totalInitialCost / qty : avg;

      const newId = Date.now().toString();
      const nextHoldings = [...holdings, { 
        id: newId, 
        name, 
        ticker: (form.ticker || '').trim(), 
        type: form.type, 
        quantity: qty, 
        avgCost: calculatedAvg, 
        currentPrice: price, 
        currency, 
        industry, 
        instrumentType, 
        lastUpdated: todayStr() 
      }];

      const newLogs = [{
        id: Date.now().toString(),
        assetId: newId,
        assetName: name,
        assetType: form.type,
        instrumentType: instrumentType,
        action: 'buy',
        quantity: qty,
        price: avg,
        fee: feeAmount,
        currency: currency,
        tradeFx: customFx,
        date: form.tradeDate || todayStr(),
        note: (form.note || '').trim(),
        prevQty: 0,
        prevAvgCost: 0
      }, ...(tradeLogs || [])];

      let newLedger = [...ledger];

      saveHoldings(nextHoldings);
      saveTradeLogs(newLogs);
      saveLedger(newLedger);
      showToast('เพิ่มสินทรัพย์แล้ว');
    }
    closePanel();
  };

  const deleteHolding = (id) => {
    saveHoldings((holdings || []).filter((h) => h && h.id !== id));
    showToast('ลบรายการแล้ว');
  };

  const executeRevertTrade = (log) => {
    if (!log) return;
    const target = holdings.find(h => h && h.id === log.assetId);

    if (log.prevQty !== undefined && log.prevAvgCost !== undefined) {
      if (log.prevQty <= 0) {
        saveHoldings(holdings.filter(h => h && h.id !== log.assetId));
      } else {
        if (target) {
          saveHoldings(holdings.map(h => h && h.id === log.assetId ? { ...h, quantity: log.prevQty, avgCost: log.prevAvgCost } : h));
        } else {
          const restoredHolding = {
            id: log.assetId,
            name: log.assetName || 'สินทรัพย์',
            type: log.assetType || 'th_stock',
            quantity: log.prevQty,
            avgCost: log.prevAvgCost,
            currentPrice: log.price || 0,
            currency: log.currency || 'THB',
            instrumentType: log.instrumentType || 'stock',
            lastUpdated: todayStr()
          };
          saveHoldings([...holdings, restoredHolding]);
        }
      }
    } else {
      if (log.action === 'buy' && target) {
        const nextQty = target.quantity - log.quantity;
        if (nextQty <= 0) {
          saveHoldings(holdings.filter(h => h.id !== log.assetId));
        } else {
          saveHoldings(holdings.map(h => h.id === log.assetId ? { ...h, quantity: nextQty } : h));
        }
      } else if (log.action === 'sell') {
        const sellQty = parseFloat(log.quantity) || 0;
        if (target) {
          saveHoldings(holdings.map(h => h.id === log.assetId ? { ...h, quantity: h.quantity + sellQty } : h));
        } else {
          const restoredHolding = {
            id: log.assetId || Date.now().toString(),
            name: log.assetName || 'สินทรัพย์',
            type: log.assetType || 'th_stock',
            quantity: sellQty,
            avgCost: log.price || 0,
            currentPrice: log.price || 0,
            currency: log.currency || 'THB',
            instrumentType: log.instrumentType || 'stock',
            lastUpdated: todayStr()
          };
          saveHoldings([...holdings, restoredHolding]);
        }
      }
    }

    const nextLogs = (tradeLogs || []).filter(l => l && l.id !== log.id);
    saveTradeLogs(nextLogs);

    setConfirmRevertTarget(null);
    showToast(`คืนค่ารายการสำเร็จ`);
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
    (holdings || []).filter((h) => h && h.type !== 'cash').forEach((h) => { draft[h.id] = String(h.currentPrice); });
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
      const r = (data.results || []).find((x) => x && x.id === '__fx__');
      return r && typeof r.price === 'number' ? r.price : null;
    } catch (e) {
      return null;
    }
  };

  const runAutoPriceUpdate = async () => {
    const url = backendUrlRef.current;
    if (!url) return;
    const currentHoldings = holdingsRef.current;
    const eligible = (currentHoldings || []).filter((h) => h && typeInfo(h.type).market && h.ticker);
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
        if (!r) return;
        if (r.id === '__fx__') return;
        if (typeof r.price === 'number') priceById[r.id] = r.price;
        else {
          const h = eligible.find((x) => x && x.id === r.id);
          failedNames.push(h ? h.name : r.id);
        }
      });
      const fxResult = results.find((r) => r && r.id === '__fx__');
      let rate = fxRateRef.current;
      if (fxResult && typeof fxResult.price === 'number') {
        rate = fxResult.price;
        setFxRate(rate);
        setFxDraft(String(rate));
        try { await window.storage.set('fx-usdthb', String(rate), false); } catch (e) { /* ignore */ }
      }
      const today = todayStr();
      const nextHoldings = (currentHoldings || []).map((h) => {
        if (!h || priceById[h.id] === undefined) return h;
        let updatedPrice = priceById[h.id];
        if (h.type === 'crypto' && h.currency === 'THB') { updatedPrice = updatedPrice * rate; }
        return { ...h, currentPrice: updatedPrice, lastUpdated: today };
      });
      await saveHoldings(nextHoldings);
      const newTotal = nextHoldings.reduce((s, h) => {
        if (!h) return s;
        const currency = h.currency === 'USD' ? 'USD' : 'THB';
        const isDr = h.instrumentType === 'dr';
        const effRate = (currency === 'USD' && !isDr) ? getEffectiveRate(h.type, rate) : 1;
        return s + (parseFloat(h.quantity) || 0) * (parseFloat(h.currentPrice) || 0) * effRate;
      }, 0);
      const histNext = [...(historyRef.current || []).filter((p) => p && p.date !== today), { date: today, value: newTotal }].sort((a, b) => (a?.date || '').localeCompare(b?.date || ''));
      await saveHistory(histNext);
      setFetchIssues(failedNames);

      const okCount = Object.keys(priceById).length;
      showToast(`ดึงราคาสำเร็จ จำนวน ${okCount} ตัว`);
    } catch (e) { /* background silent */ }
  };

  const submitUpdatePrices = async () => {
    const today = todayStr();
    const next = (holdings || []).map((h) => {
      if (!h) return h;
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
      if (!h) return s;
      const currency = h.currency === 'USD' ? 'USD' : 'THB';
      const isDr = h.instrumentType === 'dr';
      const effRate = (currency === 'USD' && !isDr) ? getEffectiveRate(h.type, rate) : 1;
      return s + (parseFloat(h.quantity) || 0) * (parseFloat(h.currentPrice) || 0) * effRate;
    }, 0);
    const histNext = [...(history || []).filter((p) => p && p.date !== today), { date: today, value: newTotal }].sort((a, b) => (a?.date || '').localeCompare(b?.date || ''));
    saveHistory(histNext);
    showToast(`ดึงราคาสำเร็จ จำนวน ${Object.keys(updateDraft).length} ตัว`);
    closePanel();
  };

  const saveBackendUrl = async () => {
    const url = backendDraft.trim();
    const fx = parseFloat(fxDraft);
    setBackendUrl(url);
    try { await window.storage.set('backend-url', url, false); } catch (e) { /* ignore */ }
    if (!isNaN(fx) && fx > 0) {
      setFxRate(fx);
      try { await window.storage.set('fx-usdthb', String(fx), false); } catch (e) { /* ignore */ }
    }
    showToast('บันทึกการตั้งค่าแล้ว');
    closePanel();
  };

  const saveInitialCapital = async () => {
    const capital = parseFloat(initialCapitalDraft);
    const nextCapital = !isNaN(capital) && capital >= 0 ? capital : 0;
    setInitialCapital(nextCapital);
    try { await window.storage.set('initial-capital', String(nextCapital), false); } catch (e) { /* ignore */ }
    showToast('บันทึกทุนเริ่มต้นแล้ว');
  };

  const fetchAutoPrices = async () => {
    if (!backendUrl) { showToast('ยังไม่ได้ตั้งค่า Backend URL'); return; }
    const eligible = (holdings || []).filter((h) => h && typeInfo(h.type).market && h.ticker);
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
        if (!r) return;
        if (typeof r.price === 'number') {
          okCount++;
          const holding = eligible.find((x) => x && x.id === r.id);
          let updatedPrice = r.price;
          if (holding && holding.type === 'crypto' && holding.currency === 'THB') { updatedPrice = r.price * fxRate; }
          next[r.id] = String(updatedPrice);
        } else {
          const h = eligible.find((x) => x && x.id === r.id);
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
      showToast(`ดึงอัตราแลกเปลี่ยนแล้ว: 1 USD ≈ ฿${fmt(price, 2)}`);
    } else {
      showToast('เชื่อมต่อ Backend ไม่สำเร็จ');
    }
    setFetchingFx(false);
  };

  const exportData = () => {
    const payload = { app: 'portfolio-tracker', version: 2, exportedAt: new Date().toISOString(), holdings, tradeLogs, history, fxRate, backendUrl, initialCapital, ledger };
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
    if (Array.isArray(pendingImport.tradeLogs)) await saveTradeLogs(pendingImport.tradeLogs);
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

  const openLedgerForm = (type) => {
    setLedgerType(type); setLedgerAmount(''); setLedgerSign('+'); setLedgerNote(''); setLedgerDate(todayStr()); setLedgerError(''); setPanel('ledger');
  };

  const submitLedger = () => {
    const rawVal = ledgerAmount.trim();
    let amt = parseFloat(rawVal);

    if (ledgerType === 'rebalance') {
      if (isNaN(amt)) { setLedgerError('กรอกจำนวนเงินให้ถูกต้อง'); return; }
      const finalAmt = ledgerSign === '-' ? -Math.abs(amt) : Math.abs(amt);
      const entry = { id: Date.now().toString(), type: 'rebalance', amount: finalAmt, date: ledgerDate || todayStr(), note: ledgerNote.trim() || 'รีบาลานซ์เงินสด' };
      saveLedger([...ledger, entry]);
      showToast('บันทึกรีบาลานซ์สำเร็จ');
      setPanel('cashManage');
      return;
    }

    if (isNaN(amt) || amt <= 0) { setLedgerError('กรอกจำนวนเงินให้มากกว่า 0'); return; }

    const entry = { id: Date.now().toString(), type: ledgerType, amount: amt, date: ledgerDate || todayStr(), note: ledgerNote.trim() };
    if (ledgerType === 'dividend') entry.invested = totalInvestedCost;
    saveLedger([...ledger, entry]);
    showToast('บันทึกรายการสำเร็จ');
    setPanel('cashManage');
  };

  const deleteLedgerEntry = (id) => {
    saveLedger((ledger || []).filter((e) => e && e.id !== id));
    showToast('ลบรายการแล้ว');
  };

  const toggleTypeInclusion = (typeKey) => {
    setExcludedTypes((prev) => {
      const next = { ...prev, [typeKey]: !prev[typeKey] };
      window.storage.set('excluded-types', JSON.stringify(next), false).catch(() => {});
      return next;
    });
  };

  const clearAll = async () => {
    await saveHoldings([]); await saveTradeLogs([]); await saveHistory([]); await saveLedger([]);
    setConfirmClear(false);
    showToast('ล้างข้อมูลทั้งหมดแล้ว');
  };

  const filteredTradeLogs = useMemo(() => {
    let list = Array.isArray(tradeLogs) ? [...tradeLogs] : [];
    if (tradeFilterType !== 'all') {
      list = list.filter((log) => log && log.assetType === tradeFilterType);
    }
    if (tradeStartDate) {
      list = list.filter((log) => log && (log.date || '') >= tradeStartDate);
    }
    if (tradeEndDate) {
      list = list.filter((log) => log && (log.date || '') <= tradeEndDate);
    }
    const q = tradeSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((log) => {
        if (!log) return false;
        return (log.assetName || '').toLowerCase().includes(q) || (log.note || '').toLowerCase().includes(q);
      });
    }
    return list;
  }, [tradeLogs, tradeFilterType, tradeStartDate, tradeEndDate, tradeSearchQuery]);

  const totalFilteredFee = useMemo(() => {
    return filteredTradeLogs.reduce((sum, log) => {
      if (!log) return sum;
      if (log.isFeeThb) {
        return sum + (parseFloat(log.fee) || 0);
      }
      const logFx = (log.currency === 'USD' && log.assetType !== 'th_stock' && log.instrumentType !== 'dr') ? (log.tradeFx ? parseFloat(log.tradeFx) : fxRate) : 1;
      const feeThb = (log.currency === 'USD' || log.assetType === 'foreign_stock') ? ((parseFloat(log.fee) || 0) * logFx) : (parseFloat(log.fee) || 0);
      return sum + feeThb;
    }, 0);
  }, [filteredTradeLogs, fxRate]);

  const searchFilteredAssetPnL = useMemo(() => {
    const q = tradeSearchQuery.trim().toLowerCase();
    if (!q) return null;
    const matchingLogs = (tradeLogs || []).filter((log) => log && (log.assetName || '').toLowerCase().includes(q));
    if (matchingLogs.length === 0) return null;
    let totalPnlThb = 0;
    matchingLogs.forEach(l => {
      if (!l) return;
      const logFx = (l.currency === 'USD' && l.assetType !== 'th_stock' && l.instrumentType !== 'dr') ? (l.tradeFx ? parseFloat(l.tradeFx) : fxRate) : 1;
      const pnlVal = l.pnlThb !== undefined ? l.pnlThb : (l.pnl || 0) * logFx;
      totalPnlThb += pnlVal;
    });
    const assetName = matchingLogs[0]?.assetName || '';
    return { name: assetName, pnl: totalPnlThb, count: matchingLogs.length };
  }, [tradeLogs, fxRate, tradeSearchQuery]);

  const isDirectFeeType = ['foreign_stock', 'gold', 'crypto'].includes(form.type) || ['dr', 'etf'].includes(form.instrumentType);

  return (
    <div className="pf-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');

        .pf-root {
          --bg: #030712;
          --surface: rgba(17, 24, 39, 0.75);
          --surface-alt: rgba(31, 41, 55, 0.85);
          --divider: rgba(56, 189, 248, 0.15);
          --text: #EDF1F5; --muted: #94a3b8; --gold: #fbbf24;
          --pos: #34d399; --neg: #fca5a5; --neon-blue: #38bdf8;

          background-color: #02040a;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(56, 189, 248, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(147, 51, 234, 0.07) 0%, transparent 40%),
            radial-gradient(white 1.2px, transparent 0),
            radial-gradient(white 1.8px, transparent 0);
          background-size: 100% 100%, 100% 100%, 60px 60px, 140px 140px;
          background-position: 0 0, 0 0, 30px 30px, 70px 70px;
          background-attachment: fixed;

          color: var(--text); min-height: 100vh;
          font-family: 'Inter', sans-serif; padding: 16px 16px 110px;
          -webkit-font-smoothing: antialiased;
        }
        .pf-root * { box-sizing: border-box; }
        .pf-mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        .pf-display { font-family: 'Fraunces', serif; }
        .pf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .pf-icon-btn { background: var(--surface); border: 1px solid var(--divider); color: var(--text); border-radius: 10px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; z-index: 10; }
        .pf-icon-btn:hover { background: var(--surface-alt); }
        .pf-hero { background: var(--surface); backdrop-filter: blur(12px); border: 1px solid var(--divider); border-radius: 16px; padding: 22px 20px; margin-bottom: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); position: relative; z-index: 1; }
        .pf-hero-label { color: var(--muted); font-size: 12px; letter-spacing: 0.4px; margin-bottom: 6px; }
        .pf-hero-value { font-size: 38px; font-weight: 800; line-height: 1.1; letter-spacing: -0.3px; }
        .pf-hero-sub { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 13px; flex-wrap: wrap; }
        .pf-chip-pos { color: var(--pos); } .pf-chip-neg { color: var(--neg); }
        .pf-spark { height: 160px; margin-top: 14px; }
        .pf-updated { color: var(--muted); font-size: 12px; }
        .pf-capital-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .pf-capital-row:last-child { border-bottom: none; }
        .pf-cash-manage-btn { display: inline-flex; align-items: center; gap: 8px; background: var(--surface-alt); border: 1px solid var(--divider); color: var(--text); border-radius: 20px; padding: 6px 14px 6px 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-top: 16px; position: relative; z-index: 50; }
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

        .pf-cash-actions-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; position: relative; z-index: 50; }
        .pf-cash-action-btn-styled { background: var(--surface-alt); border: 1px solid var(--divider); color: var(--text); border-radius: 12px; padding: 10px 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.2s ease; position: relative; z-index: 50; }
        .pf-cash-action-btn-styled:hover { background: rgba(56, 189, 248, 0.15); border-color: var(--neon-blue); }

        .pf-section-label { color: var(--muted); font-size: 12px; letter-spacing: 0.6px; text-transform: uppercase; margin: 20px 2px 10px; }
        .pf-donut-row { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; margin-bottom: 4px; }
        .pf-pie3d-svg { overflow: visible; filter: drop-shadow(0 10px 14px rgba(0,0,0,0.45)); flex-shrink: 0; background: transparent; }
        .pf-pie3d-label { font-family: 'Inter', sans-serif; font-weight: 800; font-size: 15px; fill: #fff; paint-order: stroke; stroke: rgba(0,0,0,0.4); stroke-width: 3px; stroke-linejoin: round; }
        .pf-pie-empty { border-radius: 50%; border: 1px dashed var(--divider); flex-shrink: 0; }
        .pf-legend-col { flex-direction: column; gap: 8px; flex: 1; min-width: 170px; }
        .pf-type-section { background: var(--surface); backdrop-filter: blur(12px); border: 1px solid var(--divider); border-radius: 16px; padding: 18px 16px; margin-bottom: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); position: relative; z-index: 2; }
        .pf-type-section-head { display: flex; align-items: center; gap: 18px; }
        .pf-pie-tap { display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; }
        .pf-pie-tap-hint { font-size: 10px; color: var(--muted); text-align: center; }
        .pf-type-section-info { flex: 1; min-width: 0; }
        .pf-type-section-title { display: flex; align-items: center; gap: 7px; font-family: 'Fraunces', serif; font-weight: 600; font-size: 15.5px; margin-bottom: 5px; }
        .pf-type-section-value { font-size: 25px; font-weight: 800; letter-spacing: -0.2px; }
        .pf-type-section-gain { font-size: 12.5px; margin-top: 3px; }
        .pf-type-section-cost { color: var(--muted); font-size: 12px; margin-top: 3px; }
        .pf-sort-row { display: flex; align-items: center; justify-content: flex-end; margin-top: 12px; }
        .pf-sort-btn { background: var(--surface-alt); border: 1px solid var(--divider); border-radius: 8px; padding: 4px 10px; font-size: 12px; color: var(--gold); cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: 'Inter', sans-serif; font-weight: 500; }
        .pf-sort-btn:hover { background: rgba(56, 189, 248, 0.1); }
        .pf-type-section-holdings { border-top: 1px solid var(--divider); margin-top: 16px; padding-top: 6px; }
        .pf-subrow { padding: 14px 0; border-bottom: 1px solid var(--divider); cursor: pointer; position: relative; z-index: 10; }
        .pf-subrow:last-child { border-bottom: none; padding-bottom: 0; }
        .pf-legend { display: flex; flex-wrap: wrap; gap: 10px 16px; margin-top: 12px; }
        .pf-legend-item { display: flex; align-items: center; gap: 7px; font-size: 12.5px; }
        .pf-legend-toggle { background: transparent; border: none; padding: 2px 0; cursor: pointer; text-align: left; font-family: inherit; }
        .pf-legend-name-included { color: var(--gold); font-weight: 600; }
        .pf-legend-name-excluded { color: var(--muted); text-decoration: line-through; }
        .pf-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
        .pf-legend-val { color: var(--muted); }
        .pf-empty { text-align: center; padding: 50px 20px; color: var(--muted); border: 1px dashed var(--divider); border-radius: 16px; }
        .pf-empty-cta { margin-top: 14px; }
        .pf-row-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .pf-row-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .pf-row-name-text { font-family: 'Fraunces', serif; font-weight: 600; font-size: 15.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pf-row-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .pf-row-actions button { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 6px; position: relative; z-index: 15; }
        .pf-row-meta { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 8px; font-size: 12.5px; color: var(--muted); }
        .pf-row-meta b { color: var(--text); font-weight: 500; }
        .pf-ledger-amount { font-weight: 700; }
        .pf-fab { position: fixed; right: 20px; bottom: 100px; display: flex; gap: 10px; z-index: 900; }
        .pf-btn { border-radius: 12px; padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid var(--divider); display: flex; align-items: center; gap: 6px; position: relative; z-index: 50; }
        .pf-btn-primary { background: var(--gold); color: #1A1400; border: none; }
        .pf-btn-ghost { background: var(--surface); color: var(--text); }
        .pf-overlay { position: fixed; inset: 0; background: rgba(3,7,18,0.7); backdrop-filter: blur(5px); display: flex; justify-content: flex-end; z-index: 1200; }
        .pf-modal-overlay { position: fixed; inset: 0; background: rgba(3,7,18,0.75); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 1300; padding: 20px; }
        .pf-confirm-modal { background: var(--surface); border: 1px solid var(--divider); border-radius: 16px; padding: 20px; width: 100%; max-width: 340px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
        .pf-panel { background: #070d1a; border-left: 1px solid var(--divider); width: 100%; max-width: 400px; height: 100%; overflow-y: auto; padding: 20px; animation: pf-slide 0.18s ease-out; box-shadow: -10px 0 40px rgba(0,0,0,0.8); z-index: 1250; position: relative; }
        @keyframes pf-slide { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .pf-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .pf-panel-title { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 600; }
        .pf-field { margin-bottom: 14px; }
        .pf-label { font-size: 12.5px; color: var(--muted); display: block; margin-bottom: 6px; }
        .pf-input, .pf-select { width: 100%; background: var(--surface); border: 1px solid var(--divider); color: var(--text); border-radius: 10px; padding: 10px 12px; font-size: 14.5px; font-family: 'Inter', sans-serif; position: relative; z-index: 50; }
        .pf-row2 { display: flex; gap: 10px; }
        .pf-row2 > div { flex: 1; }
        .pf-currency-toggle { display: flex; gap: 8px; }
        .pf-currency-toggle button { flex: 1; background: var(--surface); border: 1px solid var(--divider); color: var(--muted); border-radius: 10px; padding: 9px 8px; font-size: 13.5px; cursor: pointer; position: relative; z-index: 50; }
        .pf-currency-toggle button.pf-currency-active { background: var(--gold); color: #1A1400; border-color: var(--gold); font-weight: 600; }
        .pf-currency-hint { color: var(--muted); font-size: 11.5px; margin-top: 6px; line-height: 1.5; }
        .pf-error { color: var(--neg); font-size: 12.5px; margin-bottom: 10px; }
        .pf-panel-actions { display: flex; gap: 10px; margin-top: 18px; }
        .pf-panel-actions .pf-btn { flex: 1; justify-content: center; }
        .pf-update-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--divider); }
        .pf-update-name { font-size: 14px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pf-update-input { width: 110px; position: relative; z-index: 50; }
        .pf-toast { position: fixed; left: 50%; bottom: 100px; transform: translateX(-50%); background: var(--surface); border: 1px solid var(--divider); color: var(--text); padding: 10px 18px; border-radius: 30px; font-size: 13.5px; z-index: 1400; box-shadow: 0 5px 20px rgba(0,0,0,0.5); }
        .pf-confirm { background: var(--surface); border: 1px solid var(--divider); border-radius: 14px; padding: 16px; margin-bottom: 16px; }
        .pf-issue-banner { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; background: rgba(252,165,165,0.12); border: 1px solid var(--neg); color: var(--text); border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; font-size: 12.5px; line-height: 1.5; }
        .pf-loading { display: flex; align-items: center; justify-content: center; height: 60vh; color: var(--muted); }

        /* Bottom Navigation Bar */
        .pf-nav-container { position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%); width: 92%; max-width: 420px; z-index: 1000; pointer-events: none; }
        .pf-bottom-nav {
          position: relative;
          background: linear-gradient(180deg, rgba(8, 20, 42, 0.92) 0%, rgba(3, 9, 22, 0.98) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(56, 189, 248, 0.35);
          border-radius: 40px;
          display: flex; justify-content: space-around; align-items: center;
          padding: 1px 16px 2px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(56, 189, 248, 0.3);
          pointer-events: auto;
        }
        .pf-nav-item {
          background: none; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #64748b; width: 40px; height: 40px; border-radius: 50%;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pf-nav-item:hover { color: #38bdf8; }
        .pf-nav-item.active {
          background: radial-gradient(circle at 30% 30%, #38bdf8 0%, #0284c7 70%, #0369a1 100%);
          border: 2px solid rgba(255, 255, 255, 0.9);
          color: #ffffff; width: 58px; height: 58px;
          transform: translateY(-22px);
          box-shadow: 0 0 35px rgba(56, 189, 248, 0.95), inset 0 3px 6px rgba(255, 255, 255, 0.8), inset 0 -4px 6px rgba(0, 0, 0, 0.6);
        }

        .pf-foreign-glow { filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.6)); }

        .moon-float {
          position: fixed; top: 16px; right: 20px;
          width: 90px; height: 90px;
          display: flex; align-items: center; justify-content: center;
          cursor: grab; z-index: 40;
          animation: moonFloat 2.5s ease-in-out infinite;
          user-select: none; touch-action: none;
          pointer-events: auto;
        }
        .moon-float:active { cursor: grabbing; }
        @keyframes moonFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }

        @media (min-width: 640px) {
          .pf-root { padding: 32px 28px 110px; max-width: 720px; margin: 0 auto; }
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
          el.style.right = 'auto'; el.style.bottom = 'auto';
          el.style.left = `${rect.left + (m.clientX - startX)}px`;
          el.style.top = `${rect.top + (m.clientY - startY)}px`;
        };
        const onPointerUp = (u) => { el.releasePointerCapture(u.pointerId); window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp); };
        window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerup', onPointerUp);
      }}>
        <img src={new URL('../moon.png', import.meta.url).href} alt="Moon Assistant" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 5px 15px rgba(56,189,248,0.4))' }} />
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
                พบไฟล์สำรองข้อมูล{pendingImport.exportedAt ? ` (ส่งออกเมื่อ ${thaiDateAD(pendingImport.exportedAt.slice(0, 10))})` : ''} — มีสินทรัพย์ {Array.isArray(pendingImport.holdings) ? pendingImport.holdings.length : 0} รายการ
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
              <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '15.5px', color: 'var(--text)', margin: '0 0 14px 2px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span className="pf-dot" style={{ background: '#C7A344' }} />หุ้นไทย (Thai Stocks)
              </div>
              {holdings.filter((h) => h && h.type === 'th_stock').length === 0 ? (
                <div className="pf-empty">
                  <Inbox size={26} style={{ marginBottom: 8, opacity: 0.6 }} />
                  <div>ยังไม่มีรายการหุ้นไทยในพอร์ต</div>
                  <button className="pf-btn pf-btn-primary pf-empty-cta" onClick={openAdd}><Plus size={16} /> เพิ่มหุ้นไทย</button>
                </div>
              ) : (
                byType.filter((t) => t && t.key === 'th_stock').map((t) => {
                  const sortMode = sortModeByType[t.key] || 0;
                  const typeHoldings = enriched.filter((h) => h && h.type === t.key).sort((a, b) => {
                    const rankA = INSTRUMENT_RANK[a.instrumentType] ?? 0;
                    const rankB = INSTRUMENT_RANK[b.instrumentType] ?? 0;
                    if (rankA !== rankB) return rankA - rankB;
                    if (sortMode === 1) return (b.gainPct || 0) - (a.gainPct || 0);
                    if (sortMode === 2) return (a.name || '').localeCompare(b.name || '', 'th');
                    return (b.marketValue || 0) - (a.marketValue || 0);
                  });

                  const typeCost = typeHoldings.reduce((s, h) => s + (h?.costValue || 0), 0);
                  const typeGain = t.value - typeCost;
                  const typeGainPct = typeCost > 0 ? (typeGain / typeCost) * 100 : 0;
                  const shades = shadeSet(t.color, typeHoldings.length);
                  const colorById = {};
                  typeHoldings.forEach((h, i) => { if (h) colorById[h.id] = shades[i]; });
                  const viewMode = chartModeByType[t.key] === 'industry' ? 'industry' : 'holding';

                  let chartData;
                  let displayItemsList = [];
                  if (viewMode === 'industry') {
                    const groups = {};
                    typeHoldings.forEach((h) => {
                      if (!h) return;
                      const ind = (h.industry && h.industry.trim()) || 'อื่นๆ';
                      groups[ind] = (groups[ind] || 0) + (h.marketValue || 0);
                    });
                    const industryNames = Object.keys(groups).sort((a, b) => groups[b] - groups[a]);
                    const industryColors = shadeSet(t.color, industryNames.length);
                    const industryColorById = {};
                    industryNames.forEach((name, i) => { industryColorById[name] = industryColors[i]; });
                    chartData = industryNames.map((name) => ({ key: name, label: name, color: industryColorById[name], value: groups[name] }));
                    displayItemsList = industryNames.map((name) => ({ key: name, name, value: groups[name], color: industryColorById[name] }));
                  } else {
                    chartData = typeHoldings.map((h) => ({ key: h.id, label: h.name, color: colorById[h.id], value: h.marketValue }));
                    displayItemsList = typeHoldings.map((h) => ({ key: h.id, name: h.name, value: h.marketValue, color: colorById[h.id] }));
                  }

                  const sortLabels = ['เรียง: สัดส่วน', 'เรียง: % กำไร', 'เรียง: ตัวอักษร'];

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
                              <button key={y} className={y === graphYearTh ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphYearTh(y)} style={{ padding: '2px 8px', fontSize: '11px' }}>{y}</button>
                            ))}
                          </div>
                        )}
                        <div className="pf-spark">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartDataTh}>
                              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                              <YAxis stroke="#94a3b8" fontSize={10} domain={getDynamicDomain(t.value, typeCost)} tickFormatter={(val) => `฿${fmt(val, 2)}`} />
                              <Tooltip contentStyle={{ background: '#111827', border: '1px solid var(--divider)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(val, name) => [`฿${fmt(val, 2)}`, name === 'gain' ? 'มูลค่า (ต้นทุน+กำไร)' : 'ต้นทุน']} />
                              <Line type="monotone" dataKey="gain" stroke="#C7A344" strokeWidth={2} dot={false} name="gain" isAnimationActive={false} />
                              <Line type="monotone" dataKey="cost" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="cost" isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="pf-type-section-head">
                        <div onClick={() => toggleChartMode(t.key)} className="pf-pie-tap" role="button" tabIndex={0}>
                          <ExplodedPie3D data={chartData} rx={62} depth={14} explode={5} />
                          <div className="pf-pie-tap-hint">จำนวน {typeHoldings.length} รายการ</div>
                        </div>
                        <div className="pf-type-section-info">
                          <div className="pf-type-section-title"><span className="pf-dot" style={{ background: t.color }} />{t.label}</div>
                          <div className="pf-type-section-value pf-mono">฿{fmt(t.value, 2)}</div>
                          {typeCost > 0 && <div className="pf-type-section-cost pf-mono">ต้นทุนรวม ฿{fmt(typeCost, 2)}</div>}
                          {typeCost > 0 && (
                            <div className={`pf-type-section-gain pf-mono ${typeGain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>
                              {typeGain >= 0 ? '+' : ''}{fmt(typeGain, 2)} ({typeGain >= 0 ? '+' : ''}{fmt(typeGainPct, 2)}%)
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '14px', paddingRight: '4px' }}>
                        {displayItemsList.map((item) => {
                          const itemPct = t.value > 0 ? ((item?.value || 0) / t.value) * 100 : 0;
                          return (
                            <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="pf-dot" style={{ background: item.color }} />
                                <span>{item.name}</span>
                              </div>
                              <span className="pf-mono" style={{ color: 'var(--gold)', fontWeight: '600' }}>{fmt(itemPct, 2)}%</span>
                            </div>
                          );
                        })}
                      </div>

                      {typeHoldings.length > 1 && (
                        <div className="pf-sort-row">
                          <button className="pf-sort-btn" onClick={() => cycleSortMode(t.key, 2)}>
                            <ArrowUpDown size={14} /> {sortLabels[sortMode]}
                          </button>
                        </div>
                      )}

                      <div className="pf-type-section-holdings">
                        {typeHoldings.map((h) => {
                          if (!h) return null;
                          const isCrypto = h.type === 'crypto';
                          const isExpanded = expandedLotsId === h.id;
                          const lots = getAssetLots(h.id, h.qty, h.price, h.currency, h.type, h.instrumentType);

                          return (
                            <div key={h.id}>
                              <div className="pf-subrow" style={{ padding: '12px 0' }} onClick={() => setExpandedLotsId(isExpanded ? null : h.id)}>
                                <div className="pf-row-top">
                                  <div className="pf-row-name">
                                    <span className="pf-dot" style={{ background: colorById[h.id] }} />
                                    <span className="pf-row-name-text">
                                      {h.name}
                                      {h.instrumentType === 'dr' && <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px', color: '#38bdf8' }}>DR</span>}
                                      {h.instrumentType === 'etf' && <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px', color: '#6E8CB0' }}>ETF</span>}
                                    </span>
                                  </div>
                                  <div className="pf-row-actions" onClick={(e) => e.stopPropagation()}>
                                    <button aria-label="แก้ไข" onClick={() => openEdit(h)}><Pencil size={15} /></button>
                                    <button aria-label="ลบ" onClick={() => requestDelete('holding', h.id, h.name)}><Trash2 size={15} /></button>
                                  </div>
                                </div>
                                <div className="pf-row-meta pf-mono">
                                  <span>จำนวน <b>{fmt(h.qty, 2, isCrypto)}</b></span>
                                  <span>ทุนเฉลี่ย <b>{h.currency === 'USD' ? '$' : '฿'}{fmt(h.avg, 2, isCrypto)}</b></span>
                                </div>
                                <div className="pf-row-meta pf-mono">
                                  <span>ราคาล่าสุด <b style={{ color: 'var(--gold)' }}>{h.currency === 'USD' ? '$' : '฿'}{fmt(h.price, 2, isCrypto)}</b></span>
                                  <span>ต้นทุนรวม <b>฿{fmt(h.costValue, 2)}</b></span>
                                </div>
                                <div className="pf-row-meta pf-mono">
                                  <span>มูลค่า <b className={h.gain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}>฿{fmt(h.marketValue, 2)}</b></span>
                                  <span className={h.gain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}>
                                    {h.gain >= 0 ? '+' : ''}{fmt(h.gain, 2)} ({h.gain >= 0 ? '+' : ''}{fmt(h.gainPct, 2)}%)
                                  </span>
                                </div>
                              </div>

                              {isExpanded && lots.length > 0 && (
                                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '10px', margin: '6px 0 12px', border: '1px solid var(--divider)' }}>
                                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', fontWeight: '600' }}>ไม้ที่ถืออยู่ ({lots.length})</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--muted)', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '6px' }} className="pf-mono">
                                    <span style={{ minWidth: '85px' }}>วันที่ซื้อ</span>
                                    <span style={{ textAlign: 'center', flex: 1 }}>จำนวน</span>
                                    <span style={{ textAlign: 'right', flex: 1 }}>ราคา/หน่วย</span>
                                    <span style={{ textAlign: 'right', minWidth: '70px' }}>กำไร/ขาดทุน</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {lots.map((lot, idx) => (
                                      <div key={idx} style={{ background: 'var(--surface-alt)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 8px', fontSize: '11.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="pf-mono">
                                        <span style={{ color: 'var(--gold)', minWidth: '85px' }}>{thaiDateAD(lot?.date)} <span style={{ color: 'var(--muted)', fontSize: '10px' }}>({lot?.days || 0}ว)</span></span>
                                        <span style={{ textAlign: 'center', flex: 1 }}><b>{fmt(lot?.qty, 2, isCrypto)}</b></span>
                                        <span style={{ textAlign: 'right', flex: 1 }}><b>{fmt(lot?.price, 2)}</b></span>
                                        <span className={(lot?.gainPct || 0) >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'} style={{ fontWeight: '600', textAlign: 'right', minWidth: '70px' }}>
                                          {(lot?.gainPct || 0) >= 0 ? '+' : ''}{fmt(lot?.gainPct, 2)}%
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
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

          {/* ================= 2. หุ้นนอก & DR & ETF ================= */}
          {activeTab === 2 && (
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '15.5px', color: 'var(--text)', margin: '0 0 14px 2px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span className="pf-dot" style={{ background: '#38bdf8' }} />หุ้นนอก & DR (Global Stocks & DR & ETF)
              </div>
              {enriched.filter((h) => h && h.type === 'foreign_stock').length === 0 ? (
                <div className="pf-empty">
                  <Inbox size={26} style={{ marginBottom: 8, opacity: 0.6 }} />
                  <div>ยังไม่มีรายการหุ้นนอกในพอร์ต</div>
                  <button className="pf-btn pf-btn-primary pf-empty-cta" onClick={openAdd}><Plus size={16} /> เพิ่มหุ้นนอก</button>
                </div>
              ) : (
                byType.filter((t) => t && t.key === 'foreign_stock').map((t) => {
                  const sortMode = sortModeByType[t.key] || 0;
                  const typeHoldings = enriched.filter((h) => h && h.type === t.key).sort((a, b) => {
                    const rankA = INSTRUMENT_RANK[a.instrumentType] ?? 0;
                    const rankB = INSTRUMENT_RANK[b.instrumentType] ?? 0;
                    if (rankA !== rankB) return rankA - rankB;
                    if (sortMode === 1) return (b.gainPct || 0) - (a.gainPct || 0);
                    if (sortMode === 2) return (a.name || '').localeCompare(b.name || '', 'th');
                    return (b.marketValue || 0) - (a.marketValue || 0);
                  });

                  const typeCost = typeHoldings.reduce((s, h) => s + (h?.costValue || 0), 0);
                  const typeGain = t.value - typeCost;
                  const typeGainPct = typeCost > 0 ? (typeGain / typeCost) * 100 : 0;
                  const shades = shadeSet(t.color, typeHoldings.length);
                  const colorById = {};
                  typeHoldings.forEach((h, i) => { if (h) colorById[h.id] = shades[i]; });
                  const viewMode = chartModeByType[t.key] === 'industry' ? 'industry' : 'holding';

                  let chartData;
                  let displayItemsList = [];
                  if (viewMode === 'industry') {
                    const groups = {};
                    typeHoldings.forEach((h) => {
                      if (!h) return;
                      const ind = (h.industry && h.industry.trim()) || 'อื่นๆ';
                      groups[ind] = (groups[ind] || 0) + (h.marketValue || 0);
                    });
                    const industryNames = Object.keys(groups).sort((a, b) => groups[b] - groups[a]);
                    const industryColors = shadeSet(t.color, industryNames.length);
                    const industryColorById = {};
                    industryNames.forEach((name, i) => { industryColorById[name] = industryColors[i]; });
                    chartData = industryNames.map((name) => ({ key: name, label: name, color: industryColorById[name], value: groups[name] }));
                    displayItemsList = industryNames.map((name) => ({ key: name, name, value: groups[name], color: industryColorById[name] }));
                  } else {
                    chartData = typeHoldings.map((h) => ({ key: h.id, label: h.name, color: colorById[h.id], value: h.marketValue }));
                    displayItemsList = typeHoldings.map((h) => ({ key: h.id, name: h.name, value: h.marketValue, color: colorById[h.id] }));
                  }

                  const sortLabels = ['เรียง: สัดส่วน', 'เรียง: % กำไร', 'เรียง: ตัวอักษร'];

                  return (
                    <div className="pf-type-section" key={t.key}>
                      <div style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--divider)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>กราฟกำไร/ขาดทุน (หุ้นนอก)</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className={graphModeUs === 'all' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphModeUs('all')} style={{ padding: '2px 8px', fontSize: '11px' }}>ตั้งแต่เริ่มต้น</button>
                            <button className={graphModeUs === 'year' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphModeUs('year')} style={{ padding: '2px 8px', fontSize: '11px' }}>รายปี</button>
                          </div>
                        </div>
                        {graphModeUs === 'year' && (
                          <div className="pf-year-picker" style={{ marginBottom: '8px' }}>
                            {yearOptions.map((y) => (
                              <button key={y} className={y === graphYearUs ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphYearUs(y)} style={{ padding: '2px 8px', fontSize: '11px' }}>{y}</button>
                            ))}
                          </div>
                        )}
                        <div className="pf-spark">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartDataUs}>
                              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                              <YAxis stroke="#94a3b8" fontSize={10} domain={getDynamicDomain(t.value, typeCost)} tickFormatter={(val) => `฿${fmt(val, 2)}`} />
                              <Tooltip contentStyle={{ background: '#111827', border: '1px solid var(--divider)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(val, name) => [`฿${fmt(val, 2)}`, name === 'gain' ? 'มูลค่า (ต้นทุน+กำไร)' : 'ต้นทุน']} />
                              <Line type="monotone" dataKey="gain" stroke="#38bdf8" strokeWidth={2} dot={false} name="gain" isAnimationActive={false} />
                              <Line type="monotone" dataKey="cost" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="cost" isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="pf-type-section-head">
                        <div onClick={() => toggleChartMode(t.key)} className="pf-pie-tap" role="button" tabIndex={0}>
                          <ExplodedPie3D data={chartData} rx={62} depth={14} explode={5} />
                          <div className="pf-pie-tap-hint">จำนวน {typeHoldings.length} รายการ</div>
                        </div>
                        <div className="pf-type-section-info">
                          <div className="pf-type-section-title"><span className="pf-dot pf-foreign-glow" style={{ background: t.color }} />{t.label}</div>
                          <div className="pf-type-section-value pf-mono">฿{fmt(t.value, 2)}</div>
                          {typeCost > 0 && <div className="pf-type-section-cost pf-mono">ต้นทุนรวม ฿{fmt(typeCost, 2)}</div>}
                          {typeCost > 0 && (
                            <div className={`pf-type-section-gain pf-mono ${typeGain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>
                              {typeGain >= 0 ? '+' : ''}{fmt(typeGain, 2)} ({typeGain >= 0 ? '+' : ''}{fmt(typeGainPct, 2)}%)
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '14px', paddingRight: '4px' }}>
                        {displayItemsList.map((item) => {
                          const itemPct = t.value > 0 ? ((item?.value || 0) / t.value) * 100 : 0;
                          return (
                            <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="pf-dot" style={{ background: item.color }} />
                                <span>{item.name}</span>
                              </div>
                              <span className="pf-mono" style={{ color: 'var(--neon-blue)', fontWeight: '600' }}>{fmt(itemPct, 2)}%</span>
                            </div>
                          );
                        })}
                      </div>

                      {typeHoldings.length > 1 && (
                        <div className="pf-sort-row">
                          <button className="pf-sort-btn" onClick={() => cycleSortMode(t.key, 2)}>
                            <ArrowUpDown size={14} /> {sortLabels[sortMode]}
                          </button>
                        </div>
                      )}

                      <div className="pf-type-section-holdings">
                        {typeHoldings.map((h) => {
                          if (!h) return null;
                          const isCrypto = h.type === 'crypto';
                          const isExpanded = expandedLotsId === h.id;
                          const lots = getAssetLots(h.id, h.qty, h.price, h.currency, h.type, h.instrumentType);

                          return (
                            <div key={h.id}>
                              <div className="pf-subrow" style={{ padding: '12px 0' }} onClick={() => setExpandedLotsId(isExpanded ? null : h.id)}>
                                <div className="pf-row-top">
                                  <div className="pf-row-name">
                                    <span className="pf-dot" style={{ background: colorById[h.id] }} />
                                    <span className="pf-row-name-text">
                                      {h.name}
                                      {h.instrumentType === 'dr' && <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px', color: '#38bdf8' }}>DR</span>}
                                      {h.instrumentType === 'etf' && <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px', color: '#6E8CB0' }}>ETF</span>}
                                    </span>
                                  </div>
                                  <div className="pf-row-actions" onClick={(e) => e.stopPropagation()}>
                                    <button aria-label="แก้ไข" onClick={() => openEdit(h)}><Pencil size={15} /></button>
                                    <button aria-label="ลบ" onClick={() => requestDelete('holding', h.id, h.name)}><Trash2 size={15} /></button>
                                  </div>
                                </div>
                                <div className="pf-row-meta pf-mono">
                                  <span>จำนวน <b>{fmt(h.qty, 2, isCrypto)}</b></span>
                                  <span>ทุนเฉลี่ย <b>{h.currency === 'USD' && h.instrumentType !== 'dr' ? '$' : '฿'}{fmt(h.avg, 2, isCrypto)}</b></span>
                                </div>
                                <div className="pf-row-meta pf-mono">
                                  <span>ราคาล่าสุด <b style={{ color: 'var(--gold)' }}>{h.currency === 'USD' && h.instrumentType !== 'dr' ? '$' : '฿'}{fmt(h.price, 2, isCrypto)}</b></span>
                                  <span>ต้นทุนรวม <b>฿{fmt(h.costValue, 2)}</b></span>
                                </div>
                                <div className="pf-row-meta pf-mono">
                                  <span>มูลค่า <b className={h.gain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}>฿{fmt(h.marketValue, 2)}</b> {h.currency === 'USD' && h.instrumentType !== 'dr' && <span style={{ fontSize: '11px', opacity: 0.7 }}>(${fmt(h.qty * h.price, 2)})</span>}</span>
                                  <span className={h.gain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}>
                                    {h.gain >= 0 ? '+' : ''}{fmt(h.gain, 2)} ({h.gain >= 0 ? '+' : ''}{fmt(h.gainPct, 2)}%)
                                  </span>
                                </div>
                              </div>

                              {isExpanded && lots.length > 0 && (
                                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '10px', margin: '6px 0 12px', border: '1px solid var(--divider)' }}>
                                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', fontWeight: '600' }}>ไม้ที่ถืออยู่ ({lots.length})</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--muted)', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '6px' }} className="pf-mono">
                                    <span style={{ minWidth: '85px' }}>วันที่ซื้อ</span>
                                    <span style={{ textAlign: 'center', flex: 1 }}>จำนวน</span>
                                    <span style={{ textAlign: 'right', flex: 1 }}>ราคา/หน่วย</span>
                                    <span style={{ textAlign: 'right', minWidth: '70px' }}>กำไร/ขาดทุน</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {lots.map((lot, idx) => (
                                      <div key={idx} style={{ background: 'var(--surface-alt)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 8px', fontSize: '11.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="pf-mono">
                                        <span style={{ color: 'var(--gold)', minWidth: '85px' }}>{thaiDateAD(lot?.date)} <span style={{ color: 'var(--muted)', fontSize: '10px' }}>({lot?.days || 0}ว)</span></span>
                                        <span style={{ textAlign: 'center', flex: 1 }}><b>{fmt(lot?.qty, 2, isCrypto)}</b></span>
                                        <span style={{ textAlign: 'right', flex: 1 }}><b>{lot?.currency === 'USD' && h.instrumentType !== 'dr' ? '$' : '฿'}{fmt(lot?.price, 2)}</b></span>
                                        <span className={(lot?.gainPct || 0) >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'} style={{ fontWeight: '600', textAlign: 'right', minWidth: '70px' }}>
                                          {(lot?.gainPct || 0) >= 0 ? '+' : ''}{fmt(lot?.gainPct, 2)}%
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
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
              <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '15.5px', color: 'var(--text)', margin: '0 0 14px 2px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span className="pf-dot" style={{ background: 'var(--gold)' }} />พอร์ตรวม (Portfolio Overview)
              </div>

              {/* 1. การ์ดสัดส่วนสินทรัพย์รวม */}
              <div className="pf-hero" style={{ background: '#111827', padding: '20px', borderRadius: '16px', border: '1px solid var(--divider)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div className="pf-hero-label" style={{ margin: 0 }}>สัดส่วนสินทรัพย์รวม</div>
                  <div className="pf-updated" style={{ whiteSpace: 'nowrap' }}>
                    อัปเดตล่าสุด: {lastUpdated ? thaiDateAD(lastUpdated) : 'ยังไม่มีการอัปเดต'}
                  </div>
                </div>

                {holdings.length === 0 && !cashActive ? (
                  <div className="pf-empty" style={{ border: 'none', padding: '20px 0' }}>
                    <div>ยังไม่มีสินทรัพย์ในพอร์ต</div>
                    <button className="pf-btn pf-btn-primary pf-empty-cta" onClick={openAdd}><Plus size={16} /> เพิ่มสินทรัพย์แรก</button>
                  </div>
                ) : (
                  <div className="pf-donut-row" style={{ justifyContent: 'center' }}>
                    <ExplodedPie3D data={displayByType.map((t) => ({ key: t.key, label: t.label, color: t.color, value: t.value }))} rx={95} />
                    <div className="pf-legend pf-legend-col">
                      {byType.map((t) => {
                        if (!t) return null;
                        const isExcluded = !!excludedTypes[t.key];
                        return (
                          <button className="pf-legend-item pf-legend-toggle" key={t.key} onClick={() => toggleTypeInclusion(t.key)}>
                            <span className="pf-dot" style={{ background: isExcluded ? '#5B6779' : t.color }} />
                            <span className={isExcluded ? 'pf-legend-name-excluded' : 'pf-legend-name-included'}>{t.label}</span>
                            <span className="pf-legend-val pf-mono">
                              {isExcluded ? `฿${fmt(t.value, 2)}` : `${fmt((t.value / (displayTotalValue || 1)) * 100, 2)}% · ฿${fmt(t.value, 2)}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. การ์ดเงินสด / สภาพคล่องในพอร์ต */}
              {byType.find((t) => t && t.key === 'cash') && (
                <div className="pf-hero" style={{ border: '2px solid rgba(124, 139, 158, 0.3)', background: 'linear-gradient(135deg, #111827 0%, #1a2230 100%)', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div className="pf-hero-label" style={{ margin: 0 }}>เงินสด / สภาพคล่องในพอร์ต</div>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: cashRatio >= 30 ? 'rgba(52, 211, 153, 0.15)' : cashRatio >= 10 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                      color: cashRatio >= 30 ? '#34d399' : cashRatio >= 10 ? '#38bdf8' : '#fbbf24',
                      border: `1px solid ${cashRatio >= 30 ? 'rgba(52, 211, 153, 0.4)' : cashRatio >= 10 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(251, 191, 36, 0.4)'}`
                    }} className="pf-mono">
                      {cashRatio >= 30 ? 'สภาพคล่องสูง' : cashRatio >= 10 ? 'สภาพคล่องสมดุล' : 'สภาพคล่องต่ำ'} ({fmt(cashRatio, 2)}%)
                    </span>
                  </div>
                  <div className="pf-hero-value pf-mono" style={{ fontSize: '38px', color: '#EDF1F5' }}>฿{fmt(computedCash, 2)}</div>

                  <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--divider)' }}>
                    {initialCapital > 0 && (
                      <div className="pf-capital-row">
                        <span style={{ color: 'var(--muted)' }}>ทุนเริ่มต้นสะสม</span>
                        <span className="pf-mono">฿{fmt(totalCapital, 2)}</span>
                      </div>
                    )}
                    {totalInvestedCost > 0 && (
                      <div className="pf-capital-row">
                        <span style={{ color: 'var(--muted)' }}>เงินที่นำไปลงทุน</span>
                        <span className="pf-mono">฿{fmt(totalInvestedCost, 2)}</span>
                      </div>
                    )}
                    {performanceTotal !== 0 && (
                      <div className="pf-capital-row">
                        <span style={{ color: 'var(--muted)' }}>ผลประกอบการรวม</span>
                        <span className={`pf-mono ${performanceTotal >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>
                          {performanceTotal >= 0 ? '+' : ''}฿{fmt(performanceTotal, 2)}
                        </span>
                      </div>
                    )}
                    {totalDividendAmount > 0 && (
                      <div className="pf-capital-row">
                        <span style={{ color: 'var(--muted)' }}>เงินปันผลรับ</span>
                        <span className="pf-mono pf-chip-pos">฿{fmt(totalDividendAmount, 2)}</span>
                      </div>
                    )}
                    {rebalanceTotal !== 0 && (
                      <div className="pf-capital-row">
                        <span style={{ color: 'var(--muted)' }}>รีบาลานซ์</span>
                        <span className={`pf-mono ${rebalanceTotal >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>
                          {rebalanceTotal >= 0 ? '+' : ''}฿{fmt(rebalanceTotal, 2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. การ์ดมูลค่าสินทรัพย์ทั้งหมด */}
              <div className="pf-hero" style={{ border: '2px solid rgba(251, 191, 36, 0.3)', background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)' }}>
                <div className="pf-hero-label">มูลค่าสินทรัพย์ทั้งหมด</div>
                <div className="pf-hero-value pf-mono" style={{ fontSize: '44px' }}>฿{fmt(displayTotalValue, 2)}</div>
                
                {heroProfitPct !== null && (
                  <div className={`pf-hero-sub ${heroProfitAmount >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`} style={{ fontSize: '15px' }}>
                    {heroProfitAmount >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    <span className="pf-mono">{heroProfitAmount >= 0 ? '+' : ''}{fmt(heroProfitAmount, 2)} บาท ({heroProfitAmount >= 0 ? '+' : ''}{fmt(heroProfitPct, 2)}%)</span>
                  </div>
                )}

                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--divider)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>กราฟมูลค่าสินทรัพย์ / ทุนเริ่มต้น</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className={graphModeTotal === 'all' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphModeTotal('all')} style={{ padding: '2px 8px', fontSize: '11px' }}>ตั้งแต่เริ่มต้น</button>
                      <button className={graphModeTotal === 'year' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphModeTotal('year')} style={{ padding: '2px 8px', fontSize: '11px' }}>รายปี</button>
                    </div>
                  </div>
                  {graphModeTotal === 'year' && (
                    <div className="pf-year-picker" style={{ marginBottom: '8px' }}>
                      {yearOptions.map((y) => (
                        <button key={y} className={y === graphYearTotal ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphYearTotal(y)} style={{ padding: '2px 8px', fontSize: '11px' }}>{y}</button>
                      ))}
                    </div>
                  )}
                  <div className="pf-spark">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartDataTotal}>
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} domain={getDynamicDomain(displayTotalValue, totalCapital)} tickFormatter={(val) => `฿${fmt(val, 2)}`} />
                        <Tooltip contentStyle={{ background: '#111827', border: '1px solid var(--divider)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(val, name) => [`฿${fmt(val, 2)}`, name === 'value' ? 'มูลค่าพอร์ต' : 'เงินต้น']} />
                        <Line type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={2.5} dot={false} name="value" isAnimationActive={false} />
                        <Line type="monotone" dataKey="principal" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="principal" isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* 4. การ์ดมูลค่าพอร์ตลงทุน */}
              <div className="pf-hero" style={{ border: '2px solid rgba(52, 211, 153, 0.3)', background: 'linear-gradient(135deg, #111827 0%, #172a3a 100%)' }}>
                <div className="pf-hero-label">มูลค่าพอร์ตลงทุน</div>
                <div className="pf-hero-value pf-mono" style={{ fontSize: '32px', color: '#ffffff' }}>
                  ฿{fmt(totalInvestedCost + totalGain, 2)}
                </div>
                <div className={`pf-hero-sub ${totalGain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`} style={{ fontSize: '14px' }}>
                  {totalGain >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span className="pf-mono">{totalGain >= 0 ? '+' : ''}{fmt(totalGain, 2)} ({totalGain >= 0 ? '+' : ''}{fmt(totalGainPct, 2)}%)</span>
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
                        <button key={y} className={y === graphYearGain ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setGraphYearGain(y)} style={{ padding: '2px 8px', fontSize: '11px' }}>{y}</button>
                      ))}
                    </div>
                  )}
                  <div className="pf-spark">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartDataGainCard}>
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} domain={getDynamicDomain(totalInvestedCost + totalGain, totalInvestedCost)} tickFormatter={(val) => `฿${fmt(val, 2)}`} />
                        <Tooltip contentStyle={{ background: '#111827', border: '1px solid var(--divider)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(val, name) => [`฿${fmt(val, 2)}`, name === 'gain' ? 'มูลค่า (ต้นทุน+กำไร)' : 'ต้นทุน']} />
                        <Line type="monotone" dataKey="gain" stroke="#34d399" strokeWidth={2.5} dot={false} name="gain" isAnimationActive={false} />
                        <Line type="monotone" dataKey="cost" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="cost" isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* 5. การ์ดปันผลรวม */}
              <div className="pf-hero" style={{ border: '2px solid rgba(56, 189, 248, 0.3)', background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)' }}>
                <div className="pf-hero-label">ปันผลรวม</div>
                <div className="pf-hero-value pf-mono" style={{ fontSize: '32px', color: '#34d399' }}>
                  ฿{fmt(totalDividendAmount, 2)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 8px', paddingTop: '12px', borderTop: '1px solid var(--divider)' }}>
                  <div className="pf-hero-label" style={{ margin: 0 }}>กราฟปันผล / เงินที่ลงทุนไป</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className={dividendGraphMode === 'all' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setDividendGraphMode('all')} style={{ padding: '2px 8px', fontSize: '11px' }}>ตั้งแต่เริ่มต้น</button>
                    <button className={dividendGraphMode === 'year' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setDividendGraphMode('year')} style={{ padding: '2px 8px', fontSize: '11px' }}>รายปี</button>
                  </div>
                </div>

                <div className="pf-spark" style={{ marginTop: '10px', height: '190px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dividendChartData} barSize={18} barGap={4} margin={{ top: 18, right: 4, left: 0, bottom: 0 }}>
                      <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} domain={[0, dividendMaxVal]} ticks={[0, dividendMaxVal * 0.25, dividendMaxVal * 0.5, dividendMaxVal * 0.75, dividendMaxVal]} tickFormatter={(val) => `฿${fmt(val, 2)}`} />
                      <Tooltip cursor={{ fill: 'rgba(56,189,248,0.06)' }} contentStyle={{ background: '#111827', border: '1px solid var(--divider)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(val, name, item) => {
                        const label = name === 'dividend' ? 'เงินปันผลรับ' : 'เงินที่ลงทุนไป';
                        const extra = name === 'dividend' && item?.payload?.yieldPct > 0 ? ` (${fmt(item.payload.yieldPct, 2)}%)` : '';
                        return [`฿${fmt(val, 2)}${extra}`, label];
                      }} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} formatter={(value) => (value === 'dividend' ? <span style={{ color: '#34d399' }}>เงินปันผล</span> : <span style={{ color: '#38bdf8' }}>เงินที่ลงทุนไป</span>)} />
                      <Bar dataKey="dividend" fill="#34d399" radius={[4, 4, 0, 0]} name="dividend">
                        <LabelList dataKey="yieldPct" position="top" fill="#34d399" fontSize={11} formatter={(v) => (v > 0 ? `${fmt(v, 2)}%` : '')} />
                      </Bar>
                      <Bar dataKey="invested" fill="#38bdf8" radius={[4, 4, 0, 0]} name="invested" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 6. การ์ดผลประกอบการรวม */}
              <div className="pf-hero" style={{ border: '2px solid rgba(56, 189, 248, 0.3)', background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)' }}>
                <div className="pf-hero-label">ผลประกอบการรวม</div>
                <div className="pf-hero-value pf-mono" style={{ fontSize: '36px', color: totalRealizedPnL >= 0 ? '#34d399' : '#fca5a5' }}>
                  {totalRealizedPnL >= 0 ? '+' : ''}฿{fmt(totalRealizedPnL, 2)}
                </div>

                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--divider)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' }}>
                  {ASSET_TYPES.filter(t => t && t.key !== 'cash').map((t) => {
                    if (!t) return null;
                    const val = realizedPnLByType[t.key] || 0;
                    return (
                      <div key={t.key} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span className="pf-dot" style={{ background: t.color }} /> {t.label}
                        </span>
                        <span className={`pf-mono ${val >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`} style={{ fontSize: '12.5px', fontWeight: '600' }}>
                          {val >= 0 ? `+฿${fmt(val, 2)}` : `-฿${fmt(Math.abs(val), 2)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button 
                    className="pf-btn pf-btn-primary" 
                    style={{ fontSize: '12.5px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => setTradeModalOpen(true)}
                  >
                    <History size={14} /> ประวัติซื้อขาย
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ================= 4. สินทรัพย์อื่นๆ ================= */}
          {activeTab === 4 && (
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '15.5px', color: 'var(--text)', margin: '0 0 14px 2px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span className="pf-dot" style={{ background: '#7C8B9E' }} />เงินสดและสินทรัพย์อื่นๆ (Cash & Others)
              </div>

              <div className="pf-type-section" style={{ marginTop: 0, marginBottom: '20px', background: 'linear-gradient(135deg, rgba(17,24,39,0.9) 0%, rgba(31,41,55,0.7) 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div className="pf-hero-label" style={{ marginBottom: '4px' }}>เงินสด / สภาพคล่องในมือ</div>
                    <div className="pf-type-section-value pf-mono" style={{ fontSize: '36px' }}>฿{fmt(computedCash, 2)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      background: cashRatio >= 30 ? 'rgba(52, 211, 153, 0.15)' : cashRatio >= 10 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                      color: cashRatio >= 30 ? '#34d399' : cashRatio >= 10 ? '#38bdf8' : '#fbbf24',
                      border: `1px solid ${cashRatio >= 30 ? 'rgba(52, 211, 153, 0.4)' : cashRatio >= 10 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(251, 191, 36, 0.4)'}`
                    }} className="pf-mono">
                      {cashRatio >= 30 ? 'สภาพคล่องสูง' : cashRatio >= 10 ? 'สภาพคล่องสมดุล' : 'สภาพคล่องต่ำ'} ({fmt(cashRatio, 2)}%)
                    </span>
                  </div>
                </div>

                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', margin: '16px 0 6px' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, cashRatio))}%`, height: '100%', background: cashRatio >= 30 ? '#34d399' : cashRatio >= 10 ? '#38bdf8' : '#fbbf24', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                  <span>เทียบกับมูลค่าพอร์ตลงทุน</span>
                  <span className="pf-mono">{fmt(cashRatio, 2)}%</span>
                </div>

                <button className="pf-cash-manage-btn" onClick={() => setPanel('cashManage')} style={{ marginTop: '12px' }}>
                  <span className="pf-cash-manage-icon"><Wallet size={16} /></span>
                  <span>จัดการเงินสด & สรุปรายปี</span>
                  <ChevronRight size={14} style={{ opacity: 0.5 }} />
                </button>
              </div>

              {holdings.filter((h) => h && ['crypto', 'gold', 'fund', 'other'].includes(h.type)).length === 0 ? (
                <div className="pf-empty">
                  <Inbox size={26} style={{ marginBottom: 8, opacity: 0.6 }} />
                  <div>ยังไม่มีรายการสินทรัพย์อื่นๆ ในพอร์ต</div>
                  <button className="pf-btn pf-btn-primary pf-empty-cta" onClick={openAdd}><Plus size={16} /> เพิ่มสินทรัพย์อื่นๆ</button>
                </div>
              ) : (
                byType.filter((t) => t && t.key !== 'th_stock' && t.key !== 'foreign_stock' && t.key !== 'cash')
                  .sort((a, b) => {
                    const order = { fund: 0, gold: 1, crypto: 2, other: 3 };
                    return (order[a?.key] ?? 9) - (order[b?.key] ?? 9);
                  })
                  .map((t) => {
                    if (!t) return null;
                    const typeHoldings = enriched.filter((h) => h && h.type === t.key);
                    const typeCost = typeHoldings.reduce((s, h) => s + (h?.costValue || 0), 0);
                    const typeGain = t.value - typeCost;
                    const typeGainPct = typeCost > 0 ? (typeGain / typeCost) * 100 : 0;
                    const shades = shadeSet(t.color, typeHoldings.length);
                    const colorById = {};
                    typeHoldings.forEach((h, i) => { if (h) colorById[h.id] = shades[i]; });

                    return (
                      <div className="pf-type-section" key={t.key}>
                        <div className="pf-type-section-head">
                          <ExplodedPie3D data={typeHoldings.map((h) => ({ key: h.id, label: h.name, color: colorById[h.id], value: h.marketValue }))} rx={55} depth={12} explode={4} />
                          <div className="pf-type-section-info">
                            <div className="pf-type-section-title"><span className="pf-dot" style={{ background: t.color }} />{t.label}</div>
                            <div className="pf-type-section-value pf-mono">฿{fmt(t.value, 2)}</div>
                            {typeCost > 0 && <div className="pf-type-section-cost pf-mono">ต้นทุนรวม ฿{fmt(typeCost, 2)}</div>}
                            {typeCost > 0 && (
                              <div className={`pf-type-section-gain pf-mono ${typeGain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>
                                {typeGain >= 0 ? '+' : ''}{fmt(typeGain, 2)} ({typeGain >= 0 ? '+' : ''}{fmt(typeGainPct, 2)}%)
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pf-type-section-holdings">
                          {typeHoldings.map((h) => {
                            if (!h) return null;
                            const isCrypto = h.type === 'crypto';
                            const isExpanded = expandedLotsId === h.id;
                            const lots = getAssetLots(h.id, h.qty, h.price, h.currency, h.type, h.instrumentType);

                            return (
                              <div key={h.id}>
                                <div className="pf-subrow" style={{ padding: '12px 0' }} onClick={() => setExpandedLotsId(isExpanded ? null : h.id)}>
                                  <div className="pf-row-top">
                                    <div className="pf-row-name">
                                      <span className="pf-dot" style={{ background: colorById[h.id] }} />
                                      <span className="pf-row-name-text">{h.name}</span>
                                    </div>
                                    <div className="pf-row-actions" onClick={(e) => e.stopPropagation()}>
                                      <button aria-label="แก้ไข" onClick={() => openEdit(h)}><Pencil size={15} /></button>
                                      <button aria-label="ลบ" onClick={() => requestDelete('holding', h.id, h.name)}><Trash2 size={15} /></button>
                                    </div>
                                  </div>
                                  <div className="pf-row-meta pf-mono">
                                    <span>จำนวน <b>{fmt(h.qty, 2, isCrypto)}</b></span>
                                    <span>ทุนเฉลี่ย <b>{h.currency === 'USD' ? '$' : '฿'}{fmt(h.avg, 2, isCrypto)}</b></span>
                                  </div>
                                  <div className="pf-row-meta pf-mono">
                                    <span>ราคาล่าสุด <b style={{ color: 'var(--gold)' }}>{h.currency === 'USD' ? '$' : '฿'}{fmt(h.price, 2, isCrypto)}</b></span>
                                    <span>ต้นทุนรวม <b>฿{fmt(h.costValue, 2)}</b></span>
                                  </div>
                                  <div className="pf-row-meta pf-mono">
                                    <span>มูลค่า <b className={h.gain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}>฿{fmt(h.marketValue, 2)}</b></span>
                                    <span className={h.gain >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}>
                                      {h.gain >= 0 ? '+' : ''}{fmt(h.gain, 2)} ({h.gain >= 0 ? '+' : ''}{fmt(h.gainPct, 2)}%)
                                    </span>
                                  </div>
                                </div>

                                {isExpanded && lots.length > 0 && (
                                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '10px', margin: '6px 0 12px', border: '1px solid var(--divider)' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', fontWeight: '600' }}>ไม้ที่ถืออยู่ ({lots.length})</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--muted)', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '6px' }} className="pf-mono">
                                      <span style={{ minWidth: '85px' }}>วันที่ซื้อ</span>
                                      <span style={{ textAlign: 'center', flex: 1 }}>จำนวน</span>
                                      <span style={{ textAlign: 'right', flex: 1 }}>ราคา/หน่วย</span>
                                      <span style={{ textAlign: 'right', minWidth: '70px' }}>กำไร/ขาดทุน</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {lots.map((lot, idx) => (
                                        <div key={idx} style={{ background: 'var(--surface-alt)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 8px', fontSize: '11.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="pf-mono">
                                          <span style={{ color: 'var(--gold)', minWidth: '85px' }}>{thaiDateAD(lot?.date)} <span style={{ color: 'var(--muted)', fontSize: '10px' }}>({lot?.days || 0}ว)</span></span>
                                          <span style={{ textAlign: 'center', flex: 1 }}><b>{fmt(lot?.qty, 2, isCrypto)}</b></span>
                                          <span style={{ textAlign: 'right', flex: 1 }}><b>{fmt(lot?.price, 2)}</b></span>
                                          <span className={(lot?.gainPct || 0) >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'} style={{ fontWeight: '600', textAlign: 'right', minWidth: '70px' }}>
                                            {(lot?.gainPct || 0) >= 0 ? '+' : ''}{fmt(lot?.gainPct, 2)}%
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
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
              <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '15.5px', color: 'var(--text)', margin: '0 0 14px 2px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span className="pf-dot" style={{ background: '#7C8B9E' }} />ตั้งค่าระบบ (Settings)
              </div>
              <div className="pf-type-section">
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>จัดการข้อมูล & อัปเดตราคา</div>
                  <div style={{ color: 'var(--muted)', fontSize: '13px' }}>อัปเดตราคาสินทรัพย์รายวัน, ตั้งค่า API และสำรองข้อมูล</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {holdings.filter(h => h).length > 0 && (
                    <button className="pf-btn pf-btn-primary" style={{ justifyContent: 'flex-start', padding: '14px', position: 'relative', zIndex: 50 }} onClick={openUpdatePrices}>
                      <RefreshCw size={16} /> อัปเดตราคาวันนี้ (ราคาตลาด)
                    </button>
                  )}
                  <button className="pf-btn pf-btn-ghost" style={{ justifyContent: 'flex-start', padding: '14px', position: 'relative', zIndex: 50 }} onClick={() => { setBackendDraft(backendUrl); setFxDraft(String(fxRate)); setPanel('settings'); }}>
                    ⚙️ ตั้งค่า API Endpoint และอัตราแลกเปลี่ยน
                  </button>
                  <button className="pf-btn pf-btn-ghost" style={{ justifyContent: 'flex-start', padding: '14px', position: 'relative', zIndex: 50 }} onClick={exportData}>
                    📥 ส่งออกข้อมูล (สำรอง Backup JSON)
                  </button>
                  <button className="pf-btn pf-btn-ghost" style={{ justifyContent: 'flex-start', padding: '14px', position: 'relative', zIndex: 50 }} onClick={triggerImport}>
                    📤 นำเข้าข้อมูล (กู้คืน Restore JSON)
                  </button>
                  <button className="pf-btn" style={{ justifyContent: 'flex-start', padding: '14px', background: 'rgba(252,165,165,0.1)', color: 'var(--neg)', border: '1px solid var(--neg)', position: 'relative', zIndex: 50 }} onClick={() => setConfirmClear(true)}>
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

      {/* Bottom Navigation Bar */}
      <div className="pf-nav-container">
        <div className="pf-bottom-nav">
          <button onClick={() => setActiveTab(1)} className={`pf-nav-item ${activeTab === 1 ? 'active' : ''}`} title="หุ้นไทย">
            <LayoutGrid size={22} />
          </button>
          <button onClick={() => setActiveTab(2)} className={`pf-nav-item ${activeTab === 2 ? 'active' : ''}`} title="หุ้นนอก">
            <BarChart3 size={22} />
          </button>
          <button onClick={() => setActiveTab(3)} className={`pf-nav-item ${activeTab === 3 ? 'active' : ''}`} title="พอร์ตรวม">
            <Home size={22} />
          </button>
          <button onClick={() => setActiveTab(4)} className={`pf-nav-item ${activeTab === 4 ? 'active' : ''}`} title="สินทรัพย์อื่น">
            <TrendingUp size={22} />
          </button>
          <button onClick={() => setActiveTab(5)} className={`pf-nav-item ${activeTab === 5 ? 'active' : ''}`} title="ตั้งค่า">
            <Settings size={22} />
          </button>
        </div>
      </div>

      {/* Modals & Panels: เพิ่มสินทรัพย์ / แก้ไข / ซื้อขาย */}
      {panel === 'form' && (
        <div className="pf-overlay" onClick={closePanel}>
          <div className="pf-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pf-panel-head">
              <div className="pf-panel-title">{editingId ? 'แก้ไขสินทรัพย์ & ซื้อ/ขาย' : 'เพิ่มสินทรัพย์'}</div>
              <button className="pf-icon-btn" onClick={closePanel} aria-label="ปิด"><X size={16} /></button>
            </div>
            {formError && <div className="pf-error">{formError}</div>}

            {editingId && (
              <div className="pf-field" style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '12px', borderRadius: '10px', border: '1px solid var(--divider)' }}>
                <label className="pf-label" style={{ fontWeight: '600', color: 'var(--gold)', marginBottom: '8px' }}>ทำรายการซื้อเพิ่ม / ขายออก</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <button type="button" className={`pf-btn ${form.tradeAction === 'none' ? 'pf-btn-primary' : 'pf-btn-ghost'}`} style={{ flex: 1, padding: '8px', justifyContent: 'center', fontSize: '13px' }} onClick={() => setForm({ ...form, tradeAction: 'none' })}>แก้ไขข้อมูล</button>
                  <button type="button" className={`pf-btn ${form.tradeAction === 'buy' ? 'pf-btn-primary' : 'pf-btn-ghost'}`} style={{ flex: 1, padding: '8px', justifyContent: 'center', fontSize: '13px' }} onClick={() => setForm({ ...form, tradeAction: 'buy' })}>ซื้อเพิ่ม</button>
                  <button type="button" className={`pf-btn ${form.tradeAction === 'sell' ? 'pf-btn-primary' : 'pf-btn-ghost'}`} style={{ flex: 1, padding: '8px', justifyContent: 'center', fontSize: '13px' }} onClick={() => {
                    const targetHolding = holdings.find(h => h && h.id === editingId);
                    setForm({ 
                      ...form, 
                      tradeAction: 'sell', 
                      tradeQty: targetHolding ? String(targetHolding.quantity) : '' 
                    });
                  }}>ขายออก</button>
                </div>

                {form.tradeAction !== 'none' && (
                  <>
                    <div className="pf-row2" style={{ marginBottom: '10px' }}>
                      <div>
                        <label className="pf-label">จำนวนที่{form.tradeAction === 'buy' ? 'ซื้อเพิ่ม' : 'ขายออก'}</label>
                        <input className="pf-input pf-mono" inputMode="decimal" value={form.tradeQty} onChange={(e) => setForm({ ...form, tradeQty: e.target.value })} placeholder="0" />
                      </div>
                      <div>
                        <label className="pf-label">ราคาต่อหน่วย</label>
                        <input className="pf-input pf-mono" inputMode="decimal" value={form.tradePrice} onChange={(e) => setForm({ ...form, tradePrice: e.target.value })} placeholder="0.00" />
                      </div>
                    </div>

                    {form.currency === 'USD' && (
                      <div className="pf-field" style={{ marginBottom: '10px' }}>
                        <label className="pf-label">อัตราแลกเปลี่ยน (1 USD = ? บาท) <span style={{ opacity: 0.6 }}>(ไม่กรอก = ใช้เรทกลางแอพ)</span></label>
                        <input className="pf-input pf-mono" inputMode="decimal" value={form.tradeFx} onChange={(e) => setForm({ ...form, tradeFx: e.target.value })} placeholder={String(fxRate)} />
                      </div>
                    )}

                    <div className="pf-row2" style={{ marginBottom: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label className="pf-label" style={{ margin: 0 }}>ค่าธรรมเนียม {isDirectFeeType ? '' : '(%)'}</label>
                          {isDirectFeeType && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button type="button" className={form.feeCurrency !== 'USD' ? 'pf-year-pill-active' : 'pf-year-pill'} style={{ padding: '1px 6px', fontSize: '10px' }} onClick={() => setForm({ ...form, feeCurrency: 'THB' })}>บาท</button>
                              <button type="button" className={form.feeCurrency === 'USD' ? 'pf-year-pill-active' : 'pf-year-pill'} style={{ padding: '1px 6px', fontSize: '10px' }} onClick={() => setForm({ ...form, feeCurrency: 'USD' })}>USD</button>
                            </div>
                          )}
                        </div>
                        <input className="pf-input pf-mono" inputMode="decimal" value={form.feePct} onChange={(e) => setForm({ ...form, feePct: e.target.value })} placeholder="0" />
                      </div>
                      <div>
                        <label className="pf-label">วันที่ทำรายการ</label>
                        <input className="pf-input pf-mono" type="date" value={form.tradeDate} onChange={(e) => setForm({ ...form, tradeDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="pf-field" style={{ marginBottom: 0 }}>
                      <label className="pf-label">หมายเหตุการซื้อขาย</label>
                      <input className="pf-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="เช่น เติมพอร์ต / ขายทำกำไร" />
                    </div>
                  </>
                )}
              </div>
            )}

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
                {ASSET_TYPES.filter((t) => t && t.key !== 'cash').map((t) => <option value={t.key} key={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label className="pf-label">สกุลเงิน</label>
              <div className="pf-currency-toggle">
                <button type="button" className={form.currency !== 'USD' ? 'pf-currency-active' : ''} onClick={() => setForm({ ...form, currency: 'THB' })}>บาท (THB)</button>
                <button type="button" className={form.currency === 'USD' ? 'pf-currency-active' : ''} onClick={() => setForm({ ...form, currency: 'USD' })}>ดอลลาร์ (USD)</button>
              </div>
            </div>

            {form.currency === 'USD' && !editingId && (
              <div className="pf-field" style={{ marginBottom: '14px' }}>
                <label className="pf-label">อัตราแลกเปลี่ยน (1 USD = ? บาท) <span style={{ opacity: 0.6 }}>(ไม่กรอก = ใช้เรทกลางแอพ)</span></label>
                <input className="pf-input pf-mono" inputMode="decimal" value={form.tradeFx} onChange={(e) => setForm({ ...form, tradeFx: e.target.value })} placeholder={String(fxRate)} />
              </div>
            )}

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
                    <label className="pf-label">ราคาต่อหน่วย</label>
                    <input className="pf-input pf-mono" inputMode="decimal" value={form.avgCost} onChange={(e) => setForm({ ...form, avgCost: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <div className="pf-field">
                  <label className="pf-label">ราคาปัจจุบัน</label>
                  <input className="pf-input pf-mono" inputMode="decimal" value={form.currentPrice} onChange={(e) => setForm({ ...form, currentPrice: e.target.value })} placeholder="0.00" />
                </div>

                {!editingId && (
                  <>
                    <div className="pf-row2">
                      <div className="pf-field">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label className="pf-label" style={{ margin: 0 }}>ค่าธรรมเนียม {isDirectFeeType ? '' : '(%)'}</label>
                          {isDirectFeeType && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button type="button" className={form.feeCurrency !== 'USD' ? 'pf-year-pill-active' : 'pf-year-pill'} style={{ padding: '1px 6px', fontSize: '10px' }} onClick={() => setForm({ ...form, feeCurrency: 'THB' })}>บาท</button>
                              <button type="button" className={form.feeCurrency === 'USD' ? 'pf-year-pill-active' : 'pf-year-pill'} style={{ padding: '1px 6px', fontSize: '10px' }} onClick={() => setForm({ ...form, feeCurrency: 'USD' })}>USD</button>
                            </div>
                          )}
                        </div>
                        <input className="pf-input pf-mono" inputMode="decimal" value={form.feePct} onChange={(e) => setForm({ ...form, feePct: e.target.value })} placeholder="0" />
                      </div>
                      <div className="pf-field">
                        <label className="pf-label">วันที่ทำรายการ</label>
                        <input className="pf-input pf-mono" type="date" value={form.tradeDate} onChange={(e) => setForm({ ...form, tradeDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="pf-field">
                      <label className="pf-label">หมายเหตุการซื้อ</label>
                      <input className="pf-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="เช่น ซื้อครั้งแรก" />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="pf-panel-actions">
              <button className="pf-btn pf-btn-ghost" onClick={closePanel}>ยกเลิก</button>
              <button className="pf-btn pf-btn-primary" onClick={submitForm}>{editingId ? 'บันทึกการแก้ไข' : 'เพิ่มสินทรัพย์'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Panel: ตั้งค่า API & อัตราแลกเปลี่ยน */}
      {panel === 'settings' && (
        <div className="pf-overlay" onClick={closePanel}>
          <div className="pf-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pf-panel-head">
              <div className="pf-panel-title">ตั้งค่า API และอัตราแลกเปลี่ยน</div>
              <button className="pf-icon-btn" onClick={closePanel} aria-label="ปิด"><X size={16} /></button>
            </div>
            <div className="pf-field">
              <label className="pf-label">Backend API Endpoint</label>
              <input className="pf-input pf-mono" value={backendDraft} onChange={(e) => setBackendDraft(e.target.value)} placeholder="https://your-api-url.com" />
            </div>
            <div className="pf-field">
              <label className="pf-label">อัตราแลกเปลี่ยนกลาง (1 USD = ? บาท)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="pf-input pf-mono" inputMode="decimal" value={fxDraft} onChange={(e) => setFxDraft(e.target.value)} placeholder="36.50" />
                <button className="pf-btn pf-btn-ghost" onClick={fetchFxRate} disabled={fetchingFx} style={{ whiteSpace: 'nowrap' }}>
                  {fetchingFx ? 'กำลังดึง...' : 'ดึงเรทสด'}
                </button>
              </div>
            </div>
            <div className="pf-panel-actions">
              <button className="pf-btn pf-btn-ghost" onClick={closePanel}>ยกเลิก</button>
              <button className="pf-btn pf-btn-primary" onClick={saveBackendUrl}>บันทึกการตั้งค่า</button>
            </div>
          </div>
        </div>
      )}

      {/* Panel: อัปเดตราคาวันนี้ */}
      {panel === 'update' && (
        <div className="pf-overlay" onClick={closePanel}>
          <div className="pf-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pf-panel-head">
              <div className="pf-panel-title">อัปเดตราคาวันนี้</div>
              <button className="pf-icon-btn" onClick={closePanel} aria-label="ปิด"><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>กรอกราคาตลาดปัจจุบันของสินทรัพย์</span>
              {backendUrl && (
                <button className="pf-btn pf-btn-ghost" style={{ fontSize: '12px', padding: '6px 10px' }} onClick={fetchAutoPrices} disabled={fetchingPrices}>
                  {fetchingPrices ? 'กำลังดึงราคา...' : '⚡ ดึงราคาอัตโนมัติ'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '55vh', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
              {holdings.filter(h => h && h.type !== 'cash').map(h => (
                <div className="pf-update-item" key={h.id}>
                  <div className="pf-update-name"><b>{h.name}</b> <span style={{ fontSize: '11px', color: 'var(--muted)' }}>({h.ticker || '-'})</span></div>
                  <input 
                    className="pf-input pf-mono pf-update-input" 
                    inputMode="decimal" 
                    value={updateDraft[h.id] !== undefined ? updateDraft[h.id] : h.currentPrice} 
                    onChange={(e) => setUpdateDraft({ ...updateDraft, [h.id]: e.target.value })} 
                    placeholder="0.00" 
                  />
                </div>
              ))}
            </div>
            <div className="pf-panel-actions">
              <button className="pf-btn pf-btn-ghost" onClick={closePanel}>ยกเลิก</button>
              <button className="pf-btn pf-btn-primary" onClick={submitUpdatePrices}>บันทึกราคาอัปเดต</button>
            </div>
          </div>
        </div>
      )}

      {/* Panel: จัดการเงินสด & สรุปรายปี */}
      {panel === 'cashManage' && (
        <div className="pf-overlay" onClick={closePanel}>
          <div className="pf-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="pf-panel-head" style={{ marginBottom: '14px' }}>
              <div className="pf-panel-title">จัดการเงินสด & สรุปรายปี</div>
              <button className="pf-icon-btn" style={{ width: '32px', height: '32px' }} onClick={closePanel} aria-label="ปิด"><X size={16} /></button>
            </div>

            <div className="pf-field" style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', border: '1px solid var(--divider)', marginBottom: '16px' }}>
              <label className="pf-label" style={{ fontWeight: '600', color: 'var(--gold)', marginBottom: '6px' }}>ทุนเริ่มต้นสะสมทั้งหมด</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="pf-input pf-mono" inputMode="decimal" value={initialCapitalDraft} onChange={(e) => setInitialCapitalDraft(e.target.value)} placeholder="0.00" />
                <button className="pf-btn pf-btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={saveInitialCapital}>บันทึกทุน</button>
              </div>
            </div>

            <div className="pf-cash-actions-grid">
              <button className="pf-cash-action-btn-styled" onClick={() => openLedgerForm('capital_add')}><PlusCircle size={14} /> เพิ่มทุน</button>
              <button className="pf-cash-action-btn-styled" onClick={() => openLedgerForm('capital_reduce')}><MinusCircle size={14} /> ลดทุน</button>
              <button className="pf-cash-action-btn-styled" onClick={() => openLedgerForm('dividend')}><Gift size={14} /> รับปันผล</button>
              <button className="pf-cash-action-btn-styled" onClick={() => openLedgerForm('profit')}><TrendingUp size={14} /> บันทึกกำไร</button>
              <button className="pf-cash-action-btn-styled" onClick={() => openLedgerForm('loss')}><TrendingDown size={14} /> บันทึกขาดทุน</button>
              <button className="pf-cash-action-btn-styled" onClick={() => openLedgerForm('rebalance')}><Sliders size={14} /> รีบาลานซ์</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '14px', paddingBottom: '4px' }}>
              {yearOptions.map(y => (
                <button key={y} className={y === selectedYear ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => setSelectedYear(y)}>{y}</button>
              ))}
            </div>

            <div className="pf-year-card">
              <div className="pf-year-net">
                <div className="pf-year-net-label">กระแสเงินสดสุทธิปี {selectedYear}</div>
                <div className={`pf-year-net-value pf-mono ${yearSummary.net >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`}>
                  {yearSummary.net >= 0 ? '+' : ''}฿{fmt(yearSummary.net, 2)}
                </div>
              </div>
              <div className="pf-year-flow-bar">
                <div className="pf-year-flow-in" style={{ width: `${yearSummary.inPct}%` }} />
                <div className="pf-year-flow-out" style={{ width: `${100 - yearSummary.inPct}%` }} />
              </div>
              <div className="pf-year-flow-legend">
                <span>เข้า: ฿{fmt(yearSummary.totalIn, 2)}</span>
                <span>ออก: ฿{fmt(yearSummary.totalOut, 2)}</span>
              </div>
              <div className="pf-year-rows">
                {yearSummary.capital_add !== 0 && (
                  <div className="pf-year-row">เพิ่มทุน: <b className="pf-mono">฿{fmt(yearSummary.capital_add, 2)}</b></div>
                )}
                {yearSummary.capital_reduce !== 0 && (
                  <div className="pf-year-row">ลดทุน: <b className="pf-mono">฿{fmt(yearSummary.capital_reduce, 2)}</b></div>
                )}
                {yearSummary.profit !== 0 && (
                  <div className="pf-year-row">กำไรขาย: <b className="pf-mono pf-chip-pos">฿{fmt(yearSummary.profit, 2)}</b></div>
                )}
                {yearSummary.loss !== 0 && (
                  <div className="pf-year-row">ขาดทุนขาย: <b className="pf-mono pf-chip-neg">฿{fmt(yearSummary.loss, 2)}</b></div>
                )}
                {yearSummary.dividend !== 0 && (
                  <div className="pf-year-row">ปันผล: <b className="pf-mono pf-chip-pos">฿{fmt(yearSummary.dividend, 2)}</b></div>
                )}
                {yearSummary.rebalance !== 0 && (
                  <div className="pf-year-row">รีบาลานซ์: <b className="pf-mono">฿{fmt(yearSummary.rebalance, 2)}</b></div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>ประวัติรายการเงินสดทั้งหมด</span>
              </div>
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="pf-input"
                  style={{ padding: '8px 10px 8px 30px', fontSize: '13px', borderRadius: '10px' }}
                  placeholder="ค้นหาประวัติเงินสด..."
                  value={ledgerSearchQuery}
                  onChange={(e) => setLedgerSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {recentLedger.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '12px', color: 'var(--muted)' }}>ยังไม่มีประวัติรายการ</div>
                ) : (
                  recentLedger.map(e => (
                    <div key={e.id} style={{ background: 'var(--surface-alt)', border: '1px solid var(--divider)', borderRadius: '8px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{LEDGER_LABELS[e.type] || e.type} <span style={{ fontSize: '11px', color: 'var(--muted)' }}>({thaiDateAD(e.date)})</span></div>
                        {e.note && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{e.note}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`pf-mono pf-ledger-amount ${['capital_add', 'profit', 'dividend'].includes(e.type) || (e.type === 'rebalance' && e.amount >= 0) ? 'pf-chip-pos' : 'pf-chip-neg'}`}>
                          {['capital_add', 'profit', 'dividend'].includes(e.type) || (e.type === 'rebalance' && e.amount >= 0) ? '+' : '-'}฿{fmt(Math.abs(e.amount), 2)}
                        </span>
                        {!e.id.toString().startsWith('log_pnl_') && (
                          <button style={{ background: 'transparent', border: '1px solid var(--muted)', cursor: 'pointer', padding: '2px' }} onClick={() => requestDelete('ledger', e.id, LEDGER_LABELS[e.type] || e.type)}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel: ฟอร์มกรอกรายการเงินสดแยกประเภท */}
      {panel === 'ledger' && (
        <div className="pf-overlay" onClick={() => setPanel('cashManage')}>
          <div className="pf-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div className="pf-panel-head">
              <div className="pf-panel-title">บันทึก{LEDGER_LABELS[ledgerType]}</div>
              <button className="pf-icon-btn" onClick={() => setPanel('cashManage')} aria-label="ปิด"><X size={16} /></button>
            </div>
            {ledgerError && <div className="pf-error">{ledgerError}</div>}
            
            {ledgerType === 'rebalance' && (
              <div className="pf-field">
                <label className="pf-label">เลือกประเภท (บวก / ลบ)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className={`pf-btn ${ledgerSign === '+' ? 'pf-btn-primary' : 'pf-btn-ghost'}`} style={{ flex: 1, padding: '8px', justifyContent: 'center' }} onClick={() => setLedgerSign('+')}>+ (เพิ่มเงินสด)</button>
                  <button type="button" className={`pf-btn ${ledgerSign === '-' ? 'pf-btn-primary' : 'pf-btn-ghost'}`} style={{ flex: 1, padding: '8px', justifyContent: 'center' }} onClick={() => setLedgerSign('-')}>- (ลดเงินสด)</button>
                </div>
              </div>
            )}

            <div className="pf-field">
              <label className="pf-label">จำนวนเงิน (บาท)</label>
              <input className="pf-input pf-mono" inputMode="decimal" value={ledgerAmount} onChange={(e) => setLedgerAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="pf-field">
              <label className="pf-label">วันที่</label>
              <input className="pf-input pf-mono" type="date" value={ledgerDate} onChange={(e) => setLedgerDate(e.target.value)} />
            </div>
            <div className="pf-field">
              <label className="pf-label">หมายเหตุ (ถ้ามี)</label>
              <input className="pf-input" value={ledgerNote} onChange={(e) => setLedgerNote(e.target.value)} placeholder="ระบุรายละเอียด..." />
            </div>
            <div className="pf-panel-actions">
              <button className="pf-btn pf-btn-ghost" onClick={() => setPanel('cashManage')}>ยกเลิก</button>
              <button className="pf-btn pf-btn-primary" onClick={submitLedger}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Panel: ประวัติการซื้อขายทั้งหมด */}
      {tradeModalOpen && (
        <div className="pf-overlay" onClick={() => setTradeModalOpen(false)}>
          <div className="pf-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="pf-panel-head" style={{ marginBottom: '14px' }}>
              <div className="pf-panel-title">ประวัติการซื้อขายทั้งหมด</div>
              <button className="pf-icon-btn" style={{ width: '32px', height: '32px' }} onClick={() => setTradeModalOpen(false)} aria-label="ปิด"><X size={16} /></button>
            </div>

            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                className="pf-input"
                style={{ padding: '8px 10px 8px 30px', fontSize: '13px', borderRadius: '10px' }}
                placeholder="ค้นหาชื่อสินทรัพย์หรือหมายเหตุ..."
                value={tradeSearchQuery}
                onChange={(e) => setTradeSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>ตั้งแต่</label>
                <input type="date" className="pf-input pf-mono" style={{ padding: '6px 8px', fontSize: '12px' }} value={tradeStartDate} onChange={(e) => setTradeStartDate(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>ถึง</label>
                <input type="date" className="pf-input pf-mono" style={{ padding: '6px 8px', fontSize: '12px' }} value={tradeEndDate} onChange={(e) => setTradeEndDate(e.target.value)} />
              </div>
              {(tradeStartDate || tradeEndDate) && (
                <button style={{ alignSelf: 'flex-end', background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: '11px', cursor: 'pointer', paddingBottom: '8px' }} onClick={() => { setTradeStartDate(''); setTradeEndDate(''); }}>ล้าง</button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button 
                className="pf-btn pf-btn-ghost" 
                style={{ fontSize: '12px', padding: '6px 14px', height: '34px', borderColor: 'var(--divider)' }}
                onClick={() => setShowCatMenu(!showCatMenu)}
              >
                {tradeFilterType === 'all' ? 'หมวดหมู่: ทั้งหมด' : ASSET_TYPES.find(t => t && t.key === tradeFilterType)?.label} ▾
              </button>
              {showCatMenu && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className={tradeFilterType === 'all' ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => { setTradeFilterType('all'); setShowCatMenu(false); }} style={{ padding: '4px 10px', fontSize: '11px' }}>ทั้งหมด</button>
                  {ASSET_TYPES.filter(t => t && t.key !== 'cash').map((t) => (
                    <button key={t.key} className={tradeFilterType === t.key ? 'pf-year-pill-active' : 'pf-year-pill'} onClick={() => { setTradeFilterType(t.key); setShowCatMenu(false); }} style={{ padding: '4px 10px', fontSize: '11px' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--divider)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>ค่าธรรมเนียมรวม</span>
              <span className="pf-mono" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gold)' }}>฿{fmt(totalFilteredFee, 2)}</span>
            </div>

            {searchFilteredAssetPnL && (
              <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid var(--neon-blue)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>ผลรวมกำไร/ขาดทุน ({searchFilteredAssetPnL.name})</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>จากทั้งหมด {searchFilteredAssetPnL.count} รายการขาย</div>
                </div>
                <div className={`pf-mono ${searchFilteredAssetPnL.pnl >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'}`} style={{ fontSize: '16px', fontWeight: '700' }}>
                  {searchFilteredAssetPnL.pnl >= 0 ? '+' : ''}฿{fmt(searchFilteredAssetPnL.pnl, 2)}
                </div>
              </div>
            )}

            {filteredTradeLogs.length === 0 ? (
              <div className="pf-empty" style={{ padding: '30px 0', fontSize: '13px' }}>ยังไม่มีประวัติการซื้อขาย</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px' }}>
                {filteredTradeLogs.map((log) => {
                  if (!log) return null;
                  const isBuy = log.action === 'buy';
                  const showNote = tradeSearchQuery.trim().length > 0 && log.note;
                  const isUsdAsset = log.currency === 'USD' && log.instrumentType !== 'dr';
                  const logFx = (log.currency === 'USD' && log.assetType !== 'th_stock' && log.instrumentType !== 'dr') ? (log.tradeFx ? parseFloat(log.tradeFx) : fxRate) : 1;
                  
                  // ตรวจสอบว่า Log นี้เป็นรายการล่าสุดของสินทรัพย์นั้นๆ หรือไม่ (เพื่อแสดงปุ่มคืนค่าเฉพาะรายการล่าสุด)
                  const isLatestForAsset = (tradeLogs || []).find(l => l && l.assetId === log.assetId)?.id === log.id;

                  const displayPrice = isUsdAsset ? (log.price * logFx) : log.price;
                  const displayFee = log.isFeeThb ? log.fee : (isUsdAsset ? ((log.fee || 0) * logFx) : (log.fee || 0));
                  const displayPnl = log.pnlThb !== undefined ? log.pnlThb : ((log.pnl !== undefined) ? (isUsdAsset ? (log.pnl * logFx) : log.pnl) : undefined);

                  return (
                    <div key={log.id} style={{ background: 'var(--surface-alt)', border: '1px solid var(--divider)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '600', fontFamily: 'Fraunces, serif' }}>{log.assetName}</span>
                          <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: isBuy ? 'rgba(52,211,153,0.15)' : 'rgba(252,165,165,0.15)', color: isBuy ? '#34d399' : '#fca5a5' }}>{isBuy ? 'ซื้อ' : 'ขาย'}</span>
                          {isLatestForAsset && (
                            <button 
                              onClick={() => setConfirmRevertTarget(log)}
                              style={{ background: 'transparent', border: '1px solid var(--divider)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: 'var(--gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                              title="คืนค่ารายการล่าสุดนี้"
                            >
                              <RotateCcw size={10} /> คืนค่า
                            </button>
                          )}
                        </div>
                        <span className="pf-mono" style={{ fontSize: '12px', color: 'var(--muted)' }}>{thaiDateAD(log.date)}</span>
                      </div>
                      <div className="pf-row-meta pf-mono" style={{ margin: 0, fontSize: '12px' }}>
                        <span>จำนวน <b>{fmt(log.quantity, 2, log.assetType === 'crypto')}</b></span>
                        <span>ราคา <b>{isUsdAsset ? '$' : '฿'}{fmt(log.price, 2, log.assetType === 'crypto')}</b> {isUsdAsset && <span style={{ fontSize: '10px', opacity: 0.6 }}>(฿{fmt(displayPrice, 2)})</span>}</span>
                        {log.note && <span style={{ color: 'var(--muted)' }}>({log.note})</span>}
                        {displayFee > 0 && <span>ค่าธรรมเนียม <b>฿{fmt(displayFee, 2)}</b></span>}
                      </div>
                      {!isBuy && displayPnl !== undefined && (
                        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }} className="pf-mono">
                          <span style={{ color: 'var(--muted)' }}>กำไร/ขาดทุนสุทธิ:</span>
                          <span className={displayPnl >= 0 ? 'pf-chip-pos' : 'pf-chip-neg'} style={{ fontWeight: '700' }}>
                            {displayPnl >= 0 ? '+' : ''}฿{fmt(displayPnl, 2)} {isUsdAsset && <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 'normal' }}>({log.pnl >= 0 ? '+' : ''}${fmt(log.pnl, 2)})</span>}
                          </span>
                        </div>
                      )}
                      {showNote && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>หมายเหตุ: {log.note}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {confirmRevertTarget && (
        <div className="pf-modal-overlay" onClick={() => setConfirmRevertTarget(null)}>
          <div className="pf-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 12, fontSize: 15, fontWeight: '600' }}>ยืนยันการคืนค่ารายการ?</div>
            <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--muted)' }}>
              ต้องการคืนค่ารายการล่าสุด "{confirmRevertTarget.assetName}" ({confirmRevertTarget.action === 'buy' ? 'ซื้อ' : 'ขาย'}) ใช่หรือไม่? ระบบจะปรับจำนวนหุ้นและยอดเงินกลับสู่สถานะเดิม
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="pf-btn pf-btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmRevertTarget(null)}>ยกเลิก</button>
              <button className="pf-btn pf-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => executeRevertTrade(confirmRevertTarget)}>ยืนยันคืนค่า</button>
            </div>
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
