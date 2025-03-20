// Import required modules - ES Modules syntax
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get current directory name (ES Modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

// Set up Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or service role key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`Executing migration: ${path.basename(filePath)}`);
    
    const { error } = await supabase.rpc('execute_sql', { sql });
    
    if (error) {
      console.error(`Error executing migration ${path.basename(filePath)}:`, error);
      return false;
    }
    
    console.log(`Successfully executed migration: ${path.basename(filePath)}`);
    return true;
  } catch (err) {
    console.error(`Error reading or executing migration ${path.basename(filePath)}:`, err);
    return false;
  }
}

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  try {
    // Get all SQL files from migrations directory
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure order
    
    console.log(`Found ${files.length} migration files to execute`);
    
    let successful = 0;
    let failed = 0;
    
    // Execute migrations in sequence
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const success = await executeMigration(filePath);
      
      if (success) {
        successful++;
      } else {
        failed++;
      }
    }
    
    console.log(`\nMigration Summary: ${successful} successful, ${failed} failed`);
    
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Error listing migration files:', err);
    process.exit(1);
  }
}

runMigrations().catch(err => {
  console.error('Unhandled error during migrations:', err);
  process.exit(1);
}); 