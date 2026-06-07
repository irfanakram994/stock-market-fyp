export interface StockCatalogItem {
  symbol: string;
  name: string;
}

const LAST_STOCK_STORAGE_KEY = "tradeflux:lastStockSymbol";

export const STOCK_CATALOG: StockCatalogItem[] = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms, Inc." },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "NFLX", name: "Netflix, Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices, Inc." },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "ORCL", name: "Oracle Corporation" },
  { symbol: "CRM", name: "Salesforce, Inc." },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "CSCO", name: "Cisco Systems, Inc." },
  { symbol: "QCOM", name: "QUALCOMM Incorporated" },
  { symbol: "IBM", name: "International Business Machines Corporation" },
  { symbol: "TXN", name: "Texas Instruments Incorporated" },
  { symbol: "AMAT", name: "Applied Materials, Inc." },
  { symbol: "MU", name: "Micron Technology, Inc." },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "BAC", name: "Bank of America Corporation" },
  { symbol: "WFC", name: "Wells Fargo & Company" },
  { symbol: "C", name: "Citigroup Inc." },
  { symbol: "GS", name: "Goldman Sachs Group, Inc." },
  { symbol: "MS", name: "Morgan Stanley" },
  { symbol: "BLK", name: "BlackRock, Inc." },
  { symbol: "SCHW", name: "Charles Schwab Corporation" },
  { symbol: "AXP", name: "American Express Company" },
  { symbol: "USB", name: "U.S. Bancorp" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "MA", name: "Mastercard Incorporated" },
  { symbol: "PYPL", name: "PayPal Holdings, Inc." },
  { symbol: "SQ", name: "Block, Inc." },
  { symbol: "COF", name: "Capital One Financial Corporation" },
  { symbol: "BK", name: "Bank of New York Mellon Corporation" },
  { symbol: "TFC", name: "Truist Financial Corporation" },
  { symbol: "PNC", name: "PNC Financial Services Group, Inc." },
  { symbol: "AIG", name: "American International Group, Inc." },
  { symbol: "MET", name: "MetLife, Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "PFE", name: "Pfizer Inc." },
  { symbol: "MRK", name: "Merck & Co., Inc." },
  { symbol: "ABBV", name: "AbbVie Inc." },
  { symbol: "LLY", name: "Eli Lilly and Company" },
  { symbol: "TMO", name: "Thermo Fisher Scientific Inc." },
  { symbol: "DHR", name: "Danaher Corporation" },
  { symbol: "ABT", name: "Abbott Laboratories" },
  { symbol: "BMY", name: "Bristol Myers Squibb Company" },
  { symbol: "CVS", name: "CVS Health Corporation" },
  { symbol: "UNH", name: "UnitedHealth Group Incorporated" },
  { symbol: "CI", name: "The Cigna Group" },
  { symbol: "HUM", name: "Humana Inc." },
  { symbol: "GILD", name: "Gilead Sciences, Inc." },
  { symbol: "AMGN", name: "Amgen Inc." },
  { symbol: "ISRG", name: "Intuitive Surgical, Inc." },
  { symbol: "VRTX", name: "Vertex Pharmaceuticals Incorporated" },
  { symbol: "REGN", name: "Regeneron Pharmaceuticals, Inc." },
  { symbol: "SYK", name: "Stryker Corporation" },
  { symbol: "MDT", name: "Medtronic plc" },
  { symbol: "XOM", name: "Exxon Mobil Corporation" },
  { symbol: "CVX", name: "Chevron Corporation" },
  { symbol: "COP", name: "ConocoPhillips" },
  { symbol: "SLB", name: "Schlumberger Limited" },
  { symbol: "EOG", name: "EOG Resources, Inc." },
  { symbol: "MPC", name: "Marathon Petroleum Corporation" },
  { symbol: "PSX", name: "Phillips 66" },
  { symbol: "VLO", name: "Valero Energy Corporation" },
  { symbol: "OXY", name: "Occidental Petroleum Corporation" },
  { symbol: "HAL", name: "Halliburton Company" },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "COST", name: "Costco Wholesale Corporation" },
  { symbol: "HD", name: "The Home Depot, Inc." },
  { symbol: "LOW", name: "Lowe's Companies, Inc." },
  { symbol: "TGT", name: "Target Corporation" },
  { symbol: "NKE", name: "NIKE, Inc." },
  { symbol: "SBUX", name: "Starbucks Corporation" },
  { symbol: "MCD", name: "McDonald's Corporation" },
  { symbol: "KO", name: "The Coca-Cola Company" },
  { symbol: "PEP", name: "PepsiCo, Inc." },
  { symbol: "DIS", name: "The Walt Disney Company" },
  { symbol: "CMCSA", name: "Comcast Corporation" },
  { symbol: "TMUS", name: "T-Mobile US, Inc." },
  { symbol: "VZ", name: "Verizon Communications Inc." },
  { symbol: "T", name: "AT&T Inc." },
  { symbol: "CHTR", name: "Charter Communications, Inc." },
  { symbol: "EA", name: "Electronic Arts Inc." },
  { symbol: "TTWO", name: "Take-Two Interactive Software, Inc." },
  { symbol: "ROKU", name: "Roku, Inc." },
  { symbol: "SPOT", name: "Spotify Technology S.A." },
  { symbol: "CAT", name: "Caterpillar Inc." },
  { symbol: "DE", name: "Deere & Company" },
  { symbol: "GE", name: "GE Aerospace" },
  { symbol: "HON", name: "Honeywell International Inc." },
  { symbol: "MMM", name: "3M Company" },
  { symbol: "BA", name: "The Boeing Company" },
  { symbol: "LMT", name: "Lockheed Martin Corporation" },
  { symbol: "RTX", name: "RTX Corporation" },
  { symbol: "UPS", name: "United Parcel Service, Inc." },
  { symbol: "FDX", name: "FedEx Corporation" },
  { symbol: "OGDC", name: "Oil & Gas Development Company Limited" },
  { symbol: "PPL", name: "Pakistan Petroleum Limited" },
  { symbol: "POL", name: "Pakistan Oilfields Limited" },
  { symbol: "MARI", name: "Mari Energies Limited" },
  { symbol: "PSO", name: "Pakistan State Oil Company Limited" },
  { symbol: "LUCK", name: "Lucky Cement Limited" },
  { symbol: "DGKC", name: "D.G. Khan Cement Company Limited" },
  { symbol: "MLCF", name: "Maple Leaf Cement Factory Limited" },
  { symbol: "FCCL", name: "Fauji Cement Company Limited" },
  { symbol: "CHCC", name: "Cherat Cement Company Limited" },
  { symbol: "FFC", name: "Fauji Fertilizer Company Limited" },
  { symbol: "EFERT", name: "Engro Fertilizers Limited" },
  { symbol: "ENGRO", name: "Engro Corporation Limited" },
  { symbol: "FATIMA", name: "Fatima Fertilizer Company Limited" },
  { symbol: "FFBL", name: "Fauji Fertilizer Bin Qasim Limited" },
  { symbol: "HUBC", name: "The Hub Power Company Limited" },
  { symbol: "KEL", name: "K-Electric Limited" },
  { symbol: "NCPL", name: "Nishat Chunian Power Limited" },
  { symbol: "KAPCO", name: "Kot Addu Power Company Limited" },
  { symbol: "PKGP", name: "Pakgen Power Limited" },
  { symbol: "HBL", name: "Habib Bank Limited" },
  { symbol: "MCB", name: "MCB Bank Limited" },
  { symbol: "UBL", name: "United Bank Limited" },
  { symbol: "BAFL", name: "Bank Alfalah Limited" },
  { symbol: "MEBL", name: "Meezan Bank Limited" },
  { symbol: "NBP", name: "National Bank of Pakistan" },
  { symbol: "BOP", name: "The Bank of Punjab" },
  { symbol: "AKBL", name: "Askari Bank Limited" },
  { symbol: "FABL", name: "Faysal Bank Limited" },
  { symbol: "HMB", name: "Habib Metropolitan Bank Limited" },
  { symbol: "SYS", name: "Systems Limited" },
  { symbol: "TRG", name: "TRG Pakistan Limited" },
  { symbol: "AVN", name: "Avanceon Limited" },
  { symbol: "NETSOL", name: "NetSol Technologies Limited" },
  { symbol: "OCTOPUS", name: "Octopus Digital Limited" },
  { symbol: "SEARL", name: "The Searle Company Limited" },
  { symbol: "GLAXO", name: "GlaxoSmithKline Pakistan Limited" },
  { symbol: "ABOT", name: "Abbott Laboratories Pakistan Limited" },
  { symbol: "AGP", name: "AGP Limited" },
];

