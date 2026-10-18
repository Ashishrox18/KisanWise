// Test script to verify farmer@gmail.com login
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testFarmerLogin() {
  try {
    console.log('🧪 Testing farmer@gmail.com login...\n');

    const loginData = {
      email: 'farmer@gmail.com',
      password: '123456'
    };

    console.log('📧 Attempting login with:', loginData.email);
    
    const response = await axios.post(`${API_BASE}/auth/login`, loginData);
    
    console.log('✅ Login successful!');
    console.log('👤 User details:');
    console.log('   - Name:', response.data.user.name);
    console.log('   - Email:', response.data.user.email);
    console.log('   - Role:', response.data.user.role);
    console.log('   - Phone:', response.data.user.phone);
    console.log('   - Location:', response.data.user.profile?.location);
    console.log('   - Farm Size:', response.data.user.profile?.farmSize);
    console.log('🔑 Token received:', response.data.token ? 'Yes' : 'No');

  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 This usually means:');
      console.log('   - Wrong email or password');
      console.log('   - User account doesn\'t exist');
      console.log('   - Password hash mismatch');
    }
  }
}

testFarmerLogin();