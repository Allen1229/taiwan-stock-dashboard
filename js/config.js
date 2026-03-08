/**
 * 台灣股票資訊儀表板 — 設定檔
 */

const CONFIG = {
  // CORS Proxy（瀏覽器端跨域用）
  CORS_PROXY: 'https://corsproxy.io/?url=',

  // TWSE（臺灣證券交易所）
  TWSE: {
    // 每日市場成交資訊（含加權指數）
    MI_INDEX: 'https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX',
    // 全部個股日成交資訊（含股價、漲跌、成交量）
    STOCK_DAY_ALL: 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',
    // 每日收盤行情（全部）— 含 PER、殖利率、PBR
    STOCK_ALL: 'https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL',
    // 上市公司基本資料（含產業別代號）
    STOCK_INFO: 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L',
    // 類股指數彙總
    FRMSA: 'https://openapi.twse.com.tw/v1/exchangeReport/FMTQIK',
  },

  // TPEx（櫃買中心）
  TPEX: {
    // 每日市場概況
    INDEX: 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_peratio_analysis',
    // 櫃買指數統計
    SUMMARY: 'https://www.tpex.org.tw/openapi/v1/tpex_daily_market_report',
  },

  // TAIFEX（臺灣期貨交易所）
  TAIFEX: {
    // 期貨每日行情
    FUTURES_DAILY: 'https://openapi.taifex.com.tw/v1/DailyMarketReportFut',
  },

  // 產業類別
  SECTORS: [
    '水泥工業', '食品工業', '塑膠工業', '紡織纖維', '電機機械',
    '電器電纜', '化學工業', '生技醫療業', '化學生技醫療', '玻璃陶瓷',
    '造紙工業', '鋼鐵工業', '橡膠工業', '汽車工業', '電子工業',
    '半導體業', '電腦及週邊設備業', '光電業', '通信網路業', '電子零組件業',
    '電子通路業', '資訊服務業', '其他電子業', '建材營造業', '航運業',
    '觀光餐旅', '金融保險業', '貿易百貨業', '油電燃氣業', '綠能環保',
    '數位雲端', '運動休閒', '居家生活', '其他業',
  ],

  // 產業代碼 → 名稱對照（TWSE 產業別代碼）
  SECTOR_CODE_MAP: {
    '01': '水泥工業', '02': '食品工業', '03': '塑膠工業',
    '04': '紡織纖維', '05': '電機機械', '06': '電器電纜',
    '21': '化學工業', '22': '生技醫療業', '07': '玻璃陶瓷',
    '08': '造紙工業', '09': '鋼鐵工業', '10': '橡膠工業',
    '11': '汽車工業', '12': '電子工業', '24': '半導體業',
    '25': '電腦及週邊設備業', '26': '光電業', '27': '通信網路業',
    '28': '電子零組件業', '29': '電子通路業', '30': '資訊服務業',
    '31': '其他電子業', '14': '建材營造業', '15': '航運業',
    '16': '觀光餐旅', '17': '金融保險業', '18': '貿易百貨業',
    '23': '油電燃氣業', '32': '綠能環保', '33': '數位雲端',
    '34': '運動休閒', '35': '居家生活', '20': '其他業',
  },
};
