'use client';

import { useEffect, useRef } from 'react';

interface Props {
  height?: number;
}

export default function TradingViewHeatmap({ height = 400 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container';
    wrapper.style.cssText = 'height:100%;width:100%;';

    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.cssText = 'height:calc(100% - 32px);width:100%;';
    wrapper.appendChild(inner);

    const script = document.createElement('script');
    script.type  = 'text/javascript';
    script.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
    script.async = true;
    script.text  = JSON.stringify({
      exchanges:         [],
      dataSource:        'AllMA',
      grouping:          'sector',
      blockSize:         'market_cap_basic',
      blockColor:        'change',
      locale:            'fr',
      colorTheme:        'dark',
      hasTopBar:         false,
      isDataSetEnabled:  false,
      isZoomEnabled:     true,
      hasSymbolTooltip:  true,
      width:             '100%',
      height:            '100%',
    });
    wrapper.appendChild(script);

    container.appendChild(wrapper);

    return () => { if (container) container.innerHTML = ''; };
  }, []);

  return <div ref={containerRef} style={{ height, width: '100%' }} />;
}
