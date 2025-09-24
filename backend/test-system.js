'''
import { exec } from 'child_process';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import assert from 'assert';
import FormData from 'form-data';

const API_BASE_URL = 'http://localhost:3000/api';
const PROJECT_ROOT = path.resolve(process.cwd(), '..'); 
const SHARED_DIR = path.join(PROJECT_ROOT, 'shared');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// --- Test Data ---
const testFiles = {
  daily: path.join(SHARED_DIR, 'exemplo-reuniao.txt'),
  manyTasks: path.join(SHARED_DIR, 'reuniao-muitas-tasks.txt'),
  noTasks: path.join(SHARED_DIR, 'reuniao-sem-tasks.txt'),
  malformed: path.join(SHARED_DIR, 'texto-mal-formatado.txt'),
};

const expectedTasksFromDaily = [
  { title: 'Criar Pull Request para a feature de login' },
  { title: 'Agendar sessão de pair programming com Ana' },
  { title: 'Registrar bug do CVV no Jira' },
  { title: 'Atualizar ambiente de staging' },
  { title: 'Documentar a API de usuários' },
];

// --- Test Suites ---

async function runCLITests() {
  console.log('--- Running CLI Tests ---');

  const cliPath = path.resolve(process.cwd(), 'src/cli.js');
  const command = `node ${cliPath} process "${testFiles.daily}"`;

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`CLI Error: ${stderr}`);
        return reject(new Error('CLI test failed'));
      }

      try {
        assert(stdout.includes('Processing file:'), 'CLI should log file processing');
        assert(stdout.includes('[Task 1]'), 'CLI should output at least one task');
        assert(stdout.includes('Pull Request para a feature de login'), 'CLI should find a specific task');
        console.log('✔ CLI test passed');
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
}

async function runApiTests() {
  console.log('
--- Running API Tests ---');

  // 1. Health Check
  try {
    const { data } = await apiClient.get('/health');
    assert.strictEqual(data.status, 'ok', 'API Health check should return status "ok"');
    console.log('✔ API Health Check passed');
  } catch (error) {
    throw new Error(`API Health Check failed: ${error.message}`);
  }

  // 2. Upload and Process File (Daily)
  try {
    const form = new FormData();
    form.append('file', await fs.readFile(testFiles.daily), 'exemplo-reuniao.txt');
    
    const { data } = await apiClient.post('/upload', form, { headers: form.getHeaders() });

    assert(data.tasks.length >= 5, `Expected at least 5 tasks from daily, but got ${data.tasks.length}`);
    
    const taskTitles = data.tasks.map(t => t.title);
    for (const expectedTask of expectedTasksFromDaily) {
        assert(taskTitles.some(title => title.includes(expectedTask.title)), `Missing task: "${expectedTask.title}"`);
    }
    console.log('✔ API POST /upload (daily) passed');
  } catch (error) {
    throw new Error(`API POST /upload (daily) failed: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  }

  // 3. Process Malformed Text
  try {
    const malformedText = await fs.readFile(testFiles.malformed, 'utf-8');
    const { data } = await apiClient.post('/process-text', { text: malformedText });
    assert(data.tasks.length > 0, 'Should extract tasks even from malformed text');
    console.log('✔ API POST /process-text (malformed) passed');
  } catch (error) {
    throw new Error(`API POST /process-text (malformed) failed: ${error.message}`);
  }

  // 4. Process File with No Tasks
  try {
    const { data } = await apiClient.post('/process-file', { filePath: testFiles.noTasks });
    assert.strictEqual(data.tasks.length, 0, 'Should find 0 tasks in the "no-tasks" file');
    console.log('✔ API POST /process-file (no tasks) passed');
  } catch (error) {
    throw new Error(`API POST /process-file (no tasks) failed: ${error.message}`);
  }
  
  // 5. Upload and Process File (Many Tasks)
  try {
    const form = new FormData();
    form.append('file', await fs.readFile(testFiles.manyTasks), 'reuniao-muitas-tasks.txt');
    
    const { data } = await apiClient.post('/upload', form, { headers: form.getHeaders() });
    assert(data.tasks.length > 10, `Expected more than 10 tasks, but got ${data.tasks.length}`);
    console.log('✔ API POST /upload (many tasks) passed');
  } catch (error) {
    throw new Error(`API POST /upload (many tasks) failed: ${error.message}`);
  }
}


// --- Main Execution ---

async function main() {
  try {
    await runCLITests();
    await runApiTests();
    console.log('
✅ All backend tests passed!');
  } catch (error) {
    console.error(`
❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

main();
''