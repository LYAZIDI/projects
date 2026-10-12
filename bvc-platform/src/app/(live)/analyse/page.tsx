'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────

interface OHLCV {
  date_value: string;
  ouverture: number | null;
  cloture: number | null;
  haut: number | null;
  bas: number | null;
  volume: number | null;
  variation_pct: number | null;
}

interface Action {
  symbol: string;
  emetteur: string;
  secteur: string;
  statut: string;
  ouverture: number | null;
  plusHaut: number | null;
  plusBas: number | null;
  dernierCours: number | null;
  reference: number | null;
  variation: number | null;
  volume: number | null;
  capitalisation: number | null;
  achat: { prix: number | null };
  vente: { prix: number | null };
}

interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  threshold: number;
  triggered: boolean;
  createdAt: string;
  triggeredAt?: string;
}

interface ToastMsg {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  threshold: number;
  price: number;
  expiry: number;
}

// ── Colors ────────────────────────────────────────────────────────────────────

const C = {
  bg: '#0d1117', card: '#161b22', panel: '#1c2128', border: '#21262d',
  text: '#e6edf3', muted: '#8b949e', green: '#3fb950', red: '#f85149',
  blue: '#1f6feb', teal: '#26a6a0', amber: '#d29922', orange: '#f0883e', purple: '#a371f7',
};

// ── Indicators (for signals computation) ─────────────────────────────────────

function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const r = [data[0]];
  for (let i = 1; i < data.length; i++) r.push(data[i] * k + r[i - 1] * (1 - k));
  return r;
}

function calcSMA(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => i < period - 1 ? null : data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
}

function calcRSI(closes: number[], period = 14): (number | null)[] {
  if (closes.length < period + 1) return closes.map(() => null);
  const result: (number | null)[] = Array(period).fill(null);
  let g = 0, l = 0;
  for (let i = 1; i <= period; i++) { const d = closes[i] - closes[i - 1]; d > 0 ? g += d : l -= d; }
  g /= period; l /= period;
  const push = () => result.push(l === 0 ? 100 : 100 - 100 / (1 + g / l));
  push();
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    g = (g * (period - 1) + Math.max(d, 0)) / period;
    l = (l * (period - 1) + Math.max(-d, 0)) / period;
    push();
  }
  return result;
}

function calcMACD(closes: number[]) {
  const fast = calcEMA(closes, 12), slow = calcEMA(closes, 26);
  const line = fast.map((f, i) => f - slow[i]);
  const signal = calcEMA(line, 9);
  return { line, signal, hist: line.map((ln, i) => ln - signal[i]) };
}

function calcBollinger(closes: number[], period = 20, mult = 2) {
  const mid = calcSMA(closes, period);
  return mid.map((m, i) => {
    if (m === null) return { mid: null, upper: null, lower: null };
    const sl = closes.slice(Math.max(0, i - period + 1), i + 1);
    const mean = sl.reduce((a, b) => a + b, 0) / sl.length;
    const std = Math.sqrt(sl.reduce((a, b) => a + (b - mean) ** 2, 0) / sl.length);
    return { mid: m, upper: m + mult * std, lower: m - mult * std };
  });
}

// ── Signals ───────────────────────────────────────────────────────────────────

interface Signal { label: string; value: string; verdict: 'bullish' | 'bearish' | 'neutral' }

