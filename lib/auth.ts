import { supabaseServer } from './supabaseClient';
import { prisma } from './prisma';

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
  error?: string;
}

export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseServer.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    });

    if (authError) {
      console.error('Supabase signup error:', authError);
      return {
        success: false,
        message: 'Signup failed',
        error: authError.message,
      };
    }

    if (!authData.user) {
      return {
        success: false,
        message: 'Failed to create user',
      };
    }

    // Store user in Prisma database
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        name,
      },
    });

    return {
      success: true,
      message: 'Signup successful! Please check your email for confirmation.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  } catch (error) {
    console.error('Signup error:', error);
    return {
      success: false,
      message: 'An error occurred during signup',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    // Sign in with Supabase Auth
    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase signin error:', error);
      return {
        success: false,
        message: 'Signin failed',
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: 'Failed to sign in',
      };
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: data.user.id },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found in database',
      };
    }

    return {
      success: true,
      message: 'Signin successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  } catch (error) {
    console.error('Signin error:', error);
    return {
      success: false,
      message: 'An error occurred during signin',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function signOut() {
  try {
    const { error } = await supabaseServer.auth.signOut();
    if (error) {
      console.error('Signout error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Signout error:', error);
    return false;
  }
}

export async function getCurrentUser() {
  try {
    const { data } = await supabaseServer.auth.getSession();
    if (!data.session) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: data.session.user.id },
    });

    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}
