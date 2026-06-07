import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuperAdminAuditLog, extractBearerToken, verifySuperAdminSession } from '@/lib/superAdminAuth';

const DEFAULT_THRESHOLDS = [
  {
    name: 'Minimum Prediction Confidence',
    category: 'prediction',
    value: 0.6,
    minValue: 0,
    maxValue: 1,
    description: 'Predictions below this confidence should be reviewed before users rely on them.',
  },
  {
    name: 'API Response Time Warning',
    category: 'performance',
    value: 2000,
    minValue: 100,
    maxValue: 10000,
    description: 'Response time in milliseconds that should trigger a performance warning.',
  },
  {
    name: 'System Error Rate',
    category: 'alert',
    value: 5,
    minValue: 0,
    maxValue: 100,
    description: 'Percentage of failed operations that should trigger an alert.',
  },
  {
    name: 'Critical Drawdown Alert',
    category: 'performance',
    value: 20,
    minValue: 0,
    maxValue: 100,
    description: 'Backtest drawdown percentage that should be treated as high risk.',
  },
];

async function ensureDefaultThresholds() {
  const count = await prisma.systemThreshold.count();
  if (count > 0) return;
  await prisma.systemThreshold.createMany({ data: DEFAULT_THRESHOLDS, skipDuplicates: true });
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifySuperAdminSession({ accessToken });
    if (!session.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDefaultThresholds();
    const thresholds = await prisma.systemThreshold.findMany({ orderBy: { updatedAt: 'desc' } });
    return NextResponse.json({ success: true, data: thresholds });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch thresholds' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifySuperAdminSession({ accessToken });
    if (!session.success || !session.superAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id, value, minValue, maxValue, isActive, description } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Threshold ID is required' }, { status: 400 });
    }

    const parsedValue = value !== undefined ? Number(value) : undefined;
    const parsedMin = minValue !== undefined && minValue !== null ? Number(minValue) : minValue;
    const parsedMax = maxValue !== undefined && maxValue !== null ? Number(maxValue) : maxValue;

    if (parsedValue !== undefined && !Number.isFinite(parsedValue)) {
      return NextResponse.json({ success: false, error: 'Threshold value must be a valid number' }, { status: 400 });
    }
    if (parsedMin !== undefined && parsedMin !== null && !Number.isFinite(parsedMin)) {
      return NextResponse.json({ success: false, error: 'Minimum value must be a valid number' }, { status: 400 });
    }
    if (parsedMax !== undefined && parsedMax !== null && !Number.isFinite(parsedMax)) {
      return NextResponse.json({ success: false, error: 'Maximum value must be a valid number' }, { status: 400 });
    }
    if (parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
      return NextResponse.json({ success: false, error: 'Minimum value cannot be greater than maximum value' }, { status: 400 });
    }
    if (parsedValue !== undefined && parsedMin != null && parsedValue < parsedMin) {
      return NextResponse.json({ success: false, error: 'Threshold value cannot be below minimum value' }, { status: 400 });
    }
    if (parsedValue !== undefined && parsedMax != null && parsedValue > parsedMax) {
      return NextResponse.json({ success: false, error: 'Threshold value cannot be above maximum value' }, { status: 400 });
    }

    const updated = await prisma.systemThreshold.update({
      where: { id },
      data: {
        ...(parsedValue !== undefined ? { value: parsedValue } : {}),
        ...(minValue !== undefined ? { minValue: parsedMin } : {}),
        ...(maxValue !== undefined ? { maxValue: parsedMax } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    await createSuperAdminAuditLog(
      session.superAdmin.id,
      'threshold_policy_update',
      'system_threshold',
      id,
      { isActive: isActive ?? null, value: value ?? null },
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update threshold' },
      { status: 500 }
    );
  }
}
