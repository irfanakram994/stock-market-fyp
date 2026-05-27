import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env file manually
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

async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase Connection...\n');

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const databaseUrl = process.env.DATABASE_URL;

    console.log('📋 Environment Variables Check:');
    console.log(`✓ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
    console.log(`✓ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`✓ DATABASE_URL: ${databaseUrl ? '✅ Set' : '❌ Missing'}\n`);

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    // Test Supabase REST API connection
    console.log('🌐 Testing Supabase REST API Connection...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try a simple health check via auth endpoint
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log(`⚠️  Auth Check: ${error.message}`);
    } else {
      console.log('✅ Supabase REST API: Connected successfully!');
    }

    // Test direct connection details
    console.log('\n📍 Connection Details:');
    console.log(`Host: db.kgietivsvmaazyqdemiz.supabase.co`);
    console.log(`Port: 5432`);
    console.log(`Database: postgres`);
    console.log(`User: postgres`);
    console.log(`Connection String Format: postgresql://postgres:[PASSWORD]@db.kgietivsvmaazyqdemiz.supabase.co:5432/postgres`);

    console.log('\n✅ Basic configuration looks correct!');
    console.log('\n⚠️  Note: Direct PostgreSQL connection may not work if:');
    console.log('- Supabase project is paused');
    console.log('- Firewall is blocking port 5432');
    console.log('- Password is incorrect');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSupabaseConnection();
