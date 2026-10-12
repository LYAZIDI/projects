'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawBond {
  symbol: string; emetteur: string; secteur: string;
  type: string; quotationMode: string; statut: string;
  ouverture: number | null; plusHaut: number | null; plusBas: number | null;
  dernierCours: number | null; reference: number | null; variation: number | null;
  volume: number | null; quantite: number | null; nbTransactions: number;
  achat: { prix: number | null }; vente: { prix: number | null };
}

interface Bond extends RawBond {
  // User-entered maturity & coupon for YTM calculation
  coupon:     number | null;  // taux facial %
  maturite:   string;         // YYYY-MM-DD
  ytm:        number | null;  // rendement actuariel calculé
  duration:   number | null;  // duration modifiée
  spread:     number | null;  // spread vs taux BkAM (6.5% ref)
  prixTheo:   number | null;  // prix théorique au taux du marché
}

// ── Colors ────────────────────────────────────────────────────────────────────

const C = {
  bg: '#0d1117', card: '#161b22', panel: '#1c2128', border: '#21262d',
  text: '#e6edf3', muted: '#8b949e', green: '#3fb950', red: '#f85149',
  blue: '#1f6feb', teal: '#26a6a0', amber: '#d29922', orange: '#f0883e', purple: '#a371f7',
};

// ── YTM calculation (Newton-Raphson) ─────────────────────────────────────────

