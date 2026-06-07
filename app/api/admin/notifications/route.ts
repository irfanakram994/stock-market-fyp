import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBearerToken, verifyAdminSession, createAuditLog } from '@/lib/adminAuth';
import { requireModuleEnabled } from '@/lib/moduleGuard';

// GET - List notifications for admin
export async function GET(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifyAdminSession({ accessToken });
    if (!session.success) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const disabled = await requireModuleEnabled('admin_panel');
    if (disabled) return disabled;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const isRead = searchParams.get('isRead');
    const priority = searchParams.get('priority');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    
    if (type) where.type = type;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (isRead !== null && isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const adminId = session.admin!.id;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.adminNotification.findMany({
        where: { ...where, adminId },
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          admin: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.adminNotification.count({ where: { ...where, adminId } }),
      prisma.adminNotification.count({ where: { adminId, isRead: false } }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifyAdminSession({ accessToken });
    if (!session.success || !session.admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const disabled = await requireModuleEnabled('admin_panel');
    if (disabled) return disabled;

    const body = await request.json();
    const { type, title, message, category, priority, adminId, metadata } = body;

    if (!type || !title || !message || !category) {
      return NextResponse.json(
        { success: false, error: 'Type, title, message, and category are required' },
        { status: 400 }
      );
    }

    const notification = await prisma.adminNotification.create({
      data: {
        type,
        title,
        message,
        category,
        priority: priority || 'normal',
        adminId: adminId || session.admin.id,
        metadata: metadata || {},
      },
    });

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifyAdminSession({ accessToken });
    if (!session.success || !session.admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const disabled = await requireModuleEnabled('admin_panel');
    if (disabled) return disabled;

    const body = await request.json();
    const { notificationIds, markAllRead } = body;

    if (markAllRead) {
      await prisma.adminNotification.updateMany({
        where: { adminId: session.admin.id, isRead: false },
        data: { isRead: true },
      });

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { success: false, error: 'Notification IDs required' },
        { status: 400 }
      );
    }

    await prisma.adminNotification.updateMany({
      where: { id: { in: notificationIds }, adminId: session.admin.id },
      data: { isRead: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read',
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

// DELETE - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifyAdminSession({ accessToken });
    if (!session.success || !session.admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const disabled = await requireModuleEnabled('admin_panel');
    if (disabled) return disabled;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deleteRead = searchParams.get('deleteRead') === 'true';

    if (deleteRead) {
      const result = await prisma.adminNotification.deleteMany({
        where: { adminId: session.admin.id, isRead: true },
      });

      const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
      await createAuditLog(
        session.admin.id,
        'notifications_bulk_delete',
        'notification',
        undefined,
        { deletedCount: result.count },
        ipAddress
      );

      return NextResponse.json({
        success: true,
        message: `Deleted ${result.count} read notifications`,
      });
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Notification ID required' },
        { status: 400 }
      );
    }

    const result = await prisma.adminNotification.deleteMany({
      where: { id, adminId: session.admin.id },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}
