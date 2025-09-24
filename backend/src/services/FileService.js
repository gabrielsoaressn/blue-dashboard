
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Document from '../models/Document.js';
import Logger from '../utils/Logger.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json'];

/**
 * @class FileService
 * @description Service for handling local file operations.
 */
class FileService {
  /**
   * Reads a single text file from the local filesystem.
   * @param {string} filePath - The absolute path to the file.
   * @returns {Promise<Document>} A Document object representing the file.
   * @throws {Error} If the file is not found, readable, or exceeds the size limit.
   */
  async readFile(filePath) {
    await this.validateFileExists(filePath);
    this.validateFileExtension(filePath);

    try {
      const stats = await this.getFileStats(filePath);
      if (stats.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`);
      }

      const content = await fs.readFile(filePath, 'utf-8');
      Logger.info(`File read successfully: ${filePath}`);

      return new Document({
        id: uuidv4(),
        name: path.basename(filePath),
        content,
        source: 'file',
        metadata: {
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        },
      });
    } catch (error) {
      Logger.error(`Error reading file ${filePath}: ${error.message}`);
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied to read file: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Reads multiple text files from the local filesystem.
   * @param {string[]} filePaths - An array of absolute paths to the files.
   * @returns {Promise<Document[]>} An array of Document objects.
   */
  async readMultipleFiles(filePaths) {
    const documents = await Promise.all(
      filePaths.map((filePath) => this.readFile(filePath))
    );
    return documents;
  }

  /**
   * Saves an uploaded file to a temporary directory.
   * @param {Buffer} fileBuffer - The file content as a Buffer.
   * @param {string} fileName - The original name of the file.
   * @returns {Promise<Document>} A Document object representing the saved file.
   * @throws {Error} If the file format is not supported or saving fails.
   */
  async saveUploadedFile(fileBuffer, fileName) {
    this.validateFileExtension(fileName);

    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`);
    }

    const tempDir = path.join(__dirname, '..', '..', 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    const filePath = path.join(tempDir, `${uuidv4()}-${fileName}`);

    try {
      await fs.writeFile(filePath, fileBuffer);
      Logger.info(`Uploaded file saved successfully: ${filePath}`);

      const stats = await this.getFileStats(filePath);

      return new Document({
        id: uuidv4(),
        name: fileName,
        content: fileBuffer.toString('utf-8'),
        source: 'upload',
        metadata: {
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        },
      });
    } catch (error) {
      Logger.error(`Error saving uploaded file ${fileName}: ${error.message}`);
      throw new Error(`Failed to save uploaded file: ${fileName}`);
    }
  }

  /**
   * Checks if a file exists at the given path.
   * @param {string} filePath - The absolute path to the file.
   * @returns {Promise<void>}
   * @throws {Error} If the file does not exist.
   */
  async validateFileExists(filePath) {
    try {
      await fs.access(filePath, fs.constants.F_OK);
    } catch (error) {
      throw new Error(`File not found: ${filePath}`);
    }
  }

  /**
   * Validates if the file extension is supported.
   * @param {string} fileName - The name of the file.
   * @throws {Error} If the file extension is not supported.
   */
  validateFileExtension(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      throw new Error(`Unsupported file format: ${ext}. Supported formats are: ${SUPPORTED_EXTENSIONS.join(', ')}`);
    }
  }


  /**
   * Gets the supported file extensions.
   * @returns {string[]} An array of supported extensions.
   */
  getSupportedExtensions() {
    return SUPPORTED_EXTENSIONS;
  }

  /**
   * Gets statistics for a file.
   * @param {string} filePath - The absolute path to the file.
   * @returns {Promise<fs.Stats>} File stats.
   * @throws {Error} If the file does not exist.
   */
  async getFileStats(filePath) {
    await this.validateFileExists(filePath);
    return fs.stat(filePath);
  }
}

export default new FileService();
