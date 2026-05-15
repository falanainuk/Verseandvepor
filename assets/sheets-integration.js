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
      this.updateStatus(this.authenticated ? 'Connected' : 'Sync Required', this.authenticated ? 'success' : 'error');
      return this.authenticated;
    } catch (error) {
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
        this.updateStatus('Uploaded', 'success');
      }
    } catch (error) {
      this.updateStatus('Upload Failed', 'error');
    }
  }

  initUI() {
    // Hide original floating widget if it exists
    const style = document.createElement('style');
    style.innerHTML = `
      #vault-sync-btn, .vault-sync-btn { display: none !important; }
      
      .settings-sync-box {
        margin-bottom: 30px;
        padding: 20px;
        border: 1px solid #222;
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(10,10,10,0.5);
      }
      .sync-info { display: flex; align-items: center; gap: 10px; font-size: 11px; letter-spacing: 1px; color: #888; }
      .indicator-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
      .indicator-dot.success { background: #00ff88; box-shadow: 0 0 10px #00ff88; }
      .indicator-dot.error { background: #ff4444; }
      .indicator-dot.loading { background: #ffaa00; animation: blink 1s infinite; }
      @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      
      .sync-login-btn {
        background: #fff;
        color: #000;
        border: none;
        padding: 6px 15px;
        border-radius: 2px;
        font-size: 10px;
        font-weight: bold;
        cursor: pointer;
        letter-spacing: 1px;
      }
    `;
    document.head.appendChild(style);

    const observer = new MutationObserver(() => {
      if (!this.isVaultPage) return;

      // 1. Find the "Site Settings" section
      const settingsHeader = Array.from(document.querySelectorAll('h1, h2, h3, p')).find(el => el.textContent.includes('Site Settings'));
      if (settingsHeader && !document.getElementById('settings-sync-panel')) {
        const panel = document.createElement('div');
        panel.id = 'settings-sync-panel';
        panel.className = 'settings-sync-box';
        panel.innerHTML = `
          <div class="sync-info" id="sync-status-indicator">
            <span class="indicator-dot ${this.authenticated ? 'success' : 'error'}"></span>
            ${this.authenticated ? 'DATABASE SYNC ACTIVE' : 'DATABASE OFFLINE'}
          </div>
          ${!this.authenticated ? '<button class="sync-login-btn">LOGIN TO SYNC</button>' : ''}
        `;
        
        const loginBtn = panel.querySelector('.sync-login-btn');
        if (loginBtn) loginBtn.onclick = () => this.login();
        
        settingsHeader.after(panel);
      }

      // 2. Upload Button Logic
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
