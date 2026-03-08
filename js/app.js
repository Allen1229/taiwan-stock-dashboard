/**
 * 台灣股票資訊儀表板 — 主程式
 */

const APP = (() => {
  let sectorData = { top5: [], bottom5: [] };
  let isLoading = false;

  /* ──────────── 初始化 ──────────── */
  async function init() {
    bindEvents();
    await loadAll();
    hideLoadingOverlay();
  }

  function bindEvents() {
    document.getElementById('btnRefresh').addEventListener('click', refresh);
  }

  async function refresh() {
    if (isLoading) return;
    const btn = document.getElementById('btnRefresh');
    btn.classList.add('loading');
    await loadAll();
    btn.classList.remove('loading');
  }

  async function loadAll() {
    isLoading = true;
    let hasDemo = false;

    const [futures, taiex, otc, sectorFlow] = await Promise.all([
      API.fetchFutures(),
      API.fetchTAIEX(),
      API.fetchOTC(),
      API.fetchSectorFlow(),
    ]);

    renderFutures(futures);
    renderIndexStats('cardTaiex', taiex);
    renderIndexStats('cardOtc', otc);

    sectorData = sectorFlow;
    renderSectors();

    if (futures.isDemo || taiex.isDemo || otc.isDemo || sectorFlow.isDemo) hasDemo = true;

    // Update time
    const now = new Date();
    const timeStr = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    document.getElementById('updateTime').innerHTML =
      `<span class="dot"></span><span>最後更新：${timeStr}</span>`;

    document.getElementById('demoBanner').classList.toggle('show', hasDemo);
    isLoading = false;
  }

  /* ──────────── 渲染：均線狀態 ──────────── */
  function renderIndexStats(cardId, d) {
    const card = document.getElementById(cardId);
    card.classList.remove('skeleton');
    const dir = getDirection(d.change);
    card.className = `card ${dir}`;

    card.querySelector('.card-value').textContent = d.close;
    const changeEl = card.querySelector('.card-change');
    changeEl.className = `card-change ${dir}-text`;
    changeEl.innerHTML = `<span class="arrow">${dir === 'gain' ? '▲' : dir === 'loss' ? '▼' : '–'}</span> ${d.change} ${d.changePercent ? `(${d.changePercent})` : ''}`;

    const volPrefix = cardId === 'cardTaiex' ? 'tVol' : 'oVol';
    const datePrefix = cardId === 'cardTaiex' ? 'tDate' : 'oDate';
    
    const volText = d.volumeFormatted || API.fmtVolume(d.volume);
    document.getElementById(volPrefix).innerHTML = volText + volumeCompareHtml(d.volume, d.yesterdayVolume);
    document.getElementById(datePrefix).textContent = d.date;

    // 渲染均線
    const maPrefix = cardId === 'cardTaiex' ? 'tMA' : 'oMA';
    const closeVal = API.parseNum(d.close);
    
    [5, 10, 20, 60].forEach(p => {
      const maKey = `ma${p}`;
      const el = document.getElementById(maPrefix + p);
      if (!el || !d.mas || !d.mas[maKey]) return;
      
      const maVal = d.mas[maKey];
      const status = closeVal >= maVal ? 'above' : 'below';
      const statusText = closeVal >= maVal ? '站上' : '跌破';
      
      el.className = `ma-item ${status}`;
      el.querySelector('.status').textContent = `${statusText} (${maVal.toFixed(0)})`;
    });
  }

  /* ──────────── 渲染：台指期 ──────────── */
  function renderFutures(d) {
    const card = document.getElementById('cardFutures');
    card.classList.remove('skeleton');
    const dir = getDirection(d.change);
    card.className = `card ${dir}`;
    card.querySelector('.card-value').textContent = d.close;
    const changeEl = card.querySelector('.card-change');
    changeEl.className = `card-change ${dir}-text`;
    changeEl.innerHTML = `<span class="arrow">${dir === 'gain' ? '▲' : dir === 'loss' ? '▼' : '–'}</span> ${d.change}`;

    document.getElementById('fOpen').textContent = d.open;
    document.getElementById('fHigh').textContent = d.high;
    document.getElementById('fLow').textContent = d.low;
    document.getElementById('fVol').textContent = d.volume;
  }

  /* ──────────── 成交金額比較 ──────────── */
  function volumeCompareHtml(todayVol, yesterdayVol) {
    const today = parseNum(todayVol);
    const yesterday = parseNum(yesterdayVol);
    if (!yesterday || yesterday === 0) return '';
    const diff = today - yesterday;
    const pct = ((diff / yesterday) * 100).toFixed(1);
    if (diff > 0) return `<span class="vol-compare gain-text">▲ 較昨日 +${pct}%</span>`;
    if (diff < 0) return `<span class="vol-compare loss-text">▼ 較昨日 ${pct}%</span>`;
    return `<span class="vol-compare flat-text">— 與昨日持平</span>`;
  }

  /* ──────────── 渲染：產業資金流向 (Top 5 Inflow/Outflow) ──────────── */
  function renderSectors() {
    const grid = document.getElementById('sectorGrid');
    
    const headerHtml = `
      <div class="sector-periods-header">
        <div>產業名稱 (淨流向)</div>
        <div class="period-label">今日</div>
        <div class="period-label">3日</div>
        <div class="period-label">5日</div>
        <div class="period-label">10日</div>
        <div class="header-vol-label" style="text-align:right">成交值</div>
      </div>
    `;

    const mkBox = (val) => {
      const v = parseFloat(val);
      const dir = v > 0 ? 'gain' : v < 0 ? 'loss' : 'flat';
      const symbol = v > 0 ? '+' : '';
      return `<div class="period-box ${dir}">${symbol}${API.fmtVolume(v)}</div>`;
    };

    const renderRows = (list, title) => {
      if (list.length === 0) return '';
      const divider = `<div style="grid-column: 1 / -1; font-size: 0.75rem; color: var(--text-muted); padding: 8px 12px; border-bottom: 1px solid var(--border-glass); margin-top: 4px;">${title}</div>`;
      return divider + list.map((s, i) => `
        <div class="sector-bar" onclick="APP.selectSector('${s.sector}')">
          <div class="sector-name">${s.sector}</div>
          ${mkBox(s.periods.today)}
          ${mkBox(s.periods.d3)}
          ${mkBox(s.periods.d5)}
          ${mkBox(s.periods.d10)}
          <div class="sector-volume">${API.fmtVolume(s.volume)}</div>
        </div>
      `).join('');
    };

    grid.innerHTML = headerHtml + 
                     renderRows(sectorData.top5, '🚀 淨流入前五名') + 
                     renderRows(sectorData.bottom5, '📉 淨流出前五名');
  }

  /* ──────────── 選擇產業 → 載入成分股 ──────────── */
  async function selectSector(sectorName) {
    const panel = document.getElementById('stocksPanel');
    if (activeSector === sectorName) {
      activeSector = null; panel.classList.remove('open'); return;
    }
    activeSector = sectorName;
    document.getElementById('stocksSectorName').textContent = sectorName;
    const tbody = document.getElementById('stocksBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--text-muted)">載入中…</td></tr>';
    panel.classList.add('open');
    setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);

    const stocks = await API.fetchStocksBySector(sectorName);
    tbody.innerHTML = stocks.length === 0 ? '<tr><td colspan="5" style="text-align:center">查無資料</td></tr>' : 
      stocks.map(s => `<tr><td>${s.code}</td><td>${s.name}</td><td class="text-right">${s.price}</td><td class="text-right ${s.changeDir}-text">${s.change} (${s.changePct})</td><td class="text-right">${s.volume}</td></tr>`).join('');
  }

  /* ──────────── Helpers ──────────── */
  let activeSector = null;
  function getDirection(val) { const n = parseNum(val); return n > 0 ? 'gain' : n < 0 ? 'loss' : 'flat'; }
  function parseNum(val) { if (typeof val === 'number') return val; if (!val) return 0; return parseFloat(String(val).replace(/[,%+\s億萬兆]/g, '')) || 0; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function hideLoadingOverlay() { 
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) { overlay.classList.add('fade-out'); setTimeout(() => overlay.remove(), 600); }
  }

  return { init, selectSector };
})();

document.addEventListener('DOMContentLoaded', APP.init);
