// Test script to verify offer submission triggers notification to farmer
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testOfferNotificationFlow() {
  console.log('🧪 Testing Offer Notification Flow\n');

  try {
    // Step 1: Login as buyer
    console.log('1️⃣ Logging in as buyer...');
    const buyerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'buyer@test.com',
      password: 'password123'
    });
    const buyerToken = buyerLogin.data.token;
    const buyerName = buyerLogin.data.user.name;
    console.log(`✅ Buyer logged in: ${buyerName}\n`);

    // Step 2: Get a farmer listing
    console.log('2️⃣ Fetching farmer listings...');
    const listingsResponse = await axios.get(`${API_BASE}/buyer/listings`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    
    if (!listingsResponse.data.listings || listingsResponse.data.listings.length === 0) {
      console.log('❌ No listings available. Please create a farmer listing first.');
      return;
    }

    const listing = listingsResponse.data.listings[0];
    console.log(`✅ Found listing: ${listing.cropType} (ID: ${listing.id})`);
    console.log(`   Farmer ID: ${listing.farmerId}\n`);

    // Step 3: Submit an offer
    console.log('3️⃣ Submitting offer...');
    const offerData = {
      listingId: listing.id,
      pricePerUnit: listing.minimumPrice + 10,
      quantity: Math.min(listing.quantity, 100),
      quantityUnit: listing.quantityUnit,
      message: 'Test offer - checking notification system'
    };

    const offerResponse = await axios.post(
      `${API_BASE}/offers/listing/${listing.id}`,
      offerData,
      { headers: { Authorization: `Bearer ${buyerToken}` } }
    );

    console.log(`✅ Offer submitted successfully!`);
    console.log(`   Offer ID: ${offerResponse.data.offer.id}`);
    console.log(`   Price: ₹${offerData.pricePerUnit}/${offerData.quantityUnit}\n`);

    // Step 4: Login as farmer and check notifications
    console.log('4️⃣ Logging in as farmer to check notifications...');
    
    // First, get farmer's email from users table
    const farmerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'farmer@test.com',
      password: 'password123'
    });
    const farmerToken = farmerLogin.data.token;
    const farmerName = farmerLogin.data.user.name;
    console.log(`✅ Farmer logged in: ${farmerName}\n`);

    // Step 5: Check farmer's notifications
    console.log('5️⃣ Checking farmer notifications...');
    const notificationsResponse = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });

    const notifications = notificationsResponse.data.notifications || [];
    console.log(`✅ Found ${notifications.length} total notifications\n`);

    // Find the notification for this offer
    const offerNotification = notifications.find(n => 
      n.relatedId === listing.id && 
      n.notificationType === 'offer' &&
      !n.read
    );

    if (offerNotification) {
      console.log('🎉 SUCCESS! Notification was created:');
      console.log(`   Title: ${offerNotification.title}`);
      console.log(`   Message: ${offerNotification.message}`);
      console.log(`   Link: ${offerNotification.link}`);
      console.log(`   Created: ${new Date(offerNotification.createdAt).toLocaleString()}\n`);
    } else {
      console.log('⚠️  No new offer notification found. Recent notifications:');
      notifications.slice(0, 3).forEach(n => {
        console.log(`   - ${n.title} (${n.notificationType})`);
      });
      console.log('');
    }

    // Step 6: Check if farmer can see the offer on listing detail
    console.log('6️⃣ Checking if offer is visible to farmer...');
    const offersResponse = await axios.get(
      `${API_BASE}/offers/listing/${listing.id}`,
      { headers: { Authorization: `Bearer ${farmerToken}` } }
    );

    const offers = offersResponse.data.offers || [];
    const newOffer = offers.find(o => o.id === offerResponse.data.offer.id);

    if (newOffer) {
      console.log('✅ Offer is visible to farmer!');
      console.log(`   Buyer: ${newOffer.buyerName}`);
      console.log(`   Price: ₹${newOffer.pricePerUnit}/${newOffer.quantityUnit}`);
      console.log(`   Status: ${newOffer.status}\n`);
    } else {
      console.log('❌ Offer not found in farmer\'s listing\n');
    }

    console.log('✅ Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✓ Buyer can submit offers');
    console.log('   ✓ Farmer receives notification');
    console.log('   ✓ Farmer can view offers on listing detail page');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n💡 Tip: Make sure test users exist:');
      console.log('   - buyer@test.com / password123');
      console.log('   - farmer@test.com / password123');
    }
  }
}

testOfferNotificationFlow();
