import { NextRequest, NextResponse } from 'next/server';
import { adminSignIn, createAuditLog } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      );
    }

    const result = await adminSignIn(email, password);

    if (result.success && result.admin) {
      // Log the signin action
      const ipAddress = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'unknown';
      await createAuditLog(
        result.admin.id,
        'admin_signin',
        'admin',
        result.admin.id,
        { email: result.admin.email },
        ipAddress
      );
    }

    return NextResponse.json(result, {
      status: result.success ? 200 : 401,
    });
  } catch (error) {
    console.error('Admin signin error:', error);
    return NextResponse.json(
      { success: false, error: 'Signin failed' },
      { status: 500 }
    );
  }
}
