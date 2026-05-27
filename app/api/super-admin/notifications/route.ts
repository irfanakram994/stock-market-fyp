import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuperAdminAuditLog, extractBearerToken, verifySuperAdminSession } from '@/lib/superAdminAuth';

const NOTIFICATION_CONFIG_KEY = 'notification_settings';

export async function GET(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifySuperAdminSession({ accessToken });
    if (!session.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const limit = Number(request.nextUrl.searchParams.get('limit') || '50');

    const [notifications, unreadCount, settings] = await Promise.all([
      prisma.adminNotification.findMany({ take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.adminNotification.count({ where: { isRead: false } }),
      prisma.globalConfig.findUnique({ where: { configKey: NOTIFICATION_CONFIG_KEY } }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
      settings: settings?.configValue || { email: true, inApp: true, criticalOnly: false },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch notifications' },
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

    const payload = await request.json();

    if (payload.id) {
      const updated = await prisma.adminNotification.update({
        where: { id: payload.id },
        data: {
          ...(payload.isRead !== undefined ? { isRead: payload.isRead } : {}),
          ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
        },
      });

      await createSuperAdminAuditLog(
        session.superAdmin.id,
        'notification_update',
        'admin_notification',
        payload.id,
        { isRead: payload.isRead ?? null, priority: payload.priority ?? null },
        request.headers.get('x-forwarded-for') || 'unknown'
      );

      return NextResponse.json({ success: true, data: updated });
    }

    const { settings } = payload;
    if (!settings) {
      return NextResponse.json({ success: false, error: 'Either notification id or settings is required' }, { status: 400 });
    }

    const config = await prisma.globalConfig.upsert({
      where: { configKey: NOTIFICATION_CONFIG_KEY },
      update: {
        configValue: settings,
        updatedBy: session.superAdmin.email,
      },
      create: {
        configKey: NOTIFICATION_CONFIG_KEY,
        configValue: settings,
        description: 'Global notification behavior controls',
        updatedBy: session.superAdmin.email,
      },
    });

    await createSuperAdminAuditLog(
      session.superAdmin.id,
      'notification_settings_update',
      'global_config',
      config.id,
      { settings },
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    return NextResponse.json({ success: true, settings: config.configValue });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update notifications' },
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

    const payload = await request.json();
    const { adminId, adminEmail, broadcast, type, title, message, category, priority, metadata } = payload || {};

    if (!type || !title || !message || !category) {
      return NextResponse.json(
        { success: false, error: 'Type, title, message, and category are required' },
        { status: 400 }
      );
    }

    const targetAdmins = broadcast
      ? await prisma.adminUser.findMany({ where: { isActive: true } })
      : [
          adminId
            ? await prisma.adminUser.findUnique({ where: { id: String(adminId) } })
            : adminEmail
              ? await prisma.adminUser.findUnique({ where: { email: String(adminEmail) } })
              : null,
        ].filter((admin): admin is NonNullable<typeof admin> => Boolean(admin));

    if (targetAdmins.length === 0) {
      return NextResponse.json({ success: false, error: 'Recipient admin not found' }, { status: 404 });
    }

    const created = await Promise.all(
      targetAdmins.map((admin) =>
        prisma.adminNotification.create({
          data: {
            adminId: admin.id,
            type: String(type),
            title: String(title),
            message: String(message),
            category: String(category),
            priority: priority ? String(priority) : 'normal',
            metadata: {
              ...(metadata && typeof metadata === 'object' ? metadata : {}),
              sourceRole: 'super_admin',
              sourceName: session.superAdmin!.name || session.superAdmin!.email,
            },
          },
        })
      )
    );

    await createSuperAdminAuditLog(
      session.superAdmin.id,
      'admin_notification_create',
      'admin_notification',
      created[0]?.id,
      { broadcast: Boolean(broadcast), adminId: adminId ?? null, adminEmail: adminEmail ?? null, type, title, category },
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create notification' },
      { status: 500 }
    );
  }
}
