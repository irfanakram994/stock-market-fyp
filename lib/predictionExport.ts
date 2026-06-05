/**
 * Prediction Export Utilities
 * Handles CSV and JSON export for prediction data
 */

export interface PredictionData {
    date: string;
    predictedPrice: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
}

export interface FullPredictionReport {
    symbol: string;
    generatedAt: string;
    currentPrice?: number;
    trend?: string;
    insight?: string;
    sentimentScore?: number;
    predictions: PredictionData[];
}

/**
 * Convert predictions array to CSV format
 */
export function predictionsToCSV(
    symbol: string,
    predictions: PredictionData[],
    currentPrice?: number,
    trend?: string,
    insight?: string
): string {
    // Create header with metadata as comments
    const lines: string[] = [];

    // Add metadata as CSV comments (lines starting with #)
    lines.push(`# Stock Symbol: ${symbol}`);
    if (currentPrice) {
        lines.push(`# Current Price: $${currentPrice.toFixed(2)}`);
    }
    if (trend) {
        lines.push(`# Trend: ${trend}`);
    }
    if (insight) {
        // Multi-line insight
        lines.push(`# AI Insight: ${insight.replace(/\n/g, ' ')}`);
    }
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push(''); // Empty line before data

    // CSV header
    lines.push('Date,Predicted Price,Lower Bound,Upper Bound,Confidence (%)');

    // Data rows
    predictions.forEach(pred => {
        const date = new Date(pred.date).toLocaleDateString('en-CA');
        const price = pred.predictedPrice.toFixed(2);
        const lower = pred.lowerBound.toFixed(2);
        const upper = pred.upperBound.toFixed(2);
        const confidence = (pred.confidence * 100).toFixed(1);

        lines.push(`${date},${price},${lower},${upper},${confidence}`);
    });

    return lines.join('\n');
}

/**
 * Download predictions as CSV file
 */
export function downloadPredictionsCSV(
    symbol: string,
    predictions: PredictionData[],
    currentPrice?: number,
    trend?: string,
    insight?: string
): void {
    const csv = predictionsToCSV(symbol, predictions, currentPrice, trend, insight);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${symbol}_predictions_${getTimestamp()}.csv`);
}

/**
 * Download full prediction report as JSON file
 */
export function downloadPredictionsJSON(report: FullPredictionReport): void {
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    downloadBlob(blob, `${report.symbol}_report_${getTimestamp()}.json`);
}

/**
 * Helper function to trigger browser download
 */
function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Get timestamp for filename
 */
function getTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
           now.toTimeString().split(' ')[0].replace(/:/g, '');
}

/**
 * Format prediction data from API response or chart data
 */
export function formatPredictionData(data: any): PredictionData[] {
    if (!data || !Array.isArray(data)) return [];

    return data.map(pred => ({
        date: pred.date || pred.predictionDate,
        predictedPrice: pred.predictedPrice || pred.predicted,
        lowerBound: pred.lowerBound || pred.lower,
        upperBound: pred.upperBound || pred.upper,
        confidence: pred.confidence || 0.68, // Default confidence if not provided
    }));
}
