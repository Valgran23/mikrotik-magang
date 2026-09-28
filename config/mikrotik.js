const { RouterOSAPI } = require('routeros-api');

class MikrotikConfig {
  constructor() {
    this.host = process.env.MIKROTIK_IP || 'sin21.tunnel.id';
    this.user = process.env.MIKROTIK_API_USER || 'hotspot_api';
    this.password = process.env.MIKROTIK_API_PASSWORD || 'infra123';
    this.port = parseInt(process.env.MIKROTIK_API_PORT) || 3241;
  }

  // Fungsi untuk membuat koneksi ke MikroTik
  async connect() {
    const conn = new RouterOSAPI({
      host: this.host,
      user: this.user,
      password: this.password,
      port: this.port,
      timeout: 10
    });

    try {
      await conn.connect();
      return conn;
    } catch (error) {
      console.error('Gagal terhubung ke MikroTik:', error.message);
      return null;
    }
  }

  // Fungsi login dikosongkan agar serverless Vercel tidak timeout saat startup
  async login() {
    return true;
  }

  // Menambahkan user ke Hotspot MikroTik saat Admin klik Approve
  async addUserToHotspot(username, password, profile = 'default') {
    const conn = await this.connect();
    if (!conn) {
      console.error('Gagal menambah user: Tidak dapat terhubung ke MikroTik');
      return { success: false, message: 'Koneksi ke MikroTik gagal' };
    }

    try {
      await conn.write('/ip/hotspot/user/add', [
        `=name=${username}`,
        `=password=${password}`,
        `=profile=${profile}`
      ]);

      console.log(`Berhasil menambahkan user ${username} ke MikroTik Hotspot!`);
      await conn.close();
      return { success: true, message: 'User added to hotspot' };
    } catch (error) {
      console.error('Error adding user to hotspot:', error);
      try { await conn.close(); } catch (e) {}
      return { success: false, message: error.message };
    }
  }

  // Menghapus user dari Hotspot MikroTik
  async removeUserFromHotspot(username) {
    const conn = await this.connect();
    if (!conn) return { success: false, message: 'Koneksi gagal' };

    try {
      const users = await conn.write('/ip/hotspot/user/print', [
        `?name=${username}`
      ]);

      if (users && users.length > 0) {
        const userId = users[0]['.id'];
        await conn.write('/ip/hotspot/user/remove', [
          `=.id=${userId}`
        ]);
        console.log(`Berhasil menghapus user ${username} dari MikroTik.`);
      }

      await conn.close();
      return { success: true, message: 'User removed from hotspot' };
    } catch (error) {
      console.error('Error removing user from hotspot:', error);
      try { await conn.close(); } catch (e) {}
      return { success: false, message: error.message };
    }
  }

  async validateLogin(username, password) {
    return { success: true, message: 'Login valid' };
  }
}

module.exports = new MikrotikConfig();