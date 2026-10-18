// Test script to manually create a notification
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testManualNotification() {
  try {
    console.log('🔧 Testing Manual Notification Creation...\n');

    // 1. Login as buyer to get user ID
    console.log('1. Logging in as buyer...');
    const buyerUser = { email: 'buyer@gmail.com', password: '123456' };
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, buyerUser);
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ Login successful');
    console.log('👤 User ID:', user.id);
    console.log('👤 User Role:', user.role);

    // 2. Create a manual notification by calling the backend directly
    console.log('\n2. Creating manual notification...');
    
    // We'll create a test endpoint to manually trigger notification creation
    // For now, let's check what users exist in the system
    
    console.log('\n3. Checking current notifications...');
    const notificationsResponse = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📊 Current notifications:', notificationsResponse.data.notifications.length);

    // 4. Let's try to create a procurement request (buyer -> farmer notification)
    console.log('\n4. Creating procurement request (should notify farmers)...');
    const procurementData = {
      cropType: 'Test Rice',
      quantity: 200,
      quantityUnit: 'kg',
      maxPricePerUnit: 3000,
      deliveryLocation: 'Test Buyer Location',
      requiredBy: '2026-04-01',
      description: 'Test procurement request for notification testing'
    };

    const procurementResponse = await axios.post(`${API_BASE}/buyer/procurement-requests`, procurementData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Procurement request created:', procurementResponse.data.request?.id);

    // 5. Wait and check for notifications
    console.log('\n5. Waiting for notifications...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. Login as farmer and check notifications
    console.log('\n6. Checking farmer notifications...');
    const farmerUser = { email: 'test@example.com', password: 'password123' };
    const farmerLoginResponse = await axios.post(`${API_BASE}/auth/login`, farmerUser);
    const farmerToken = farmerLoginResponse.data.token;
    
    const farmerNotifications = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    
    console.log('📊 Farmer notifications:', farmerNotifications.data.notifications.length);
    
    if (farmerNotifications.data.notifications.length > 0) {
      console.log('\n🎉 SUCCESS: Notifications are working!');
      farmerNotifications.data.notifications.forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.title}`);
        console.log(`   ${notif.message}`);
        console.log(`   Type: ${notif.notificationType}`);
      });
    } else {
      console.log('\n❌ No notifications found for farmer');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testManualNotification();