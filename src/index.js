import dotenv from 'dotenv';
import { MeetingScheduler } from './scheduler.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'BLUE_TOKEN_ID',
  'BLUE_TOKEN_SECRET',
  'ANTHROPIC_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease create a .env file based on .env.example and fill in the required values.');
  process.exit(1);
}

async function main() {
  const scheduler = new MeetingScheduler();
  
  try {
    // Initialize services
    const initialized = await scheduler.initialize();
    if (!initialized) {
      console.error('❌ Failed to initialize services');
      process.exit(1);
    }

    // Check command line arguments
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'run-once':
        const documentId = args[1];
        console.log('🏃 Running one-time processing...');
        const results = await scheduler.runOnce(documentId);
        console.log('✅ One-time processing completed');
        process.exit(0);
        break;

      case 'auth':
        console.log('🔐 Setting up Google Drive authentication...');
        try {
          const authUrl = scheduler.googleDrive.generateAuthUrl();
          console.log('\n📋 To authorize this application:');
          console.log('1. Visit this URL:', authUrl);
          console.log('2. Sign in with your Google account');
          console.log('3. Copy the authorization code from the redirect URL');
          console.log('4. Run: node src/index.js auth-token <code>');
        } catch (error) {
          console.error('❌ Authentication setup failed:', error.message);
        }
        process.exit(0);
        break;

      case 'auth-token':
        const code = args[1];
        if (!code) {
          console.error('❌ Please provide the authorization code');
          console.error('Usage: node src/index.js auth-token <code>');
          process.exit(1);
        }
        
        try {
          await scheduler.googleDrive.saveToken(code);
          console.log('✅ Authentication token saved successfully');
          console.log('You can now run the application normally');
        } catch (error) {
          console.error('❌ Failed to save token:', error.message);
        }
        process.exit(0);
        break;

      case 'status':
        const status = scheduler.getStatus();
        console.log('📊 System Status:');
        console.log('   Running:', status.isRunning ? '✅' : '❌');
        console.log('   Services:');
        Object.entries(status.services).forEach(([service, state]) => {
          console.log(`     ${service}: ${state}`);
        });
        process.exit(0);
        break;

      case 'test-blue':
        console.log('🧪 Testing Blue.cc connection...');
        const connected = await scheduler.blueApi.validateConnection();
        if (connected) {
          const projects = await scheduler.blueApi.getProjects();
          console.log(`✅ Connected successfully - Found ${projects.length} projects`);
          if (projects.length > 0) {
            console.log('Projects:');
            projects.slice(0, 5).forEach(project => {
              console.log(`  - ${project.name} (${project.id})`);
            });
          }
        }
        process.exit(0);
        break;

      case 'test-claude':
        console.log('🧪 Testing Claude connection...');
        const claudeConnected = await scheduler.claudeService.validateConnection();
        if (claudeConnected) {
          console.log('✅ Claude connected successfully');
        } else {
          console.log('❌ Claude connection failed');
        }
        process.exit(0);
        break;

      case 'process-document':
        const docId = args[1];
        if (!docId) {
          console.error('❌ Please provide the document ID');
          console.error('Usage: node src/index.js process-document <document-id>');
          process.exit(1);
        }
        
        console.log(`🏃 Processing document: ${docId}`);
        try {
          const docResults = await scheduler.processSpecificDocument(docId);
          console.log('✅ Document processing completed');
        } catch (error) {
          console.error('❌ Document processing failed:', error.message);
        }
        process.exit(0);
        break;

      case 'schedule':
        const cronPattern = args[1];
        console.log('⏰ Starting scheduled mode...');
        const task = scheduler.startSchedule(cronPattern);
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
          console.log('\n🛑 Received SIGINT, stopping scheduler...');
          task.stop();
          scheduler.stop();
          process.exit(0);
        });
        
        process.on('SIGTERM', () => {
          console.log('\n🛑 Received SIGTERM, stopping scheduler...');
          task.stop();
          scheduler.stop();
          process.exit(0);
        });

        // Keep the process alive
        console.log('✅ Scheduler is running. Press Ctrl+C to stop.');
        break;

      case 'help':
      case undefined:
        console.log(`
📋 Meeting Summary Task Manager

Available commands:

  🏃 run-once [doc-id]     Process default document or specified document ID
  📄 process-document <id> Process specific Google Doc by ID
  ⏰ schedule [cron]       Start scheduled processing (default: weekdays at 9 AM)
  🔐 auth                  Setup Google Drive authentication
  🔑 auth-token <code>     Save Google OAuth token
  📊 status                Show system status
  🧪 test-blue             Test Blue.cc API connection
  🧪 test-claude           Test Claude API connection
  ❓ help                  Show this help message

Examples:
  node src/index.js run-once
  node src/index.js process-document 1EvSaGqtGxDiyiWtQXTaC_EVQsZ-96vgO9gaQhjX36Lw
  node src/index.js schedule
  node src/index.js schedule "0 10 * * 1-5"  # 10 AM on weekdays
  node src/index.js auth
  
Environment Setup:
  1. Copy .env.example to .env
  2. Fill in your API keys: BLUE_API_TOKEN, ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  3. Run 'node src/index.js auth' to setup Google authentication
  4. Run 'node src/index.js test-blue' and 'node src/index.js test-claude' to verify connections
`);
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.error('Run "node src/index.js help" for available commands');
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Application error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the application
main();