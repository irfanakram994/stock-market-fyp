import { prisma } from './lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

// Load .env file
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value.trim();
    }
  });
}

console.log('📌 DATABASE_URL from .env:', process.env.DATABASE_URL);

async function testPostgresConnection() {
  console.log('🔍 Testing PostgreSQL Session Pooler Connection...\n');
  
  try {
    // Test the connection
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ PostgreSQL Connection: SUCCESS!');
    console.log('📌 PostgreSQL Version:', result);
    
    // Get database info
    const dbInfo = await prisma.$queryRaw`
      SELECT datname as database, usename as owner FROM pg_database JOIN pg_user ON pg_database.datdba = pg_user.usesysid WHERE datname = 'postgres'
    `;
    console.log('📌 Database Info:', dbInfo);
    
    console.log('\n✅ All connections working!');
    
  } catch (error: any) {
    console.error('❌ PostgreSQL Connection Failed:');
    console.error('Error:', error.message);
    console.error('\n💡 Troubleshooting Tips:');
    console.error('1. Verify the Session Pooler host is correct');
    console.error('2. Check if password contains special characters that need escaping');
    console.error('3. Ensure Supabase project is running');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPostgresConnection();