function generateSignals(candles: OHLCV[]): { signals: Signal[]; score: number } {
  const closes = candles.map(c => c.cloture).filter((v): v is number => v !== null);
  if (closes.length < 30) return { signals: [], score: 0 };
  const signals: Signal[] = [];
  let score = 0;
  const add = (s: Signal) => { signals.push(s); if (s.verdict === 'bullish') score++; else if (s.verdict === 'bearish') score--; };

  const rsiArr = calcRSI(closes);
  const lastRsi = rsiArr.filter((v): v is number => v !== null).at(-1);
  if (lastRsi !== undefined) {
    add({ label: 'RSI (14)', value: `${lastRsi.toFixed(1)}`, verdict: lastRsi < 30 ? 'bullish' : lastRsi > 70 ? 'bearish' : 'neutral' });
  }
  const { hist } = calcMACD(closes);
  const h0 = hist.at(-1) ?? 0, h1 = hist.at(-2) ?? 0;
  add({ label: 'MACD', value: h0 > 0 ? 'Haussier' : 'Baissier', verdict: h0 > 0 && h1 <= 0 ? 'bullish' : h0 < 0 && h1 >= 0 ? 'bearish' : h0 > 0 ? 'bullish' : 'bearish' });

  const ma50v = calcSMA(closes, 50).at(-1) ?? null;
  const ma200v = calcSMA(closes, 200).at(-1) ?? null;
  const ma20v = calcSMA(closes, 20).at(-1) ?? null;
  const last = closes.at(-1) ?? 0;
  if (ma50v !== null) add({ label: 'Cours vs MA50', value: last > ma50v ? 'Au-dessus' : 'En-dessous', verdict: last > ma50v ? 'bullish' : 'bearish' });
  if (ma200v !== null) add({ label: 'Cours vs MA200', value: last > ma200v ? 'Au-dessus' : 'En-dessous', verdict: last > ma200v ? 'bullish' : 'bearish' });
  if (ma20v !== null && ma50v !== null) add({ label: 'MA20 vs MA50', value: ma20v > ma50v ? 'Golden Cross' : 'Death Cross', verdict: ma20v > ma50v ? 'bullish' : 'bearish' });

  const bb = calcBollinger(closes).at(-1);
  if (bb?.upper && bb?.lower) {
    const pos = (last - bb.lower) / (bb.upper - bb.lower);
    add({ label: 'Bollinger', value: pos > 0.85 ? 'Bande sup.' : pos < 0.15 ? 'Bande inf.' : 'Zone médiane', verdict: pos > 0.85 ? 'bearish' : pos < 0.15 ? 'bullish' : 'neutral' });
  }
  const vols = candles.map(c => c.volume ?? 0);
  const avgVol = vols.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const vr = avgVol > 0 ? (vols.at(-1) ?? 0) / avgVol : 1;
  add({ label: 'Volume', value: `${vr.toFixed(1)}× moy.`, verdict: vr > 1.5 ? 'bullish' : vr < 0.5 ? 'bearish' : 'neutral' });

  const h52 = Math.max(...candles.map(c => c.haut ?? c.cloture ?? 0));
  const l52 = Math.min(...candles.map(c => c.bas ?? c.cloture ?? 0));
  const p52 = (h52 - l52) > 0 ? ((last - l52) / (h52 - l52)) * 100 : 50;
  add({ label: 'Pos. 52 sem.', value: `${p52.toFixed(0)}%`, verdict: p52 > 85 ? 'bearish' : p52 < 15 ? 'bullish' : 'neutral' });
  return { signals, score };
}

// ── TradingView chart ─────────────────────────────────────────────────────────

function TradingViewChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    const containerId = `tv_${symbol}_${Date.now()}`;
    const inner = document.createElement('div');
    inner.id = containerId;
    inner.style.cssText = 'height:100%;width:100%';
    el.appendChild(inner);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createWidget = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const TV = (window as any).TradingView;
      if (!TV?.widget) return;
      new TV.widget({
        autosize: true,
        symbol: `CSEMA:${symbol}`,
        interval: 'D',
        timezone: 'Africa/Casablanca',
        theme: 'dark',
        style: '1',
        locale: 'fr',
        toolbar_bg: '#161b22',
        enable_publishing: false,
        save_image: false,
        hide_side_toolbar: false,
        container_id: containerId,
        studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).TradingView?.widget) {
      createWidget();
    } else {
      let script = document.getElementById('tv-script') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'tv-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', createWidget, { once: true });
    }

    return () => { if (el) el.innerHTML = ''; };
  }, [symbol]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

function heatColor(v: number | null) {
  if (v === null) return C.panel;
  if (v >= 3) return '#174717'; if (v >= 1) return '#1a5c1a'; if (v >= 0) return '#1c3520';
  if (v >= -1) return '#4a1515'; if (v >= -3) return '#6b1a1a'; return '#8b1515';
}

