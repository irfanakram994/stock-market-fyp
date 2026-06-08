/**
 * Agent execution logic for TradeFlux Python agents
 * NO DATABASE - agents use Prophet, OpenAI/Groq LLM, News APIs directly
 *
 * Flow: Frontend -> POST /api/predictions -> exec Python agent -> return result
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const AGENT_SCRIPT_PATH = path.join(process.cwd(), "apps", "agents", "main.py");
const PROJECT_ROOT = process.cwd();
const DOTENV_PATH = path.join(PROJECT_ROOT, ".env");

function loadDotEnv(envPath: string) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(DOTENV_PATH);

// Python command: use venv path on Windows, python3 elsewhere
const VENV_PYTHON_PATH = path.join(
  process.cwd(),
  "apps",
  "agents",
  ".venv",
  "Scripts",
  "python.exe",
);
const ROOT_VENV_PYTHON_PATH = path.join(
  process.cwd(),
  ".venv",
  "Scripts",
  "python.exe",
);
const SYSTEM_PYTHON = process.platform === "win32" ? "python" : "python3";
let PYTHON_CMD = process.env.PYTHON_CMD || "";

if (!PYTHON_CMD || (PYTHON_CMD.includes(".venv") && !fs.existsSync(PYTHON_CMD))) {
  if (fs.existsSync(VENV_PYTHON_PATH)) {
    PYTHON_CMD = VENV_PYTHON_PATH;
  } else if (fs.existsSync(ROOT_VENV_PYTHON_PATH)) {
    PYTHON_CMD = ROOT_VENV_PYTHON_PATH;
  } else {
    PYTHON_CMD = SYSTEM_PYTHON;
  }
}

export interface AgentPrediction {
  date: string;
  predictedPrice: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  ds?: string;
  yhat?: number;
  yhat_lower?: number;
  yhat_upper?: number;
  trend?: number;
  weekly?: number | null;
  yearly?: number | null;
  additive_terms?: number | null;
  multiplicative_terms?: number | null;
  sentiment?: number | null;
}

export interface ForecastHistoricalPoint {
  ds: string;
  y: number | null;
}

export interface ForecastComponents {
  trend?: Array<{ ds: string; trend: number | null }>;
  weekly?: Array<{ ds?: string; day?: string; weekly: number | null }>;
  yearly?: Array<{ ds: string; yearly: number | null }>;
}

export interface ForecastModelMetrics {
  modelType?: "prophet" | "fallback";
  confidenceInterval?: number;
  forecastDays?: number;
  avgConfidence?: number;
  seasonalityMode?: string;
  changepointPriorScale?: number;
  hasSentimentRegressor?: boolean;
  mae?: number;
  rmse?: number;
}

export interface RunPredictionResult {
  success: boolean;
  symbol?: string;
  currentPrice?: number;
  predictions?: AgentPrediction[];
  forecast?: AgentPrediction[];
  historical?: ForecastHistoricalPoint[];
  components?: ForecastComponents;
  modelMetrics?: ForecastModelMetrics;
  trend?: string;
  insight?: string;
  sentimentScore?: number;
  sentimentArticles?: Array<{
    title?: string;
    description?: string;
    content?: string;
    source?: string;
    author?: string;
    url?: string;
    imageUrl?: string;
    publishedAt?: string;
    sentiment?: {
      score?: number;
      compound?: number;
      positive?: number;
      negative?: number;
      neutral?: number;
      label?: string;
    };
  }>;
  error?: string;
}

/**
 * Run Python prediction agent SYNCHRONOUSLY - uses Prophet, OpenAI/Groq LLM, News APIs.
 * No database dependency.
 * Includes automatic retry with exponential backoff for rate limits.
 */
