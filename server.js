const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { Readable } = require('stream');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Store session in memory (for simplicity, use cookies/JWT in production)
let isAdminAuthenticated = false;

// Multer config for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  console.log('Login attempt with password:', password);
  // Accept both versions to be safe
  if (password === 'vapur2024' || password === 'vapor2024') {
    isAdminAuthenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: isAdminAuthenticated });
});

app.post('/api/auth/logout', (req, res) => {
  isAdminAuthenticated = false;
  res.json({ success: true });
});

// Database routes
app.get('/api/debug', async (req, res) => {
  try {
    const { data: productsCount, error: productsError } = await supabase.from('products').select('id', { count: 'exact', head: true });
    const { data: settingsCount, error: settingsError } = await supabase.from('site_settings').select('id', { count: 'exact', head: true });
    
    res.json({
      supabase_connected: !!process.env.SUPABASE_URL,
      products_table: !productsError,
      settings_table: !settingsError,
      error: productsError?.message || settingsError?.message || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/data', async (req, res) => {
  const table = req.query.table || 'products';
  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      if (error.code === '42P01') return res.json({ headers: [], data: [], message: `Table "${table}" not found` });
      throw error;
    }
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    res.json({ headers, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/data', async (req, res) => {
  try {
    if (!isAdminAuthenticated) return res.status(401).json({ error: 'Unauthorized' });

    const { newRow } = req.body;
    const { data, error } = await supabase
      .from('products')
      .insert([newRow])
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error writing to Supabase:', error);
    res.status(500).json({ error: 'Failed to write to database: ' + error.message });
  }
});

app.put('/api/data/:id', async (req, res) => {
  try {
    if (!isAdminAuthenticated) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { rowData } = req.body;
    
    const { data, error } = await supabase
      .from('products')
      .update(rowData)
      .eq('ID', id)
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating Supabase:', error);
    res.status(500).json({ error: 'Failed to update database: ' + error.message });
  }
});

// Storage route (Supabase Storage)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!isAdminAuthenticated) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const fileName = `${Date.now()}-${req.file.originalname}`;
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    res.json({ 
      success: true, 
      fileId: data.path,
      url: publicUrl 
    });
  } catch (error) {
    console.error('Error uploading to Supabase Storage:', error);
    res.status(500).json({ error: 'Failed to upload file: ' + error.message });
  }
});

// API Aliases for compatibility
app.get('/api/products', (req, res) => res.redirect('/api/data'));

// Serve index.html for all non-API, non-file routes (SPA support)
app.get('*', (req, res) => {
  // Check if the request is for an API or a file with an extension
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/') || path.extname(req.path)) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Supabase integration ready`);
});
