// Test script to create a listing and trigger notifications
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Test user credentials
const farmerUser = {
  email: 'test@example.com',
  password: 'password123'
};

async function testCreateListing() {
  try {
    console.log('🌾 Testing Listing Creation and Notifications...\n');

    // 1. Login as farmer
    console.log('1. Logging in as farmer...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, farmerUser);
    const token = loginResponse.data.token;
    console.log('✅ Farmer login successful');

    // 2. Create a crop first
    console.log('\n2. Creating test crop...');
    const cropData = {
      name: 'Test Wheat Crop',
      variety: 'Durum Wheat',
      plantingDate: '2026-01-15',
      expectedHarvestDate: '2026-04-15',
      area: 5,
      location: 'Test Farm, Karnataka'
    };

    const cropResponse = await axios.post(`${API_BASE}/farmer/crops`, cropData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Crop created successfully!');
    const cropId = cropResponse.data.crop?.id;
    console.log('🌾 Crop ID:', cropId);

    // 3. List the crop for sale
    console.log('\n3. Listing crop for sale...');
    const listingData = {
      quantity: 100,
      quantityUnit: 'kg',
      minimumPrice: 2000,
      pickupLocation: 'Test Farm, Karnataka',
      description: 'High quality wheat for testing notifications'
    };

    const listingResponse = await axios.post(`${API_BASE}/farmer/harvests/${cropId}/list`, listingData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Listing created successfully!');
    console.log('📋 Listing ID:', listingResponse.data.listing?.id);

    // 4. Wait a moment for notifications to be processed
    console.log('\n4. Waiting for notifications to be processed...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Check notifications for buyers
    console.log('\n5. Checking if buyers received notifications...');
    
    // Login as buyer to check notifications
    const buyerUser = { email: 'buyer@gmail.com', password: '123456' };
    const buyerLoginResponse = await axios.post(`${API_BASE}/auth/login`, buyerUser);
    const buyerToken = buyerLoginResponse.data.token;

    const notificationsResponse = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });

    console.log('📊 Buyer notifications:', notificationsResponse.data.notifications.length);
    
    if (notificationsResponse.data.notifications.length > 0) {
      console.log('\n📋 Recent Notifications:');
      notificationsResponse.data.notifications.slice(0, 2).forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.title}`);
        console.log(`   ${notif.message}`);
        console.log(`   Type: ${notif.notificationType}`);
        console.log(`   Read: ${notif.read ? '✅' : '❌'}`);
        console.log(`   Created: ${new Date(notif.createdAt).toLocaleString()}\n`);
      });
    }

    console.log('🎉 Listing creation and notification test completed!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testCreateListing();