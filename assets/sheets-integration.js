// Supabase Integration Client
class SupabaseClient {
  constructor() {
    this.authenticated = false;
    this.isVaultPage = window.location.pathname.toLowerCase().includes('/vault');
    if (this.isVaultPage) {
      this.initUI();
    }
  }

  updateStatus(message, type) {
    if (!this.isVaultPage) return;
    const indicator = document.getElementById('sync-indicator-pill');
    if (indicator) {
      indicator.className = `indicator-dot ${type}`;
      indicator.title = message;
    }
  }

  async checkAuth() {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      this.authenticated = data.authenticated;
      if (this.isVaultPage) {
        this.updateStatus(this.authenticated ? 'Connected' : 'Logged Out', this.authenticated ? 'success' : 'error');
      }
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
    const style = document.createElement('style');
    style.innerHTML = `
      .vault-sync-btn {
        background: rgba(0,0,0,0.5);
        color: #888;
        border: 1px solid #222;
        padding: 6px 16px;
        border-radius: 100px;
        font-size: 10px;
        letter-spacing: 2px;
        cursor: pointer;
        transition: all 0.3s;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 10000;
        backdrop-filter: blur(10px);
      }
      .vault-sync-btn:hover { color: #fff; border-color: #444; background: rgba(0,0,0,0.8); }
      .indicator-dot { width: 6px; height: 6px; border-radius: 50%; }
      .indicator-dot.success { background: #00ff88; box-shadow: 0 0 8px #00ff88; }
      .indicator-dot.loading { background: #ffaa00; animation: vault-blink 1s infinite; }
      .indicator-dot.error { background: #ff4444; }
      @keyframes vault-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      
      /* Premium Form Style */
      input, textarea, select {
        border-bottom: 1px solid #222 !important;
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);

    const observer = new MutationObserver(() => {
      if (!this.isVaultPage) return;

      // Ensure the sync button is always there on Vault page
      if (!document.getElementById('vault-sync-btn')) {
        const btn = document.createElement('button');
        btn.id = 'vault-sync-btn';
        btn.className = 'vault-sync-btn';
        btn.innerHTML = `<span id="sync-indicator-pill" class="indicator-dot ${this.authenticated ? 'success' : 'error'}"></span> SYNC`;
        btn.onclick = () => this.login();
        document.body.appendChild(btn);
      }

      // Upload Button Logic
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
