const { Redis } = require('@upstash/redis');

class StorageConfig {
  constructor() {
    // Membaca kredensial dari Environment Variables Vercel
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    this.KEY = 'hotspot_users';
  }

  async initialize() {
    // Tidak perlu inisialisasi file lokal lagi
    return true;
  }

  async getAllUsers() {
    try {
      const users = await this.redis.get(this.KEY);
      return users || [];
    } catch (error) {
      console.error('Error fetching users from Upstash Redis:', error);
      return [];
    }
  }

  async saveData(users) {
    try {
      await this.redis.set(this.KEY, users);
    } catch (error) {
      console.error('Error saving data to Upstash Redis:', error);
    }
  }

  async addUser(userData) {
    const users = await this.getAllUsers();
    const existing = users.find(u => u.username === userData.username);
    
    if (existing) {
      throw new Error('Username already exists');
    }

    const newUser = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      username: userData.username,
      password: userData.password,
      status: 'pending',
      approvedAt: '',
      approvedBy: ''
    };

    users.push(newUser);
    await this.saveData(users);
    return newUser;
  }

  async approveUser(username, adminName) {
    const users = await this.getAllUsers();
    const user = users.find(u => u.username === username);
    if (!user) throw new Error('User not found');

    user.status = 'approved';
    user.approvedAt = new Date().toISOString();
    user.approvedBy = adminName;

    await this.saveData(users);
    return user;
  }

  async rejectUser(username, adminName) {
    const users = await this.getAllUsers();
    const user = users.find(u => u.username === username);
    if (!user) throw new Error('User not found');

    user.status = 'rejected';
    user.approvedAt = new Date().toISOString();
    user.approvedBy = adminName;

    await this.saveData(users);
    return user;
  }

  async getUserByUsername(username) {
    const users = await this.getAllUsers();
    return users.find(u => u.username === username) || null;
  }

  async deleteUser(username) {
    let users = await this.getAllUsers();
    const index = users.findIndex(u => u.username === username);
    if (index === -1) throw new Error('User not found');

    users.splice(index, 1);
    await this.saveData(users);
    return true;
  }
}

module.exports = new StorageConfig();