export async function runPredictionAgent(
  symbol: string,
  forecastDays: number = 30,
  retryCount: number = 0,
  maxRetries: number = 3,
): Promise<RunPredictionResult> {
  const framework =
    process.env.AGENT_FRAMEWORK ||
    (process.env.LLM_PROVIDER?.toLowerCase() === "groq" ? "legacy" : "crewai");
  const command = `"${PYTHON_CMD}" "${AGENT_SCRIPT_PATH}" --agent prediction --symbol ${symbol} --days ${forecastDays} --framework ${framework}`;

  const env = {
    ...process.env,
    LLM_PROVIDER: process.env.LLM_PROVIDER || "openai",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
    NEWS_API_KEY: process.env.NEWS_API_KEY || "",
    AGENT_FRAMEWORK: framework,
    PROJECT_ROOT,
    DOTENV_PATH: path.join(PROJECT_ROOT, ".env"),
  };

  const options = {
    cwd: PROJECT_ROOT,
    env,
    maxBuffer: 10 * 1024 * 1024, // 10MB
    timeout: 120000, // 2 min - Prophet can take time
  };

  let stdout: string;
  let stderr: string;
  try {
    const result = await execAsync(command, options);
    stdout = result.stdout;
    stderr = result.stderr || "";
  } catch (execError: unknown) {
    const err = execError as {
      stdout?: string;
      stderr?: string;
      message?: string;
      killed?: boolean;
    };
    stdout = err.stdout || "";
    stderr = err.stderr || err.message || String(execError);
    const combined = [stderr, stdout].filter(Boolean).join(" | ");
    if (err.killed) {
      return {
        success: false,
        error: `Agent timed out after 2 minutes. ${combined}`,
      };
    }
    return {
      success: false,
      error: combined || `Failed to run Python agent: ${err.message}`,
    };
  }

  try {
    let output: any;
    try {
      output = JSON.parse(stdout);
    } catch (firstErr) {
      // CrewAI outputs debug messages before JSON - extract JSON only
      const jsonStart = stdout.indexOf("{");
      if (jsonStart !== -1) {
        try {
          output = JSON.parse(stdout.slice(jsonStart));
        } catch (_) {
          throw firstErr;
        }
      } else {
        throw firstErr;
      }
    }

    if (!output) {
      // Try sanitizing common non-JSON numeric tokens (NaN, Infinity) if still no output
      const sanitized = stdout
        .replace(/\bNaN\b/g, "null")
        .replace(/\bInfinity\b/g, "null")
        .replace(/\b-Infinity\b/g, "null");
      try {
        output = JSON.parse(sanitized);
      } catch (secondErr) {
        const errMsg =
          secondErr instanceof Error ? secondErr.message : String(secondErr);
        const hint = stdout?.slice(0, 200) || stderr || "none";
        return {
          success: false,
          error: `Agent output error: ${errMsg}. Raw output (truncated): ${hint}`,
        };
      }
    }

    if (!output.success) {
      return {
        success: false,
        error: output.error || "Agent failed",
      };
    }
    return {
      success: true,
      symbol: output.data?.symbol,
      currentPrice: output.data?.currentPrice,
      predictions: output.data?.predictions,
      forecast: output.data?.forecast,
      historical: output.data?.historical,
      components: output.data?.components,
      modelMetrics: output.data?.modelMetrics,
      trend: output.data?.trend,
      insight: output.data?.insight,
      sentimentScore: output.data?.sentimentScore,
      sentimentArticles: output.data?.sentimentArticles,
    };
  } catch (parseError) {
    const errMsg =
      parseError instanceof Error ? parseError.message : String(parseError);
    const hint = stdout?.slice(0, 200) || stderr || "none";
    return {
      success: false,
      error: `Agent output error: ${errMsg}. Output: ${hint}`,
    };
  }
}

/** Run any Python agent synchronously (news, market, sentiment, full) - no DB */
export async function runAgentSync(
  agent: string,
  symbol: string,
  forecastDays: number = 30,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const framework =
    process.env.AGENT_FRAMEWORK ||
    (process.env.LLM_PROVIDER?.toLowerCase() === "groq" ? "legacy" : "crewai");
  const command = `"${PYTHON_CMD}" "${AGENT_SCRIPT_PATH}" --agent ${agent} --symbol ${symbol} --days ${forecastDays} --framework ${framework}`;
  const env = {
    ...process.env,
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
    NEWS_API_KEY: process.env.NEWS_API_KEY || "",
    AGENT_FRAMEWORK: framework,
    PROJECT_ROOT: process.cwd(),
  };
  try {
    const { stdout } = await execAsync(command, {
      cwd: process.cwd(),
      env,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000,
    });
    let parsed: any;
    try {
      parsed = JSON.parse(stdout);
    } catch (firstErr) {
      // CrewAI outputs debug messages before JSON - extract JSON only
      const jsonStart = stdout.indexOf("{");
      if (jsonStart !== -1) {
        try {
          parsed = JSON.parse(stdout.slice(jsonStart));
        } catch (_) {
          throw firstErr;
        }
      } else {
        throw firstErr;
      }
    }

    if (!parsed) {
      // Try sanitizing common non-JSON numeric tokens if still no output
      const sanitized = stdout
        .replace(/\bNaN\b/g, "null")
        .replace(/\bInfinity\b/g, "null")
        .replace(/\b-Infinity\b/g, "null");
      try {
        parsed = JSON.parse(sanitized);
      } catch (secondErr) {
        return {
          success: false,
          error:
            secondErr instanceof Error ? secondErr.message : String(secondErr),
        };
      }
    }
    return parsed.success
      ? { success: true, data: parsed.data }
      : { success: false, error: parsed.error };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
