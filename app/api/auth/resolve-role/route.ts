import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { supabaseServer } from '@/lib/supabaseClient';

function extractBearerToken(authorizationHeader: string | null): string | undefined {
  if (!authorizationHeader) return undefined;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token;
}

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const accessToken =
      extractBearerToken(request.headers.get('authorization')) ||
      (typeof body?.accessToken === 'string' ? body.accessToken : undefined);

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    let authResult: any = null;
    try {
      authResult = await supabaseServer.auth.getUser(accessToken);
    } catch (e) {
      // Fallback to anon client if service role isn't available in this environment
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey) {
        const recoveryClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        authResult = await recoveryClient.auth.getUser(accessToken);
      } else {
        return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
      }
    }

    const { data, error } = authResult;
    const email = data?.user?.email;
    if (error || !data?.user || !email) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const superAdmin = await prisma.superAdminUser.findUnique({ where: { email } });
    if (superAdmin?.isActive) {
      await prisma.superAdminUser.update({
        where: { id: superAdmin.id },
        data: { lastLogin: new Date() },
      });
      return NextResponse.json({
        success: true,
        role: 'super_admin',
        redirectTo: '/super-admin',
        account: {
          id: superAdmin.id,
          email: superAdmin.email,
          name: superAdmin.name,
          role: superAdmin.role,
        },
      });
    }
    if (superAdmin && !superAdmin.isActive) {
      return NextResponse.json({ success: false, error: 'Super admin account is inactive.' }, { status: 403 });
    }

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (admin?.isActive) {
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { lastLogin: new Date() },
      });
      return NextResponse.json({
        success: true,
        role: 'admin',
        redirectTo: '/admin',
        account: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      });
    }
    if (admin && !admin.isActive) {
      return NextResponse.json({ success: false, error: 'Admin account is inactive.' }, { status: 403 });
    }

    const user = await prisma.user.upsert({
      where: { id: data.user.id },
      update: {
        email,
        name: data.user.user_metadata?.name ?? undefined,
      },
      create: {
        id: data.user.id,
        email,
        name: data.user.user_metadata?.name ?? null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isBlocked: true,
        blockedReason: true,
      },
    });

    if (user.isBlocked) {
      return NextResponse.json(
        {
          success: false,
          error: user.blockedReason || 'This account has been blocked. Contact support for help.',
          code: 'USER_BLOCKED',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      role: 'user',
      redirectTo: '/dashboard',
      account: user,
    });
  } catch (error) {
    console.error('Resolve role error:', error);
    return NextResponse.json({ success: false, error: 'Failed to resolve account role' }, { status: 500 });
  }
}
