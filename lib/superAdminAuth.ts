import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { supabaseServer } from './supabaseClient';

export interface SuperAdminAuthResponse {
  success: boolean;
  message: string;
  superAdmin?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  error?: string;
}

interface VerifySuperAdminSessionOptions {
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

async function getActiveSuperAdminByEmail(email: string) {
  const superAdmin = await prisma.superAdminUser.findUnique({
    where: { email },
  });

  if (!superAdmin || !superAdmin.isActive) {
    return null;
  }

  return superAdmin;
}

export async function superAdminSignIn(email: string, password: string): Promise<SuperAdminAuthResponse> {
  try {
    if (!email || !password) {
      return {
        success: false,
        message: 'Email and password are required',
      };
    }

    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user?.email) {
      return {
        success: false,
        message: 'Authentication failed',
        error: error?.message,
      };
    }

    const superAdmin = await getActiveSuperAdminByEmail(email);
    if (!superAdmin) {
      await supabaseServer.auth.signOut();
      return {
        success: false,
        message: 'Access denied. Super Admin privileges required.',
      };
    }

    await prisma.superAdminUser.update({
      where: { id: superAdmin.id },
      data: { lastLogin: new Date() },
    });

    return {
      success: true,
      message: 'Super Admin signin successful',
      superAdmin: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.role,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'An error occurred during super admin signin',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function superAdminSignOut(): Promise<SuperAdminAuthResponse> {
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
    return {
      success: false,
      message: 'An error occurred during signout',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function verifySuperAdminSession(
  options: VerifySuperAdminSessionOptions = {}
): Promise<SuperAdminAuthResponse> {
  try {
    let resolvedEmail = options.email;

    if (!options.accessToken) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    if (options.accessToken) {
      const { data, error } = await supabaseServer.auth.getUser(options.accessToken);
      if (error) {
        return {
          success: false,
          message: 'Not authenticated',
          error: error.message,
        };
      }

      const tokenEmail = data.user?.email;
      if (!tokenEmail) {
        return {
          success: false,
          message: 'Not authenticated',
        };
      }

      if (resolvedEmail && resolvedEmail !== tokenEmail) {
        return {
          success: false,
          message: 'Session email mismatch',
        };
      }

      resolvedEmail = tokenEmail;
    }

    if (!resolvedEmail) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    const superAdmin = await getActiveSuperAdminByEmail(resolvedEmail);
    if (!superAdmin) {
      return {
        success: false,
        message: 'Super Admin access denied',
      };
    }

    return {
      success: true,
      message: 'Super Admin session valid',
      superAdmin: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.role,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Session verification failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function createSuperAdminAuditLog(
  superAdminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Prisma.InputJsonValue,
  ipAddress?: string
) {
  try {
    await prisma.superAdminAuditLog.create({
      data: {
        superAdminId,
        action,
        targetType,
        targetId,
        details: details ?? Prisma.JsonNull,
        ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to create super admin audit log:', error);
  }
}
