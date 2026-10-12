'use client';

import { Menu, Search, Sun, Moon, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onMenuOpen: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export default function Header({ onMenuOpen, isDark, onToggleDark }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/titre/${query.trim().toUpperCase()}`);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/scraper/sync', {
        method: 'POST',
        headers: { 'x-scraper-secret': process.env.NEXT_PUBLIC_SCRAPER_SECRET ?? '' },
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-60 z-20 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 px-4">
      <button onClick={onMenuOpen} className="lg:hidden text-slate-500 hover:text-slate-700 p-1">
        <Menu size={20} />
      </button>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xs">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value.toUpperCase())}
            placeholder="ATW, IAM, BCP..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>

      <div className="flex-1" />

      <button
        onClick={handleSync}
        disabled={syncing}
        title="Synchroniser les cotations"
        className="p-2 text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-50"
      >
        <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
      </button>

      <button onClick={onToggleDark} className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}
