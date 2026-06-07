import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MODULE_LABELS: Record<string, string> = {
  user_panel: 'User Panel',
  admin_panel: 'Admin Panel',
  forecasting_module: 'Forecasting Module',
  multi_agent_system: 'Multi-Agent System',
  analytics_module: 'Analytics Module',
};

export async function requireModuleEnabled(moduleKey: string) {
  const systemModule = await prisma.systemModule.findUnique({
    where: { moduleKey },
    select: { isEnabled: true, moduleName: true },
  });

  if (!systemModule || systemModule.isEnabled) {
    return null;
  }

  const label = systemModule.moduleName || MODULE_LABELS[moduleKey] || moduleKey;
  return NextResponse.json(
    {
      success: false,
      error: `${label} is currently disabled by Super Admin.`,
      code: 'MODULE_DISABLED',
      moduleKey,
    },
    { status: 403 }
  );
}
