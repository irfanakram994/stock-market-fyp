import { prisma } from './lib/prisma';

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test database connection
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ Database connection successful!');
    console.log('PostgreSQL version:', result);
    
    // Test if we can query the database schema
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('✅ Database accessible. Tables found:', tables.length);
    
    console.log('\n✅ Supabase connectivity confirmed!');
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
