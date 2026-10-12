'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveAction {
  symbol: string; emetteur: string; secteur: string; compartiment: string;
  statut: string; reference: number | null; dernierCours: number | null;
  variation: number | null; volume: number | null; quantite: number | null;
  nbTransactions: number; capitalisation: number | null;
  achat: { prix: number | null; quantite: number | null };
  vente: { prix: number | null; quantite: number | null };
}

interface LiveObligation {
  symbol: string; emetteur: string; type: string;
  statut: string; reference: number | null; dernierCours: number | null;
  variation: number | null; volume: number | null; quotationMode: string;
}

interface LiveIndex {
  code: string; label: string; value: number | null;
  change_pct: number | null; change_ytd: number | null;
}

interface LiveData {
  session: { status?: string };
  cashVolume: number | null;
  futuresVolume: number | null;
  indices: LiveIndex[];
}

// ── Colors ────────────────────────────────────────────────────────────────────

const C = {
  bg:     '#0d1117',
  card:   '#161b22',
  panel:  '#1c2128',
  border: '#21262d',
  text:   '#e6edf3',
  muted:  '#8b949e',
  green:  '#3fb950',
  red:    '#f85149',
  blue:   '#1f6feb',
  teal:   '#26a6a0',
  amber:  '#d29922',
  purple: '#a371f7',
  orange: '#f0883e',
};

