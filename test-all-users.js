// Test script to verify all user accounts
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

const testUsers = [
  { email: 'buyer@gmail.com', password: '123456', expectedRole: 'buyer' },
  { email: 'farmer@gmail.com', password: '123456', expectedRole: 'farmer' },
  { email: 'test@example.com', password: 'password123', expectedRole: 'farmer' }
];

async function testAllUsers() {
  console.log('🧪 Testing all user accounts...\n');

  for (const user of testUsers) {
    try {
      console.log(`📧 Testing: ${user.email}`);
      
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: user.email,
        password: user.password
      });
      
      const userData = response.data.user;
      const roleMatch = userData.role === user.expectedRole;
      
      console.log(`   ✅ Login successful`);
      console.log(`   👤 Name: ${userData.name}`);
      console.log(`   🎭 Role: ${userData.role} ${roleMatch ? '✅' : '❌'}`);
      console.log(`   🔑 Token: ${response.data.token ? 'Received' : 'Missing'}`);
      
    } catch (error) {
      console.log(`   ❌ Login failed: ${error.response?.data?.error || error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }

  console.log('🎉 User account testing completed!');
  console.log('\n📋 Available Accounts:');
  console.log('   🛒 buyer@gmail.com / 123456 (Buyer)');
  console.log('   🌾 farmer@gmail.com / 123456 (Farmer)');
  console.log('   🌾 test@example.com / password123 (Farmer)');
}

testAllUsers();