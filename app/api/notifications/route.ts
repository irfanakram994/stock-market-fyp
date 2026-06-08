import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { requireModuleEnabled } from '@/lib/moduleGuard';
import {
  countUnreadUserNotifications,
  listUserNotifications,
  markUserNotificationsRead,
} from '@/lib/notificationService';

export const dynamic = 'force-dynamic';

async function resolveCurrentUser(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await resolveCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const disabled = await requireModuleEnabled('user_panel');
    if (disabled) return disabled;

    const limit = Number(request.nextUrl.searchParams.get('limit') || '10');
    const notifications = await listUserNotifications(user.id, limit);
    const unreadCount = await countUnreadUserNotifications(user.id);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
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
    const user = await resolveCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const disabled = await requireModuleEnabled('user_panel');
    if (disabled) return disabled;

    const body = await request.json();
    const notificationIds = Array.isArray(body?.notificationIds) ? body.notificationIds.map(String) : undefined;
    const markAllRead = Boolean(body?.markAllRead);

    const updatedCount = await markUserNotificationsRead(user.id, markAllRead ? undefined : notificationIds);

    return NextResponse.json({
      success: true,
      message: markAllRead ? 'All notifications marked as read' : 'Notifications marked as read',
      updatedCount,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