function Heatmap({ actions, onSelect }: { actions: Action[]; onSelect: (s: string) => void }) {
  const bySector: Record<string, Action[]> = {};
  for (const a of actions) (bySector[a.secteur || 'Autres'] ??= []).push(a);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {Object.entries(bySector).sort(([a], [b]) => a.localeCompare(b)).map(([sec, stocks]) => (
        <div key={sec} style={{ minWidth: 120 }}>
          <div style={{ fontSize: 9, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{sec}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {stocks.map(s => (
              <div key={s.symbol} onClick={() => onSelect(s.symbol)} title={`${s.emetteur}\n${s.variation?.toFixed(2) ?? '—'}%`}
                style={{ width: 50, height: 34, background: heatColor(s.variation), borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: `1px solid ${C.border}` }}>
                <span style={{ fontWeight: 700, fontSize: 8, color: C.text }}>{s.symbol}</span>
                <span style={{ fontSize: 8, color: (s.variation ?? 0) >= 0 ? C.green : C.red }}>
                  {s.variation !== null ? `${s.variation >= 0 ? '+' : ''}${s.variation.toFixed(1)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const SIG_PERIODS = [{ label: '1M', days: 22 }, { label: '3M', days: 65 }, { label: '6M', days: 130 }, { label: '1A', days: 260 }];

function fmt(v: number | null, d = 2) { return v === null ? '—' : v.toFixed(d); }

export default function AnalysePage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [sigPeriod, setSigPeriod] = useState(3);
  const [allCandles, setAllCandles] = useState<OHLCV[]>([]);
  const [tab, setTab] = useState<'watchlist' | 'screener' | 'alertes'>('watchlist');
  const [screenerVar, setScreenerVar] = useState<'all' | 'up' | 'down'>('all');
  const [screenerSector, setScreenerSector] = useState('');
  const [addTicker, setAddTicker] = useState('');

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [newAlertThreshold, setNewAlertThreshold] = useState('');
  const [newAlertCondition, setNewAlertCondition] = useState<'above' | 'below'>('above');
  const alertsRef = useRef<PriceAlert[]>([]);
  alertsRef.current = alerts;
  const actMapRef = useRef<Record<string, Action>>({});

  useEffect(() => {
    try { const s = localStorage.getItem('bvc-watchlist'); if (s) setWatchlist(JSON.parse(s)); } catch {}
    try { const s = localStorage.getItem('bvc-alerts'); if (s) setAlerts(JSON.parse(s)); } catch {}
  }, []);

  const loadActions = useCallback(() => {
    fetch('/api/bvc/actions').then(r => r.json()).then(d => {
      const loaded: Action[] = d.actions ?? [];
      setActions(loaded);
      try {
        if (!localStorage.getItem('bvc-watchlist') && loaded.length > 0) {
          setWatchlist(loaded.map(a => a.symbol));
          // Auto-sélectionne le premier ticker si rien n'est sélectionné
          setSelected(s => s || loaded[0]?.symbol || '');
        }
      } catch {}
    }).catch(() => {});
  }, []);
  useEffect(() => { loadActions(); const id = setInterval(loadActions, 60_000); return () => clearInterval(id); }, [loadActions]);

  const actMap: Record<string, Action> = {};
  for (const a of actions) actMap[a.symbol] = a;
  actMapRef.current = actMap;

  useEffect(() => {
    const ref = actMapRef.current[selected]?.reference;
    if (ref) setNewAlertThreshold(ref.toFixed(2));
  }, [selected, actions.length]);

  useEffect(() => {
    if (!actions.length) return;
    const current = alertsRef.current;
    if (!current.some(a => !a.triggered)) return;
    const map = actMapRef.current;
    let changed = false;
    const fired: ToastMsg[] = [];
    const updated = current.map(a => {
      if (a.triggered) return a;
      const price = map[a.symbol]?.dernierCours ?? map[a.symbol]?.reference ?? null;
      if (!price) return a;
      const hit = a.condition === 'above' ? price >= a.threshold : price <= a.threshold;
      if (!hit) return a;
      changed = true;
      fired.push({ id: `t-${Date.now()}-${a.id}`, symbol: a.symbol, condition: a.condition, threshold: a.threshold, price, expiry: Date.now() + 9000 });
      return { ...a, triggered: true, triggeredAt: new Date().toISOString() };
    });
    if (changed) {
      setAlerts(updated);
      try { localStorage.setItem('bvc-alerts', JSON.stringify(updated)); } catch {}
      setToasts(prev => [...prev, ...fired]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useEffect(() => {
    if (!toasts.length) return;
    const id = setInterval(() => setToasts(prev => prev.filter(t => t.expiry > Date.now())), 500);
    return () => clearInterval(id);
  }, [toasts.length]);

  const alertsSave = useCallback((list: PriceAlert[]) => {
    setAlerts(list);
    try { localStorage.setItem('bvc-alerts', JSON.stringify(list)); } catch {}
  }, []);

  const addAlert = useCallback(() => {
    const t = parseFloat(newAlertThreshold);
    if (isNaN(t) || t <= 0) return;
    alertsSave([...alertsRef.current, {
      id: Date.now().toString(), symbol: selected,
      condition: newAlertCondition, threshold: t,
      triggered: false, createdAt: new Date().toISOString(),
    }]);
  }, [newAlertThreshold, newAlertCondition, selected, alertsSave]);

  useEffect(() => {
    const toN = (v: unknown) => { const n = +(v as string); return isFinite(n) ? n : null; };
    fetch(`/api/bvc/historique/${selected}?jours=730`)
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(d => setAllCandles((d.data ?? []).map((c: any) => ({
        date_value:    String(c.date_value ?? ''),
        ouverture:     toN(c.ouverture),
        cloture:       toN(c.cloture),
        haut:          toN(c.haut),
        bas:           toN(c.bas),
        volume:        toN(c.volume),
        variation_pct: toN(c.variation_pct),
      }))))
      .catch(() => {});
  }, [selected]);

  const candles = allCandles.slice(-SIG_PERIODS[sigPeriod].days);
  const selAct = actMap[selected];

  const { signals, score } = candles.length > 30
    ? generateSignals(candles)
    : { signals: [] as Signal[], score: 0 };
  const totalSig = signals.length;
  const bullSig = signals.filter(s => s.verdict === 'bullish').length;
  const bearSig = signals.filter(s => s.verdict === 'bearish').length;
  const verdict = score >= 2 ? 'ACHETER' : score <= -2 ? 'VENDRE' : 'NEUTRE';
  const vColor = score >= 2 ? C.green : score <= -2 ? C.red : C.amber;

  const hausse = actions.filter(a => (a.variation ?? 0) > 0).length;
  const baisse = actions.filter(a => (a.variation ?? 0) < 0).length;
  const stable = actions.length - hausse - baisse;

  const sectors = [...new Set(actions.map(a => a.secteur).filter(Boolean))].sort();
  const filtered = actions
    .filter(a => {
      if (screenerVar === 'up' && (a.variation ?? 0) <= 0) return false;
      if (screenerVar === 'down' && (a.variation ?? 0) >= 0) return false;
      if (screenerSector && a.secteur !== screenerSector) return false;
      return true;
    })
    .sort((a, b) => Math.abs(b.variation ?? 0) - Math.abs(a.variation ?? 0));

  const topH = [...actions].sort((a, b) => (b.variation ?? 0) - (a.variation ?? 0)).slice(0, 5);
  const topB = [...actions].sort((a, b) => (a.variation ?? 0) - (b.variation ?? 0)).slice(0, 5);

  const wlSave = (list: string[]) => {
    setWatchlist(list);
    try { localStorage.setItem('bvc-watchlist', JSON.stringify(list)); } catch {}
  };

  const selectTicker = (sym: string) => {
    setSelected(sym);
    if (!watchlist.includes(sym)) wlSave([sym, ...watchlist]);
  };

  const btnStyle = (active: boolean, color: string) => ({
    background: active ? color + '28' : 'none',
    border: `1px solid ${active ? color : C.border}`,
    borderRadius: 4, padding: '2px 8px',
    color: active ? color : C.muted, fontSize: 10, cursor: 'pointer' as const,
  });

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: 'monospace', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <polyline points="3,28 11,14 16,7 21,14 29,28" stroke="#C49A2E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
            <circle cx="16" cy="7" r="2.5" fill="#E4BA4A"/>
          </svg>
          <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: 13, color: C.text, letterSpacing: '0.12em' }}>Z<span style={{ color: '#C49A2E' }}>É</span>NITH</span>
          <span style={{ fontSize: 9, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', paddingLeft: 2 }}>Analyse</span>
        </div>
        <div style={{ width: 1, height: 16, background: C.border }} />
        <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
          <span style={{ color: C.green }}>▲ {hausse}</span>
          <span style={{ color: C.muted }}>— {stable}</span>
          <span style={{ color: C.red }}>▼ {baisse}</span>
          <span style={{ color: C.muted, marginLeft: 6 }}>{actions.length} titres</span>
        </div>
        <div style={{ flex: 1 }} />
        <Link href="/live" style={{ fontSize: 11, color: C.muted, textDecoration: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 10px' }}>← Live</Link>
        <Link href="/actualites" style={{ fontSize: 11, color: C.orange, textDecoration: 'none', border: `1px solid ${C.orange}`, borderRadius: 6, padding: '3px 10px' }}>Actualités →</Link>
        <Link href="/screener-oblig" style={{ fontSize: 11, color: C.purple, textDecoration: 'none', border: `1px solid ${C.purple}`, borderRadius: 6, padding: '3px 10px' }}>YTM →</Link>
        <Link href="/portefeuille" style={{ fontSize: 11, color: C.teal, textDecoration: 'none', border: `1px solid ${C.teal}`, borderRadius: 6, padding: '3px 10px' }}>Portefeuille →</Link>
      </header>

      {/* ── Main 3-column ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left panel ── */}
        <div style={{ width: 230, minWidth: 230, background: C.card, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {(['watchlist', 'screener', 'alertes'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '7px 0', fontSize: 8, fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', color: tab === t ? C.teal : C.muted, borderBottom: `2px solid ${tab === t ? C.teal : 'transparent'}`, textTransform: 'uppercase', letterSpacing: 0.8, position: 'relative' }}>
                {t}
                {t === 'alertes' && alerts.filter(a => a.triggered).length > 0 && (
                  <span style={{ position: 'absolute', top: 3, right: 4, background: C.red, color: '#fff', borderRadius: 8, padding: '0 4px', fontSize: 7, fontWeight: 700 }}>
                    {alerts.filter(a => a.triggered).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === 'watchlist' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              <form onSubmit={e => { e.preventDefault(); const t = addTicker.trim().toUpperCase(); if (t && !watchlist.includes(t)) wlSave([t, ...watchlist]); setAddTicker(''); }} style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                <input value={addTicker} onChange={e => setAddTicker(e.target.value)} placeholder="Ticker..."
                  style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 6px', color: C.text, fontSize: 11, outline: 'none' }} />
                <button type="submit" style={{ background: C.teal, border: 'none', borderRadius: 4, padding: '0 10px', color: '#000', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>+</button>
              </form>
              <button onClick={() => { try { localStorage.removeItem('bvc-watchlist'); } catch {} wlSave(actions.map(a => a.symbol)); }}
                style={{ width: '100%', background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, padding: '3px 0', color: C.muted, fontSize: 9, cursor: 'pointer', marginBottom: 8, letterSpacing: 0.5 }}>
                Tous les titres ({actions.length})
              </button>
              {watchlist.map(sym => {
                const a = actMap[sym]; const v = a?.variation ?? null;
                return (
                  <div key={sym} onClick={() => setSelected(sym)} style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', borderRadius: 4, cursor: 'pointer', background: selected === sym ? C.panel : 'transparent', marginBottom: 2, gap: 4 }}>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 11 }}>{sym}</span>
                    <span style={{ fontSize: 10, color: C.muted }}>{fmt(a?.reference ?? null)}</span>
                    <span style={{ fontSize: 10, width: 52, textAlign: 'right', color: (v ?? 0) >= 0 ? C.green : C.red }}>
                      {v !== null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—'}
                    </span>
                    <a href={`https://fr.tradingview.com/symbols/CSEMA-${sym}/`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Voir sur TradingView" style={{ color: C.muted, fontSize: 10, padding: '0 0 0 2px', lineHeight: 1, textDecoration: 'none' }}>↗</a>
                    <button onClick={e => { e.stopPropagation(); wlSave(watchlist.filter(x => x !== sym)); }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, padding: '0 0 0 4px', lineHeight: 1 }}>×</button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'screener' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              <select value={screenerVar} onChange={e => setScreenerVar(e.target.value as 'all' | 'up' | 'down')}
                style={{ width: '100%', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 6px', color: C.text, fontSize: 11, marginBottom: 4, outline: 'none' }}>
                <option value="all">Tous les titres</option>
                <option value="up">Hausse uniquement</option>
                <option value="down">Baisse uniquement</option>
              </select>
              <select value={screenerSector} onChange={e => setScreenerSector(e.target.value)}
                style={{ width: '100%', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 6px', color: C.text, fontSize: 11, marginBottom: 8, outline: 'none' }}>
                <option value="">Tous secteurs</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>{filtered.length} résultats</div>
              {filtered.slice(0, 40).map(a => (
                <div key={a.symbol} onClick={() => selectTicker(a.symbol)}
                  style={{ display: 'flex', padding: '4px 8px', cursor: 'pointer', borderRadius: 4, background: selected === a.symbol ? C.panel : 'transparent', marginBottom: 1, gap: 4, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 10, width: 44 }}>{a.symbol}</span>
                  <span style={{ flex: 1, fontSize: 8, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.secteur}</span>
                  <span style={{ fontSize: 10, color: (a.variation ?? 0) >= 0 ? C.green : C.red, width: 44, textAlign: 'right' }}>
                    {a.variation !== null ? `${a.variation >= 0 ? '+' : ''}${a.variation.toFixed(1)}%` : '—'}
                  </span>
                  <a href={`https://fr.tradingview.com/symbols/CSEMA-${a.symbol}/`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Voir sur TradingView" style={{ color: C.muted, fontSize: 10, textDecoration: 'none', lineHeight: 1 }}>↗</a>
                </div>
              ))}
            </div>
          )}

          {tab === 'alertes' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {/* Signal compact */}
              <div style={{ background: C.panel, borderRadius: 6, padding: '8px 10px', marginBottom: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.8 }}>{selected} — signal</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: vColor }}>{verdict}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4, fontSize: 9 }}>
                  <span style={{ color: C.green }}>▲ {bullSig}</span>
                  <span style={{ color: C.muted }}>— {totalSig - bullSig - bearSig}</span>
                  <span style={{ color: C.red }}>▼ {bearSig}</span>
                </div>
                <div style={{ marginTop: 5, background: C.border, borderRadius: 4, height: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(5, totalSig > 0 ? ((score + totalSig) / (totalSig * 2)) * 100 : 50)}%`, background: vColor, borderRadius: 4 }} />
                </div>
                <div style={{ marginTop: 6 }}>
                  {signals.length === 0
                    ? <div style={{ fontSize: 9, color: C.muted }}>Données insuffisantes</div>
                    : signals.map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 9, color: C.muted }}>{s.label}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, color: s.verdict === 'bullish' ? C.green : s.verdict === 'bearish' ? C.red : C.amber }}>{s.value}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Alerte form */}
              <div style={{ background: C.panel, borderRadius: 6, padding: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: C.text }}>{selected}</span> — nouvelle alerte
                </div>
                <input type="number" step="0.01" value={newAlertThreshold} onChange={e => setNewAlertThreshold(e.target.value)}
                  style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 6px', color: C.text, fontSize: 11, outline: 'none', marginBottom: 5 }} />
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  <button onClick={() => setNewAlertCondition('above')} style={{ flex: 1, background: newAlertCondition === 'above' ? C.green + '25' : 'none', border: `1px solid ${newAlertCondition === 'above' ? C.green : C.border}`, borderRadius: 4, padding: '3px 0', color: newAlertCondition === 'above' ? C.green : C.muted, fontSize: 10, cursor: 'pointer' }}>↑ Au-dessus</button>
                  <button onClick={() => setNewAlertCondition('below')} style={{ flex: 1, background: newAlertCondition === 'below' ? C.red + '25' : 'none', border: `1px solid ${newAlertCondition === 'below' ? C.red : C.border}`, borderRadius: 4, padding: '3px 0', color: newAlertCondition === 'below' ? C.red : C.muted, fontSize: 10, cursor: 'pointer' }}>↓ En-dessous</button>
                </div>
                <button onClick={addAlert} style={{ width: '100%', background: C.teal + '22', border: `1px solid ${C.teal}`, borderRadius: 4, padding: '5px 0', color: C.teal, fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>+ Créer alerte</button>
              </div>

              {alerts.length === 0 && <div style={{ fontSize: 9, color: C.muted }}>Aucune alerte configurée</div>}
              {alerts.filter(a => !a.triggered).map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, padding: '4px 6px', background: C.panel, borderRadius: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ flex: 1, fontSize: 10 }}>
                    <span style={{ fontWeight: 700 }}>{a.symbol}</span>
                    <span style={{ color: a.condition === 'above' ? C.green : C.red }}> {a.condition === 'above' ? '↑' : '↓'} </span>
                    <span>{a.threshold.toFixed(2)}</span>
                  </span>
                  <button onClick={() => alertsSave(alerts.filter(x => x.id !== a.id))} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: 0 }}>×</button>
                </div>
              ))}
              {alerts.filter(a => a.triggered).map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, padding: '4px 6px', background: C.panel, borderRadius: 4, borderLeft: `2px solid ${a.condition === 'above' ? C.green : C.red}` }}>
                  <span style={{ flex: 1, fontSize: 10 }}>
                    <span style={{ fontWeight: 700 }}>{a.symbol}</span>
                    <span style={{ color: a.condition === 'above' ? C.green : C.red }}> {a.condition === 'above' ? '↑' : '↓'} </span>
                    <span>{a.threshold.toFixed(2)}</span>
                  </span>
                  <button onClick={() => alertsSave(alerts.map(x => x.id === a.id ? { ...x, triggered: false, triggeredAt: undefined } : x))} title="Réactiver" style={{ background: 'none', border: 'none', color: C.amber, cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>↺</button>
                  <button onClick={() => alertsSave(alerts.filter(x => x.id !== a.id))} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Center: TradingView chart + Heatmap ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Ticker info + signal verdict */}
          <div style={{ padding: '5px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: C.card, flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{selected}</span>
            {selAct && <>
              <span style={{ fontSize: 12, color: C.teal }}>{fmt(selAct.reference)}</span>
              <span style={{ fontSize: 11, color: (selAct.variation ?? 0) >= 0 ? C.green : C.red, fontWeight: 600 }}>
                {selAct.variation !== null ? `${selAct.variation >= 0 ? '+' : ''}${selAct.variation.toFixed(2)}%` : ''}
              </span>
              <span style={{ fontSize: 10, color: C.muted }}>O:{fmt(selAct.ouverture)} H:{fmt(selAct.plusHaut)} L:{fmt(selAct.plusBas)}</span>
            </>}
            <div style={{ flex: 1 }} />
            {totalSig > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.panel, borderRadius: 6, padding: '3px 10px', border: `1px solid ${vColor}40` }}>
                <span style={{ fontSize: 9, color: C.muted }}>Signal :</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: vColor }}>{verdict}</span>
                <span style={{ fontSize: 9, color: C.green }}>▲{bullSig}</span>
                <span style={{ fontSize: 9, color: C.red }}>▼{bearSig}</span>
              </div>
            )}
          </div>

          {/* TradingView chart */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <TradingViewChart symbol={selected} />
          </div>

        </div>

      </div>

      {/* ── Toast notifications ── */}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999, pointerEvents: 'none' }}>
          {toasts.map(t => (
            <div key={t.id} style={{ background: C.card, border: `1px solid ${t.condition === 'above' ? C.green : C.red}`, borderRadius: 8, padding: '10px 14px', minWidth: 230, boxShadow: '0 6px 24px rgba(0,0,0,0.5)', pointerEvents: 'all', position: 'relative' }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>Alerte déclenchée</div>
              <div style={{ fontSize: 11 }}>
                <span style={{ fontWeight: 700 }}>{t.symbol}</span>
                <span style={{ color: t.condition === 'above' ? C.green : C.red }}> {t.condition === 'above' ? '↑ au-dessus de' : '↓ en-dessous de'} </span>
                <span style={{ fontWeight: 700 }}>{t.threshold.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Cours actuel : {t.price.toFixed(2)}</div>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
