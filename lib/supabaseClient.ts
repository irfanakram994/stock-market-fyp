import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing env variables');
}

// Client-side Supabase instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Server-side Supabase instance (for API routes)
function createSupabaseServer() {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseServer can only be used on the server side');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let cachedSupabaseServer: ReturnType<typeof createSupabaseServer> | null = null;

export const supabaseServer = new Proxy({} as any, {
  get(target, prop) {
    if (!cachedSupabaseServer) {
      cachedSupabaseServer = createSupabaseServer();
    }
    return cachedSupabaseServer[prop as keyof typeof cachedSupabaseServer];
  },
  apply(target, thisArg, args) {
    if (!cachedSupabaseServer) {
      cachedSupabaseServer = createSupabaseServer();
    }
    return (cachedSupabaseServer as any)(...args);
  },
});
