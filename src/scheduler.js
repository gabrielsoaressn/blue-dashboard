import cron from 'node-cron';
import { GoogleDriveService } from './googleDrive.js';
import { BlueApiService } from './blueApiService.js';
import { ClaudeService } from './claudeService.js';

export class MeetingScheduler {
  constructor() {
    this.googleDrive = new GoogleDriveService();
    this.blueApi = new BlueApiService();
    this.claudeService = new ClaudeService();
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing services...');
      
      // Validate Blue.cc connection
      const blueConnected = await this.blueApi.validateConnection();
      if (!blueConnected) {
        throw new Error('Blue.cc API connection failed');
      }
      
      // Validate Claude connection
      const claudeConnected = await this.claudeService.validateConnection();
      if (!claudeConnected) {
        throw new Error('Claude API connection failed');
      }
      
      console.log('✅ All services initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return false;
    }
  }

  async processSpecificDocument(documentId) {
    if (this.isRunning) {
      console.log('⏳ Process already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    
    try {
      console.log(`🚀 Starting document processing at ${startTime.toLocaleString()}`);
      console.log(`📄 Processing document ID: ${documentId}`);
      
      // Get specific document
      const document = await this.googleDrive.getSpecificDocument(documentId);
      
      console.log(`📋 Processing: ${document.name}`);
      
      const results = {
        processed: 0,
        created: 0,
        updated: 0,
        errors: 0,
        details: []
      };

      try {
        // Analyze document with Claude
        const extractedTasks = await this.claudeService.analyzeMeetingSummary(
          document.content,
          document.name
        );
        
        if (extractedTasks.length === 0) {
          console.log(`   ℹ️  No tasks found in ${document.name}`);
          return { processed: 1, created: 0, updated: 0, errors: 0 };
        }

        console.log(`   🎯 Found ${extractedTasks.length} task(s)`);

        // Process tasks in Blue.cc
        const taskResults = await this.blueApi.processTranscriptionTasks(extractedTasks);
        
        // Update counters
        for (const result of taskResults) {
          if (result.action === 'created') {
            results.created++;
            console.log(`   ✅ Created task: ${result.task.title}`);
          } else if (result.action === 'updated') {
            results.updated++;
            console.log(`   🔄 Updated task: ${result.task.title} (${Math.round(result.similarity * 100)}% similarity)`);
          } else if (result.action === 'error') {
            results.errors++;
            console.log(`   ❌ Error with task: ${result.originalTask.title}`);
          }
        }

        results.processed = 1;
        results.details.push({
          document: document.name,
          tasks: taskResults
        });

      } catch (error) {
        console.error(`❌ Error processing ${document.name}:`, error.message);
        results.errors++;
      }

      const endTime = new Date();
      const duration = Math.round((endTime - startTime) / 1000);
      
      console.log(`\n📊 Processing Summary:`);
      console.log(`   📄 Document processed: ${results.processed}`);
      console.log(`   ➕ Tasks created: ${results.created}`);
      console.log(`   🔄 Tasks updated: ${results.updated}`);
      console.log(`   ❌ Errors: ${results.errors}`);
      console.log(`   ⏱️  Duration: ${duration}s`);
      
      return results;

    } catch (error) {
      console.error('❌ Fatal error during processing:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async processTranscriptions() {
    // For backwards compatibility, process the default document
    const defaultDocumentId = process.env.DEFAULT_DOCUMENT_ID || '1EvSaGqtGxDiyiWtQXTaC_EVQsZ-96vgO9gaQhjX36Lw';
    return await this.processSpecificDocument(defaultDocumentId);
  }

  startSchedule(cronExpression = null) {
    const schedule = cronExpression || process.env.SCHEDULE_CRON || '0 9 * * 1-5'; // Default: 9 AM on weekdays
    
    console.log(`⏰ Starting scheduler with pattern: ${schedule}`);
    console.log(`   Next run: ${this.getNextRunTime(schedule)}`);
    
    const task = cron.schedule(schedule, async () => {
      console.log('\n🕐 Scheduled processing triggered');
      try {
        await this.processTranscriptions();
      } catch (error) {
        console.error('❌ Scheduled processing failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo' // Adjust to your timezone
    });

    return task;
  }

  getNextRunTime(cronExpression) {
    try {
      // Simple next run calculation (basic implementation)
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      
      // If it's a weekend, move to Monday
      if (tomorrow.getDay() === 0) { // Sunday
        tomorrow.setDate(tomorrow.getDate() + 1);
      } else if (tomorrow.getDay() === 6) { // Saturday
        tomorrow.setDate(tomorrow.getDate() + 2);
      }
      
      return tomorrow.toLocaleString();
    } catch (error) {
      return 'Unable to calculate';
    }
  }

  async runOnce(documentId = null) {
    console.log('🏃 Running one-time document processing...');
    if (documentId) {
      return await this.processSpecificDocument(documentId);
    } else {
      return await this.processTranscriptions();
    }
  }

  stop() {
    console.log('🛑 Stopping scheduler...');
    this.isRunning = false;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      services: {
        googleDrive: this.googleDrive ? 'initialized' : 'not initialized',
        claudeService: this.claudeService ? 'initialized' : 'not initialized',
        blueApi: this.blueApi ? 'initialized' : 'not initialized'
      }
    };
  }
}