const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Test users
const testUsers = [
  { email: 'buyer@gmail.com', password: '123456', role: 'buyer' },
  { email: 'farmer@gmail.com', password: '123456', role: 'farmer' }
];

async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
    return response.data.token;
  } catch (error) {
    console.error(`Login failed for ${email}:`, error.response?.data || error.message);
    return null;
  }
}

async function testBuyerPages() {
  console.log('\n=== TESTING BUYER PAGES ===');
  
  const token = await login('buyer@gmail.com', '123456');
  if (!token) return;

  const headers = { Authorization: `Bearer ${token}` };

  try {
    // Test Browse Farmer Listings (Procurement page)
    console.log('\n1. Testing Browse Farmer Listings...');
    const procurementResponse = await axios.get(`${API_BASE}/buyer/available-produce`, { headers });
    console.log(`✓ Available produce: ${procurementResponse.data.listings?.length || 0} listings found`);
    
    if (procurementResponse.data.listings?.length > 0) {
      console.log('Sample listing:', {
        id: procurementResponse.data.listings[0].id,
        cropType: procurementResponse.data.listings[0].cropType,
        status: procurementResponse.data.listings[0].status,
        farmerId: procurementResponse.data.listings[0].farmerId
      });
    }

    // Test My Procurement Requests
    console.log('\n2. Testing My Procurement Requests...');
    const myRequestsResponse = await axios.get(`${API_BASE}/buyer/procurement-requests`, { headers });
    console.log(`✓ My procurement requests: ${myRequestsResponse.data.requests?.length || 0} requests found`);
    
    if (myRequestsResponse.data.requests?.length > 0) {
      console.log('Sample request:', {
        id: myRequestsResponse.data.requests[0].id,
        cropType: myRequestsResponse.data.requests[0].cropType,
        status: myRequestsResponse.data.requests[0].status,
        buyerId: myRequestsResponse.data.requests[0].buyerId
      });
    }

  } catch (error) {
    console.error('Buyer pages test failed:', error.response?.data || error.message);
  }
}

async function testFarmerPages() {
  console.log('\n=== TESTING FARMER PAGES ===');
  
  const token = await login('farmer@gmail.com', '123456');
  if (!token) return;

  const headers = { Authorization: `Bearer ${token}` };

  try {
    // Test My Listings
    console.log('\n1. Testing My Listings...');
    const myListingsResponse = await axios.get(`${API_BASE}/farmer/purchase-requests`, { headers });
    console.log(`✓ My listings: ${myListingsResponse.data.requests?.length || 0} listings found`);
    
    if (myListingsResponse.data.requests?.length > 0) {
      console.log('Sample listing:', {
        id: myListingsResponse.data.requests[0].id,
        cropType: myListingsResponse.data.requests[0].cropType,
        status: myListingsResponse.data.requests[0].status,
        farmerId: myListingsResponse.data.requests[0].farmerId
      });
    }

  } catch (error) {
    console.error('Farmer pages test failed:', error.response?.data || error.message);
  }
}

async function testSpecificListing() {
  console.log('\n=== TESTING SPECIFIC LISTING ===');
  
  const token = await login('farmer@gmail.com', '123456');
  if (!token) return;

  const headers = { Authorization: `Bearer ${token}` };
  const listingId = 'a189e87e-39af-4915-8f13-3c6075bd1318';

  try {
    console.log(`\nTesting listing: ${listingId}`);
    const listingResponse = await axios.get(`${API_BASE}/farmer/listings/${listingId}`, { headers });
    console.log('✓ Listing found:', {
      id: listingResponse.data.listing.id,
      cropType: listingResponse.data.listing.cropType,
      status: listingResponse.data.listing.status,
      minimumPrice: listingResponse.data.listing.minimumPrice,
      farmerId: listingResponse.data.listing.farmerId
    });

    // Test negotiation
    console.log('\nTesting negotiation...');
    const negotiationData = {
      minimumPrice: 2250,
      quantity: listingResponse.data.listing.quantity,
      qualityGrade: listingResponse.data.listing.qualityGrade,
      negotiationNotes: 'Test negotiation update'
    };

    const negotiationResponse = await axios.put(`${API_BASE}/farmer/listings/${listingId}/negotiate`, negotiationData, { headers });
    console.log('✓ Negotiation successful:', negotiationResponse.data.success);

  } catch (error) {
    console.error('Specific listing test failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🧪 Testing Current Issues...\n');
  
  await testBuyerPages();
  await testFarmerPages();
  await testSpecificListing();
  
  console.log('\n✅ Tests completed!');
}

runTests().catch(console.error);