export const PROJECT_STOCK_SYMBOLS = STOCK_CATALOG.map((stock) => stock.symbol);

export function formatStockOption(stock: StockCatalogItem) {
  return `${stock.symbol} - ${stock.name || stock.symbol}`;
}

export function mergeStockOptions(extraStocks: StockCatalogItem[] = []) {
  const stockMap = new Map<string, StockCatalogItem>();

  for (const stock of STOCK_CATALOG) {
    stockMap.set(stock.symbol, stock);
  }

  for (const stock of extraStocks) {
    const symbol = stock.symbol.trim().toUpperCase();
    if (!symbol) continue;
    const name = stock.name?.trim() || symbol;
    stockMap.set(symbol, { symbol, name });
  }

  return Array.from(stockMap.values()).sort((a, b) =>
    a.symbol.localeCompare(b.symbol),
  );
}

export function getLastSelectedStockSymbol(defaultSymbol = "AAPL") {
  if (typeof window === "undefined") return defaultSymbol;

  const stored = window.localStorage.getItem(LAST_STOCK_STORAGE_KEY);
  return stored?.trim().toUpperCase() || defaultSymbol;
}

export function saveLastSelectedStockSymbol(symbol: string) {
  if (typeof window === "undefined") return;

  const cleanSymbol = symbol.trim().toUpperCase();
  if (cleanSymbol) {
    window.localStorage.setItem(LAST_STOCK_STORAGE_KEY, cleanSymbol);
  }
}
