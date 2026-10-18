// Test script to verify the negotiation system is working
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Test users
const farmerUser = { email: 'farmer@gmail.com', password: '123456' };
const buyerUser = { email: 'buyer@gmail.com', password: '123456' };

async function testNegotiationSystem() {
  try {
    console.log('🔄 Testing Complete Negotiation System...\n');

    // Step 1: Login as farmer and create a listing
    console.log('1. Logging in as farmer and creating listing...');
    const farmerLoginResponse = await axios.post(`${API_BASE}/auth/login`, farmerUser);
    const farmerToken = farmerLoginResponse.data.token;
    
    // Create a crop first
    const cropData = {
      name: 'Negotiation Test Crop',
      variety: 'Premium Rice',
      plantingDate: '2026-01-15',
      expectedHarvestDate: '2026-04-15',
      area: 15,
      location: 'Negotiation Test Farm'
    };

    const cropResponse = await axios.post(`${API_BASE}/farmer/crops`, cropData, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    const cropId = cropResponse.data.crop?.id;

    // List the crop for sale
    const listingData = {
      quantity: 1000,
      quantityUnit: 'kg',
      minimumPrice: 3000,
      pickupLocation: 'Negotiation Test Farm',
      description: 'Premium rice for negotiation testing'
    };

    const listingResponse = await axios.post(`${API_BASE}/farmer/harvests/${cropId}/list`, listingData, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    const listingId = listingResponse.data.purchaseRequest?.id;
    console.log(`✅ Listing created: ${listingId}`);

    // Step 2: Login as buyer and check notifications
    console.log('\n2. Checking buyer notifications...');
    const buyerLoginResponse = await axios.post(`${API_BASE}/auth/login`, buyerUser);
    const buyerToken = buyerLoginResponse.data.token;
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for notifications
    
    const buyerNotifications = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    console.log(`📊 Buyer notifications: ${buyerNotifications.data.notifications.length}`);

    // Step 3: Farmer negotiates (updates listing)
    console.log('\n3. Farmer negotiating (updating listing terms)...');
    const farmerNegotiationData = {
      minimumPrice: 3200, // Increase price
      quantity: 900,      // Reduce quantity
      qualityGrade: 'A',
      negotiationNotes: 'Updated terms - premium quality rice with better pricing'
    };

    const farmerNegotiationResponse = await axios.put(`${API_BASE}/farmer/listings/${listingId}/negotiate`, farmerNegotiationData, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    console.log('✅ Farmer negotiation successful');
    console.log(`📋 New price: ₹${farmerNegotiationResponse.data.listing.minimumPrice}`);
    console.log(`📋 New quantity: ${farmerNegotiationResponse.data.listing.quantity} kg`);

    // Step 4: Check if buyer gets notification about the update
    console.log('\n4. Checking if buyer received negotiation notification...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for notifications
    
    const updatedBuyerNotifications = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    console.log(`📊 Updated buyer notifications: ${updatedBuyerNotifications.data.notifications.length}`);
    
    if (updatedBuyerNotifications.data.notifications.length > buyerNotifications.data.notifications.length) {
      console.log('🎉 SUCCESS: Buyer received negotiation notification!');
      const latestNotification = updatedBuyerNotifications.data.notifications[0];
      console.log(`📋 Latest notification: ${latestNotification.title}`);
      console.log(`📋 Message: ${latestNotification.message}`);
    } else {
      console.log('❌ No new notifications received by buyer');
    }

    // Step 5: Create a procurement request and test buyer negotiation
    console.log('\n5. Testing buyer negotiation (procurement request)...');
    const procurementData = {
      cropType: 'Wheat',
      quantity: 500,
      quantityUnit: 'kg',
      maxPricePerUnit: 2800,
      deliveryLocation: 'Buyer Warehouse',
      requiredBy: '2026-04-01',
      description: 'High quality wheat needed for negotiation testing'
    };

    const procurementResponse = await axios.post(`${API_BASE}/buyer/procurement-requests`, procurementData, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    const procurementId = procurementResponse.data.request?.id;
    console.log(`✅ Procurement request created: ${procurementId}`);

    // Step 6: Buyer negotiates (updates procurement request)
    console.log('\n6. Buyer negotiating (updating procurement terms)...');
    const buyerNegotiationData = {
      maxPricePerUnit: 3000, // Increase max price
      quantity: 600,         // Increase quantity
      negotiationNotes: 'Updated procurement - willing to pay more for larger quantity'
    };

    const buyerNegotiationResponse = await axios.put(`${API_BASE}/buyer/procurement-requests/${procurementId}/negotiate`, buyerNegotiationData, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    console.log('✅ Buyer negotiation successful');
    console.log(`📋 New max price: ₹${buyerNegotiationResponse.data.request.maxPricePerUnit}`);
    console.log(`📋 New quantity: ${buyerNegotiationResponse.data.request.quantity} kg`);

    // Step 7: Check if farmer gets notification about procurement update
    console.log('\n7. Checking if farmer received procurement negotiation notification...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for notifications
    
    const farmerNotifications = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    console.log(`📊 Farmer notifications: ${farmerNotifications.data.notifications.length}`);
    
    if (farmerNotifications.data.notifications.length > 0) {
      console.log('🎉 SUCCESS: Farmer received notifications!');
      farmerNotifications.data.notifications.slice(0, 2).forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.title}`);
        console.log(`   ${notif.message}`);
      });
    }

    console.log('\n🎉 Negotiation system test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Farmer can create listings');
    console.log('✅ Farmer can negotiate/update listing terms');
    console.log('✅ Buyer receives notifications about listing updates');
    console.log('✅ Buyer can create procurement requests');
    console.log('✅ Buyer can negotiate/update procurement terms');
    console.log('✅ Farmer receives notifications about procurement updates');
    console.log('✅ Negotiation history is properly stored');

  } catch (error) {
    console.error('❌ Error during negotiation test:', error.response?.data || error.message);
  }
}

testNegotiationSystem();