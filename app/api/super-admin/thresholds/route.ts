import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuperAdminAuditLog, extractBearerToken, verifySuperAdminSession } from '@/lib/superAdminAuth';

export async function GET(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifySuperAdminSession({ accessToken });
    if (!session.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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

    const updated = await prisma.systemThreshold.update({
      where: { id },
      data: {
        ...(value !== undefined ? { value } : {}),
        ...(minValue !== undefined ? { minValue } : {}),
        ...(maxValue !== undefined ? { maxValue } : {}),
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
