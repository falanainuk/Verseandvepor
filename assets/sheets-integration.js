// Supabase Integration Client (Replacing Google Sheets)
class SupabaseClient {
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
    const password = prompt('Enter Admin Password:');
    if (!password) return;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      if (data.success) {
        this.authenticated = true;
        await this.loadData();
      } else {
        alert('Invalid password');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Login failed');
    }
  }

  async loadData() {
    try {
      this.updateStatus('Syncing with Supabase...', 'loading');
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
      // Don't alert here to avoid spamming on page load
    }
  }

  render() {
    const container = document.getElementById('data-container');
    if (!container) return;

    if (!this.authenticated) {
      this.updateStatus('', '');
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; background: #111; border: 1px solid #333; border-radius: 12px; margin-top: 20px;">
          <h2 style="margin-top:0; color: #fff;">Vault Access</h2>
          <p style="color: #888; margin-bottom: 24px;">Please enter the admin password to manage Verse & Vapor data.</p>
          <button onclick="sheetsClient.login()" style="padding: 12px 30px; font-size: 16px; font-weight: bold; cursor: pointer; background: #fff; color: #000; border: none; border-radius: 8px; transition: all 0.2s;">
            Login to Vault
          </button>
        </div>
      `;
      return;
    }

    if (this.data.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; border: 1px dashed #333; border-radius: 12px; margin-top: 20px;">
          <p style="color: #666;">No data found in Supabase. Check if the "products" table is created.</p>
        </div>
      `;
      return;
    }

    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse; margin-top: 20px; color: #eee;';

    const headerRow = document.createElement('tr');
    headerRow.style.cssText = 'background-color: #222;';
    this.headers.forEach(header => {
      const th = document.createElement('th');
      th.style.cssText = 'border: 1px solid #333; padding: 12px; text-align: left; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;';
      th.textContent = header;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    this.data.forEach((row) => {
      const tr = document.createElement('tr');
      tr.style.cssText = 'border: 1px solid #333; transition: background 0.2s;';
      tr.onmouseover = () => tr.style.backgroundColor = '#1a1a1a';
      tr.onmouseout = () => tr.style.backgroundColor = 'transparent';
      
      this.headers.forEach(header => {
        const td = document.createElement('td');
        td.style.cssText = 'border: 1px solid #333; padding: 12px; font-size: 14px;';
        
        // Truncate long values like image URLs
        const val = row[header] || '';
        if (typeof val === 'string' && val.startsWith('http') && val.length > 30) {
          td.innerHTML = `<a href="${val}" target="_blank" style="color: #55acee; text-decoration: none;">View Link</a>`;
        } else {
          td.textContent = val;
        }
        
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    container.innerHTML = '';
    container.appendChild(table);
  }
}

// Keep the name sheetsClient for backward compatibility with index.html events
const sheetsClient = new SupabaseClient();

document.addEventListener('DOMContentLoaded', async () => {
  const authenticated = await sheetsClient.checkAuth();
  if (authenticated) {
    await sheetsClient.loadData();
  } else {
    // If not authenticated, but we are on the Vault page, show the login UI
    if (window.location.pathname.toLowerCase().includes('/vault')) {
      sheetsClient.render();
    }
  }
});
