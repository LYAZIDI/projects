'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PortfolioLine {
  symbol:     string;
  quantite:   number;
  prixRevient: number | null;  // PRU saisi dans le fichier
}

interface LiveAction {
  symbol: string; emetteur: string; statut: string;
  reference: number | null; dernierCours: number | null;
  variation: number | null; volume: number | null;
  achat: { prix: number | null; quantite: number | null };
  vente: { prix: number | null; quantite: number | null };
}

interface LiveBond {
  symbol: string; emetteur: string; statut: string;
  reference: number | null; dernierCours: number | null;
  variation: number | null; volume: number | null;
}

interface EnrichedLine extends PortfolioLine {
  emetteur:      string;
  assetType:     'action' | 'obligation' | 'inconnu';
  statut:        string;
  reference:     number | null;
  cours:         number | null;
  variation:     number | null;
  valeurRef:     number | null;
  valeurLive:    number | null;
  plMad:         number | null;
  plPct:         number | null;
  poids:         number;          // % du portefeuille total live
  bidPrix:       number | null;
  askPrix:       number | null;
  volume:        number | null;
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
  orange: '#f0883e',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null, dec = 2) {
  if (n == null) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtPct(n: number | null) {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}
function fmtMillions(n: number | null) {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M MAD`;
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(0)} K MAD`;
  return `${n.toFixed(0)} MAD`;
}

// ── CSV / Excel parser ────────────────────────────────────────────────────────

const SYMBOL_KEYS   = ['symbol','ticker','code','isin','titre','valeur'];
const QTY_KEYS      = ['quantite','qte','qty','quantity','nombre','titres'];
const PRICE_KEYS    = ['prix_revient','pru','pa','prix','cout','cost','prix_achat'];

function normalizeKey(k: string) {
  return k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '_');
}

function findCol(headers: string[], candidates: string[]) {
  return headers.findIndex(h => candidates.includes(normalizeKey(h)));
}

function parseRows(rows: string[][]): PortfolioLine[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  const si = findCol(headers, SYMBOL_KEYS);
  const qi = findCol(headers, QTY_KEYS);
  const pi = findCol(headers, PRICE_KEYS);
  if (si === -1 || qi === -1) return [];

  return rows.slice(1).flatMap(row => {
    const symbol = (row[si] ?? '').trim().toUpperCase().replace(/\s+/g, '');
    const qty    = parseFloat((row[qi] ?? '').replace(/\s/g, '').replace(',', '.'));
    const price  = pi !== -1 ? parseFloat((row[pi] ?? '').replace(/\s/g, '').replace(',', '.')) : NaN;
    if (!symbol || isNaN(qty) || qty <= 0) return [];
    return [{ symbol, quantite: qty, prixRevient: isNaN(price) ? null : price }];
  });
}

async function parseFile(file: File): Promise<PortfolioLine[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv' || ext === 'txt') {
    const text = await file.text();
    const sep  = text.includes(';') ? ';' : ',';
    const rows = text.trim().split('\n').map(r => r.split(sep));
    return parseRows(rows);
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const { read, utils } = await import('xlsx');
    const buf  = await file.arrayBuffer();
    const wb   = read(buf);
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];
    return parseRows(rows);
  }

  return [];
}

// ── Main Component ────────────────────────────────────────────────────────────

type SortKey = keyof EnrichedLine;

