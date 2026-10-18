// Comprehensive test for the notification system
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Test users
const farmerUser = { email: 'test@example.com', password: 'password123' };
const buyerUser = { email: 'buyer@gmail.com', password: '123456' };

async function testFullNotificationFlow() {
  try {
    console.log('🔔 Testing Complete Notification Flow...\n');

    // Step 1: Login as buyer and check initial notifications
    console.log('1. Checking buyer\'s initial notifications...');
    const buyerLoginResponse = await axios.post(`${API_BASE}/auth/login`, buyerUser);
    const buyerToken = buyerLoginResponse.data.token;
    
    const initialNotifications = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    console.log(`📊 Initial notifications: ${initialNotifications.data.notifications.length}`);

    // Step 2: Login as farmer
    console.log('\n2. Logging in as farmer...');
    const farmerLoginResponse = await axios.post(`${API_BASE}/auth/login`, farmerUser);
    const farmerToken = farmerLoginResponse.data.token;
    console.log('✅ Farmer login successful');

    // Step 3: Create a crop
    console.log('\n3. Creating crop...');
    const cropData = {
      name: 'Notification Test Wheat',
      variety: 'Premium Wheat',
      plantingDate: '2026-01-15',
      expectedHarvestDate: '2026-04-15',
      area: 10,
      location: 'Notification Test Farm, Karnataka'
    };

    const cropResponse = await axios.post(`${API_BASE}/farmer/crops`, cropData, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    const cropId = cropResponse.data.crop?.id;
    console.log(`✅ Crop created: ${cropId}`);

    // Step 4: List crop for sale (this should trigger notifications)
    console.log('\n4. Listing crop for sale (should trigger notifications)...');
    const listingData = {
      quantity: 500,
      quantityUnit: 'kg',
      minimumPrice: 2500,
      pickupLocation: 'Notification Test Farm, Karnataka',
      description: 'Premium wheat for notification testing - high quality grain'
    };

    const listingResponse = await axios.post(`${API_BASE}/farmer/harvests/${cropId}/list`, listingData, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    console.log(`✅ Listing created: ${listingResponse.data.purchaseRequest?.id}`);

    // Step 5: Wait for notifications to be processed
    console.log('\n5. Waiting for notifications to be processed...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 6: Check buyer notifications again
    console.log('\n6. Checking buyer notifications after listing...');
    const updatedNotifications = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    
    const newNotificationCount = updatedNotifications.data.notifications.length;
    console.log(`📊 Updated notifications: ${newNotificationCount}`);
    
    if (newNotificationCount > initialNotifications.data.notifications.length) {
      console.log('🎉 SUCCESS: New notifications were created!');
      
      // Show the latest notifications
      console.log('\n📋 Latest Notifications:');
      updatedNotifications.data.notifications.slice(0, 3).forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.title}`);
        console.log(`   Message: ${notif.message}`);
        console.log(`   Type: ${notif.notificationType}`);
        console.log(`   Read: ${notif.read ? '✅' : '❌'}`);
        console.log(`   Link: ${notif.link}`);
        console.log(`   Created: ${new Date(notif.createdAt).toLocaleString()}\n`);
      });

      // Step 7: Test marking notification as read
      if (updatedNotifications.data.notifications.length > 0) {
        const firstNotification = updatedNotifications.data.notifications[0];
        console.log('7. Testing mark notification as read...');
        
        await axios.put(`${API_BASE}/notifications/${firstNotification.id}/read`, {}, {
          headers: { Authorization: `Bearer ${buyerToken}` }
        });
        console.log('✅ Notification marked as read');

        // Step 8: Test mark all as read
        console.log('\n8. Testing mark all notifications as read...');
        const markAllResponse = await axios.put(`${API_BASE}/notifications/mark-all-read`, {}, {
          headers: { Authorization: `Bearer ${buyerToken}` }
        });
        console.log(`✅ Marked ${markAllResponse.data.updated} notifications as read`);
      }

    } else {
      console.log('❌ ISSUE: No new notifications were created');
      console.log('🔍 This might indicate that notification triggers are not working properly');
    }

    console.log('\n🎉 Notification flow test completed!');

  } catch (error) {
    console.error('❌ Error during notification flow test:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Backend server is not running. Please start it with:');
      console.log('   cd "Krishi Era/Krishi_Era/backend" && npm run dev');
    }
  }
}

testFullNotificationFlow();