
#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs/promises';
import path from 'path';
import TaskController from './controllers/TaskController.js';
import Logger from './utils/Logger.js';

const taskController = new TaskController();

/**
 * Formats the extracted tasks for display.
 * @param {object} result - The result object from TaskController.
 * @returns {string} - The formatted string.
 */
function formatOutput(result) {
  let output = `--- Document: ${result.documentName} ---
`;
  if (result.tasks.length === 0) {
    output += 'No tasks found.\n';
  } else {
    result.tasks.forEach((task, index) => {
      output += `\n[Task ${index + 1}]\n`;
      output += `  Title: ${task.title}\n`;
      output += `  Description: ${task.description}\n`;
      output += `  Due Date: ${task.dueDate || 'Not specified'}\n`;
      output += `  Priority: ${task.priority || 'Not specified'}\n`;
    });
  }
  return output;
}

/**
 * Saves the result to a JSON file.
 * @param {object} data - The data to save.
 * @param {string} outputPath - The path to the output file.
 */
async function saveOutput(data, outputPath) {
  try {
    const finalPath = outputPath || `results-${Date.now()}.json`;
    await fs.writeFile(finalPath, JSON.stringify(data, null, 2));
    Logger.log(`Results saved to ${finalPath}`);
  } catch (error) {
    Logger.error(`Failed to save results: ${error.message}`);
  }
}

yargs(hideBin(process.argv))
  .command(
    'process <file>',
    'Process a single file to extract tasks',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Absolute path to the file to process',
        type: 'string',
      });
    },
    async (argv) => {
      try {
        Logger.log(`Processing file: ${argv.file}`);
        const result = await taskController.processDocumentFromFile(argv.file);
        
        console.log(formatOutput(result));

        if (argv.save) {
          await saveOutput(result, argv.output);
        }
      } catch (error) {
        Logger.error(`Error: ${error.message}`);
        process.exit(1);
      }
    }
  )
  .command(
    'batch <directory>',
    'Process all supported files in a directory',
    (yargs) => {
      return yargs.positional('directory', {
        describe: 'Absolute path to the directory to process',
        type: 'string',
      });
    },
    async (argv) => {
      try {
        Logger.log(`Starting batch processing for directory: ${argv.directory}`);
        const files = await fs.readdir(argv.directory);
        const supportedExtensions = ['.txt', '.md'];
        const results = [];

        for (const file of files) {
          const filePath = path.join(argv.directory, file);
          if (supportedExtensions.includes(path.extname(filePath).toLowerCase())) {
            try {
              Logger.log(`Processing file: ${filePath}`);
              const result = await taskController.processDocumentFromFile(filePath);
              console.log(formatOutput(result));
              results.push(result);
            } catch (error) {
               Logger.error(`Could not process file ${filePath}: ${error.message}`);
            }
          }
        }
        
        if (argv.save) {
          await saveOutput(results, argv.output);
        }

        Logger.log('Batch processing finished.');

      } catch (error) {
        Logger.error(`Error during batch processing: ${error.message}`);
        process.exit(1);
      }
    }
  )
  .option('save', {
    alias: 's',
    type: 'boolean',
    description: 'Save the output to a JSON file',
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'Path to save the output file (e.g., results.json)',
  })
  .demandCommand(1, 'You need to provide a command: process or batch.')
  .help()
  .alias('help', 'h')
  .strict().argv;
