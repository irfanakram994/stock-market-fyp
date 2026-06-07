import { NextRequest, NextResponse } from "next/server";
import { runAgentSync, runPredictionAgent } from "@/lib/agentRunner";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/userAuth";

/** POST /api/agents/run - Execute Python agents (Prophet, OpenAI/Groq LLM, News) - NO DB */
export async function POST(request: NextRequest) {
  let logId: string | null = null;
  const startedAt = Date.now();

  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { agent, symbol, forecastDays = 30 } = body;

    if (!agent || !symbol) {
      return NextResponse.json(
        { success: false, error: "Agent and symbol are required" },
        { status: 400 },
      );
    }

    const symbolUpper = symbol.toString().toUpperCase();
    const agentName =
      agent === "prediction"
        ? "PredictionAgent"
        : `${String(agent).charAt(0).toUpperCase()}${String(agent).slice(1)}Agent`;

    const runningLog = await prisma.agentLog.create({
      data: {
        userId: user.id,
        agentName,
        status: "running",
        input: { agent, symbol: symbolUpper, forecastDays },
      },
    });
    logId = runningLog.id;

    const result =
      agent === "prediction"
        ? await runPredictionAgent(symbolUpper, forecastDays)
        : await runAgentSync(agent, symbolUpper, forecastDays);

    if (!result.success) {
      await prisma.agentLog.update({
        where: { id: runningLog.id },
        data: {
          status: "failed",
          error: result.error || "Agent failed",
          duration: Date.now() - startedAt,
          completedAt: new Date(),
        },
      });

      return NextResponse.json(
        { success: false, error: result.error || "Agent failed" },
        { status: 500 },
      );
    }

    const data =
      agent === "prediction"
        ? {
            symbol: (result as any).symbol,
            currentPrice: (result as any).currentPrice,
            predictions: (result as any).predictions,
            trend: (result as any).trend,
            insight: (result as any).insight,
            sentimentScore: (result as any).sentimentScore,
          }
        : (result as any).data;

    await prisma.agentLog.update({
      where: { id: runningLog.id },
      data: {
        status: "completed",
        output: data,
        duration: Date.now() - startedAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error running agent:", error);
    if (logId) {
      try {
        await prisma.agentLog.update({
          where: { id: logId },
          data: {
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
            duration: Date.now() - startedAt,
            completedAt: new Date(),
          },
        });
      } catch (logError) {
        console.error("Error updating failed agent log:", logError);
      }
    }
    return NextResponse.json(
      { success: false, error: "Failed to run agent" },
      { status: 500 },
    );
  }
}
