import { setupAdminUser } from '../lib/supabase/admin-setup';
import dotenv from 'dotenv';
import readline from 'readline';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const execAsync = promisify(exec);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Prompt for input
const promptQuestion = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Main function
async function main() {
  console.log('🔐 Create Admin User for Graceful Homeschooling Platform');
  console.log('=====================================================');
  
  // Check if required environment variables are set
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
  }
  
  try {
    // Gather user input
    const email = await promptQuestion('Enter admin email: ');
    if (!isValidEmail(email)) {
      console.error('❌ Error: Invalid email format');
      process.exit(1);
    }
    
    const password = await promptQuestion('Enter admin password (min 8 characters): ');
    if (password.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters long');
      process.exit(1);
    }
    
    const firstName = await promptQuestion('Enter admin first name: ');
    const lastName = await promptQuestion('Enter admin last name: ');
    
    console.log('\nCreating admin user...');
    
    // Call the setup function
    const result = await setupAdminUser({
      email,
      password,
      firstName,
      lastName,
    });
    
    if (result.success) {
      console.log('✅ Success:', result.message);
      console.log(`Admin user created with email: ${email}`);
    } else {
      console.error('❌ Error:', result.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ An unexpected error occurred:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main(); 