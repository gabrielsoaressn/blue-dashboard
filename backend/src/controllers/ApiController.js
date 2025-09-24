const TaskController = require('./TaskController');
const Logger = require('../utils/Logger');

// Note: Middleware for file upload (multer), rate limiting, and validation
// should be applied in the router, before these controller methods are called.

class ApiController {
  constructor() {
    this.taskController = new TaskController();
  }

  /**
   * Health check endpoint.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  async healthCheck(req, res) {
    Logger.log('Health check endpoint hit');
    res.status(200).json({ status: 'ok', message: 'API is healthy' });
  }

  /**
   * Handles file upload, processes it, and extracts tasks.
   * Assumes 'multer' middleware has processed the upload.
   * @param {object} req - Express request object (with req.file from multer).
   * @param {object} res - Express response object.
   */
  async uploadAndProcess(req, res) {
    try {
      if (!req.file) {
        Logger.warn('Upload attempt with no file.');
        return res.status(400).json({ error: 'No file uploaded. Please upload a supported file.' });
      }

      const maxFileSize = 10 * 1024 * 1024; // 10 MB
      if (req.file.size > maxFileSize) {
        Logger.warn(`File upload rejected: size (${req.file.size}) exceeds limit (${maxFileSize}).`);
        return res.status(413).json({ error: 'File size exceeds the 10MB limit.' });
      }

      Logger.log(`Received file for processing: ${req.file.originalname}`);
      const result = await this.taskController.processUploadedFile(
        req.file.buffer,
        req.file.originalname
      );

      return res.status(200).json(result);

    } catch (error) {
      Logger.error(`Error in uploadAndProcess: ${error.message}`);
      if (error.message.includes('Input cannot be empty')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'An internal server error occurred while processing the file.' });
    }
  }

  /**
   * Handles processing of raw text input.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  async processText(req, res) {
    try {
      const { text, name } = req.body;

      if (!text || typeof text !== 'string' || text.trim() === '') {
        Logger.warn('Process text attempt with empty input.');
        return res.status(400).json({ error: 'Text input cannot be empty.' });
      }

      Logger.log('Received text for processing.');
      const result = await this.taskController.processDocumentFromText(text, name);

      return res.status(200).json(result);

    } catch (error) {
      Logger.error(`Error in processText: ${error.message}`);
      if (error.message.includes('Input cannot be empty')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'An internal server error occurred while processing the text.' });
    }
  }

  /**
   * Handles processing of a local file path (e.g., for CLI or internal use).
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  async processLocalFile(req, res) {
    try {
        const { filePath } = req.body;

        if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
            Logger.warn('Process local file attempt with empty path.');
            return res.status(400).json({ error: 'File path cannot be empty.' });
        }

        Logger.log(`Received request to process local file: ${filePath}`);
        const result = await this.taskController.processDocumentFromFile(filePath);

        return res.status(200).json(result);

    } catch (error) {
        Logger.error(`Error in processLocalFile: ${error.message}`);
        if (error.code === 'ENOENT') {
             return res.status(404).json({ error: `File not found at path: ${req.body.filePath}` });
        }
        return res.status(500).json({ error: 'An internal server error occurred while processing the local file.' });
    }
  }
}

// Export a single instance to be used as a singleton
module.exports = new ApiController();
