'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';

interface Titre {
  ticker: string;
  nom: string;
  secteur: string | null;
  prix: number | null;
  variation: number | null;
  volume: number | null;
  capitaux: number | null;
  ytd: number | null;
  marketCap: number | null;
}

function fmt(n: number | null, dec = 2): string {
  if (n == null) return '—';
  return n.toFixed(dec);
}
function fmtPct(n: number | null): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}
function fmtVol(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function VariationBadge({ val }: { val: number | null }) {
  if (val == null) return <span className="text-slate-400 text-xs">—</span>;
  const pos = val >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${pos ? 'text-green-600' : 'text-red-500'}`}>
      {pos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {fmtPct(val)}
    </span>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Titre[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof Titre>('marketCap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [view, setView] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    fetch('/api/bvc/marche')
      .then(r => r.json())
      .then(j => setData(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...data]
    .filter(t =>
      !search ||
      t.ticker.includes(search.toUpperCase()) ||
      t.nom.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey] as number | null;
      const bv = b[sortKey] as number | null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortDir === 'desc' ? bv - av : av - bv;
    });

  const totalCap = data.reduce((s, t) => s + (t.marketCap ?? 0), 0);
  const hausses  = data.filter(t => (t.variation ?? 0) > 0).length;
  const baisses  = data.filter(t => (t.variation ?? 0) < 0).length;
  const avgYtd   = data.length ? data.reduce((s, t) => s + (t.ytd ?? 0), 0) / data.filter(t => t.ytd != null).length : 0;

  const toggleSort = (key: keyof Titre) => {
    if (sortKey === key) setSortDir(p => p === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: keyof Titre }) => (
    <span className={`ml-1 ${sortKey === k ? 'text-blue-500' : 'text-slate-300'}`}>
      {sortKey === k ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">Chargement des cotations...</div>
  );

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Titres actifs', value: String(data.length), icon: BarChart3, color: 'text-blue-600' },
          { label: 'Capitaux totaux', value: `${(totalCap / 1e9).toFixed(1)} Md MAD`, icon: Activity, color: 'text-purple-600' },
          { label: 'Hausses / Baisses', value: `${hausses} / ${baisses}`, icon: TrendingUp, color: 'text-green-600' },
          { label: 'YTD moyen', value: fmtPct(avgYtd), icon: TrendingUp, color: avgYtd >= 0 ? 'text-green-600' : 'text-red-500' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{kpi.label}</span>
              <kpi.icon size={15} className={kpi.color} />
            </div>
            <div className="text-lg font-bold text-slate-800 dark:text-white">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-800 dark:text-white">Cotations BVC</h2>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtrer..."
              className="text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              {(['table', 'cards'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === v ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {v === 'table' ? 'Tableau' : 'Cartes'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {[
                    { key: 'ticker', label: 'TICKER' },
                    { key: 'prix', label: 'PRIX' },
                    { key: 'variation', label: '24H%' },
                    { key: 'ytd', label: 'YTD' },
                    { key: 'volume', label: 'VOLUME' },
                    { key: 'marketCap', label: 'CAPITALISATION' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key as keyof Titre)}
                      className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 select-none"
                    >
                      {col.label}<SortIcon k={col.key as keyof Titre} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((t, i) => (
                  <tr
                    key={t.ticker}
                    className={`border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-800/10'}`}
                  >
                    <td className="px-4 py-3">
                      <a href={`https://fr.tradingview.com/symbols/CSEMA-${t.ticker}/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-blue-600">{t.ticker.slice(0, 2)}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{t.ticker}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{t.nom}</div>
                        </div>
                      </a>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-white">
                      {fmt(t.prix, 2)} <span className="text-[10px] text-slate-400 font-sans">MAD</span>
                    </td>
                    <td className="px-4 py-3"><VariationBadge val={t.variation} /></td>
                    <td className="px-4 py-3"><VariationBadge val={t.ytd} /></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{fmtVol(t.volume)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">
                      {t.marketCap != null ? `${(t.marketCap / 1e9).toFixed(1)} Md` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sorted.length === 0 && (
              <div className="text-center py-12 text-slate-400">Aucun titre trouvé</div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {sorted.map(t => (
              <a
                key={t.ticker}
                href={`https://fr.tradingview.com/symbols/CSEMA-${t.ticker}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-blue-600">{t.ticker.slice(0, 2)}</span>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-white">{t.ticker}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[100px]">{t.nom}</div>
                    </div>
                  </div>
                  <VariationBadge val={t.variation} />
                </div>
                <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mb-1">
                  {fmt(t.prix)} MAD
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>YTD <VariationBadge val={t.ytd} /></span>
                  <span>Vol: {fmtVol(t.volume)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