const INDEX_COLORS: Record<string, string> = {
  MASI: C.blue, MSI20: C.purple, ESGI: C.teal, MASIMS: C.amber,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null, dec = 2) {
  if (n == null) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtPct(n: number | null, sign = true) {
  if (n == null) return '—';
  return `${sign && n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}
function fmtMillions(n: number | null) {
  if (n == null) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} Mrd MAD`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)} M MAD`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)} K MAD`;
  return `${n.toFixed(0)} MAD`;
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function RapportPage() {
  const [liveData,  setLiveData]  = useState<LiveData | null>(null);
  const [actions,   setActions]   = useState<LiveAction[]>([]);
  const [bonds,     setBonds]     = useState<LiveObligation[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [generated, setGenerated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const [ld, la, lb] = await Promise.all([
      fetch('/api/bvc/live').then(r => r.json()),
      fetch('/api/bvc/actions').then(r => r.json()),
      fetch('/api/bvc/obligations').then(r => r.json()),
    ]);
    setLiveData(ld);
    setActions(la.actions ?? []);
    setBonds(lb.bonds ?? []);
    setGenerated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ color: C.muted, fontSize: 14 }}>Génération du rapport...</div>
      </div>
    );
  }

  // ── Computed stats ──────────────────────────────────────────────────────────

  const withVar    = actions.filter(a => a.variation != null);
  const hausse     = withVar.filter(a => (a.variation ?? 0) > 0);
  const baisse     = withVar.filter(a => (a.variation ?? 0) < 0);
  const stable     = withVar.filter(a => a.variation === 0);
  const suspended  = actions.filter(a => a.statut === 'S');

  const top5Hausse = [...hausse].sort((a, b) => (b.variation ?? 0) - (a.variation ?? 0)).slice(0, 5);
  const top5Baisse = [...baisse].sort((a, b) => (a.variation ?? 0) - (b.variation ?? 0)).slice(0, 5);
  const top5Volume = [...actions].filter(a => a.volume != null).sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 5);

  const totalVolAct = actions.reduce((s, a) => s + (a.volume ?? 0), 0);
  const volHausse   = hausse.reduce((s, a) => s + (a.volume ?? 0), 0);
  const volBaisse   = baisse.reduce((s, a) => s + (a.volume ?? 0), 0);
  const breadthPct  = withVar.length > 0 ? (hausse.length / withVar.length) * 100 : null;

  const indices = (liveData?.indices ?? []).filter(i => ['MASI','MSI20','ESGI','MASIMS'].includes(i.code));
  const masi    = indices.find(i => i.code === 'MASI');

  // ── Sector breakdown ────────────────────────────────────────────────────────
  const sectorMap = new Map<string, { vol: number; hausse: number; baisse: number }>();
  for (const a of actions) {
    if (!a.secteur) continue;
    const cur = sectorMap.get(a.secteur) ?? { vol: 0, hausse: 0, baisse: 0 };
    cur.vol    += a.volume ?? 0;
    if ((a.variation ?? 0) > 0) cur.hausse++;
    if ((a.variation ?? 0) < 0) cur.baisse++;
    sectorMap.set(a.secteur, cur);
  }
  const topSectors = [...sectorMap.entries()]
    .filter(([, v]) => v.vol > 0)
    .sort((a, b) => b[1].vol - a[1].vol)
    .slice(0, 5);

  const sessionOpen  = liveData?.session?.status === 'open';
  const sessionLabel = sessionOpen ? 'Séance ouverte' : 'Séance clôturée';
  const reportTitle  = sessionOpen ? 'Rapport de séance en cours' : 'Rapport de clôture';

  // ── Styles ──────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px', marginBottom: 16 };
  const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 };
  const th: React.CSSProperties = { padding: '9px 12px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}`, textAlign: 'right' };
  const td: React.CSSProperties = { padding: '9px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13 };

  return (
    <>
      <style>{`
        @media print {
          header, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-page { color: black !important; }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #161b22; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <header className="no-print" style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/live" style={{ color: C.muted, textDecoration: 'none', fontSize: 20 }}>←</Link>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#fff' }}>B</div>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Rapport de séance</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button onClick={() => load()} style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, cursor: 'pointer' }}>
            ↻ Actualiser
          </button>
          <button onClick={() => window.print()} style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, background: C.blue, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
            🖨 Imprimer
          </button>
        </div>
      </header>

      <div className="print-page" style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Report header ── */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Bourse de Casablanca</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: '0 0 6px 0' }}>{reportTitle}</h1>
            <div style={{ fontSize: 14, color: C.muted }}>{generated ? fmtDate(generated) : '—'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ padding: '6px 14px', borderRadius: 20, background: sessionOpen ? 'rgba(63,185,80,0.12)' : 'rgba(139,148,158,0.12)', border: `1px solid ${sessionOpen ? C.green : C.muted}`, fontSize: 12, fontWeight: 700, color: sessionOpen ? C.green : C.muted }}>
              {sessionOpen ? '● ' : '○ '}{sessionLabel}
            </div>
            {generated && (
              <div style={{ fontSize: 11, color: C.muted }}>
                Généré à {generated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>

        {/* ── Alerte suspensions ── */}
        {suspended.length > 0 && (
          <div style={{ background: 'rgba(248,81,73,0.06)', border: `1px solid rgba(248,81,73,0.4)`, borderRadius: 10, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>
              🚨 Valeurs suspendues ({suspended.length})
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {suspended.map(a => (
                <div key={a.symbol} style={{ background: 'rgba(248,81,73,0.12)', border: `1px solid ${C.red}`, borderRadius: 6, padding: '5px 12px', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: C.red }}>{a.symbol.trim()}</span>
                  <span style={{ color: C.muted, marginLeft: 8, fontSize: 11 }}>{a.emetteur}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 1 : Indices ── */}
        <div style={card}>
          <div style={sectionTitle}>Indices boursiers</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {indices.map(idx => {
              const isPos = (idx.change_pct ?? 0) >= 0;
              const color = INDEX_COLORS[idx.code] ?? C.blue;
              return (
                <div key={idx.code} style={{ background: C.panel, borderRadius: 8, padding: '14px 16px', borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{idx.label || idx.code}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{fmt(idx.value, 2)}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isPos ? C.green : C.red }}>
                      {isPos ? '▲' : '▼'} {fmtPct(idx.change_pct)}
                    </span>
                    {idx.change_ytd != null && (
                      <span style={{ fontSize: 11, color: C.muted }}>YTD {fmtPct(idx.change_ytd)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section 2 : Volumes & breadth ── */}
        <div style={card}>
          <div style={sectionTitle}>Volumes & breadth</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'Volume marché comptant', value: fmtMillions(liveData?.cashVolume ?? null), color: C.blue },
              { label: 'Volume marché terme',    value: fmtMillions(liveData?.futuresVolume ?? null), color: C.orange },
              { label: 'Volume actions séance',  value: fmtMillions(totalVolAct),           color: C.teal },
              { label: 'Valeurs en hausse',      value: `${hausse.length} / ${withVar.length}`,  color: C.green },
              { label: 'Valeurs en baisse',      value: `${baisse.length} / ${withVar.length}`,  color: C.red },
              { label: 'Valeurs stables',        value: `${stable.length} / ${withVar.length}`,  color: C.muted },
            ].map(item => (
              <div key={item.label} style={{ background: C.panel, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>{item.label}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Breadth bar */}
          {breadthPct != null && withVar.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 5 }}>
                <span>Breadth du marché — {hausse.length} hausses · {stable.length} stables · {baisse.length} baisses</span>
                <span style={{ color: breadthPct >= 50 ? C.green : C.red, fontWeight: 700 }}>{breadthPct.toFixed(0)}% haussier</span>
              </div>
              <div style={{ height: 10, background: C.border, borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${withVar.length > 0 ? (hausse.length / withVar.length) * 100 : 0}%`, background: C.green, transition: 'width 0.5s' }} />
                <div style={{ width: `${withVar.length > 0 ? (stable.length / withVar.length) * 100 : 0}%`, background: C.muted }} />
                <div style={{ width: `${withVar.length > 0 ? (baisse.length / withVar.length) * 100 : 0}%`, background: C.red }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, marginTop: 4 }}>
                <span>Vol. hausse : {fmtMillions(volHausse)}</span>
                <span>Vol. baisse : {fmtMillions(volBaisse)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 3 : Top movers ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Hausses */}
          <div style={card}>
            <div style={sectionTitle}>Top 5 hausses</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left' }}>VALEUR</th>
                  <th style={th}>COURS</th>
                  <th style={{ ...th, color: C.green }}>VAR %</th>
                  <th style={th}>VOLUME</th>
                </tr>
              </thead>
              <tbody>
                {top5Hausse.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 12 }}>Aucune donnée</td></tr>}
                {top5Hausse.map(a => (
                  <tr key={a.symbol} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px 12px' }}>
                      <a href={`https://fr.tradingview.com/symbols/CSEMA-${a.symbol.trim()}/`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: C.blue, textDecoration: 'none', fontSize: 13 }}>{a.symbol.trim()}</a>
                      <div style={{ fontSize: 10, color: C.muted }}>{a.emetteur}</div>
                    </td>
                    <td style={td}>{fmt(a.dernierCours)}</td>
                    <td style={{ ...td, fontWeight: 800, color: C.green }}>+{a.variation?.toFixed(2)}%</td>
                    <td style={{ ...td, color: C.muted }}>{fmtMillions(a.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Baisses */}
          <div style={card}>
            <div style={sectionTitle}>Top 5 baisses</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left' }}>VALEUR</th>
                  <th style={th}>COURS</th>
                  <th style={{ ...th, color: C.red }}>VAR %</th>
                  <th style={th}>VOLUME</th>
                </tr>
              </thead>
              <tbody>
                {top5Baisse.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 12 }}>Aucune donnée</td></tr>}
                {top5Baisse.map(a => (
                  <tr key={a.symbol} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px 12px' }}>
                      <a href={`https://fr.tradingview.com/symbols/CSEMA-${a.symbol.trim()}/`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: C.blue, textDecoration: 'none', fontSize: 13 }}>{a.symbol.trim()}</a>
                      <div style={{ fontSize: 10, color: C.muted }}>{a.emetteur}</div>
                    </td>
                    <td style={td}>{fmt(a.dernierCours)}</td>
                    <td style={{ ...td, fontWeight: 800, color: C.red }}>{a.variation?.toFixed(2)}%</td>
                    <td style={{ ...td, color: C.muted }}>{fmtMillions(a.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 4 : Top volumes ── */}
        <div style={card}>
          <div style={sectionTitle}>Top 5 volumes — actions les plus actives</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>VALEUR</th>
                <th style={{ ...th, textAlign: 'left' }}>SECTEUR</th>
                <th style={th}>COURS RÉF.</th>
                <th style={th}>COURS LIVE</th>
                <th style={th}>VAR %</th>
                <th style={th}>VOLUME</th>
                <th style={th}>NB TX</th>
                <th style={{ ...th, textAlign: 'center' }}>STATUT</th>
              </tr>
            </thead>
            <tbody>
              {top5Volume.map(a => {
                const isPos = (a.variation ?? 0) >= 0;
                const STATUT_COLORS: Record<string, string> = { T: C.green, NT: C.amber, S: C.red };
                return (
                  <tr key={a.symbol} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px 12px' }}>
                      <a href={`https://fr.tradingview.com/symbols/CSEMA-${a.symbol.trim()}/`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: C.blue, textDecoration: 'none' }}>{a.symbol.trim()}</a>
                      <div style={{ fontSize: 10, color: C.muted }}>{a.emetteur}</div>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: C.muted }}>{a.secteur}</td>
                    <td style={{ ...td, color: C.teal }}>{fmt(a.reference)}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{fmt(a.dernierCours)}</td>
                    <td style={{ ...td, fontWeight: 700, color: a.variation == null ? C.muted : isPos ? C.green : C.red }}>{fmtPct(a.variation)}</td>
                    <td style={{ ...td, fontWeight: 700, color: C.text }}>{fmtMillions(a.volume)}</td>
                    <td style={{ ...td, color: C.muted }}>{a.nbTransactions || '—'}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{ color: STATUT_COLORS[a.statut] ?? C.muted, fontSize: 11, fontWeight: 700 }}>{a.statut || '—'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Section 5 : Secteurs ── */}
        {topSectors.length > 0 && (
          <div style={card}>
            <div style={sectionTitle}>Secteurs les plus actifs</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topSectors.map(([secteur, data]) => {
                const totalSecteurVol = topSectors.reduce((s, [, d]) => s + d.vol, 0);
                const pct = totalSecteurVol > 0 ? (data.vol / totalSecteurVol) * 100 : 0;
                const breadth = data.hausse + data.baisse > 0 ? (data.hausse / (data.hausse + data.baisse)) * 100 : 50;
                return (
                  <div key={secteur} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 90px 90px 80px', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{secteur}</div>
                    <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: C.blue, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMillions(data.vol)}</div>
                    <div style={{ fontSize: 11, color: breadth >= 50 ? C.green : C.red, textAlign: 'right', fontWeight: 700 }}>{breadth.toFixed(0)}% haussier</div>
                    <div style={{ fontSize: 10, color: C.muted, textAlign: 'right' }}>↑{data.hausse} ↓{data.baisse}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Section 6 : Obligations ── */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={sectionTitle}>Obligations — cours de référence</div>
            <div style={{ fontSize: 11, color: C.muted }}>{bonds.length} instruments</div>
          </div>
          {bonds.length === 0 ? (
            <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: 20 }}>Aucune donnée disponible</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left' }}>INSTRUMENT</th>
                  <th style={{ ...th, textAlign: 'left' }}>ÉMETTEUR</th>
                  <th style={{ ...th, textAlign: 'left' }}>TYPE</th>
                  <th style={{ ...th, color: C.teal }}>C.RÉF</th>
                  <th style={th}>DERNIER</th>
                  <th style={th}>VAR %</th>
                  <th style={th}>MODE COT.</th>
                  <th style={{ ...th, textAlign: 'center' }}>STATUT</th>
                </tr>
              </thead>
              <tbody>
                {bonds.map(b => {
                  const isPos = (b.variation ?? 0) >= 0;
                  return (
                    <tr key={b.symbol} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '7px 12px', fontWeight: 700, color: C.blue, fontSize: 12 }}>{b.symbol.trim()}</td>
                      <td style={{ padding: '7px 12px', color: C.text, fontSize: 11 }}>{b.emetteur}</td>
                      <td style={{ padding: '7px 12px', color: C.muted, fontSize: 10 }}>{b.type?.replace('EMPRUNTS OBLIGATAIRES ', '')}</td>
                      <td style={{ ...td, color: C.teal, fontWeight: 700, fontSize: 12 }}>{fmt(b.reference)}</td>
                      <td style={{ ...td, fontWeight: 600, fontSize: 12 }}>{fmt(b.dernierCours)}</td>
                      <td style={{ ...td, color: b.variation == null ? C.muted : isPos ? C.green : C.red, fontWeight: 700, fontSize: 12 }}>
                        {b.variation != null ? fmtPct(b.variation) : '—'}
                      </td>
                      <td style={{ ...td, color: C.orange, fontSize: 11 }}>{b.quotationMode || '—'}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: b.statut === 'T' ? C.green : b.statut === 'S' ? C.red : C.amber }}>{b.statut || 'NT'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>


        {/* ── Footer ── */}
        <div style={{ marginTop: 24, borderTop: `1px solid ${C.border}`, paddingTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 11, color: C.muted }}>
            Bourse de Casablanca · Données en temps réel · {masi ? `MASI ${fmt(masi.value)} (${fmtPct(masi.change_pct)})` : ''}
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>
            Rapport généré le {generated ? generated.toLocaleString('fr-FR') : '—'}
          </div>
        </div>

      </div>
    </>
  );
}
