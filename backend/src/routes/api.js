
import { Router } from 'express';
import multer from 'multer';
import FileService from '../services/FileService.js';
import GoogleAIService from '../services/GoogleAIService.js';
import Logger from '../utils/Logger.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @route   POST /api/upload
 * @desc    Upload a file, process it, and extract tasks.
 * @access  Public
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const { buffer, originalname } = req.file;
    const document = await FileService.saveUploadedFile(buffer, originalname);
    const tasks = await GoogleAIService.extractTasks(document.content, document.name);
    res.json({ document, tasks });
  } catch (error) {
    Logger.error(`Error in /api/upload: ${error.message}`);
    next(error);
  }
});

/**
 * @route   POST /api/process-text
 * @desc    Process raw text and extract tasks.
 * @access  Public
 */
router.post('/process-text', async (req, res, next) => {
  const { text, documentName } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'No text provided.' });
  }

  try {
    const tasks = await GoogleAIService.extractTasks(text, documentName || 'direct-text-input');
    res.json({ tasks });
  } catch (error) {
    Logger.error(`Error in /api/process-text: ${error.message}`);
    next(error);
  }
});

/**
 * @route   GET /api/health
 * @desc    Health check endpoint.
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

/**
 * @route   POST /api/process-file
 * @desc    Process a local file and extract tasks.
 * @access  Public
 */
router.post('/process-file', async (req, res, next) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ message: 'No file path provided.' });
  }

  try {
    const document = await FileService.readFile(filePath);
    const tasks = await GoogleAIService.extractTasks(document.content, document.name);
    res.json({ document, tasks });
  } catch (error) {
    Logger.error(`Error in /api/process-file: ${error.message}`);
    next(error);
  }
});

export default router;
