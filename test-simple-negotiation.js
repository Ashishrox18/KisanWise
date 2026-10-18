// Simple test for negotiation endpoints
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testSimpleNegotiation() {
  try {
    console.log('🧪 Testing Negotiation Endpoints...\n');

    // Test farmer login
    console.log('1. Testing farmer login...');
    const farmerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'farmer@gmail.com',
      password: '123456'
    });
    console.log('✅ Farmer login successful');

    // Test buyer login  
    console.log('\n2. Testing buyer login...');
    const buyerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'buyer@gmail.com', 
      password: '123456'
    });
    console.log('✅ Buyer login successful');

    // Test notification endpoints
    console.log('\n3. Testing notification endpoints...');
    const farmerNotifications = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${farmerLogin.data.token}` }
    });
    console.log(`✅ Farmer notifications: ${farmerNotifications.data.notifications.length}`);

    const buyerNotifications = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${buyerLogin.data.token}` }
    });
    console.log(`✅ Buyer notifications: ${buyerNotifications.data.notifications.length}`);

    console.log('\n🎉 Basic endpoints are working!');
    console.log('\n📋 Next Steps:');
    console.log('1. Login to the frontend at http://localhost:5174');
    console.log('2. Use farmer@gmail.com / 123456 or buyer@gmail.com / 123456');
    console.log('3. Create listings/procurement requests');
    console.log('4. Click "Negotiate" button and test "Update & Continue Negotiation"');
    console.log('5. Check notification bell for updates');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSimpleNegotiation();