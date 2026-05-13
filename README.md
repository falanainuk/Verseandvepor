# Verse & Vapor - Google Sheets Integration

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- Google Account with access to the Google Sheet

### Installation

1. **Navigate to project directory:**
```bash
cd "c:\WEBSITEs\wonderfull v&v"
```

2. **Install dependencies:**
```bash
npm install
```

### Configuration

The following files contain the configuration:
- `config.json` - Main configuration file
- `.env` - Environment variables (already configured with your Google credentials)

**Already configured:**
- ✅ Client ID: `676374937521-00j0cbueufitrpe0588vsv342ku4bi1j.apps.googleusercontent.com`
- ✅ Client Secret: `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`
- ✅ Sheet ID: `1vaRXFZUaXx6hcT4mjWVa9qql9InEm4tHtmhHZWT7-Ws`
- ✅ Redirect URI: `http://localhost:8000/auth/callback`

### Running the Server

**Stop the Python HTTP server first**, then run:

```bash
npm start
```

The server will start at `http://localhost:8000`

### Features

1. **Google Authentication**
   - Click "Login with Google" button on the page
   - Authenticate with your Google account
   - Get editor access to the Google Sheet

2. **View Data**
   - All data from the Google Sheet is displayed in a table
   - Headers are automatically detected

3. **Add Data**
   - Use the API endpoint `/api/data` to add new rows

4. **Update Data**
   - Use the API endpoint `/api/data/:rowIndex` to update existing rows

### API Endpoints

#### Get Data
```
GET /api/data
Response: { headers: [...], data: [...] }
```

#### Add Row
```
POST /api/data
Body: { headers: [...], newRow: [...] }
Response: { success: true, updates: ... }
```

#### Update Row
```
PUT /api/data/:rowIndex
Body: { rowData: [...] }
Response: { success: true, updates: ... }
```

#### Check Auth Status
```
GET /api/auth/status
Response: { authenticated: boolean }
```

#### Get Auth URL
```
GET /api/auth/url
Response: { authUrl: "..." }
```

### Google Sheet Structure

Your sheet "VerseVaporDatabase" should have:
- **Sheet name:** Products
- **Columns:** A through G (ID, Name, Description, Price, ImageURL, Category, InStock)

### Troubleshooting

1. **Port 8000 already in use:**
   - Change the PORT in config.json and try again
   - Or kill the Python process: `netstat -ano | findstr :8000`

2. **Authentication fails:**
   - Verify Client ID and Secret are correct
   - Ensure redirect URI is registered in Google Cloud Console

3. **Cannot read sheet:**
   - Verify Sheet ID is correct
   - Ensure your Google account has editor access
   - Check that the sheet "Products" exists

### Next Steps

1. Add more sheets (Users, Orders, etc.) to your Google Sheet
2. Update the API endpoints to handle multiple sheets
3. Add form UI to add/edit data
4. Implement data validation
5. Add search and filter functionality
