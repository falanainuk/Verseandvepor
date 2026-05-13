// Google Sheets Integration Client
class GoogleSheetsClient {
  constructor() {
    this.authenticated = false;
    this.data = [];
    this.headers = [];
  }

  async checkAuth() {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      this.authenticated = data.authenticated;
      return this.authenticated;
    } catch (error) {
      console.error('Error checking auth:', error);
      return false;
    }
  }

  async login() {
    try {
      const response = await fetch('/api/auth/url');
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      alert('Failed to initiate login: ' + error.message);
    }
  }

  async loadData() {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        if (response.status === 401) {
          this.authenticated = false;
          throw new Error('Not authenticated');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.headers = data.headers;
      this.data = data.data;
      this.render();
      return data;
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data: ' + error.message);
    }
  }

  async addRow(rowData) {
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers: this.headers, newRow: rowData }),
      });
      const data = await response.json();
      if (data.success) {
        await this.loadData();
        return true;
      }
      throw new Error(data.error || 'Failed to add row');
    } catch (error) {
      console.error('Error adding row:', error);
      alert('Failed to add row: ' + error.message);
    }
  }

  async updateRow(rowIndex, rowData) {
    try {
      const response = await fetch(`/api/data/${rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowData }),
      });
      const data = await response.json();
      if (data.success) {
        await this.loadData();
        return true;
      }
      throw new Error(data.error || 'Failed to update row');
    } catch (error) {
      console.error('Error updating row:', error);
      alert('Failed to update row: ' + error.message);
    }
  }

  render() {
    const container = document.getElementById('data-container');
    if (!container) return;

    if (!this.authenticated) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <h2>Google Sheets Database</h2>
          <p>Connect to your Google Sheet to view and edit data</p>
          <button onclick="sheetsClient.login()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #4285F4; color: white; border: none; border-radius: 4px;">
            Login with Google
          </button>
        </div>
      `;
      return;
    }

    if (this.data.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <p>No data found in sheet</p>
        </div>
      `;
      return;
    }

    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse; margin-top: 20px;';

    // Header row
    const headerRow = document.createElement('tr');
    headerRow.style.cssText = 'background-color: #f0f0f0;';
    this.headers.forEach(header => {
      const th = document.createElement('th');
      th.style.cssText = 'border: 1px solid #ddd; padding: 12px; text-align: left;';
      th.textContent = header;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Data rows
    this.data.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.style.cssText = 'border: 1px solid #ddd;';
      this.headers.forEach(header => {
        const td = document.createElement('td');
        td.style.cssText = 'border: 1px solid #ddd; padding: 12px;';
        td.textContent = row[header] || '';
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    container.innerHTML = '';
    container.appendChild(table);
  }
}

// Initialize client
const sheetsClient = new GoogleSheetsClient();

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
  const authenticated = await sheetsClient.checkAuth();
  if (authenticated) {
    await sheetsClient.loadData();
  } else {
    sheetsClient.render();
  }
});
