'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, TrendingUp, BarChart3,
  X, ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

const navGroups = [
  {
    label: 'Marché',
    items: [
      { path: '/marche',    label: 'Actions BVC',     icon: TrendingUp },
      { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { path: '/performance', label: 'Performance', icon: BarChart3 },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (label: string) =>
    setCollapsed(p => ({ ...p, [label]: !p[label] }));

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed left-0 top-0 bottom-0 w-60
        bg-[#0f172a] border-r border-white/5
        flex flex-col z-30 transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:z-10
      `}>
        {/* Logo */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <polyline points="3,28 11,14 16,7 21,14 29,28" stroke="#C49A2E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
              <circle cx="16" cy="7" r="2.5" fill="#E4BA4A"/>
            </svg>
            <div>
              <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '0.1em' }} className="text-white font-bold text-sm leading-tight">Z<span style={{ color: '#C49A2E' }}>É</span>NITH</div>
              <div className="text-slate-500 text-[11px]">Bourse de Casablanca</div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navGroups.map(group => (
            <div key={group.label} className="mb-1">
              <button
                onClick={() => toggle(group.label)}
                className="w-full flex items-center justify-between px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-400 transition-colors"
              >
                {group.label}
                <ChevronDown
                  size={12}
                  className={`transition-transform ${collapsed[group.label] ? '-rotate-90' : ''}`}
                />
              </button>

              {!collapsed[group.label] && group.items.map(({ path, label, icon: Icon }) => {
                const active = pathname === path || pathname.startsWith(path + '/');
                return (
                  <Link
                    key={path}
                    href={path}
                    className={`
                      flex items-center gap-3 px-4 py-2 text-sm transition-colors
                      ${active
                        ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-500'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    `}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-white/5">
          <div className="text-xs text-slate-500">Données BVC</div>
          <div className="text-xs text-slate-600 mt-0.5">74+ titres cotés</div>
        </div>
      </aside>
    </>
  );
}
