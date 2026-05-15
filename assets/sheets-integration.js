// Supabase Integration Client
class SupabaseClient {
  constructor() {
    this.authenticated = false;
    this.isVaultPage = window.location.pathname.toLowerCase().includes('/vault');
    this.initUI();
  }

  updateStatus(message, type) {
    const indicator = document.getElementById('sync-status-indicator');
    if (indicator) {
      indicator.innerHTML = `<span class="indicator-dot ${type}"></span> ${message}`;
    }
  }

  async checkAuth() {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      this.authenticated = data.authenticated;
      this.updateStatus(this.authenticated ? 'DATABASE SYNC ACTIVE' : 'DATABASE OFFLINE', this.authenticated ? 'success' : 'error');
      return this.authenticated;
    } catch (error) {
      return false;
    }
  }

  async testConnection() {
    try {
      this.updateStatus('Testing...', 'loading');
      const response = await fetch('/api/debug');
      const data = await response.json();
      if (data.supabase_connected && data.products_table) {
        alert('✅ Connection Perfect! Database is ready to store products.');
        this.updateStatus('Connection Perfect', 'success');
      } else {
        alert('❌ Connection Error: ' + (data.error || 'Table missing'));
        this.updateStatus('Connection Failed', 'error');
      }
    } catch (error) {
      alert('❌ Failed to reach server');
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
        location.reload();
      } else {
        alert('Invalid password');
      }
    } catch (error) {
      alert('Login failed');
    }
  }

  async uploadImage(file, targetInput) {
    try {
      this.updateStatus('Uploading...', 'loading');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) {
        targetInput.value = data.url;
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        this.updateStatus('Image Uploaded', 'success');
      }
    } catch (error) {
      this.updateStatus('Upload Failed', 'error');
    }
  }

  initUI() {
    const style = document.createElement('style');
    style.innerHTML = `
      #vault-sync-btn, .vault-sync-btn { display: none !important; }
      .settings-sync-box {
        margin-bottom: 30px;
        padding: 25px;
        border: 1px solid #222;
        border-radius: 4px;
        background: rgba(10,10,10,0.8);
        border-left: 4px solid #333;
      }
      .sync-info { display: flex; align-items: center; gap: 12px; font-size: 11px; letter-spacing: 2px; color: #fff; font-weight: bold; }
      .indicator-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
      .indicator-dot.success { background: #00ff88; box-shadow: 0 0 12px #00ff88; }
      .indicator-dot.error { background: #ff4444; box-shadow: 0 0 12px #ff4444; }
      .indicator-dot.loading { background: #ffaa00; animation: blink 1s infinite; }
      @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      .sync-actions { margin-top: 15px; display: flex; gap: 10px; }
      .sync-btn {
        background: #fff; color: #000; border: none; padding: 8px 18px;
        border-radius: 2px; font-size: 10px; font-weight: bold; cursor: pointer; letter-spacing: 1px;
      }
      .sync-btn.secondary { background: transparent; color: #888; border: 1px solid #333; }
      [data-sonner-toaster], .sonner-toaster, #toast-container { display: none !important; }
    `;
    document.head.appendChild(style);

    const observer = new MutationObserver(() => {
      if (!this.isVaultPage) return;
      const settingsHeader = Array.from(document.querySelectorAll('h1, h2, h3, p')).find(el => el.textContent.includes('Site Settings'));
      if (settingsHeader && !document.getElementById('settings-sync-panel')) {
        const panel = document.createElement('div');
        panel.id = 'settings-sync-panel';
        panel.className = 'settings-sync-box';
        panel.innerHTML = `
          <div class="sync-info" id="sync-status-indicator">
            <span class="indicator-dot ${this.authenticated ? 'success' : 'error'}"></span>
            ${this.authenticated ? 'DATABASE CONNECTION SECURE' : 'DATABASE DISCONNECTED'}
          </div>
          <div class="sync-actions">
            ${!this.authenticated ? '<button class="sync-btn" id="vault-login-action">LOGIN TO SYNC</button>' : ''}
            <button class="sync-btn secondary" id="vault-test-action">TEST CONNECTION</button>
          </div>
        `;
        settingsHeader.after(panel);
        const loginBtn = panel.querySelector('#vault-login-action');
        if (loginBtn) loginBtn.onclick = () => this.login();
        const testBtn = panel.querySelector('#vault-test-action');
        if (testBtn) testBtn.onclick = () => this.testConnection();
      }

      const inputs = document.querySelectorAll('input');
      inputs.forEach(input => {
        const label = input.previousElementSibling || input.parentElement.previousElementSibling;
        if (label && label.textContent.toUpperCase().includes('IMAGE URL') && !input.dataset.uploadAttached) {
          input.dataset.uploadAttached = 'true';
          this.attachUploadButton(input);
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  attachUploadButton(input) {
    const btn = document.createElement('button');
    btn.innerHTML = 'UPLOAD IMAGE';
    btn.style.cssText = 'background: #111; color: #666; border: 1px solid #222; padding: 6px 12px; border-radius: 2px; font-size: 9px; cursor: pointer; margin-top: 8px; letter-spacing: 1px;';
    btn.onclick = (e) => { e.preventDefault(); fileInput.click(); };
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.onchange = (e) => { if (e.target.files[0]) this.uploadImage(e.target.files[0], input); };
    input.parentElement.appendChild(btn);
    input.parentElement.appendChild(fileInput);
  }
}

const sheetsClient = new SupabaseClient();
document.addEventListener('DOMContentLoaded', () => sheetsClient.checkAuth());
