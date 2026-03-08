/**
 * 台灣股票資訊儀表板 — 資料擷取層
 */

const API = (() => {
  let _stockInfoCache = null;
  let _stockDayCache = null;

  async function safeFetch(url) {
    const proxies = [
      CONFIG.CORS_PROXY, // 您的 Cloudflare Worker (最優先)
      'https://api.allorigins.win/raw?url=', // 備援 1
    ];

    for (const prefix of proxies) {
      try {
        const fetchUrl = prefix ? prefix + encodeURIComponent(url) : url;
        const res = await fetch(fetchUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && !data.error && (Array.isArray(data) ? data.length > 0 : true)) return data;
        }
      } catch (_) {}
    }
    return null;
  }

  function rocToAD(dateStr) {
    if (!dateStr) return '--';
    const s = String(dateStr).replace(/[/\-]/g, '');
    if (s.length === 7 || s.length === 8) {
      const y = parseInt(s.substring(0, s.length - 4), 10) + 1911;
      const m = s.substring(s.length - 4, s.length - 2);
      const d = s.substring(s.length - 2);
      return `${y}/${m}/${d}`;
    }
    return dateStr;
  }

  function pick(obj, ...keys) {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    }
    return null;
  }

  function fmtVolume(val) {
    const v = parseFloat(val);
    const n = Math.abs(v || 0);
    const sign = v < 0 ? '-' : '';
    if (n >= 1e12) return sign + (n / 1e12).toFixed(1) + ' 兆';
    if (n >= 1e8) return sign + (n / 1e8).toFixed(1) + ' 億';
    if (n >= 1e4) return sign + (n / 1e4).toFixed(0) + ' 萬';
    return sign + n.toLocaleString();
  }

  function parseNum(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const s = String(val).replace(/[,%+\s億萬兆]/g, '').trim();
    return parseFloat(s) || 0;
  }

  function saveHistory(key, todayData, todayDate) {
    try {
      const storageKey = `tw_stock_vfinal_${key}`;
      let history = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const existingIdx = history.findIndex(h => h.date === todayDate);
      if (existingIdx !== -1) {
        history[existingIdx].data = todayData;
      } else {
        history.unshift({ date: todayDate, data: todayData });
        if (history.length > 60) history.pop();
      }
      localStorage.setItem(storageKey, JSON.stringify(history));
      return history;
    } catch (_) { return null; }
  }

  function calculateMAs(prices) {
    const calc = (p) => (prices.length >= p) ? (prices.slice(0, p).reduce((a,b)=>a+b,0)/p) : null;
    return { ma5: calc(5), ma10: calc(10), ma20: calc(20), ma60: calc(60) };
  }

  /* ──────────────── 代數定義 ──────────────── */
  async function fetchFutures() {
    const data = await safeFetch(CONFIG.TAIFEX.FUTURES_DAILY);
    if (!data || !Array.isArray(data)) return DEMO.futures;
    const row = data.find(r => r.ContractName && r.ContractName.trim() === '臺股期貨');
    if (!row) return DEMO.futures;
    return {
      name: '台指期 (TX)',
      deliveryMonth: row.DeliveryMonth || '',
      open: row.Open || '--',
      high: row.High || '--',
      low: row.Low || '--',
      close: row.SettlementPrice || row.Close || '--',
      change: row.Change || '--',
      volume: row.Volume || '--',
      date: row.Date || '',
      isDemo: false
    };
  }

  async function fetchTAIEX() {
    const data = await safeFetch(CONFIG.TWSE.MI_INDEX);
    if (!data || !Array.isArray(data)) return DEMO.taiex;

    // 嚴格過濾，必須是 "發行量加權股價指數" 且不含 "報酬" 
    const row = data.find(r => {
      const name = (pick(r, '指數', 'IndexName', '索引') || '').trim();
      return name === '發行量加權股價指數' || name === 'TAIEX';
    });

    if (!row || parseNum(pick(row, '收盤指數', 'ClosingIndex')) > 40000) {
      // 異常過高(可能是寶島指數) 則進入 DEMO
      return DEMO.taiex;
    }
    const rawDate = pick(row, '日期', 'Date') || '';
    const rawVolume = pick(row, '成交金額(元)', '成交金額', 'TradingValue') || '0';
    const closePrice = parseNum(pick(row, '收盤指數', 'ClosingIndex'));
    const history = saveHistory('taiex_p', closePrice, rawDate);
    const volHistory = saveHistory('taiex_v', rawVolume, rawDate);
    return {
      name: '加權指數 (TAIEX)',
      close: closePrice.toFixed(2),
      change: pick(row, '漲跌點數', 'Change') || '--',
      changePercent: pick(row, '漲跌百分比(%)', '漲跌百分比', 'ChangePercent') || '',
      volume: rawVolume,
      volumeFormatted: fmtVolume(rawVolume),
      yesterdayVolume: (volHistory && volHistory.length > 1) ? volHistory[1].data : null,
      date: rocToAD(rawDate),
      mas: calculateMAs(history.map(h => h.data)),
      isDemo: false
    };
  }

  async function fetchOTC() {
    const data = await safeFetch(CONFIG.TPEX.SUMMARY);
    if (!data || !Array.isArray(data) || data.length === 0) return DEMO.otc;
    const row = data[0];
    const rawVolume = row.TotalTradingValue || row.成交金額 || '0';
    const rawDate = row.Date || row.日期 || '';
    const closePrice = parseNum(row.ClosingIndex || row.收盤指數);
    const history = saveHistory('otc_p', closePrice, rawDate);
    const volHistory = saveHistory('otc_v', rawVolume, rawDate);
    return {
      name: '櫃買指數 (OTC)',
      close: closePrice.toFixed(2),
      change: row.Change || row.漲跌 || '--',
      changePercent: row.ChangePercent || row.漲跌百分比 || '',
      volume: rawVolume,
      volumeFormatted: fmtVolume(rawVolume),
      yesterdayVolume: (volHistory && volHistory.length > 1) ? volHistory[1].data : null,
      date: row.Date || row.日期 || '',
      mas: calculateMAs(history.map(h => h.data)),
      isDemo: false
    };
  }

  /* ──────────────── 產業資金流向 (BFTTQIK - 產業別成交統計) ──────────────── */
  async function fetchSectorFlow() {
    // 試著抓產業成交統計 BFTTQIK
    let data = await safeFetch('https://openapi.twse.com.tw/v1/exchangeReport/BFTTQIK');
    if (!data || !Array.isArray(data)) {
      // 備援抓 MI_INDEX
      data = await safeFetch(CONFIG.TWSE.MI_INDEX);
    }
    if (!data || !Array.isArray(data)) return DEMO.sectorFlow;

    const rawDate = pick(data[0], '日期', 'Date') || '';
    const sectors = data.map(r => {
      let name = (pick(r, '產業別', '指數', 'IndexName', '索引') || '').trim();
      if (!name || name.includes('報酬') || name.includes('加權股價指數') || name.includes('臺灣')) return null;
      name = name.replace('指數', '').trim();
      
      const matched = CONFIG.SECTORS.find(s => name.includes(s) || s.includes(name));
      if (!matched) return null;
      
      const vol = parseNum(pick(r, '成交金額(元)', '成交金額', 'TradingValue'));
      const chg = parseNum(pick(r, '漲跌百分比(%)', '漲跌百分比', 'ChangePercent'));
      
      return { sector: matched, volume: vol, changePercent: chg };
    }).filter(s => s && s.volume > 0);

    if (sectors.length < 5) return DEMO.sectorFlow;

    const history = saveHistory('sectors_vfinal', sectors, rawDate);
    const compute = (days) => {
      const res = {};
      const limit = Math.min(history.length, days);
      for (let i = 0; i < limit; i++) {
        history[i].data.forEach(s => {
          if (!res[s.sector]) res[s.sector] = 0;
          res[s.sector] += (s.changePercent >= 0 ? s.volume : -s.volume);
        });
      }
      return res;
    };

    const f10 = compute(10), fToday = compute(1), f3 = compute(3), f5 = compute(5);
    const results = Object.keys(f10).map(name => {
      const today = sectors.find(s => s.sector === name);
      return {
        sector: name, volume: today ? today.volume : 0,
        periods: { today: fToday[name] || 0, d3: f3[name] || 0, d5: f5[name] || 0, d10: f10[name] || 0 }
      };
    }).sort((a,b) => b.periods.d10 - a.periods.d10);

    return { top5: results.slice(0, 5), bottom5: results.slice(-5).reverse(), isDemo: false };
  }

  function sectorNameToCode(sectorName) {
    for (const [code, name] of Object.entries(CONFIG.SECTOR_CODE_MAP)) {
      if (name === sectorName || sectorName.includes(name)) return code;
    }
    return null;
  }

  async function fetchStocksBySector(sectorName) {
    const code = sectorNameToCode(sectorName);
    if (!code) return DEMO.getStocksBySector(sectorName);
    if (!_stockInfoCache) _stockInfoCache = await safeFetch(CONFIG.TWSE.STOCK_INFO);
    if (!_stockDayCache) _stockDayCache = await safeFetch(CONFIG.TWSE.STOCK_DAY_ALL);
    if (!_stockInfoCache || !_stockDayCache) return DEMO.getStocksBySector(sectorName);

    const industries = _stockInfoCache.filter(i => String(i['產業別'] || i['Industry']).trim() === code)
                                     .map(i => String(i['公司代號'] || i['Code']).trim());
    const codes = new Set(industries);
    const results = _stockDayCache.filter(r => codes.has(String(r['Code'] || r['證券代號']).trim())).slice(0, 50).map(r => {
      const cp = parseNum(r.ClosingPrice || r['收盤價']), ch = parseNum(r.Change || r['漲跌價差']);
      return {
        code: r.Code || r['證券代號'], name: r.Name || r['證券名稱'], price: cp.toFixed(2),
        change: (ch > 0 ? '+' : '') + ch.toFixed(2),
        changePct: (cp > 0 ? (ch/(cp-ch)*100).toFixed(2) : '0.00') + '%',
        changeDir: ch > 0 ? 'gain' : ch < 0 ? 'loss' : 'flat',
        volume: (parseNum(r.TradeVolume || r['成交股數'])/1000).toFixed(0)
      };
    });
    return results.length ? results : DEMO.getStocksBySector(sectorName);
  }

  return { fetchFutures, fetchTAIEX, fetchOTC, fetchSectorFlow, fetchStocksBySector, fmtVolume, parseNum };
})();

