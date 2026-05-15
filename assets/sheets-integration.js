// Supabase Integration Client
class SupabaseClient {
  constructor() {
    this.authenticated = false;
    this.data = [];
    this.headers = [];
    this.initMutationObserver();
  }

  updateStatus(message, type) {
    const statusEl = document.getElementById('sync-indicator');
    if (!statusEl) return;
    
    statusEl.innerHTML = `<span class="indicator-dot ${type}"></span> ${message}`;
    statusEl.style.opacity = '1';
    
    if (type === 'success') {
      setTimeout(() => statusEl.style.opacity = '0.7', 3000);
    }
  }

  async checkAuth() {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      this.authenticated = data.authenticated;
      this.render();
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
        this.updateStatus('Sync Active', 'success');
        this.render();
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
      this.updateStatus('Syncing...', 'loading');
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('Fetch failed');
      const data = await response.json();
      this.headers = data.headers;
      this.data = data.data;
      this.updateStatus('Connected to Supabase', 'success');
      return data;
    } catch (error) {
      this.updateStatus('Sync Error', 'error');
      console.error('Error loading data:', error);
    }
  }

  // Image Upload Logic
  async uploadImage(file, targetInput) {
    try {
      this.updateStatus('Uploading Image...', 'loading');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        targetInput.value = data.url;
        // Trigger React's change event
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        this.updateStatus('Image Uploaded', 'success');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      this.updateStatus('Upload Failed', 'error');
      alert('Upload failed: ' + error.message);
    }
  }

  // Inject "Upload" button into React's form
  initMutationObserver() {
    const observer = new MutationObserver(() => {
      const inputs = document.querySelectorAll('input');
      inputs.forEach(input => {
        // Find the Image URL input (usually by label or placeholder)
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
    btn.innerHTML = '📤 Upload File';
    btn.style.cssText = 'background: #fff; color: #000; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; margin-top: 5px; font-weight: bold;';
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    btn.onclick = (e) => {
      e.preventDefault();
      fileInput.click();
    };

    fileInput.onchange = (e) => {
      if (e.target.files[0]) {
        this.uploadImage(e.target.files[0], input);
      }
    };

    input.parentElement.appendChild(btn);
    input.parentElement.appendChild(fileInput);
  }

  render() {
    let widget = document.getElementById('sheets-widget');
    if (!widget) return;

    // Reset widget style to be a subtle indicator
    widget.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 10000; font-family: sans-serif;';
    
    widget.innerHTML = `
      <style>
        .sync-pill {
          background: rgba(20, 20, 20, 0.9);
          border: 1px solid #333;
          border-radius: 100px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #eee;
          font-size: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5);
          backdrop-filter: blur(10px);
        }
        .indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .indicator-dot.success { background: #00ff88; box-shadow: 0 0 10px #00ff88; }
        .indicator-dot.loading { background: #ffaa00; animation: blink 1s infinite; }
        .indicator-dot.error { background: #ff4444; }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
        .vault-btn {
          background: #fff;
          color: #000;
          border: none;
          padding: 4px 12px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
        }
      </style>
      <div class="sync-pill" id="sync-container">
        <div id="sync-indicator">
          <span class="indicator-dot ${this.authenticated ? 'success' : 'error'}"></span>
          ${this.authenticated ? 'Sync Active' : 'Offline'}
        </div>
        ${!this.authenticated ? '<button class="vault-btn" onclick="sheetsClient.login()">LOGIN</button>' : ''}
      </div>
    `;
  }
}

const sheetsClient = new SupabaseClient();

document.addEventListener('DOMContentLoaded', () => {
  sheetsClient.checkAuth();
});
