const path = require('path');
const fs = require('fs').promises;

class StorageConfig {
  constructor() {
    this.dataFile = path.join('/tmp', 'users.json');
    // Menggunakan variabel global Node.js agar data bertahan di memori instance Vercel
    if (!global.usersData) {
      global.usersData = [];
    }
  }

  async initialize() {
    try {
      const fileContent = await fs.readFile(this.dataFile, 'utf8');
      const parsed = JSON.parse(fileContent);
      if (parsed && Array.isArray(parsed.users)) {
        global.usersData = parsed.users;
      }
    } catch (error) {
      await this.saveData();
    }
  }

  async saveData() {
    try {
      await fs.writeFile(
        this.dataFile, 
        JSON.stringify({ users: global.usersData }, null, 2), 
        'utf8'
      );
    } catch (error) {
      console.error('Error saving data to /tmp:', error);
    }
  }

  async addUser(userData) {
    const existing = global.usersData.find(u => u.username === userData.username);
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

    global.usersData.push(newUser);
    await this.saveData();
    return newUser;
  }

  async getAllUsers() {
    // Selalu pastikan membaca dari memori global Vercel
    return global.usersData || [];
  }

  async approveUser(username, adminName) {
    const user = global.usersData.find(u => u.username === username);
    if (!user) throw new Error('User not found');

    user.status = 'approved';
    user.approvedAt = new Date().toISOString();
    user.approvedBy = adminName;

    await this.saveData();
    return user;
  }

  async rejectUser(username, adminName) {
    const user = global.usersData.find(u => u.username === username);
    if (!user) throw new Error('User not found');

    user.status = 'rejected';
    user.approvedAt = new Date().toISOString();
    user.approvedBy = adminName;

    await this.saveData();
    return user;
  }

  async getUserByUsername(username) {
    return global.usersData.find(u => u.username === username) || null;
  }

  async deleteUser(username) {
    const index = global.usersData.findIndex(u => u.username === username);
    if (index === -1) throw new Error('User not found');

    global.usersData.splice(index, 1);
    await this.saveData();
    return true;
  }
}

module.exports = new StorageConfig();