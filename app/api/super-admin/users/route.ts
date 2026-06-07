import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuperAdminAuditLog, extractBearerToken, verifySuperAdminSession } from '@/lib/superAdminAuth';

export async function GET(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifySuperAdminSession({ accessToken });
    if (!session.success || !session.superAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const search = request.nextUrl.searchParams.get('search') || '';
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const adminEmails = await prisma.adminUser.findMany({ select: { email: true } });
    const superAdminEmails = await prisma.superAdminUser.findMany({ select: { email: true } });
    const excludedEmails = [...adminEmails, ...superAdminEmails].map((item) => item.email);

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (excludedEmails.length > 0) {
      Object.assign(where, { email: { notIn: excludedEmails } });
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          isBlocked: true,
          blockedReason: true,
          _count: {
            select: {
              stocks: true,
              agentLogs: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching super-admin users:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifySuperAdminSession({ accessToken });
    if (!session.success || !session.superAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, action, blockedReason } = await request.json();
    if (!userId || !action || !['block', 'unblock', 'deactivate', 'activate'].includes(String(action))) {
      return NextResponse.json({ success: false, error: 'User ID and a valid action are required' }, { status: 400 });
    }

    const shouldBlock = action === 'block' || action === 'deactivate';
    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: String(userId) },
      data: {
        isBlocked: shouldBlock,
        blockedReason: shouldBlock
          ? String(blockedReason || 'Account blocked by Super Admin.')
          : null,
      },
    });

    await createSuperAdminAuditLog(
      session.superAdmin.id,
      shouldBlock ? 'user_block' : 'user_unblock',
      'user',
      String(userId),
      { email: user.email, previousBlocked: user.isBlocked },
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: shouldBlock ? 'User blocked successfully' : 'User unblocked successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating super-admin user:', error);
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}
