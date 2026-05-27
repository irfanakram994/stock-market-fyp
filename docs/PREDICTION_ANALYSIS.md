# TradeFlux Prediction Flow – Analysis & Fixes

## Why Predictions May Not Be Working

### Full Flow (Frontend → Prediction)

```
1. User clicks "Run Prediction" on AI Predictions page
2. runPrediction(symbol, days) → POST /api/predictions
3. API calls runPredictionAgent() → exec: py -3 apps/agents/main.py --agent prediction --symbol AAPL --days 30
4. Python: Config.validate() → AgentOrchestrator.run_full_prediction()
5. Orchestrator runs: Market → News → Sentiment → Preprocess → Prophet → Groq LLM → Report
6. Python prints JSON to stdout
7. Node parses JSON and returns to frontend
```

---

## Issues Found & Fixed

### 1. Config errors hidden (FIXED)
- **Problem:** When `GROQ_API_KEY` or `NEWS_API_KEY` is missing, Python printed to stdout and exited. Node expected only JSON on stdout, so `JSON.parse(stdout)` failed with a generic error.
- **Fix:** Config validation now writes to stderr. Agent runner now includes both stdout and stderr in error messages.

### 2. Python command on Windows (CHECK)
- **Problem:** `py -3` may not exist; `python3` is uncommon on Windows.
- **Fix:** Add `PYTHON_CMD=python` to `.env` if `py -3` fails.

### 3. Sentiment not passed to Prophet (FIXED)
- **Problem:** Orchestrator passed raw `news_data` to `merge_data` instead of sentiment-enriched articles. Prophet never received sentiment as a regressor.
- **Fix:** Now passes `sentiment_result['data']['articles']` (with sentiment scores) to `merge_data`.

### 4. Pandas deprecation (FIXED)
- **Problem:** `fillna(method='ffill')` deprecated in pandas 2.2.
- **Fix:** Replaced with `ffill()` and `bfill()`.

### 5. Error visibility (FIXED)
- **Problem:** Real errors (config, Python crashes) were not surfaced to the user.
- **Fix:** Agent runner now combines stdout + stderr in error messages and shows first 200 chars of output on parse failure.

---

## Checklist: What You Need for Predictions to Work

| Requirement | Status |
|-------------|--------|
| **Python 3.11+** | Must be in PATH |
| **GROQ_API_KEY** | Required in `.env` |
| **NEWS_API_KEY** | Required in `.env` |
| **Python deps** | `pip install -r apps/agents/requirements.txt` |
| **Run from project root** | `npm run dev` from FYP-1 |

---

## Manual Test (Diagnose Issues)

Run from project root:

```powershell
# Windows - try py -3 first
py -3 apps/agents/main.py --agent prediction --symbol AAPL --days 30

# If that fails, try python
python apps/agents/main.py --agent prediction --symbol AAPL --days 30
```

- **If you see JSON output** → Python works; issue may be in Node/exec.
- **If you see "Configuration error"** → Check `.env` for GROQ_API_KEY and NEWS_API_KEY.
- **If you see "No data found"** → yfinance issue (symbol or network).
- **If you see "Module not found"** → Run `pip install -r apps/agents/requirements.txt`.

---

## API Keys

- **Groq:** https://console.groq.com
- **News API:** https://newsapi.org

Both keys must be in `.env` at the project root.
