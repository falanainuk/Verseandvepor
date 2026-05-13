const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { Readable } = require('stream');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

// Store tokens in memory (use database in production)
let tokens = {};

// APIs
const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Multer config for file uploads (in-memory)
const upload = multer({ storage: multer.memoryStorage() });

// Route to get Google login URL
app.get('/api/auth/url', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ],
  });
  res.json({ authUrl });
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens: newTokens } = await oauth2Client.getToken(code);
    tokens = newTokens;
    oauth2Client.setCredentials(newTokens);
    res.redirect('/?authenticated=true');
  } catch (error) {
    res.status(500).send('Authentication failed: ' + error.message);
  }
});

// Get data from Google Sheet
app.get('/api/data', async (req, res) => {
  try {
    if (!tokens.access_token) {
      return res.status(401).json({ error: 'Not authenticated. Please login first.' });
    }

    oauth2Client.setCredentials(tokens);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: process.env.SPREADSHEET_RANGE || 'Products!A:G',
    });

    const rows = response.data.values || [];
    const headers = rows[0] || [];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    res.json({ headers, data });
  } catch (error) {
    console.error('Error reading sheet:', error);
    res.status(500).json({ error: 'Failed to read sheet: ' + error.message });
  }
});

// Add data to Google Sheet
app.post('/api/data', async (req, res) => {
  try {
    if (!tokens.access_token) {
      return res.status(401).json({ error: 'Not authenticated. Please login first.' });
    }

    oauth2Client.setCredentials(tokens);
    const { headers, newRow } = req.body;

    const values = [newRow];
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: process.env.SPREADSHEET_RANGE || 'Products!A:G',
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    res.json({ success: true, updates: response.data.updates });
  } catch (error) {
    console.error('Error writing to sheet:', error);
    res.status(500).json({ error: 'Failed to write to sheet: ' + error.message });
  }
});

// Update data in Google Sheet
app.put('/api/data/:rowIndex', async (req, res) => {
  try {
    if (!tokens.access_token) {
      return res.status(401).json({ error: 'Not authenticated. Please login first.' });
    }

    oauth2Client.setCredentials(tokens);
    const rowIndex = parseInt(req.params.rowIndex) + 1; // +1 because of header row
    const { rowData } = req.body;

    const range = `Products!A${rowIndex}:G${rowIndex}`;
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: range,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [rowData] },
    });

    res.json({ success: true, updates: response.data.updates });
  } catch (error) {
    console.error('Error updating sheet:', error);
    res.status(500).json({ error: 'Failed to update sheet: ' + error.message });
  }
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: !!tokens.access_token });
});

// Upload file to Google Drive
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!tokens.access_token) {
      return res.status(401).json({ error: 'Not authenticated. Please login first.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    oauth2Client.setCredentials(tokens);

    const fileMetadata = {
      name: req.file.originalname,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
    };

    const media = {
      mimeType: req.file.mimetype,
      body: Readable.from(req.file.buffer)
    };

    const driveResponse = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    res.json({ 
      success: true, 
      fileId: driveResponse.data.id,
      url: driveResponse.data.webViewLink 
    });
  } catch (error) {
    console.error('Error uploading to Drive:', error);
    res.status(500).json({ error: 'Failed to upload file: ' + error.message });
  }
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Google Sheets integration ready`);
  console.log(`Sheet ID: ${process.env.GOOGLE_SHEET_ID}`);
});