export default function PortefeuillePage() {
  const [lines,     setLines]     = useState<PortfolioLine[]>([]);
  const [actions,   setActions]   = useState<LiveAction[]>([]);
  const [bonds,     setBonds]     = useState<LiveBond[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [lastUpdate,  setLastUpdate]  = useState<Date | null>(null);
  const [sortKey,   setSortKey]   = useState<SortKey>('valeurLive');
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('desc');
  const [alertThreshold, setAlertThreshold] = useState(3); // % variation alerte
  const [fileError, setFileError] = useState('');
  const [dragging,  setDragging]  = useState(false);
  const [infoOpen,  setInfoOpen]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch live prices
  const loadLive = useCallback(async () => {
    setLiveLoading(true);
    try {
      const [ra, rb] = await Promise.all([
        fetch('/api/bvc/actions').then(r => r.json()),
        fetch('/api/bvc/obligations').then(r => r.json()),
      ]);
      setActions(ra.actions ?? []);
      setBonds(rb.bonds ?? []);
      setLastUpdate(new Date());
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLive();
    const id = setInterval(loadLive, 60_000);
    return () => clearInterval(id);
  }, [loadLive]);

  // Handle file
  async function handleFile(file: File) {
    setFileError('');
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) {
        setFileError('Fichier invalide ou colonnes non reconnues. Colonnes attendues : SYMBOL, QUANTITE (+ optionnel PRIX_REVIENT)');
        return;
      }
      setLines(parsed);
    } catch {
      setFileError('Erreur lors de la lecture du fichier');
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function downloadExampleCsv() {
    const content = [
      'SYMBOL;QUANTITE;PRIX_REVIENT',
      'ATW;5000;450.00',
      'IAM;10000;10.50',
      'OCP;2000;210.00',
      'CIH;3000;320.00',
      'BOA;8000;55.00',
      'TQM;1500;1100.00',
      'OCAMF;50000;100.18',
      'OCDMC;30000;100.29',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'portefeuille_exemple.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // Build live map
  const liveMap = new Map<string, { cours: number | null; reference: number | null; variation: number | null; statut: string; emetteur: string; assetType: 'action' | 'obligation'; bidPrix: number | null; askPrix: number | null; volume: number | null }>();
  for (const a of actions) {
    liveMap.set(a.symbol.trim(), { cours: a.dernierCours, reference: a.reference, variation: a.variation, statut: a.statut, emetteur: a.emetteur, assetType: 'action', bidPrix: a.achat?.prix ?? null, askPrix: a.vente?.prix ?? null, volume: a.volume });
  }
  for (const b of bonds) {
    liveMap.set(b.symbol.trim(), { cours: b.dernierCours, reference: b.reference, variation: b.variation, statut: b.statut, emetteur: b.emetteur, assetType: 'obligation', bidPrix: null, askPrix: null, volume: b.volume });
  }

  // Enrich lines
  const enriched: EnrichedLine[] = lines.map(l => {
    const live     = liveMap.get(l.symbol);
    const cours    = live?.cours    ?? null;
    const ref      = live?.reference ?? null;
    const valRef   = ref  != null ? l.quantite * ref  : null;
    const valLive  = cours != null ? l.quantite * cours : null;
    const plMad    = valLive != null && valRef != null ? valLive - valRef : null;
    const plPct    = live?.variation ?? null;
    return {
      ...l,
      emetteur:  live?.emetteur  ?? '',
      assetType: live?.assetType ?? 'inconnu',
      statut:    live?.statut    ?? '',
      reference: ref,
      cours,
      variation: live?.variation ?? null,
      valeurRef: valRef,
      valeurLive: valLive,
      plMad,
      plPct,
      poids:     0,
      bidPrix:   live?.bidPrix ?? null,
      askPrix:   live?.askPrix ?? null,
      volume:    live?.volume  ?? null,
    };
  });

  // Compute poids
  const totalLive = enriched.reduce((s, e) => s + (e.valeurLive ?? 0), 0);
  const totalRef  = enriched.reduce((s, e) => s + (e.valeurRef  ?? 0), 0);
  const totalPL   = totalLive - totalRef;
  const totalPLPct = totalRef > 0 ? (totalPL / totalRef) * 100 : null;
  enriched.forEach(e => { e.poids = totalLive > 0 ? ((e.valeurLive ?? 0) / totalLive) * 100 : 0; });

  const alerts = enriched.filter(e =>
    e.statut === 'S' ||
    (e.variation != null && Math.abs(e.variation) >= alertThreshold)
  );

  // Sort
  const sorted = [...enriched].sort((a, b) => {
    const va = (a[sortKey] as number | string | null) ?? (typeof a[sortKey] === 'number' ? -Infinity : '');
    const vb = (b[sortKey] as number | string | null) ?? (typeof b[sortKey] === 'number' ? -Infinity : '');
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortI({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span style={{ color: C.muted, marginLeft: 3, fontSize: 10 }}>↕</span>;
    return <span style={{ color: C.blue, marginLeft: 3, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const th: React.CSSProperties = { padding: '10px 12px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', userSelect: 'none', textAlign: 'right' };
  const td: React.CSSProperties = { padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13 };

  const hasPortfolio = lines.length > 0;

  return (
    <>
      <style>{`
        input::placeholder { color: #8b949e; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #161b22; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      {/* Header */}
      <header style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/live" style={{ color: C.muted, textDecoration: 'none', fontSize: 20 }}>←</Link>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#fff' }}>B</div>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Portefeuille live</span>
        {lastUpdate && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
            {liveLoading && <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.amber, display: 'inline-block', animation: 'pulse 1s infinite' }} />}
            Mis à jour {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </header>

      <div style={{ padding: '24px 32px', maxWidth: 1300, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 4px 0' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Portefeuille live</h1>
          <div style={{ position: 'relative', display: 'inline-flex' }}
            onMouseEnter={() => setInfoOpen(true)}
            onMouseLeave={() => setInfoOpen(false)}
          >
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(139,148,158,0.15)', border: '1px solid rgba(139,148,158,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: C.muted, cursor: 'default', userSelect: 'none', fontWeight: 700 }}>i</span>
            {infoOpen && (
              <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 8px)', width: 320, background: '#1c2128', border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700, color: C.text }}>À quoi sert cet écran ?</p>
                <p style={{ margin: '0 0 10px 0', fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                  Importez un fichier <strong style={{ color: C.text }}>CSV ou Excel</strong> contenant vos titres BVC. L&apos;écran récupère les cours en direct et calcule automatiquement :
                </p>
                <ul style={{ margin: '0 0 10px 0', padding: '0 0 0 16px', fontSize: 12, color: C.muted, lineHeight: 1.8 }}>
                  <li>La <strong style={{ color: C.green }}>valorisation live</strong> de chaque ligne</li>
                  <li>La <strong style={{ color: C.text }}>plus/moins-value</strong> vs votre prix de revient (PRU)</li>
                  <li>Le <strong style={{ color: C.blue }}>poids</strong> de chaque titre dans le portefeuille</li>
                  <li>Le <strong style={{ color: C.text }}>bid / ask</strong> en temps réel</li>
                </ul>
                <p style={{ margin: 0, fontSize: 11, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                  Fonctionne pour les <strong style={{ color: C.text }}>actions</strong> et les <strong style={{ color: C.amber }}>obligations</strong> BVC. Données actualisées toutes les 60 s.
                </p>
              </div>
            )}
          </div>
        </div>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 24px 0' }}>Valorisation temps réel — données BVC actualisées toutes les 60 secondes</p>

        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{ background: dragging ? 'rgba(31,111,235,0.08)' : C.card, border: `2px dashed ${dragging ? C.blue : C.border}`, borderRadius: 12, padding: '28px 24px', textAlign: 'center', cursor: 'pointer', marginBottom: 20, transition: 'all 0.15s' }}
        >
          <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" style={{ display: 'none' }} onChange={onFileInput} />
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
            {hasPortfolio ? `${lines.length} ligne${lines.length > 1 ? 's' : ''} chargée${lines.length > 1 ? 's' : ''} — cliquer pour remplacer` : 'Importer votre portefeuille'}
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>
            CSV ou Excel (.xlsx) · Colonnes : <code style={{ background: '#21262d', padding: '1px 5px', borderRadius: 3, color: C.teal }}>SYMBOL</code> + <code style={{ background: '#21262d', padding: '1px 5px', borderRadius: 3, color: C.teal }}>QUANTITE</code> + optionnel <code style={{ background: '#21262d', padding: '1px 5px', borderRadius: 3, color: C.teal }}>PRIX_REVIENT</code>
          </div>
          {fileError && <div style={{ marginTop: 10, fontSize: 12, color: C.red }}>{fileError}</div>}
        </div>

        {/* Format hint + download */}
        {!hasPortfolio && (
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Exemple de format CSV</div>
              <button onClick={downloadExampleCsv} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, background: C.blue, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                ⬇ Télécharger exemple CSV
              </button>
            </div>
            <pre style={{ margin: 0, fontSize: 12, color: C.teal, fontFamily: 'monospace', lineHeight: 1.7 }}>{`SYMBOL;QUANTITE;PRIX_REVIENT
ATW;5000;450.00
IAM;10000;10.50
OCP;2000;210.00
CIH;3000;320.00
OCAMF;50000;100.18`}</pre>
            <div style={{ marginTop: 12, fontSize: 11, color: C.muted }}>Le séparateur peut être <code style={{ color: C.teal }}>;</code> ou <code style={{ color: C.teal }}>,</code> — les noms de colonnes sont insensibles à la casse et aux accents.</div>
          </div>
        )}

        {hasPortfolio && (
          <>
            {/* Alerts */}
            {alerts.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                {alerts.filter(a => a.statut === 'S').map(a => (
                  <div key={a.symbol} style={{ background: 'rgba(248,81,73,0.08)', border: `1px solid rgba(248,81,73,0.4)`, borderRadius: 8, padding: '10px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>🚨</span>
                    <span style={{ fontSize: 13, color: C.red, fontWeight: 700 }}>SUSPENSION — {a.symbol}</span>
                    <span style={{ fontSize: 12, color: C.muted }}>{a.emetteur} · {a.quantite.toLocaleString('fr-FR')} titres · Valeur bloquée : {fmtMillions(a.valeurLive)}</span>
                  </div>
                ))}
                {alerts.filter(a => a.statut !== 'S' && a.variation != null && Math.abs(a.variation) >= alertThreshold).map(a => {
                  const isPos = (a.variation ?? 0) >= 0;
                  return (
                    <div key={a.symbol} style={{ background: `rgba(${isPos ? '63,185,80' : '248,81,73'},0.06)`, border: `1px solid rgba(${isPos ? '63,185,80' : '248,81,73'},0.3)`, borderRadius: 8, padding: '10px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14 }}>{isPos ? '📈' : '📉'}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isPos ? C.green : C.red }}>{a.symbol} {fmtPct(a.variation)}</span>
                      <span style={{ fontSize: 12, color: C.muted }}>Impact portefeuille : {fmtMillions(a.plMad)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Valorisation live', value: fmtMillions(totalLive), sub: `Référence J-1 : ${fmtMillions(totalRef)}`, color: C.blue },
                { label: 'P&L intraday', value: fmtMillions(totalPL), sub: fmtPct(totalPLPct), color: totalPL >= 0 ? C.green : C.red },
                { label: 'Positions', value: String(enriched.length), sub: `${enriched.filter(e => e.assetType === 'action').length} actions · ${enriched.filter(e => e.assetType === 'obligation').length} obligations`, color: C.teal },
                { label: 'Alertes', value: String(alerts.length), sub: `Seuil variation : ±${alertThreshold}%`, color: alerts.length > 0 ? C.amber : C.muted },
              ].map(card => (
                <div key={card.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.7 }}>{card.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: card.color, fontVariantNumeric: 'tabular-nums' }}>{card.value}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Alert threshold control */}
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: C.muted }}>Seuil d'alerte variation :</span>
              {[1, 2, 3, 5, 10].map(v => (
                <button key={v} onClick={() => setAlertThreshold(v)} style={{ padding: '3px 10px', fontSize: 12, fontWeight: 600, border: `1px solid ${alertThreshold === v ? C.amber : C.border}`, borderRadius: 4, cursor: 'pointer', background: alertThreshold === v ? 'rgba(210,153,34,0.15)' : 'transparent', color: alertThreshold === v ? C.amber : C.muted }}>
                  ±{v}%
                </button>
              ))}
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${C.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.panel }}>
                    <th onClick={() => toggleSort('symbol')}     style={{ ...th, textAlign: 'left' }}>TITRE <SortI col="symbol" /></th>
                    <th style={{ ...th, textAlign: 'center' }}>TYPE</th>
                    <th style={{ ...th, textAlign: 'center' }}>STATUT</th>
                    <th onClick={() => toggleSort('quantite')}   style={th}>QUANTITÉ <SortI col="quantite" /></th>
                    <th onClick={() => toggleSort('reference')}  style={{ ...th, color: C.teal }}>COURS RÉF. <SortI col="reference" /></th>
                    <th onClick={() => toggleSort('cours')}      style={th}>COURS LIVE <SortI col="cours" /></th>
                    <th onClick={() => toggleSort('variation')}  style={th}>VAR% <SortI col="variation" /></th>
                    <th onClick={() => toggleSort('bidPrix')}    style={{ ...th, color: C.green }}>MEILLEUR ACHAT <SortI col="bidPrix" /></th>
                    <th onClick={() => toggleSort('askPrix')}    style={{ ...th, color: C.red }}>MEILLEUR VENTE <SortI col="askPrix" /></th>
                    <th onClick={() => toggleSort('valeurRef')}  style={th}>VALEUR RÉF. <SortI col="valeurRef" /></th>
                    <th onClick={() => toggleSort('valeurLive')} style={th}>VALEUR LIVE <SortI col="valeurLive" /></th>
                    <th onClick={() => toggleSort('plMad')}      style={th}>P&L MAD <SortI col="plMad" /></th>
                    <th onClick={() => toggleSort('plPct')}      style={th}>P&L % <SortI col="plPct" /></th>
                    <th onClick={() => toggleSort('poids')}      style={th}>POIDS <SortI col="poids" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(e => {
                    const isPos = (e.variation ?? 0) >= 0;
                    const isAlert = e.statut === 'S' || (e.variation != null && Math.abs(e.variation) >= alertThreshold);
                    const STATUT_COLORS: Record<string, { bg: string; color: string }> = {
                      T:  { bg: 'rgba(63,185,80,0.15)',  color: '#3fb950' },
                      NT: { bg: 'rgba(210,153,34,0.15)', color: '#d29922' },
                      S:  { bg: 'rgba(248,81,73,0.15)',  color: '#f85149' },
                    };
                    const sc = STATUT_COLORS[e.statut] ?? STATUT_COLORS['NT'];
                    return (
                      <tr key={e.symbol} style={{ borderBottom: `1px solid ${C.border}`, background: isAlert && e.statut === 'S' ? 'rgba(248,81,73,0.04)' : undefined }}>
                        <td style={{ padding: '10px 12px' }}>
                          <a href={`https://fr.tradingview.com/symbols/CSEMA-${e.symbol}/`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: C.blue, textDecoration: 'none' }}>{e.symbol}</a>
                          {e.emetteur && <div style={{ fontSize: 11, color: C.muted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.emetteur}</div>}
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: e.assetType === 'action' ? C.blue : e.assetType === 'obligation' ? C.teal : C.muted, border: `1px solid currentColor`, borderRadius: 3, padding: '1px 5px' }}>
                            {e.assetType === 'action' ? 'ACT' : e.assetType === 'obligation' ? 'OBL' : '?'}
                          </span>
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          {e.statut ? <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}`, borderRadius: 3, padding: '2px 6px', fontWeight: 700, fontSize: 11 }}>{e.statut}</span> : <span style={{ color: C.muted }}>—</span>}
                        </td>
                        <td style={td}>{e.quantite.toLocaleString('fr-FR')}</td>
                        <td style={{ ...td, color: C.teal, fontWeight: 600 }}>{fmt(e.reference)}</td>
                        <td style={{ ...td, fontWeight: 700, color: e.cours == null ? C.muted : C.text }}>{fmt(e.cours)}</td>
                        <td style={{ ...td, fontWeight: 700, color: e.variation == null ? C.muted : isPos ? C.green : C.red }}>{fmtPct(e.variation)}</td>
                        <td style={{ ...td, color: C.green }}>{fmt(e.bidPrix)}</td>
                        <td style={{ ...td, color: C.red }}>{fmt(e.askPrix)}</td>
                        <td style={{ ...td, color: C.muted }}>{fmtMillions(e.valeurRef)}</td>
                        <td style={{ ...td, fontWeight: 700, color: C.text }}>{fmtMillions(e.valeurLive)}</td>
                        <td style={{ ...td, fontWeight: 700, color: e.plMad == null ? C.muted : e.plMad >= 0 ? C.green : C.red }}>{fmtMillions(e.plMad)}</td>
                        <td style={{ ...td, fontWeight: 700, color: e.plPct == null ? C.muted : isPos ? C.green : C.red }}>{fmtPct(e.plPct)}</td>
                        <td style={{ ...td }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                            <div style={{ width: 48, height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(e.poids * 3, 100)}%`, background: C.blue, borderRadius: 3 }} />
                            </div>
                            <span style={{ color: C.muted, minWidth: 36, textAlign: 'right' }}>{e.poids.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer note */}
            <div style={{ marginTop: 10, fontSize: 11, color: C.muted, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
              <span>P&L calculé vs cours de référence BVC (séance J-1) · Obligations valorisées au dernier fixing</span>
              <span>{sorted.filter(e => e.assetType === 'inconnu').length > 0 && `${sorted.filter(e => e.assetType === 'inconnu').length} symbole(s) non trouvé(s) dans la base BVC`}</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
