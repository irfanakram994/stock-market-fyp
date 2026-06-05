import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBearerToken, verifyAdminSession, createAuditLog } from '@/lib/adminAuth';

// GET - List all thresholds
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

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};
    if (category) {
      where.category = category;
    }

    const thresholds = await prisma.systemThreshold.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Group by category
    const groupedThresholds = thresholds.reduce((acc, threshold) => {
      if (!acc[threshold.category]) {
        acc[threshold.category] = [];
      }
      acc[threshold.category].push(threshold);
      return acc;
    }, {} as Record<string, typeof thresholds>);

    return NextResponse.json({
      success: true,
      data: thresholds,
      grouped: groupedThresholds,
    });
  } catch (error) {
    console.error('Error fetching thresholds:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch thresholds' },
      { status: 500 }
    );
  }
}

// POST - Create a new threshold
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

    const body = await request.json();
    const { name, category, value, minValue, maxValue, description } = body;

    if (!name || !category || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name, category, and value are required' },
        { status: 400 }
      );
    }

    const threshold = await prisma.systemThreshold.create({
      data: {
        name,
        category,
        value,
        minValue,
        maxValue,
        description,
      },
    });

    // Log the action
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    await createAuditLog(
      session.admin.id,
      'threshold_create',
      'threshold',
      threshold.id,
      { name, category, value },
      ipAddress
    );

    return NextResponse.json({
      success: true,
      data: threshold,
    });
  } catch (error) {
    console.error('Error creating threshold:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create threshold' },
      { status: 500 }
    );
  }
}

// PATCH - Update a threshold
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

    const body = await request.json();
    const { id, value, minValue, maxValue, description, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Threshold ID is required' },
        { status: 400 }
      );
    }

    const existingThreshold = await prisma.systemThreshold.findUnique({
      where: { id },
    });

    if (!existingThreshold) {
      return NextResponse.json(
        { success: false, error: 'Threshold not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (value !== undefined) updateData.value = value;
    if (minValue !== undefined) updateData.minValue = minValue;
    if (maxValue !== undefined) updateData.maxValue = maxValue;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const threshold = await prisma.systemThreshold.update({
      where: { id },
      data: updateData,
    });

    // Log the action
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    await createAuditLog(
      session.admin.id,
      'threshold_update',
      'threshold',
      id,
      { 
        previousValue: existingThreshold.value, 
        previousName: existingThreshold.name,
        newValue: value,
        newMinValue: minValue,
        newMaxValue: maxValue,
      },
      ipAddress
    );

    return NextResponse.json({
      success: true,
      data: threshold,
    });
  } catch (error) {
    console.error('Error updating threshold:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update threshold' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a threshold
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Threshold ID is required' },
        { status: 400 }
      );
    }

    const threshold = await prisma.systemThreshold.findUnique({
      where: { id },
    });

    if (!threshold) {
      return NextResponse.json(
        { success: false, error: 'Threshold not found' },
        { status: 404 }
      );
    }

    await prisma.systemThreshold.delete({
      where: { id },
    });

    // Log the action
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    await createAuditLog(
      session.admin.id,
      'threshold_delete',
      'threshold',
      id,
      { name: threshold.name, category: threshold.category },
      ipAddress
    );

    return NextResponse.json({
      success: true,
      message: 'Threshold deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting threshold:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete threshold' },
      { status: 500 }
    );
  }
}
