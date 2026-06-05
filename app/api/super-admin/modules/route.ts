import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuperAdminAuditLog, extractBearerToken, verifySuperAdminSession } from '@/lib/superAdminAuth';

const DEFAULT_MODULES = [
  { moduleKey: 'user_panel', moduleName: 'User Panel', description: 'Primary user-facing dashboard and workflows' },
  { moduleKey: 'admin_panel', moduleName: 'Admin Panel', description: 'Administrative controls for admins' },
  { moduleKey: 'forecasting_module', moduleName: 'Forecasting Module', description: 'Prediction pipeline and forecasting outputs' },
  { moduleKey: 'multi_agent_system', moduleName: 'Multi-Agent System', description: 'Agent orchestration and execution' },
  { moduleKey: 'analytics_module', moduleName: 'Analytics Module', description: 'System and business analytics views' },
];

async function ensureDefaultModules() {
  const count = await prisma.systemModule.count();
  if (count > 0) return;

  await prisma.systemModule.createMany({
    data: DEFAULT_MODULES.map((module) => ({ ...module, isEnabled: true })),
    skipDuplicates: true,
  });
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifySuperAdminSession({ accessToken });
    if (!session.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDefaultModules();

    const modules = await prisma.systemModule.findMany({ orderBy: { moduleName: 'asc' } });
    return NextResponse.json({ success: true, data: modules });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch modules' },
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

    const { id, isEnabled } = await request.json();
    if (!id || isEnabled === undefined) {
      return NextResponse.json({ success: false, error: 'Module ID and isEnabled are required' }, { status: 400 });
    }

    const updated = await prisma.systemModule.update({
      where: { id },
      data: {
        isEnabled,
        updatedBy: session.superAdmin.email,
      },
    });

    await createSuperAdminAuditLog(
      session.superAdmin.id,
      'module_toggle',
      'system_module',
      id,
      { moduleKey: updated.moduleKey, isEnabled },
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update module' },
      { status: 500 }
    );
  }
}
