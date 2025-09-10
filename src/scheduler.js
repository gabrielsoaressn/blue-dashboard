import cron from 'node-cron';
import { GoogleDriveService } from './googleDrive.js';
import { TranscriptionSummarizer } from './transcriptionSummarizer.js';
import { BlueApiService } from './blueApiService.js';

export class MeetingScheduler {
  constructor() {
    this.googleDrive = new GoogleDriveService();
    this.summarizer = new TranscriptionSummarizer();
    this.blueApi = new BlueApiService();
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing services...');
      
      // Validate Blue.cc connection
      await this.blueApi.validateConnection();
      
      console.log('✅ All services initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return false;
    }
  }

  async processTranscriptions() {
    if (this.isRunning) {
      console.log('⏳ Process already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    
    try {
      console.log(`🚀 Starting transcription processing at ${startTime.toLocaleString()}`);
      
      // Get recent transcriptions (last 1 day)
      const transcriptions = await this.googleDrive.getRecentMeetingTranscriptions(1);
      
      if (transcriptions.length === 0) {
        console.log('📂 No new transcriptions found');
        return { processed: 0, created: 0, updated: 0, errors: 0 };
      }

      console.log(`📄 Found ${transcriptions.length} transcription(s) to process`);
      
      const results = {
        processed: 0,
        created: 0,
        updated: 0,
        errors: 0,
        details: []
      };

      for (const transcription of transcriptions) {
        try {
          console.log(`📋 Processing: ${transcription.name}`);
          
          // Summarize transcription
          const summary = await this.summarizer.summarizeTranscription(
            transcription.content,
            transcription.name
          );

          // Extract tasks from summary
          const extractedTasks = await this.summarizer.extractTasksFromSummary(summary);
          
          if (extractedTasks.length === 0) {
            console.log(`   ℹ️  No tasks found in ${transcription.name}`);
            continue;
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

          results.processed++;
          results.details.push({
            transcription: transcription.name,
            summary: summary,
            tasks: taskResults
          });

        } catch (error) {
          console.error(`❌ Error processing ${transcription.name}:`, error.message);
          results.errors++;
        }
      }

      const endTime = new Date();
      const duration = Math.round((endTime - startTime) / 1000);
      
      console.log(`\n📊 Processing Summary:`);
      console.log(`   📄 Transcriptions processed: ${results.processed}`);
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

  async runOnce() {
    console.log('🏃 Running one-time transcription processing...');
    return await this.processTranscriptions();
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
        summarizer: this.summarizer ? 'initialized' : 'not initialized',
        blueApi: this.blueApi ? 'initialized' : 'not initialized'
      }
    };
  }
}