/**
 * Agent execution logic for TradeFlux Python agents
 * NO DATABASE - agents use Prophet, Groq, News APIs directly
 *
 * Flow: Frontend -> POST /api/predictions -> exec Python agent -> return result
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const AGENT_SCRIPT_PATH = path.join(process.cwd(), 'apps', 'agents', 'main.py');
const PROJECT_ROOT = process.cwd();

// Python command: use env override, else python on Windows, python3 elsewhere
const PYTHON_CMD = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');

export interface AgentPrediction {
  date: string;
  predictedPrice: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface RunPredictionResult {
  success: boolean;
  symbol?: string;
  currentPrice?: number;
  predictions?: AgentPrediction[];
  trend?: string;
  insight?: string;
  sentimentScore?: number;
  error?: string;
}

/**
 * Run Python prediction agent SYNCHRONOUSLY - uses Prophet, Groq, News APIs.
 * No database dependency.
 */
export async function runPredictionAgent(
  symbol: string,
  forecastDays: number = 30
): Promise<RunPredictionResult> {
  const command = `${PYTHON_CMD} "${AGENT_SCRIPT_PATH}" --agent prediction --symbol ${symbol} --days ${forecastDays}`;

  const env = {
    ...process.env,
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    NEWS_API_KEY: process.env.NEWS_API_KEY || '',
    PROJECT_ROOT,
    DOTENV_PATH: path.join(PROJECT_ROOT, '.env'),
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
    stderr = result.stderr || '';
  } catch (execError: unknown) {
    const err = execError as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    stdout = err.stdout || '';
    stderr = err.stderr || err.message || String(execError);
    const combined = [stderr, stdout].filter(Boolean).join(' | ');
    if (err.killed) {
      return { success: false, error: `Agent timed out after 2 minutes. ${combined}` };
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
      // Attempt to sanitize common non-JSON numeric tokens produced by Python
      // (e.g., NaN, Infinity) which cause JSON.parse to fail.
      const sanitized = stdout
        .replace(/\bNaN\b/g, 'null')
        .replace(/\bInfinity\b/g, 'null')
        .replace(/\b-Infinity\b/g, 'null');
      try {
        output = JSON.parse(sanitized);
      } catch (secondErr) {
        const errMsg = secondErr instanceof Error ? secondErr.message : String(secondErr);
        const hint = stdout?.slice(0, 200) || stderr || 'none';
        return {
          success: false,
          error: `Agent output error: ${errMsg}. Raw output (truncated): ${hint}`,
        };
      }
    }

    if (!output.success) {
      return {
        success: false,
        error: output.error || 'Agent failed',
      };
    }
    return {
      success: true,
      symbol: output.data?.symbol,
      currentPrice: output.data?.currentPrice,
      predictions: output.data?.predictions,
      trend: output.data?.trend,
      insight: output.data?.insight,
      sentimentScore: output.data?.sentimentScore,
    };
  } catch (parseError) {
    const errMsg = parseError instanceof Error ? parseError.message : String(parseError);
    const hint = stdout?.slice(0, 200) || stderr || 'none';
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
  forecastDays: number = 30
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const command = `${PYTHON_CMD} "${AGENT_SCRIPT_PATH}" --agent ${agent} --symbol ${symbol} --days ${forecastDays}`;
  const env = { ...process.env, GROQ_API_KEY: process.env.GROQ_API_KEY || '', NEWS_API_KEY: process.env.NEWS_API_KEY || '', PROJECT_ROOT: process.cwd() };
  try {
    const { stdout } = await execAsync(command, { cwd: process.cwd(), env, maxBuffer: 10 * 1024 * 1024, timeout: 120000 });
    let parsed: any;
    try {
      parsed = JSON.parse(stdout);
    } catch (firstErr) {
      const sanitized = stdout
        .replace(/\bNaN\b/g, 'null')
        .replace(/\bInfinity\b/g, 'null')
        .replace(/\b-Infinity\b/g, 'null');
      try {
        parsed = JSON.parse(sanitized);
      } catch (secondErr) {
        return { success: false, error: secondErr instanceof Error ? secondErr.message : String(secondErr) };
      }
    }
    return parsed.success ? { success: true, data: parsed.data } : { success: false, error: parsed.error };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
