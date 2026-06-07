import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBearerToken, verifyAdminSession, createAuditLog } from '@/lib/adminAuth';

// GET - List all users with optional filters
export async function GET(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const adminEmail = request.nextUrl.searchParams.get('adminEmail') || undefined;
    const session = await verifyAdminSession({ email: adminEmail, accessToken });
    if (!session.success) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // 'active' | 'inactive' | all

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

    // Note: The User model doesn't have isActive field by default
    // Users are considered active if they exist

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
          _count: {
            select: {
              predictions: true,
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
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// PATCH - Update user status (activate/deactivate)
export async function PATCH(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const adminEmail = request.nextUrl.searchParams.get('adminEmail') || undefined;
    const session = await verifyAdminSession({ email: adminEmail, accessToken });
    if (!session.success || !session.admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, action } = await request.json();

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: 'User ID and action required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isBlocked: action === 'deactivate',
        blockedReason: action === 'deactivate' ? 'Account deactivated by admin.' : null,
      },
    });

    // Log the action
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    await createAuditLog(
      session.admin.id,
      `user_${action}`,
      'user',
      userId,
      { email: user.email, action },
      ipAddress
    );

    return NextResponse.json({
      success: true,
      message: `User ${action}d successfully`,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
