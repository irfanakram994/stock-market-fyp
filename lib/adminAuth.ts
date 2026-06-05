import { supabaseServer } from './supabaseClient';
import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

export interface AdminAuthResponse {
  success: boolean;
  message: string;
  admin?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  error?: string;
}

interface VerifyAdminSessionOptions {
  email?: string;
  accessToken?: string;
}

export function extractBearerToken(authorizationHeader: string | null): string | undefined {
  if (!authorizationHeader) return undefined;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return undefined;
  }
  return token;
}

async function getActiveAdminByEmail(email: string) {
  const adminUser = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!adminUser || !adminUser.isActive) {
    return null;
  }

  return adminUser;
}

export async function adminSignIn(email: string, password: string): Promise<AdminAuthResponse> {
  try {
    // Sign in with Supabase Auth
    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Admin signin error:', error);
      return {
        success: false,
        message: 'Authentication failed',
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: 'Failed to sign in',
      };
    }

    // Check if user is an admin in AdminUser table
    const adminUser = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!adminUser) {
      // Sign out since they're not an admin
      await supabaseServer.auth.signOut();
      return {
        success: false,
        message: 'Access denied. Admin privileges required.',
      };
    }

    if (!adminUser.isActive) {
      await supabaseServer.auth.signOut();
      return {
        success: false,
        message: 'Admin account is deactivated.',
      };
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: adminUser.id },
      data: { lastLogin: new Date() },
    });

    return {
      success: true,
      message: 'Admin signin successful',
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
    };
  } catch (error) {
    console.error('Admin signin error:', error);
    return {
      success: false,
      message: 'An error occurred during admin signin',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function adminSignOut(): Promise<AdminAuthResponse> {
  try {
    const { error } = await supabaseServer.auth.signOut();
    if (error) {
      return {
        success: false,
        message: 'Signout failed',
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Signed out successfully',
    };
  } catch (error) {
    console.error('Admin signout error:', error);
    return {
      success: false,
      message: 'An error occurred during signout',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function verifyAdminSession(
  options: VerifyAdminSessionOptions = {}
): Promise<AdminAuthResponse> {
  try {
    let resolvedEmail = options.email;

    if (!resolvedEmail && options.accessToken) {
      const { data, error } = await supabaseServer.auth.getUser(options.accessToken);
      if (error) {
        return {
          success: false,
          message: 'Not authenticated',
          error: error.message,
        };
      }

      resolvedEmail = data.user?.email;
    }

    if (!resolvedEmail) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    const adminUser = await getActiveAdminByEmail(resolvedEmail);
    if (!adminUser) {
      return {
        success: false,
        message: 'Admin access denied',
      };
    }

    return {
      success: true,
      message: 'Admin session valid',
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
    };
  } catch (error) {
    console.error('Admin session verification error:', error);
    return {
      success: false,
      message: 'Session verification failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Create audit log entry for admin actions
export async function createAuditLog(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Prisma.InputJsonValue,
  ipAddress?: string
) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetType,
        targetId,
        details: details ?? Prisma.JsonNull,
        ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
