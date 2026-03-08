# 📈 台股資訊儀表板 (Taiwan Stock Dashboard)

這是一個專為台灣股市設計的「一頁式資訊工具」，旨在讓投資者能夠在一個頁面中快速掌握大盤走勢、期貨行情、以及細產業的資金流向。

![Dashboard Preview](https://via.placeholder.com/800x450?text=Taiwan+Stock+Dashboard+Preview)

## 🌟 核心功能

1.  **市場指數總覽**：
    *   **台指期 (TX)**：即時掌握期指開盤、最高、最低、收盤及成交量。
    *   **加權指數 (TAIEX)**：顯示今日收盤、漲跌幅，並提供 **MA5/10/20/60** 均線狀態（站上/跌破）。
    *   **櫃買指數 (OTC)**：同大盤提供收盤行情與均線趨勢判斷。
2.  **成交量動態比較**：
    *   自動計算今日指數成交值與前一交易日的增減比例（量增/量縮一目了然）。
3.  **資金流向與報酬排行 (Top 5)**：
    *   **淨流入/流出前五名**：根據成交值與漲跌幅計算近 10 日內資金最青睞或逃出的細產業。
    *   **多週期金額顯示**：並列顯示 **今日、3日、5日、10日** 的累積資金進出金額（如：+1,245 億）。
4.  **細產業成分股查詢**：
    *   點擊產業名稱即可展開該產業前 50 檔成分股的 **股價、漲跌幅（%）及成交量（張）**。

---

## 🚀 部署與設定說明

### 1. 部署到 GitHub Pages
1.  將此專案 Push 到您的 GitHub 儲存庫。
2.  在 GitHub 儲存庫設定 (Settings) -> Pages。
3.  選擇 `main` 分支並儲存，網址通常為 `https://<your-username>.github.io/<repo-name>/`。

### 2. 設定 Cloudflare Worker 中轉 (重要：解決 CORS 問題)
由於瀏覽器安全限制 (CORS)，直接從瀏覽器存取證交所 API 會失敗。建議透過 Cloudflare Worker 建立中轉：

1.  登入 [Cloudflare Dashboard](https://dash.cloudflare.com/) 建立一個新的 **Worker**。
2.  貼入專案中建議的 Proxy 腳本（見下方或原始碼中的說明）。
3.  在 `js/config.js` 中調整 `CORS_PROXY` 為您的 Worker 網址。

```javascript
// js/config.js 範例
const CONFIG = {
  CORS_PROXY: 'https://your-worker-name.workers.dev/?url=',
  // ...
};
```

---

## 🛠️ 技術架構
*   **Frontend**: 原生 HTML5, CSS3 (Glassmorphism 玻璃擬態設計), Vanilla JavaScript。
*   **API Sources**: 
    *   [TWSE 臺灣證券交易所](https://openapi.twse.com.tw/)
    *   [TPEx 櫃買中心](https://www.tpex.org.tw/openapi/)
    *   [TAIFEX 台灣期貨交易所](https://openapi.taifex.com.tw/)
*   **Caching**: 使用 `localStorage` 本地儲存累積歷史股價，用於計算移動平均線 (MA)。

---

## ⚠️ 免責聲明
本工具所提供的資料僅供參考，不構成任何投資建議。數據更新可能會有延遲，實際成交資訊請以各交易所公告為準。投資人應獨立判斷、謹慎評估並自負投資風險。
