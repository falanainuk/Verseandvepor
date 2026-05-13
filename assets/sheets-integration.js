// Google Sheets Integration Client
class GoogleSheetsClient {
  constructor() {
    this.authenticated = false;
    this.data = [];
    this.headers = [];
  }

  updateStatus(message, type) {
    const statusEl = document.getElementById('sync-status');
    if (!statusEl) return;
    if (!message) {
      statusEl.textContent = '';
      statusEl.className = '';
      return;
    }
    statusEl.textContent = message;
    statusEl.className = `status-${type}`;
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
      this.updateStatus('Syncing with Google Sheets...', 'loading');
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
      this.updateStatus('Data is up to date.', 'success');
      return data;
    } catch (error) {
      this.updateStatus('Error syncing data.', 'error');
      console.error('Error loading data:', error);
      alert('Failed to load data: ' + error.message);
    }
  }

  async addRow(rowData) {
    try {
      this.updateStatus('Saving new row...', 'loading');
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
      this.updateStatus('Error saving row.', 'error');
      console.error('Error adding row:', error);
      alert('Failed to add row: ' + error.message);
    }
  }

  async updateRow(rowIndex, rowData) {
    try {
      this.updateStatus('Updating row...', 'loading');
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
      this.updateStatus('Error updating row.', 'error');
      console.error('Error updating row:', error);
      alert('Failed to update row: ' + error.message);
    }
  }

  render() {
    const container = document.getElementById('data-container');
    if (!container) return;

    if (!this.authenticated) {
      this.updateStatus('', ''); // Clear status
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; background: #222; border-radius: 12px; margin-top: 20px;">
          <h2 style="margin-top:0;">Database Access</h2>
          <p style="color: #bbb; margin-bottom: 24px;">Please sign in to view and edit your Verse & Vapor data.</p>
          <button onclick="sheetsClient.login()" style="display: inline-flex; align-items: center; padding: 12px 24px; font-size: 16px; font-weight: bold; cursor: pointer; background-color: #fff; color: #444; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: transform 0.2s;">
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style="margin-right: 12px;"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.13-10.36 7.13-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Sign in with Google Auth
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
