import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

export class GoogleDriveService {
  constructor() {
    this.auth = null;
    this.drive = null;
  }

  async authenticate() {
    const credentials = {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uris: [process.env.GOOGLE_REDIRECT_URI]
    };

    const { client_id, client_secret, redirect_uris } = credentials;
    this.auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Load saved tokens if available
    try {
      const tokenPath = path.join(process.cwd(), 'token.json');
      const token = await fs.readFile(tokenPath);
      this.auth.setCredentials(JSON.parse(token));
    } catch (error) {
      console.log('No token found. Please run authentication flow.');
      throw new Error('Authentication required. Please set up Google OAuth tokens.');
    }

    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  async getTranscriptionFiles(folderId = null, daysBack = 1) {
    if (!this.drive) {
      await this.authenticate();
    }

    const today = new Date();
    const searchDate = new Date(today.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const searchDateString = searchDate.toISOString().split('T')[0];

    let query = `mimeType='text/plain' or mimeType='application/vnd.google-apps.document'`;
    query += ` and modifiedTime >= '${searchDateString}T00:00:00'`;
    query += ` and name contains 'transcript' or name contains 'transcrição'`;
    
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    try {
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, modifiedTime, mimeType)',
        orderBy: 'modifiedTime desc'
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error fetching transcription files:', error);
      throw error;
    }
  }

  async downloadFileContent(fileId) {
    if (!this.drive) {
      await this.authenticate();
    }

    try {
      // First get file metadata to determine how to download
      const fileMetadata = await this.drive.files.get({
        fileId: fileId,
        fields: 'mimeType'
      });

      let response;
      
      if (fileMetadata.data.mimeType === 'application/vnd.google-apps.document') {
        // Google Docs - export as plain text
        response = await this.drive.files.export({
          fileId: fileId,
          mimeType: 'text/plain'
        });
      } else {
        // Regular file - download directly
        response = await this.drive.files.get({
          fileId: fileId,
          alt: 'media'
        });
      }

      return response.data;
    } catch (error) {
      console.error(`Error downloading file ${fileId}:`, error);
      throw error;
    }
  }

  async getRecentMeetingTranscriptions(daysBack = 1) {
    const files = await this.getTranscriptionFiles(process.env.TRANSCRIPTIONS_FOLDER_ID, daysBack);
    const transcriptions = [];

    for (const file of files) {
      try {
        const content = await this.downloadFileContent(file.id);
        transcriptions.push({
          id: file.id,
          name: file.name,
          content: content,
          modifiedTime: file.modifiedTime
        });
      } catch (error) {
        console.error(`Failed to download transcription ${file.name}:`, error);
      }
    }

    return transcriptions;
  }

  generateAuthUrl() {
    if (!this.auth) {
      throw new Error('Authentication not initialized');
    }

    const scopes = ['https://www.googleapis.com/auth/drive.readonly'];
    
    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  async saveToken(code) {
    if (!this.auth) {
      throw new Error('Authentication not initialized');
    }

    const { tokens } = await this.auth.getToken(code);
    this.auth.setCredentials(tokens);

    const tokenPath = path.join(process.cwd(), 'token.json');
    await fs.writeFile(tokenPath, JSON.stringify(tokens));
    
    console.log('Token saved to', tokenPath);
  }
}