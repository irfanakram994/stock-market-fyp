import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuperAdminAuditLog, extractBearerToken, verifySuperAdminSession } from '@/lib/superAdminAuth';

const DEFAULT_MODULES = [
  { moduleKey: 'user_panel', moduleName: 'User Panel', description: 'Primary user dashboard summary, stock catalog, saved stock purchases, and stored news access' },
  { moduleKey: 'admin_panel', moduleName: 'Admin Panel', description: 'Administrative controls for admins, including users, thresholds, notifications, predictions, and audit logs' },
  { moduleKey: 'forecasting_module', moduleName: 'Forecasting Module', description: 'Prediction, recent forecast, and backtesting workflows' },
  { moduleKey: 'multi_agent_system', moduleName: 'Multi-Agent System', description: 'Agent execution, market-data agents, live news, and agent log access' },
  { moduleKey: 'analytics_module', moduleName: 'Analytics Module', description: 'Admin analytics dashboards and analytics API access' },
  { moduleKey: 'chatbot_module', moduleName: 'Chatbot', description: 'User access to TradeFlux Chat and its AI response API' },
];

async function ensureDefaultModules() {
  await Promise.all(
    DEFAULT_MODULES.map((module) =>
      prisma.systemModule.upsert({
        where: { moduleKey: module.moduleKey },
        update: {
          moduleName: module.moduleName,
          description: module.description,
        },
        create: { ...module, isEnabled: true },
      })
    )
  );
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
