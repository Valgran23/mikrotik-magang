const path = require('path');
const fs = require('fs').promises;

class StorageConfig {
  constructor() {
    // Di Vercel serverless, hanya folder /tmp yang bisa ditulis
    this.dataFile = path.join('/tmp', 'users.json');
    this.data = {
      users: []
    };
  }

  async initialize() {
    try {
      try {
        const fileContent = await fs.readFile(this.dataFile, 'utf8');
        this.data = JSON.parse(fileContent);
        console.log('Storage loaded successfully');
      } catch (error) {
        // Jika file belum ada di /tmp, buat file baru
        await this.saveData();
        console.log('Storage initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  async saveData() {
    try {
      await fs.writeFile(this.dataFile, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async addUser(userData) {
    try {
      const timestamp = new Date().toISOString();
      const newUser = {
        id: Date.now().toString(),
        timestamp,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        username: userData.username,
        password: userData.password,
        status: 'pending',
        approvedAt: '',
        approvedBy: ''
      };

      this.data.users.push(newUser);
      await this.saveData();
      
      return newUser;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  }

  async getAllUsers() {
    try {
      return this.data.users;
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  async approveUser(username, adminName) {
    try {
      const userIndex = this.data.users.findIndex(u => u.username === username);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      this.data.users[userIndex].status = 'approved';
      this.data.users[userIndex].approvedAt = new Date().toISOString();
      this.data.users[userIndex].approvedBy = adminName;
      
      await this.saveData();
      
      return this.data.users[userIndex];
    } catch (error) {
      console.error('Error approving user:', error);
      throw error;
    }
  }

  async rejectUser(username, adminName) {
    try {
      const userIndex = this.data.users.findIndex(u => u.username === username);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      this.data.users[userIndex].status = 'rejected';
      this.data.users[userIndex].approvedAt = new Date().toISOString();
      this.data.users[userIndex].approvedBy = adminName;
      
      await this.saveData();
      
      return this.data.users[userIndex];
    } catch (error) {
      console.error('Error rejecting user:', error);
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      return this.data.users.find(u => u.username === username) || null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  async deleteUser(username) {
    try {
      const userIndex = this.data.users.findIndex(u => u.username === username);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      this.data.users.splice(userIndex, 1);
      await this.saveData();
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

module.exports = new StorageConfig();