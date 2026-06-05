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

    const configs = await prisma.globalConfig.findMany({ orderBy: { updatedAt: 'desc' } });
    return NextResponse.json({ success: true, data: configs });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch configs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifySuperAdminSession({ accessToken });
    if (!session.success || !session.superAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { configKey, configValue, description, isActive = true } = await request.json();
    if (!configKey || configValue === undefined) {
      return NextResponse.json({ success: false, error: 'configKey and configValue are required' }, { status: 400 });
    }

    const created = await prisma.globalConfig.create({
      data: {
        configKey,
        configValue,
        description,
        isActive,
        updatedBy: session.superAdmin.email,
      },
    });

    await createSuperAdminAuditLog(
      session.superAdmin.id,
      'global_config_create',
      'global_config',
      created.id,
      { configKey, isActive },
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create config' },
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

    const { id, configValue, description, isActive } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Config ID is required' }, { status: 400 });
    }

    const updated = await prisma.globalConfig.update({
      where: { id },
      data: {
        ...(configValue !== undefined ? { configValue } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        updatedBy: session.superAdmin.email,
      },
    });

    await createSuperAdminAuditLog(
      session.superAdmin.id,
      'global_config_update',
      'global_config',
      id,
      { isActive: isActive ?? null },
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update config' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifySuperAdminSession({ accessToken });
    if (!session.success || !session.superAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Config ID is required' }, { status: 400 });
    }

    const deleted = await prisma.globalConfig.delete({ where: { id } });

    await createSuperAdminAuditLog(
      session.superAdmin.id,
      'global_config_delete',
      'global_config',
      id,
      { configKey: deleted.configKey },
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete config' },
      { status: 500 }
    );
  }
}
