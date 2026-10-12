'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

interface Position {
  ticker: string; nom: string; secteur: string | null;
  opcvm: string; gestionnaire: string;
  quantite: number | null; valorisation: number | null; poids_pct: number | null;
  valo_opcvm: number | null;
}

interface GroupedTitre {
  ticker: string; nom: string; secteur: string | null;
  totalValo: number; nbFonds: number;
  positions: Position[];
}

export default function PositionsPage() {
  const [ticker, setTicker] = useState('ATW');
  const [input, setInput]   = useState('ATW');
  const [data, setData]     = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [tickers, setTickers] = useState<Array<{ ticker: string; nom: string }>>([]);
  const [activeTab, setActiveTab] = useState<'titre' | 'concentration'>('titre');

  useEffect(() => {
    fetch('/api/bvc/marche')
      .then(r => r.json())
      .then(j => setTickers((j.data ?? []).map((t: { ticker: string; nom: string }) => ({ ticker: t.ticker, nom: t.nom }))));
  }, []);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    fetch(`/api/opcvm/positions?ticker=${ticker}`)
      .then(r => r.json())
      .then(j => setData(j.data ?? []))
      .finally(() => setLoading(false));
  }, [ticker]);

  const totalValo   = data.reduce((s, r) => s + (r.valorisation ?? 0), 0);
  const nbFonds     = data.length;
  const topFond     = data[0];

  // Grouper par gestionnaire pour la vue concentration
  const byGestionnaire = data.reduce<Record<string, { gestionnaire: string; nbFonds: number; totalValo: number; avgPoids: number }>>((acc, r) => {
    if (!acc[r.gestionnaire]) acc[r.gestionnaire] = { gestionnaire: r.gestionnaire, nbFonds: 0, totalValo: 0, avgPoids: 0 };
    acc[r.gestionnaire].nbFonds++;
    acc[r.gestionnaire].totalValo += r.valorisation ?? 0;
    acc[r.gestionnaire].avgPoids  += r.poids_pct ?? 0;
    return acc;
  }, {});
  const gestionnaires = Object.values(byGestionnaire)
    .map(g => ({ ...g, avgPoids: g.avgPoids / g.nbFonds }))
    .sort((a, b) => b.totalValo - a.totalValo);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setTicker(input.trim().toUpperCase());
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Positions OPCVM</h1>
        <p className="text-sm text-slate-500">Analysez quels fonds détiennent un titre et avec quel poids</p>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
        <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder="Ticker (ex: ATW)"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            Analyser
          </button>
          {/* Quick picks */}
          <div className="flex gap-2 flex-wrap">
            {tickers.slice(0, 5).map(({ ticker: t }) => (
              <button
                key={t}
                type="button"
                onClick={() => { setInput(t); setTicker(t); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  ticker === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* KPIs */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Fonds détenteurs', value: String(nbFonds) },
            { label: 'Valorisation totale', value: `${(totalValo / 1e6).toFixed(1)} M MAD` },
            { label: 'Plus gros détenteur', value: topFond?.gestionnaire ?? '—' },
            { label: 'Poids max', value: topFond?.poids_pct != null ? `${topFond.poids_pct.toFixed(2)}%` : '—' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-400 mb-1">{kpi.label}</div>
              <div className="font-bold text-slate-800 dark:text-white">{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {!loading && data.length > 0 && (
        <>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            {(['titre', 'concentration'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === t ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                {t === 'titre' ? 'Détail par fonds' : 'Concentration SDG'}
              </button>
            ))}
          </div>

          {activeTab === 'titre' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800 dark:text-white">
                  Fonds détenant <span className="text-blue-600">{ticker}</span>
                </h2>
                <a href={`https://fr.tradingview.com/symbols/CSEMA-${ticker}/`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                  Voir la fiche →
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {['OPCVM', 'Gestionnaire', 'Quantité', 'Valorisation', 'Poids', 'AUM Fonds'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((r, i) => (
                      <tr key={i} className={`border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-white max-w-[200px]">
                          <div className="truncate">{r.opcvm}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{r.gestionnaire}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {r.quantite != null ? r.quantite.toLocaleString('fr-FR') : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {r.valorisation != null ? `${(r.valorisation / 1e6).toFixed(2)} M` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {r.poids_pct != null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(r.poids_pct, 100)}%` }} />
                              </div>
                              <span className="text-xs font-mono text-blue-600">{r.poids_pct.toFixed(2)}%</span>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {r.valo_opcvm != null ? `${(r.valo_opcvm / 1e9).toFixed(2)} Md` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'concentration' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="font-semibold text-slate-800 dark:text-white">Concentration par SDG</h2>
              </div>
              <div className="p-5 space-y-3">
                {gestionnaires.map((g, i) => {
                  const maxValo = gestionnaires[0]?.totalValo ?? 1;
                  const pct     = (g.totalValo / maxValo) * 100;
                  return (
                    <div key={g.gestionnaire} className="flex items-center gap-4">
                      <div className="w-6 text-xs text-slate-400 text-right">{i + 1}</div>
                      <div className="w-36 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{g.gestionnaire}</div>
                      <div className="flex-1 h-6 bg-slate-50 dark:bg-slate-800 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-blue-500/80 rounded-lg flex items-center pl-2 transition-all"
                          style={{ width: `${pct}%` }}
                        >
                          <span className="text-[10px] text-white font-medium whitespace-nowrap">
                            {(g.totalValo / 1e6).toFixed(1)} M
                          </span>
                        </div>
                      </div>
                      <div className="w-16 text-right">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{g.nbFonds} fonds</div>
                        <div className="text-[10px] text-slate-400">{g.avgPoids.toFixed(1)}% moy.</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {loading && <div className="text-center py-12 text-slate-400">Chargement...</div>}

      {!loading && data.length === 0 && ticker && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-12 text-center text-slate-400">
          Aucun fonds OPCVM ne détient le titre <strong>{ticker}</strong>
        </div>
      )}
    </div>
  );
}
