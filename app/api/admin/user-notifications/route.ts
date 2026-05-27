import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBearerToken, verifyAdminSession } from '@/lib/adminAuth';
import { createUserNotification } from '@/lib/notificationService';

export async function POST(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifyAdminSession({ accessToken });
    if (!session.success || !session.admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, userEmail, type, title, message, category, priority, metadata, sourceKey } = body || {};

    if (!type || !title || !message || !category) {
      return NextResponse.json(
        { success: false, error: 'Type, title, message, and category are required' },
        { status: 400 }
      );
    }

    let recipient = null;
    if (userId) {
      recipient = await prisma.user.findUnique({ where: { id: String(userId) } });
    } else if (userEmail) {
      recipient = await prisma.user.findUnique({ where: { email: String(userEmail) } });
    }

    if (!recipient) {
      return NextResponse.json({ success: false, error: 'Recipient user not found' }, { status: 404 });
    }

    const notification = await createUserNotification({
      userId: recipient.id,
      userEmail: recipient.email,
      sourceType: 'admin',
      sourceName: session.admin.name || session.admin.email,
      sourceKey: sourceKey ? String(sourceKey) : null,
      type: String(type),
      title: String(title),
      message: String(message),
      category: String(category),
      priority: priority ? String(priority) : 'normal',
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });

    return NextResponse.json({ success: true, data: notification });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create notification' },
      { status: 500 }
    );
  }
}