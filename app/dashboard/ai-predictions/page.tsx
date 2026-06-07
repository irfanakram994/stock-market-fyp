"use client";

import { useEffect, useState } from "react";
import {
  Play,
  Loader,
  RefreshCw,
  Download,
  FileDown,
  FileJson,
} from "lucide-react";
import ForecastChart from "@/components/Charts/ForecastChart";
import { fetchRecentPredictions, runPrediction, Prediction } from "@/lib/api";
import { useSnackbar } from "@/components/SnackbarProvider";
import {
  downloadPredictionsCSV,
  downloadPredictionsJSON,
  formatPredictionData,
  type FullPredictionReport,
} from "@/lib/predictionExport";

interface StoredPrediction extends Prediction {
  symbol: string;
  name: string;
}

export default function AIPredictionsPage() {
  const { showSnackbar, updateSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [progress, setProgress] = useState(0);
  const [symbol, setSymbol] = useState("AAPL");
  const [days, setDays] = useState(30);
  const [predictions, setPredictions] = useState<StoredPrediction[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const availableSymbols = [
    "AAPL","MSFT","NVDA","AMZN","GOOGL","META","TSLA","NFLX","AMD","INTC",
    "AVGO","ORCL","CRM","ADBE","CSCO","QCOM","IBM","TXN","AMAT","MU",
    "JPM","BAC","WFC","C","GS","MS","BLK","SCHW","AXP","USB",
    "V","MA","PYPL","SQ","COF","BK","TFC","PNC","AIG","MET",
    "JNJ","PFE","MRK","ABBV","LLY","TMO","DHR","ABT","BMY","CVS",
    "UNH","CI","HUM","GILD","AMGN","ISRG","VRTX","REGN","SYK","MDT",
    "XOM","CVX","COP","SLB","EOG","MPC","PSX","VLO","OXY","HAL",
    "WMT","COST","HD","LOW","TGT","NKE","SBUX","MCD","KO","PEP",
    "DIS","CMCSA","TMUS","VZ","T","CHTR","EA","TTWO","ROKU","SPOT",
    "CAT","DE","GE","HON","MMM","BA","LMT","RTX","UPS","FDX",
    "OGDC","PPL","POL","MARI","PSO",
    "LUCK","DGKC","MLCF","FCCL","CHCC",
    "FFC","EFERT","ENGRO","FATIMA","FFBL",
    "HUBC","KEL","NCPL","KAPCO","PKGP",
    "HBL","MCB","UBL","BAFL","MEBL",
    "NBP","BOP","AKBL","FABL","HMB",
    "SYS","TRG","AVN","NETSOL","OCTOPUS",
    "SEARL","GLAXO","ABOT","AGP",
  ];

  // Load recent predictions from database on mount
  useEffect(() => {
    loadRecentPredictions();
  }, []);

  const loadRecentPredictions = async () => {
    setFetching(true);
    try {
      const data = await fetchRecentPredictions(20);

      if (data.success && data.data && data.data.length > 0) {
        // Map stored predictions to display format
        const mapped: StoredPrediction[] = data.data.map((p: any) => ({
          id: p.id,
          stockId: p.stockId || "",
          predictionDate: p.predictionDate,
          predictedPrice: p.predictedPrice,
          lowerBound: p.lowerBound,
          upperBound: p.upperBound,
          confidence: p.confidence,
          trend: p.trend,
          modelVersion: p.modelVersion,
          llmSummary: p.llmSummary,
          createdAt: p.createdAt,
          symbol: p.symbol,
          name: p.name,
        }));

        setPredictions(mapped);

        // Auto-select first stock's predictions
        if (mapped.length > 0 && !selectedSymbol) {
          setSelectedSymbol(mapped[0].symbol);
        }
      } else {
        setPredictions([]);
        if (!data.success) {
          showSnackbar({
            variant: "error",
            message: data.error || "Failed to load your recent predictions.",
          });
        }
      }
    } catch (error) {
      console.error("Failed to load predictions:", error);
      showSnackbar({
        variant: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load your recent predictions.",
      });
    } finally {
      setFetching(false);
    }
  };

  const handleRunPrediction = async () => {
    setLoading(true);
    setProgress(12);

    const snackbarId = showSnackbar({
      variant: "loading",
      message: `Running ${symbol} prediction. This can take a little while...`,
    });

    const interval = window.setInterval(() => {
      setProgress((current) => Math.min(current + 7, 92));
    }, 900);

    const res = await runPrediction(symbol, days);
    window.clearInterval(interval);
    setProgress(100);

    if (res.success && res.data?.predictions) {
      updateSnackbar(snackbarId, {
        variant: "success",
        message: res.message || "Prediction completed and saved to your history.",
      });

      // Reload predictions from database to get the stored ones
      await loadRecentPredictions();
      setSelectedSymbol(symbol);
    } else {
      const details = (res as any).details;
      updateSnackbar(snackbarId, {
        variant: "error",
        message: details || res.error || "Failed to run prediction.",
      });
    }

    setLoading(false);
    window.setTimeout(() => setProgress(0), 600);
  };

  // Filter predictions by selected symbol
  const filteredPredictions = selectedSymbol
    ? predictions.filter((p) => p.symbol === selectedSymbol)
    : predictions;

  // Build forecast chart data from predictions
  const forecastData = filteredPredictions
    .slice()
    .sort(
      (a, b) =>
        new Date(a.predictionDate).getTime() -
        new Date(b.predictionDate).getTime(),
    )
    .map((p) => ({
      date: new Date(p.predictionDate).toLocaleDateString("en-CA"),
      actual: null as number | null,
      predicted: p.predictedPrice,
      lower: p.lowerBound,
      upper: p.upperBound,
    }));

  const latestPrediction = filteredPredictions[0];
  const insight = latestPrediction?.llmSummary;

  // Get symbol options for prediction form and keep existing predicted stocks
  const symbolOptions = Array.from(
    new Set([...availableSymbols, ...predictions.map((p) => p.symbol)]),
  );

  useEffect(() => {
    if (symbolOptions.length > 0 && !symbolOptions.includes(symbol)) {
      setSymbol(symbolOptions[0]);
    }
  }, [symbolOptions, symbol]);

  const handleDownloadCSV = () => {
    if (filteredPredictions.length === 0) {
      showSnackbar({ variant: "warning", message: "No predictions available to download." });
      return;
    }

    const predictionData = formatPredictionData(forecastData);
    const latest = filteredPredictions[0];

    downloadPredictionsCSV(
      selectedSymbol || "predictions",
      predictionData,
      undefined,
      latest?.trend,
      latest?.llmSummary,
    );

    showSnackbar({ variant: "success", message: "CSV report downloaded successfully." });
  };

  const handleDownloadJSON = () => {
    if (filteredPredictions.length === 0) {
      showSnackbar({ variant: "warning", message: "No predictions available to download." });
      return;
    }

    const latest = filteredPredictions[0];
    const report: FullPredictionReport = {
      symbol: selectedSymbol || "predictions",
      generatedAt: new Date().toISOString(),
      trend: latest?.trend,
      insight: latest?.llmSummary,
      predictions: formatPredictionData(forecastData),
    };

    downloadPredictionsJSON(report);

    showSnackbar({ variant: "success", message: "JSON report downloaded successfully." });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Predictions</h1>
          <p className="text-gray-400">
            Prophet-based forecasting with LLM insights
          </p>
          <div className="mt-3 text-sm text-gray-500 max-w-2xl space-y-1">
            <p>
              Solid line = predicted price, dashed lines = lower/upper
              confidence.
            </p>
            <p>
              Hover over a point to see exact USD values. Use the dropdown to
              select a stock.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Download buttons */}
          {filteredPredictions.length > 0 && (
            <>
              <button
                onClick={handleDownloadCSV}
                className="px-4 py-2 bg-green-600/20 border border-green-600/50 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors flex items-center gap-2"
                title="Download as CSV"
              >
                <FileDown className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={handleDownloadJSON}
                className="px-4 py-2 bg-blue-600/20 border border-blue-600/50 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors flex items-center gap-2"
                title="Download as JSON"
              >
                <FileJson className="w-4 h-4" />
                JSON
              </button>
            </>
          )}
          <button
            onClick={loadRecentPredictions}
            disabled={fetching}
            className="px-4 py-2 bg-dark-200 border border-gray-700 rounded-lg hover:bg-dark-300 transition-colors flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Symbol Selector */}
      {symbolOptions.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-3">Select Stock</h3>
          <div className="flex flex-wrap gap-2">
            {symbolOptions.map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  setSelectedSymbol(sym);
                  setSymbol(sym);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedSymbol === sym
                    ? "bg-primary text-white"
                    : "bg-dark-200 text-gray-200 hover:bg-dark-300"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prediction Form */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Generate New Prediction</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Stock Symbol
            </label>
            <select
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                setSelectedSymbol(e.target.value);
              }}
              className="w-full px-4 py-2 bg-dark-200 border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-gray-200"
            >
              {symbolOptions.map((sym) => (
                <option
                  key={sym}
                  value={sym}
                  className="bg-slate-950 text-white"
                >
                  {sym}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Forecast Days
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-dark-200 border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-gray-200"
              min="7"
              max="90"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleRunPrediction}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Run Prediction
                </>
              )}
            </button>
          </div>
        </div>
        {loading && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-dark-200">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Forecast Chart */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">
          Price Forecast {selectedSymbol && `- ${selectedSymbol}`}
        </h3>
        {fetching ? (
          <div className="h-[350px] flex items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : forecastData.length > 0 ? (
          <ForecastChart data={forecastData} />
        ) : (
          <div className="h-[350px] flex items-center justify-center text-gray-400">
            {predictions.length === 0
              ? 'No predictions yet. Click "Run Prediction" to generate.'
              : `No predictions for ${selectedSymbol}. Select another stock or generate new predictions.`}
          </div>
        )}
      </div>

      {/* LLM Insight */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">AI Insight</h3>
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-gray-200 leading-relaxed whitespace-pre-line">
            {insight ||
              (filteredPredictions.length > 0
                ? `Based on the latest forecast for ${selectedSymbol}, the trend is ${latestPrediction?.trend || "neutral"} with a confidence of ${latestPrediction ? (latestPrediction.confidence * 100).toFixed(0) : "—"}%. Predicted price: $${latestPrediction?.predictedPrice?.toFixed(2) || "—"}.`
                : "No AI insights available yet. Run a prediction to generate insights.")}
          </p>
        </div>
      </div>

      {/* Prediction Details */}
      {latestPrediction && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card">
            <div className="text-sm text-gray-400 mb-1">Predicted Price</div>
            <div className="text-2xl font-bold text-primary">
              ${latestPrediction.predictedPrice.toFixed(2)}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400 mb-1">Confidence</div>
            <div className="text-2xl font-bold text-green-400">
              {(latestPrediction.confidence * 100).toFixed(0)}%
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400 mb-1">Range</div>
            <div className="text-2xl font-bold">
              ${latestPrediction.lowerBound.toFixed(2)} – $
              {latestPrediction.upperBound.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Recent Predictions List */}
      {predictions.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold mb-4">
            Recent Predictions ({predictions.length})
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {predictions.slice(0, 10).map((pred) => (
              <div
                key={pred.id}
                onClick={() => setSelectedSymbol(pred.symbol)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedSymbol === pred.symbol
                    ? "border-primary bg-primary/10"
                    : "border-gray-700 hover:bg-dark-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold">{pred.symbol}</div>
                    <div className="text-sm text-gray-400">
                      {new Date(pred.predictionDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">
                      ${pred.predictedPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {(pred.confidence * 100).toFixed(0)}% conf.
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
