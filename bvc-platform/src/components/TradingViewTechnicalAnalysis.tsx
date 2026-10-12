'use client';

import { useEffect, useRef } from 'react';

interface Props {
  symbol: string;   // ex: "CSEMA:ATW"
  isDark?: boolean;
}

export default function TradingViewTechnicalAnalysis({ symbol, isDark = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type  = 'text/javascript';
    script.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.async = true;
    script.textContent = JSON.stringify({
      interval:         '1D',
      width:            '100%',
      isTransparent:    true,
      height:           425,
      symbol,
      showIntervalTabs: true,
      displayMode:      'single',
      locale:           'fr',
      colorTheme:       isDark ? 'dark' : 'light',
    });
    container.appendChild(script);

    return () => { container.innerHTML = ''; };
  }, [symbol, isDark]);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ minHeight: 425 }}
    />
  );
}
