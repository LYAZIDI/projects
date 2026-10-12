import axios from 'axios';

const { data } = await axios.post(
  'https://scanner.tradingview.com/morocco/scan',
  {
    columns: ['name','description','sector','industry'],
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    range: [0, 200],
  },
  {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      'Content-Type': 'application/json',
      'Origin': 'https://www.tradingview.com',
      'Referer': 'https://www.tradingview.com/',
    },
    timeout: 20000,
  }
);

const nullSector = data.data.filter(({ d }) => !d[2]);
const hasSector  = data.data.filter(({ d }) => !!d[2]);

console.log(`Avec secteur: ${hasSector.length} / ${data.data.length}`);
console.log(`Sans secteur: ${nullSector.length}`);
console.log('\nExemples avec secteur:');
hasSector.slice(0, 10).forEach(({ d }) =>
  console.log(`  ${String(d[0]).padEnd(6)} | ${String(d[2]).padEnd(25)} | ${d[3]}`)
);
console.log('\nSans secteur:');
nullSector.map(({ d }) => d[0]).join(', ').split('').slice(0, 200).join('') && console.log(' ', nullSector.map(({ d }) => d[0]).join(', '));
