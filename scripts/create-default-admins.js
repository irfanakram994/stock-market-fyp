const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

function parseEnv(envPath) {
  const raw = fs.readFileSync(envPath, 'utf8');
  return raw.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return acc;
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) return acc;
    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    acc[key] = value;
    return acc;
  }, {});
}

async function main() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env file not found at project root');
  }

  const env = parseEnv(envPath);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = env.DATABASE_URL;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL in .env');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const prisma = new PrismaClient();

  const accounts = [
    {
      email: 'admin@tradeflux.local',
      password: 'Admin@123',
      name: 'Default Admin',
      role: 'admin',
      table: 'adminUser',
    },
    {
      email: 'superadmin@tradeflux.local',
      password: 'SuperAdmin@123',
      name: 'Default Super Admin',
      role: 'super_admin',
      table: 'superAdminUser',
    },
  ];

  for (const account of accounts) {
    console.log(`\nProcessing ${account.role} account: ${account.email}`);

    const { data, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Failed to list Supabase users: ${listError.message}`);
    }

    const existingUsers = Array.isArray(data?.users) ? data.users : [];
    const existingUser = existingUsers.find((user) => user.email === account.email);

    let userId;
    if (existingUser) {
      userId = existingUser.id;
      console.log(`- Supabase user already exists with ID ${userId}`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        user_metadata: { name: account.name },
        email_confirm: true,
      });

      if (error) {
        throw new Error(`Failed to create Supabase auth user: ${error.message}`);
      }

      userId = data.user.id;
      console.log(`- Created Supabase auth user with ID ${userId}`);
    }

    const exists = await prisma[account.table].findUnique({
      where: { email: account.email },
    });

    if (exists) {
      console.log(`- ${account.table} record already exists for ${account.email}`);
    } else {
      const createData = {
        id: userId,
        email: account.email,
        name: account.name,
        role: account.role === 'admin' ? 'admin' : 'super_admin',
        isActive: true,
      };

      await prisma[account.table].create({ data: createData });
      console.log(`- Created ${account.table} record for ${account.email}`);
    }

    console.log(`✅ ${account.role} credentials:
    email: ${account.email}
    password: ${account.password}
`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Script failed:', error.message || error);
  process.exit(1);
});
