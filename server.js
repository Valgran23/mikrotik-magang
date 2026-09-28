require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const storageConfig = require('./config/storage');
const mikrotikConfig = require('./config/mikrotik');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Storage (Aman untuk Vercel)
storageConfig.initialize().catch(console.error);

// HAPUS / KOMEN DARI ROOT: mikrotikConfig.login()
// Jangan panggil koneksi MikroTik di root serverless agar Vercel tidak crash saat cold-start!

// Routes Tampilan Web
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API Register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, phone, username, password } = req.body;
    
    if (!name || !email || !phone || !username || !password) {
      return res.json({ success: false, message: 'Semua kolom wajib diisi' });
    }
    
    const existingUser = await storageConfig.getUserByUsername(username);
    if (existingUser) {
      return res.json({ success: false, message: 'Username sudah terdaftar' });
    }
    
    await storageConfig.addUser({ name, email, phone, username, password });
    
    res.json({ success: true, message: 'Registrasi berhasil. Silakan tunggu persetujuan admin.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.json({ success: false, message: 'Registrasi gagal' });
  }
});

// API Get All Users
app.get('/api/users', async (req, res) => {
  try {
    const users = await storageConfig.getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error getting users:', error);
    res.json({ success: false, message: 'Gagal mengambil data user' });
  }
});

// API Approve User
app.post('/api/approve', async (req, res) => {
  try {
    const { username, adminName } = req.body;
    
    if (!username || !adminName) {
      return res.json({ success: false, message: 'Username dan Admin Name wajib diisi' });
    }
    
    await storageConfig.approveUser(username, adminName);
    const userData = await storageConfig.getUserByUsername(username);
    
    // Tembak ke MikroTik via Tunnel.id saat approve
    if (mikrotikConfig.addUserToHotspot) {
      await mikrotikConfig.addUserToHotspot(userData.username, userData.password);
    }
    
    res.json({ success: true, message: 'User berhasil disetujui' });
  } catch (error) {
    console.error('Approval error:', error);
    res.json({ success: false, message: 'Gagal menyetujui user' });
  }
});

// API Reject User
app.post('/api/reject', async (req, res) => {
  try {
    const { username, adminName } = req.body;
    
    if (!username || !adminName) {
      return res.json({ success: false, message: 'Username dan Admin Name wajib diisi' });
    }
    
    await storageConfig.rejectUser(username, adminName);
    res.json({ success: true, message: 'User ditolak' });
  } catch (error) {
    console.error('Rejection error:', error);
    res.json({ success: false, message: 'Gagal menolak user' });
  }
});

// API Delete User
app.delete('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    await storageConfig.deleteUser(username);
    if (mikrotikConfig.removeUserFromHotspot) {
      await mikrotikConfig.removeUserFromHotspot(username);
    }
    
    res.json({ success: true, message: 'User berhasil dihapus' });
  } catch (error) {
    console.error('Deletion error:', error);
    res.json({ success: false, message: 'Gagal menghapus user' });
  }
});

// API Validate Login (Selalu kembalikan HTTP 200 dengan status success: true/false)
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.json({ success: false, message: 'Username dan password wajib diisi' });
    }
    
    const user = await storageConfig.getUserByUsername(username);
    
    if (!user) {
      return res.json({ success: false, message: 'User tidak ditemukan' });
    }
    
    if (user.password !== password) {
      return res.json({ success: false, message: 'Password salah' });
    }
    
    if (user.status !== 'approved') {
      return res.json({ success: false, message: 'Akun Anda belum disetujui oleh admin' });
    }
    
    res.json({ 
      success: true, 
      message: 'Login berhasil', 
      user: { name: user.name, username: user.username } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.json({ success: false, message: 'Gagal memproses login di server' });
  }
});

// API Check Status
app.get('/api/status/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await storageConfig.getUserByUsername(username);
    
    if (!user) {
      return res.json({ success: false, message: 'User tidak ditemukan' });
    }
    
    res.json({ success: true, status: user.status });
  } catch (error) {
    console.error('Status check error:', error);
    res.json({ success: false, message: 'Gagal mengecek status' });
  }
});

// API Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, message: 'Login admin berhasil' });
  } else {
    res.json({ success: false, message: 'Password admin salah' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server lokal berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;