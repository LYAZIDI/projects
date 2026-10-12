'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';

interface Titre {
  ticker:    string;
  nom:       string;
  secteur:   string | null;
  prix:      number | null;
  variation: number | null;
  ouverture: number | null;
  haut:      number | null;
  bas:       number | null;
  ytd:       number | null;
  volume:    number | null;
  marketCap: number | null;
}

const ALPHABET = ['A-Z', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

function fmtPrix(n: number | null): string {
  if (n == null) return '—';
  return n.toFixed(2);
}
function fmtVar(n: number | null): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}
function fmtVol(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} K`;
  return String(n);
}

function Arrow({ val }: { val: number | null }) {
  if (val == null || val === 0) return (
    <span className="inline-block w-0 h-0 border-l-4 border-r-4 border-b-[6px] border-l-transparent border-r-transparent border-b-slate-300 mr-1" />
  );
  if (val > 0) return (
    <span className="inline-block w-0 h-0 border-l-4 border-r-4 border-b-[6px] border-l-transparent border-r-transparent border-b-emerald-500 mr-1" />
  );
  return (
    <span className="inline-block w-0 h-0 border-l-4 border-r-4 border-t-[6px] border-l-transparent border-r-transparent border-t-red-500 mr-1" />
  );
}

function VarCell({ val, bold = false }: { val: number | null; bold?: boolean }) {
  const cls = val == null || val === 0
    ? 'text-slate-500'
    : val > 0 ? 'text-emerald-600' : 'text-red-600';
  return (
    <span className={`${cls} ${bold ? 'font-semibold' : ''} whitespace-nowrap`}>
      {fmtVar(val)}
    </span>
  );
}

export default function MarchePage() {
  const [data, setData]         = useState<Titre[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [secteur, setSecteur]   = useState('Tous les secteurs');
  const [lettre, setLettre]     = useState('A-Z');
  const [sOpen, setSOpen]       = useState(false);

  useEffect(() => {
    fetch('/api/bvc/marche')
      .then(r => r.json())
      .then(j => setData(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const secteurs = useMemo(() => {
    const set = new Set(data.map(t => t.secteur).filter((s): s is string => !!s));
    return ['Tous les secteurs', ...Array.from(set).sort()];
  }, [data]);

  const filtered = useMemo(() => data.filter(t => {
    if (search) {
      const q = search.toUpperCase();
      if (!t.ticker.includes(q) && !t.nom.toUpperCase().includes(q)) return false;
    }
    if (secteur !== 'Tous les secteurs' && t.secteur !== secteur) return false;
    if (lettre !== 'A-Z' && !t.ticker.startsWith(lettre)) return false;
    return true;
  }), [data, search, secteur, lettre]);

  // Sidebar: top hausse + top baisse
  const topHausse = useMemo(() =>
    [...data].filter(t => t.variation != null).sort((a, b) => (b.variation ?? 0) - (a.variation ?? 0)).slice(0, 5),
    [data]
  );
  const topBaisse = useMemo(() =>
    [...data].filter(t => t.variation != null).sort((a, b) => (a.variation ?? 0) - (b.variation ?? 0)).slice(0, 5),
    [data]
  );
  const topCap = useMemo(() =>
    [...data].filter(t => t.marketCap != null).sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0)).slice(0, 5),
    [data]
  );
  const [sideTab, setSideTab] = useState<'hausse' | 'baisse' | 'cap'>('hausse');
  const sideData = sideTab === 'hausse' ? topHausse : sideTab === 'baisse' ? topBaisse : topCap;

  const hausses = data.filter(t => (t.variation ?? 0) > 0).length;
  const baisses = data.filter(t => (t.variation ?? 0) < 0).length;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* ── Titre ─────────────────────────────────────────────────── */}
      <div className="pb-4">
        <h1 className="text-3xl font-bold text-[#cc1469] dark:text-[#f0629a] mb-1">
          actions par marché
        </h1>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          Accès direct aux différents secteurs de la Bourse de Casablanca
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Colonne principale ────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Filtres */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-4 mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            {/* Secteur dropdown */}
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Secteur</label>
              <div className="relative">
                <button
                  onClick={() => setSOpen(p => !p)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-700 dark:text-slate-200 hover:border-slate-400 transition-colors"
                >
                  <span className="truncate">{secteur}</span>
                  <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${sOpen ? 'rotate-180' : ''}`} />
                </button>
                {sOpen && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-lg max-h-56 overflow-y-auto">
                    {secteurs.map(s => (
                      <button
                        key={s}
                        onClick={() => { setSecteur(s as string); setSOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${secteur === s ? 'font-semibold text-[#cc1469]' : 'text-slate-700 dark:text-slate-300'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recherche */}
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Recherche</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Ex: ATW, Attijariwafa..."
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc1469]/40 focus:border-[#cc1469]"
                />
              </div>
            </div>

            {/* Réinitialiser */}
            <button
              onClick={() => { setSearch(''); setSecteur('Tous les secteurs'); setLettre('A-Z'); }}
              className="px-5 py-2 bg-[#cc1469] hover:bg-[#a81057] text-white text-sm font-semibold rounded transition-colors flex-shrink-0"
            >
              Filtrer
            </button>
          </div>

          {/* Alphabet nav */}
          <div className="flex flex-wrap gap-px mb-3 border-b border-slate-200 dark:border-slate-700 pb-3">
            {ALPHABET.map(l => (
              <button
                key={l}
                onClick={() => setLettre(l)}
                className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                  lettre === l
                    ? 'bg-[#0a3d8c] text-white dark:bg-blue-600'
                    : 'text-[#0a3d8c] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Compteur */}
          <div className="flex items-center gap-4 mb-2 text-xs text-slate-500">
            <span><strong className="text-slate-700 dark:text-slate-300">{filtered.length}</strong> valeurs affichées</span>
            <span className="text-emerald-600 flex items-center gap-1"><TrendingUp size={11} /> {hausses} en hausse</span>
            <span className="text-red-500 flex items-center gap-1"><TrendingDown size={11} /> {baisses} en baisse</span>
          </div>

          {/* Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-sm overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  {[
                    { key: 'nom',       label: 'LIBELLÉ',      align: 'left'  },
                    { key: 'prix',      label: 'DERNIER',      align: 'right' },
                    { key: 'variation', label: 'VAR.',         align: 'right' },
                    { key: 'ouverture', label: 'OUV',          align: 'right' },
                    { key: 'haut',      label: '+HAUT',        align: 'right' },
                    { key: 'bas',       label: '+BAS',         align: 'right' },
                    { key: 'ytd',       label: 'VAR/1JANV',    align: 'right' },
                    { key: 'volume',    label: 'VOL.',         align: 'right' },
                  ].map(col => (
                    <th
                      key={col.key}
                      className={`px-3 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400">
                      Chargement des cotations...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      Aucune valeur trouvée
                    </td>
                  </tr>
                ) : filtered.map((t, i) => {
                  const pos = (t.variation ?? 0) > 0;
                  const neg = (t.variation ?? 0) < 0;
                  return (
                    <tr
                      key={t.ticker}
                      className={`border-b border-slate-100 dark:border-slate-800/60 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/50 dark:bg-slate-900/30'}`}
                    >
                      {/* Libellé */}
                      <td className="px-3 py-2">
                        <a href={`https://fr.tradingview.com/symbols/CSEMA-${t.ticker}/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
                          <Arrow val={t.variation} />
                          <div>
                            <span className="font-semibold text-[#0a3d8c] dark:text-blue-400 group-hover:underline">
                              {t.ticker}
                            </span>
                            <span className="text-slate-400 text-xs ml-1.5 hidden sm:inline truncate max-w-[160px]">
                              {t.nom}
                            </span>
                          </div>
                        </a>
                      </td>
                      {/* Dernier */}
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {fmtPrix(t.prix)}
                      </td>
                      {/* Var. */}
                      <td className="px-3 py-2 text-right">
                        <VarCell val={t.variation} bold />
                      </td>
                      {/* Ouv */}
                      <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400 text-xs">
                        {fmtPrix(t.ouverture)}
                      </td>
                      {/* +Haut */}
                      <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400 text-xs">
                        {fmtPrix(t.haut)}
                      </td>
                      {/* +Bas */}
                      <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400 text-xs">
                        {fmtPrix(t.bas)}
                      </td>
                      {/* Var/1janv */}
                      <td className="px-3 py-2 text-right">
                        <VarCell val={t.ytd} />
                      </td>
                      {/* Volume */}
                      <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400 text-xs">
                        {fmtVol(t.volume)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Sidebar droite ────────────────────────────────────────── */}
        <aside className="w-64 flex-shrink-0 hidden xl:block">
          <div className="border border-slate-200 dark:border-slate-700 rounded-sm overflow-hidden">
            {/* Header */}
            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Top BVC
              </h3>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              {([
                { key: 'hausse', label: 'Hausse' },
                { key: 'baisse', label: 'Baisse' },
                { key: 'cap',    label: 'Capitalisation' },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSideTab(tab.key)}
                  className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors border-b-2 ${
                    sideTab === tab.key
                      ? 'border-[#cc1469] text-[#cc1469]'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Colonnes */}
            <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
              <span>VALEUR</span>
              <span className="text-right">DERNIER</span>
              <span className="text-right">VAR.</span>
            </div>

            {/* Rows */}
            {sideData.map(t => (
              <a
                key={t.ticker}
                href={`https://fr.tradingview.com/symbols/CSEMA-${t.ticker}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="grid grid-cols-3 items-center px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="text-[#0a3d8c] dark:text-blue-400 font-semibold text-xs truncate">{t.ticker}</span>
                <span className="text-right font-mono text-xs text-slate-700 dark:text-slate-300">{fmtPrix(t.prix)}</span>
                <span className={`text-right text-xs font-semibold ${(t.variation ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {fmtVar(t.variation)}
                </span>
              </a>
            ))}

            {/* Footer */}
            <div className="px-3 py-2.5">
              <Link
                href="/dashboard"
                className="text-[11px] text-[#cc1469] hover:text-[#a81057] font-semibold hover:underline"
              >
                Voir toutes les valeurs →
              </Link>
            </div>
          </div>

          {/* Résumé marché */}
          <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-sm overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Résumé du marché
              </h3>
            </div>
            <div className="px-3 py-3 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Titres cotés</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{data.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">En hausse</span>
                <span className="font-semibold text-emerald-600">{hausses}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">En baisse</span>
                <span className="font-semibold text-red-500">{baisses}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Inchangés</span>
                <span className="font-semibold text-slate-500">{data.length - hausses - baisses}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
