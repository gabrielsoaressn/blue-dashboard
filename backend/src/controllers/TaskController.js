const FileService = require('../services/FileService');
const GoogleAIService = require('../services/GoogleAIService');
const Document = require('../models/Document');
const Task = require('../models/Task');
const Logger = require('../utils/Logger');

class TaskController {
  constructor() {
    this.fileService = new FileService();
    this.googleAIService = new GoogleAIService();
  }

  /**
   * Validates the given input.
   * @param {*} input - The input to validate.
   * @returns {boolean} - True if the input is valid.
   * @throws {Error} - If the input is empty.
   */
  validateInput(input) {
    if (!input) {
      throw new Error('Input cannot be empty.');
    }
    return true;
  }

  /**
   * Processes a document from a local file path.
   * @param {string} filePath - The absolute path to the file.
   * @returns {Promise<object>} - The structured result with document name and extracted tasks.
   */
  async processDocumentFromFile(filePath) {
    try {
      this.validateInput(filePath);
      Logger.log(`Processing document from file: ${filePath}`);
      const document = await this.fileService.createDocumentFromFile(filePath);
      return await this.extractTasksFromDocument(document);
    } catch (error) {
      Logger.error(`Error processing document from file: ${error.message}`);
      throw error; // Re-throw for the caller to handle
    }
  }

  /**
   * Processes a document from a raw text string.
   * @param {string} text - The text content.
   * @param {string} name - The name for the document.
   * @returns {Promise<object>} - The structured result with document name and extracted tasks.
   */
  async processDocumentFromText(text, name = 'text-input') {
    try {
      this.validateInput(text);
      Logger.log(`Processing document from text: ${name}`);
      const document = await this.fileService.createDocumentFromText(text, name);
      return await this.extractTasksFromDocument(document);
    } catch (error) {
      Logger.error(`Error processing document from text: ${error.message}`);
      throw error;
    }
  }

  /**
   * Processes a document from an uploaded file buffer.
   * @param {Buffer} fileBuffer - The file content as a buffer.
   * @param {string} fileName - The original name of the file.
   * @returns {Promise<object>} - The structured result with document name and extracted tasks.
   */
  async processUploadedFile(fileBuffer, fileName) {
    try {
      this.validateInput(fileBuffer);
      this.validateInput(fileName);
      Logger.log(`Processing uploaded file: ${fileName}`);
      const document = await this.fileService.createDocumentFromBuffer(fileBuffer, fileName);
      return await this.extractTasksFromDocument(document);
    } catch (error) {
      Logger.error(`Error processing uploaded file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extracts tasks from a Document object using an AI service.
   * @param {Document} document - The Document object to process.
   * @returns {Promise<object>} - A structured object containing document name and an array of Task objects.
   * @throws {Error} - If the provided document is not a valid Document instance.
   */
  async extractTasksFromDocument(document) {
    if (!(document instanceof Document)) {
      throw new Error('Invalid document provided for task extraction.');
    }

    try {
      Logger.log(`Extracting tasks from document: ${document.name}`);
      const rawTasks = await this.googleAIService.extractTasksFromContent(document.content);

      const tasks = rawTasks.map(taskData => new Task(
        taskData.title,
        taskData.description,
        taskData.dueDate,
        taskData.priority
      ));

      Logger.log(`Successfully extracted ${tasks.length} tasks.`);
      return {
        documentName: document.name,
        tasks: tasks,
      };
    } catch (error) {
      Logger.error(`Error extracting tasks from document ${document.name}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = TaskController;