const DEMO = {
  futures: { name: '台指期 (TX)', deliveryMonth: '2026/03', open: '22,250', high: '22,380', low: '22,120', close: '22,280', change: '+130', volume: '98,452', date: '2026/03/08', isDemo: true },
  taiex: { name: '加權指數 (TAIEX)', close: '22,780.50', change: '+135.28', changePercent: '+0.61%', volume: '356700000000', volumeFormatted: '3,567 億', yesterdayVolume: '324500000000', date: '2026/03/06', mas: { ma5: 22600, ma10: 22550, ma20: 22400, ma60: 22100 }, isDemo: true },
  otc: { name: '櫃買指數 (OTC)', close: '235.78', change: '+2.15', changePercent: '+0.92%', volume: '81200000000', volumeFormatted: '812 億', yesterdayVolume: '75600000000', date: '2026/03/06', mas: { ma5: 232, ma10: 233, ma20: 230, ma60: 225 }, isDemo: true },
  sectorFlow: {
    top5: [
      { sector: '半導體業', volume: 124500000000, periods: { today: 124500000000, d3: 312000000000, d5: 456000000000, d10: 890000000000 } },
      { sector: '電腦設備', volume: 52300000000, periods: { today: 52300000000, d3: 145000000000, d5: 212000000000, d10: 456000000000 } },
      { sector: '金融保險', volume: 45600000000, periods: { today: 45600000000, d3: 123000000000, d5: 189000000000, d10: 345000000000 } },
      { sector: '電子零組件', volume: 28700000000, periods: { today: 28700000000, d3: 75000000000, d5: 112000000000, d10: 198000000000 } },
      { sector: '通信網路', volume: 19800000000, periods: { today: 19800000000, d3: 56000000000, d5: 78000000000, d10: 145000000000 } }
    ],
    bottom5: [
      { sector: '塑膠工業', volume: 11200000000, periods: { today: -11200000000, d3: -25600000000, d5: -34500000000, d10: -67800000000 } },
      { sector: '水泥工業', volume: 6700000000, periods: { today: -6700000000, d3: -12300000000, d5: -19800000000, d10: -38900000000 } },
      { sector: '航運業', volume: 16700000000, periods: { today: -16700000000, d3: -31200000000, d5: -45600000000, d10: -11200000000 } },
      { sector: '鋼鐵工業', volume: 15600000000, periods: { today: -15600000000, d3: -31200000000, d5: -45600000000, d10: -89000000000 } },
      { sector: '觀光餐旅', volume: 3400000000, periods: { today: -3400000000, d3: -8900000000, d5: -12300000000, d10: -24500000000 } }
    ],
    isDemo: true
  },
  getStocksBySector: () => []
};
