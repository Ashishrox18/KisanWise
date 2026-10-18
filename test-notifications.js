// Test script to verify notification system
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Test user credentials (from your previous setup)
const testUser = {
  email: 'buyer@gmail.com',
  password: '123456'
};

async function testNotificationSystem() {
  try {
    console.log('🔍 Testing Notification System...\n');

    // 1. Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, testUser);
    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // 2. Test get notifications endpoint
    console.log('\n2. Testing get notifications...');
    const notificationsResponse = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Notifications endpoint working');
    console.log(`📊 Found ${notificationsResponse.data.notifications.length} notifications`);

    // 3. Display notifications
    if (notificationsResponse.data.notifications.length > 0) {
      console.log('\n📋 Recent Notifications:');
      notificationsResponse.data.notifications.slice(0, 3).forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.title}`);
        console.log(`   ${notif.message}`);
        console.log(`   Read: ${notif.read ? '✅' : '❌'}`);
        console.log(`   Created: ${new Date(notif.createdAt).toLocaleString()}\n`);
      });
    }

    // 4. Test mark all as read
    if (notificationsResponse.data.notifications.some(n => !n.read)) {
      console.log('4. Testing mark all as read...');
      await axios.put(`${API_BASE}/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Mark all as read working');
    }

    console.log('\n🎉 Notification system is working correctly!');

  } catch (error) {
    console.error('❌ Error testing notifications:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Backend server is not running. Please start it with:');
      console.log('   cd "Krishi Era/Krishi_Era/backend" && npm run dev');
    }
  }
}

testNotificationSystem();