function calcYTM(price: number, couponRate: number, maturityDate: string, frequency = 2): number | null {
  try {
    const today    = new Date();
    const maturity = new Date(maturityDate);
    const yearsLeft = (maturity.getTime() - today.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (yearsLeft <= 0) return null;

    const periodsLeft = Math.round(yearsLeft * frequency);
    if (periodsLeft <= 0) return null;

    const coupon = (couponRate / 100) / frequency * 100; // per period, face=100
    const face   = 100;
    const px     = price;

    // Newton-Raphson to solve: price = sum(coupon/(1+r)^t) + face/(1+r)^n
    let r = couponRate / 100 / frequency; // initial guess
    for (let iter = 0; iter < 200; iter++) {
      let pv = 0, dpv = 0;
      for (let t = 1; t <= periodsLeft; t++) {
        const disc = Math.pow(1 + r, t);
        pv  += coupon / disc;
        dpv -= t * coupon / (disc * (1 + r));
      }
      const lastDisc = Math.pow(1 + r, periodsLeft);
      pv  += face / lastDisc;
      dpv -= periodsLeft * face / (lastDisc * (1 + r));

      const diff = pv - px;
      if (Math.abs(diff) < 1e-8) break;
      r -= diff / dpv;
      if (r < -0.99 || r > 10) return null;
    }
    return r * frequency * 100; // annualized %
  } catch {
    return null;
  }
}

function calcDuration(ytm: number, couponRate: number, maturityDate: string, frequency = 2): number | null {
  try {
    const today    = new Date();
    const maturity = new Date(maturityDate);
    const yearsLeft = (maturity.getTime() - today.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (yearsLeft <= 0) return null;
    const periodsLeft = Math.round(yearsLeft * frequency);
    const r      = (ytm / 100) / frequency;
    const coupon = (couponRate / 100) / frequency * 100;
    const face   = 100;
    let sumWeighted = 0, price = 0;
    for (let t = 1; t <= periodsLeft; t++) {
      const disc = Math.pow(1 + r, t);
      const cf   = t === periodsLeft ? coupon + face : coupon;
      sumWeighted += (t / frequency) * cf / disc;
      price       += cf / disc;
    }
    if (price === 0) return null;
    const macaulay = sumWeighted / price;
    return macaulay / (1 + r * frequency); // modified duration
  } catch {
    return null;
  }
}

// Reference curve BkAM (approximate, aug 2026)
const BKAM_CURVE: { maturity: number; rate: number }[] = [
  { maturity: 0.25, rate: 2.90 },
  { maturity: 0.5,  rate: 3.10 },
  { maturity: 1,    rate: 3.25 },
  { maturity: 2,    rate: 3.65 },
  { maturity: 3,    rate: 3.90 },
  { maturity: 5,    rate: 4.20 },
  { maturity: 7,    rate: 4.50 },
  { maturity: 10,   rate: 4.75 },
  { maturity: 15,   rate: 5.00 },
  { maturity: 20,   rate: 5.20 },
];

function interpolateBkam(yearsLeft: number): number {
  if (yearsLeft <= BKAM_CURVE[0].maturity) return BKAM_CURVE[0].rate;
  for (let i = 1; i < BKAM_CURVE.length; i++) {
    if (yearsLeft <= BKAM_CURVE[i].maturity) {
      const t  = (yearsLeft - BKAM_CURVE[i-1].maturity) / (BKAM_CURVE[i].maturity - BKAM_CURVE[i-1].maturity);
      return BKAM_CURVE[i-1].rate + t * (BKAM_CURVE[i].rate - BKAM_CURVE[i-1].rate);
    }
  }
  return BKAM_CURVE[BKAM_CURVE.length - 1].rate;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n: number | null, dec = 2) {
  if (n == null) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtPct(n: number | null) {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(3)}%`;
}
function fmtBps(n: number | null) {
  if (n == null) return '—';
  const bps = Math.round(n * 100);
  return `${bps >= 0 ? '+' : ''}${bps} bps`;
}

// ── KNOWN_BONDS: static reference data (coupon, maturite, cours de référence BVC)
// Cours ref au 06/08/2026 — source BVC. Override possible par l'utilisateur.

const KNOWN_BONDS: Record<string, { coupon: number; maturite: string; reference?: number; emetteur?: string; type?: string }> = {
  'OCAMF': { coupon: 3.07, maturite: '2027-10-04', reference: 100.18, emetteur: 'CREDIT AGRICOLE DU MAROC', type: 'A TAUX FIXE' },
  'OCAMG': { coupon: 4.26, maturite: '2029-04-10', reference: 101.90, emetteur: 'CREDIT AGRICOLE DU MAROC', type: 'A TAUX FIXE' },
  'OCAMJ': { coupon: 3.48, maturite: '2028-06-18', reference: 101.22, emetteur: 'CREDIT AGRICOLE DU MAROC', type: 'A TAUX FIXE' },
  'OCDMC': { coupon: 3.50, maturite: '2027-03-08', reference: 100.29, emetteur: 'CREDIT DU MAROC',          type: 'A TAUX FIXE' },
  'OCDMD': { coupon: 4.07, maturite: '2029-05-07', reference: 102.08, emetteur: 'CREDIT DU MAROC',          type: 'A TAUX FIXE' },
  'OCFGC': { coupon: 3.50, maturite: '2026-12-19', reference:  99.91, emetteur: 'CFG BANK',                 type: 'A TAUX FIXE' },
  'OCIHC': { coupon: 3.80, maturite: '2028-02-08', reference: 101.50, emetteur: 'CREDIT IMMOBILIER ET HOTELIER', type: 'A TAUX FIXE' },
  'OFECA': { coupon: 3.30, maturite: '2027-09-22', reference: 100.86, emetteur: "FONDS D'EQUIPEMENT COMMUNAL", type: 'A TAUX FIXE' },
  'OOCFC': { coupon: 3.30, maturite: '2028-07-07', reference: 100.26, emetteur: 'OFFICE NATIONAL DES CHEMINS DE FER', type: 'A TAUX FIXE' },
  'OOCPB': { coupon: 3.45, maturite: '2030-01-10', reference: 100.31, emetteur: 'OCP SA',                   type: 'A TAUX REVISABLE' },
  'OCFCB': { coupon: 3.20, maturite: '2027-06-15', reference: 100.10, emetteur: 'CFC BANK',                 type: 'A TAUX FIXE' },
  'OCPOA': { coupon: 3.60, maturite: '2029-09-01', reference: 101.10, emetteur: 'OCP SA',                   type: 'A TAUX FIXE' },
};


// ── Main Component ────────────────────────────────────────────────────────────

type SortKey = 'symbol' | 'reference' | 'ytm' | 'spread' | 'duration' | 'variation' | 'volume';

export default function ScreenerObligPage() {
  const [rawBonds,  setRawBonds]  = useState<RawBond[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { coupon?: string; maturite?: string }>>({});
  const [loading,   setLoading]   = useState(true);
  const [sortKey,   setSortKey]   = useState<SortKey>('ytm');
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('asc');
  const [editing,   setEditing]   = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/bvc/obligations')
      .then(r => r.json())
      .then(d => {
        const bonds: RawBond[] = d.bonds ?? [];
        setRawBonds(bonds);
        setLoading(false);
      })
      .catch(() => { setRawBonds([]); setLoading(false); });
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 60_000); return () => clearInterval(id); }, [load]);

  // Enrich with YTM
  const bonds: Bond[] = rawBonds.map(b => {
    const sym      = b.symbol.trim();
    const known    = KNOWN_BONDS[sym];
    const ov       = overrides[sym];
    const parsedCoupon = parseFloat(ov?.coupon ?? '');
    const coupon   = (!isNaN(parsedCoupon) && parsedCoupon > 0) ? parsedCoupon : (known?.coupon ?? null);
    const maturite = ov?.maturite ?? known?.maturite ?? '';
    const price    = b.reference ?? null;

    let ytm: number | null = null;
    let duration: number | null = null;
    let spread: number | null = null;

    if (price && coupon && maturite) {
      ytm = calcYTM(price, coupon, maturite);
      if (ytm != null) {
        duration = calcDuration(ytm, coupon, maturite);
        const today    = new Date();
        const maturity = new Date(maturite);
        const yearsLeft = (maturity.getTime() - today.getTime()) / (365.25 * 24 * 3600 * 1000);
        const bkam     = interpolateBkam(yearsLeft);
        spread         = ytm - bkam;
      }
    }

    return { ...b, coupon, maturite, ytm, duration, spread, prixTheo: null };
  });

  const sorted = [...bonds].sort((a, b) => {
    const numericKeys: SortKey[] = ['reference', 'ytm', 'spread', 'duration', 'variation', 'volume'];
    if (numericKeys.includes(sortKey)) {
      const va = (a[sortKey] as number | null) ?? (sortDir === 'asc' ? Infinity : -Infinity);
      const vb = (b[sortKey] as number | null) ?? (sortDir === 'asc' ? Infinity : -Infinity);
      return sortDir === 'asc' ? va - vb : vb - va;
    }
    const va = String(a[sortKey] ?? '');
    const vb = String(b[sortKey] ?? '');
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortI({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span style={{ color: C.muted, marginLeft: 3, fontSize: 10 }}>↕</span>;
    return <span style={{ color: C.blue, marginLeft: 3, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  function setOverride(sym: string, field: 'coupon' | 'maturite', val: string) {
    setOverrides(prev => ({ ...prev, [sym]: { ...prev[sym], [field]: val } }));
  }

  const withYtm = bonds.filter(b => b.ytm != null);
  const avgYtm  = withYtm.length > 0 ? withYtm.reduce((s, b) => s + (b.ytm ?? 0), 0) / withYtm.length : null;
  const avgSpread = withYtm.filter(b => b.spread != null).reduce((s, b) => s + (b.spread ?? 0), 0) / (withYtm.filter(b => b.spread != null).length || 1);

  const th: React.CSSProperties = { padding: '10px 12px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', userSelect: 'none', textAlign: 'right' };
  const td: React.CSSProperties = { padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13 };

  return (
    <>
      <style>{`
        input[type=text], input[type=date] { background: #1c2128; border: 1px solid #30363d; border-radius: 4px; color: #e6edf3; padding: 3px 7px; font-size: 12px; outline: none; width: 100%; }
        input[type=text]:focus, input[type=date]:focus { border-color: #1f6feb; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #161b22; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <header style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/live" style={{ color: C.muted, textDecoration: 'none', fontSize: 20 }}>←</Link>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#fff' }}>%</div>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Screener Obligations — YTM & Spread</span>
      </header>

      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 4px 0' }}>Screener Obligations</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 6px 0' }}>Rendement actuariel (YTM), duration modifiée et spread vs courbe BkAM — données BVC live</p>
        <p style={{ fontSize: 12, color: C.amber, margin: '0 0 24px 0' }}>
          ⚠ Cliquer sur une ligne pour ajuster taux facial et maturité — les données pré-remplies sont indicatives.
        </p>

        {/* Summary cards */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Obligations suivies',  value: `${bonds.length}`, color: C.blue },
              { label: 'YTM calculés',         value: `${withYtm.length} / ${bonds.length}`, color: C.teal },
              { label: 'YTM moyen',            value: avgYtm != null ? `${avgYtm.toFixed(3)}%` : '—', color: C.green },
              { label: 'Spread moyen vs BkAM', value: withYtm.length > 0 ? fmtBps(avgSpread) : '—', color: C.orange },
            ].map(c => (
              <div key={c.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 5 }}>{c.label}</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* BkAM curve reference */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            Courbe des taux BkAM (référence — août 2026)
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {BKAM_CURVE.filter(p => [0.25, 1, 2, 3, 5, 7, 10, 15].includes(p.maturity)).map(p => (
              <div key={p.maturity} style={{ textAlign: 'center', minWidth: 52 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{p.maturity >= 1 ? `${p.maturity}A` : `${p.maturity * 12}M`}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.teal }}>{p.rate.toFixed(2)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main table */}
        <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.panel }}>
                <th onClick={() => toggleSort('symbol')}    style={{ ...th, textAlign: 'left' }}>INSTRUMENT <SortI col="symbol" /></th>
                <th style={{ ...th, textAlign: 'left' }}>ÉMETTEUR</th>
                <th onClick={() => toggleSort('reference')} style={{ ...th, color: C.teal }}>C.RÉF <SortI col="reference" /></th>
                <th style={{ ...th, color: C.muted }}>TAUX FACIAL</th>
                <th style={{ ...th, color: C.muted }}>MATURITÉ</th>
                <th onClick={() => toggleSort('ytm')}      style={{ ...th, color: C.green }}>YTM <SortI col="ytm" /></th>
                <th onClick={() => toggleSort('spread')}   style={{ ...th, color: C.orange }}>SPREAD <SortI col="spread" /></th>
                <th onClick={() => toggleSort('duration')} style={{ ...th, color: C.purple }}>DURATION MOD. <SortI col="duration" /></th>
                <th onClick={() => toggleSort('variation')} style={th}>VAR% SÉANCE <SortI col="variation" /></th>
                <th onClick={() => toggleSort('volume')}   style={th}>VOLUME <SortI col="volume" /></th>
                <th style={{ ...th, textAlign: 'center' }}>STATUT</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: C.muted }}>Chargement...</td></tr>
              )}
              {!loading && sorted.map(b => {
                const sym    = b.symbol.trim();
                const ov     = overrides[sym] ?? {};
                const isEdit = editing === sym;
                const isPos  = (b.variation ?? 0) >= 0;
                const spreadColor = b.spread == null ? C.muted : b.spread > 1 ? C.red : b.spread > 0.5 ? C.amber : C.green;
                const STATUT_COLORS: Record<string, string> = { T: C.green, NT: C.amber, S: C.red };
                return (
                  <tr key={sym} style={{ borderBottom: `1px solid ${C.border}`, background: isEdit ? 'rgba(31,111,235,0.04)' : undefined, cursor: 'pointer' }}
                      onClick={() => setEditing(isEdit ? null : sym)}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, color: C.blue, fontSize: 13 }}>{sym}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: C.text }}>{b.emetteur}</td>
                    <td style={{ ...td, fontWeight: 700, color: C.teal }}>{fmt(b.reference)}</td>
                    {/* Editable coupon */}
                    <td style={{ ...td }} onClick={e => e.stopPropagation()}>
                      {isEdit ? (
                        <input type="text" value={ov.coupon ?? String(b.coupon ?? '')} placeholder="ex: 3.50"
                          onChange={e => setOverride(sym, 'coupon', e.target.value)}
                          style={{ width: 70, textAlign: 'right' }} />
                      ) : (
                        <span style={{ color: b.coupon ? C.text : C.red }}>
                          {b.coupon ? `${b.coupon.toFixed(2)}%` : '✏ à saisir'}
                        </span>
                      )}
                    </td>
                    {/* Editable maturite */}
                    <td style={{ ...td }} onClick={e => e.stopPropagation()}>
                      {isEdit ? (
                        <input type="date" value={ov.maturite ?? b.maturite}
                          onChange={e => setOverride(sym, 'maturite', e.target.value)} />
                      ) : (
                        <span style={{ color: b.maturite ? C.text : C.red, fontSize: 12 }}>
                          {b.maturite ? new Date(b.maturite).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '✏ à saisir'}
                        </span>
                      )}
                    </td>
                    {/* YTM */}
                    <td style={{ ...td, fontWeight: 800, color: b.ytm != null ? C.green : C.red }}>
                      {b.ytm != null ? `${b.ytm.toFixed(3)}%` : b.coupon && b.maturite ? 'Erreur' : '—'}
                    </td>
                    {/* Spread */}
                    <td style={{ ...td, fontWeight: 700, color: spreadColor }}>
                      {b.spread != null ? fmtBps(b.spread) : '—'}
                    </td>
                    {/* Duration */}
                    <td style={{ ...td, color: C.purple }}>
                      {b.duration != null ? `${b.duration.toFixed(2)} ans` : '—'}
                    </td>
                    {/* Var séance */}
                    <td style={{ ...td, color: b.variation == null ? C.muted : isPos ? C.green : C.red, fontWeight: 700 }}>
                      {b.variation != null ? `${isPos ? '+' : ''}${b.variation.toFixed(2)}%` : '—'}
                    </td>
                    {/* Volume */}
                    <td style={{ ...td, color: C.muted }}>
                      {b.volume != null ? b.volume.toLocaleString('fr-FR') : '—'}
                    </td>
                    {/* Statut */}
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: STATUT_COLORS[b.statut] ?? C.muted }}>{b.statut || 'NT'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: C.muted }}>
          YTM calculé par la méthode actuarielle (Newton-Raphson) · Fréquence annuelle · Face value 100 MAD · Spread vs courbe BkAM interpolée linéairement · Duration = Duration de Macaulay modifiée
        </div>
      </div>
    </>
  );
}
