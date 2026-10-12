'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    TradingView: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

interface Props {
  symbol:    string;
  isDark?:   boolean;
  height?:   number;
  compact?:  boolean;   // simplified, no toolbar (overview cadran)
  intraday?: boolean;   // full toolbar, 5-min intraday (index detail page)
}

export default function TradingViewChart({ symbol, isDark = false, height = 560, compact = false, intraday = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef        = useRef(`tv_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.id       = idRef.current;
    container.innerHTML = '';

    const init = () => {
      if (typeof window.TradingView === 'undefined') return;
      new window.TradingView.widget({
        autosize:            true,
        symbol,
        interval:            (compact || intraday) ? '5' : 'D',
        timezone:            'Africa/Casablanca',
        theme:               isDark ? 'dark' : 'light',
        style:               (compact || intraday) ? '3' : '1',
        locale:              'fr',
        toolbar_bg:          isDark ? '#161b22' : '#ffffff',
        enable_publishing:   false,
        withdateranges:      !compact,
        range:               (compact || intraday) ? '1D' : '12M',
        hide_side_toolbar:   compact,
        hide_top_toolbar:    compact,
        allow_symbol_change: false,
        save_image:          false,
        studies:             compact ? [] : intraday ? [] : [
          'RSI@tv-basicstudies',
          'MACD@tv-basicstudies',
          'Volume@tv-basicstudies',
        ],
        container_id: idRef.current,
      });
    };

    if (typeof window.TradingView !== 'undefined') {
      init();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[src*="tradingview.com/tv.js"]');
      if (existing) {
        existing.addEventListener('load', init, { once: true });
      } else {
        const script = document.createElement('script');
        script.src   = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.addEventListener('load', init, { once: true });
        document.head.appendChild(script);
      }
    }

    return () => { if (container) container.innerHTML = ''; };
  }, [symbol, isDark, compact]);

  return <div ref={containerRef} style={{ height }} />;
}
