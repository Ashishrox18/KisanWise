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

async function testBuyerFunctionality() {
  console.log('\n=== TESTING BUYER FUNCTIONALITY ===');
  
  const token = await login('buyer@gmail.com', '123456');
  if (!token) return;

  const headers = { Authorization: `Bearer ${token}` };

  try {
    // 1. Test Browse Farmer Listings
    console.log('\n1. Testing Browse Farmer Listings...');
    const procurementResponse = await axios.get(`${API_BASE}/buyer/available-produce`, { headers });
    const listings = procurementResponse.data.listings || [];
    console.log(`✓ Found ${listings.length} farmer listings`);
    
    const validListings = listings.filter(l => l.cropType);
    console.log(`✓ Valid listings with cropType: ${validListings.length}`);
    
    if (validListings.length > 0) {
      console.log('Sample valid listing:', {
        id: validListings[0].id,
        cropType: validListings[0].cropType,
        status: validListings[0].status,
        minimumPrice: validListings[0].minimumPrice
      });
    }

    // 2. Test My Procurement Requests
    console.log('\n2. Testing My Procurement Requests...');
    const myRequestsResponse = await axios.get(`${API_BASE}/buyer/procurement-requests`, { headers });
    const requests = myRequestsResponse.data.requests || [];
    console.log(`✓ Found ${requests.length} procurement requests`);
    
    if (requests.length > 0) {
      const testRequest = requests[0];
      console.log('Sample request:', {
        id: testRequest.id,
        cropType: testRequest.cropType,
        status: testRequest.status,
        maxPricePerUnit: testRequest.maxPricePerUnit
      });

      // 3. Test Edit Procurement Request (Negotiation)
      console.log('\n3. Testing Edit Procurement Request...');
      const editData = {
        maxPricePerUnit: (testRequest.maxPricePerUnit || 100) + 50,
        quantity: testRequest.quantity,
        qualityGrade: testRequest.qualityGrade,
        negotiationNotes: 'Updated price for better offers'
      };

      const editResponse = await axios.put(`${API_BASE}/buyer/procurement-requests/${testRequest.id}/negotiate`, editData, { headers });
      console.log(`✓ Edit successful: ${editResponse.data.success}`);
      
      // 4. Test Status Update
      console.log('\n4. Testing Status Update...');
      const statusResponse = await axios.put(`${API_BASE}/buyer/procurement-requests/${testRequest.id}/status`, { status: 'open' }, { headers });
      console.log(`✓ Status update successful`);
    }

  } catch (error) {
    console.error('Buyer functionality test failed:', error.response?.data || error.message);
  }
}

async function testFarmerFunctionality() {
  console.log('\n=== TESTING FARMER FUNCTIONALITY ===');
  
  const token = await login('farmer@gmail.com', '123456');
  if (!token) return;

  const headers = { Authorization: `Bearer ${token}` };

  try {
    // 1. Test My Listings
    console.log('\n1. Testing My Listings...');
    const myListingsResponse = await axios.get(`${API_BASE}/farmer/purchase-requests`, { headers });
    const listings = myListingsResponse.data.requests || [];
    console.log(`✓ Found ${listings.length} farmer listings`);
    
    if (listings.length > 0) {
      const testListing = listings[0];
      console.log('Sample listing:', {
        id: testListing.id,
        cropType: testListing.cropType,
        status: testListing.status,
        minimumPrice: testListing.minimumPrice
      });

      // 2. Test Edit Listing (Negotiation)
      console.log('\n2. Testing Edit Listing...');
      const editData = {
        minimumPrice: (testListing.minimumPrice || 100) + 25,
        quantity: testListing.quantity,
        qualityGrade: testListing.qualityGrade,
        negotiationNotes: 'Updated price based on market conditions'
      };

      const editResponse = await axios.put(`${API_BASE}/farmer/listings/${testListing.id}/negotiate`, editData, { headers });
      console.log(`✓ Edit successful: ${editResponse.data.success}`);
      
      // 3. Test View Details
      console.log('\n3. Testing View Details...');
      const detailResponse = await axios.get(`${API_BASE}/farmer/listings/${testListing.id}`, { headers });
      console.log(`✓ Details loaded: ${detailResponse.data.listing.cropType}`);
      
      // 4. Test Status Update
      console.log('\n4. Testing Status Update...');
      const statusResponse = await axios.put(`${API_BASE}/farmer/listings/${testListing.id}/status`, { status: 'open' }, { headers });
      console.log(`✓ Status update successful`);
    }

    // 5. Test Browse Buyer Procurement Requests
    console.log('\n5. Testing Browse Buyer Procurement Requests...');
    const buyerRequestsResponse = await axios.get(`${API_BASE}/farmer/buyer-procurement-requests`, { headers });
    const buyerRequests = buyerRequestsResponse.data.requests || [];
    console.log(`✓ Found ${buyerRequests.length} buyer procurement requests`);

  } catch (error) {
    console.error('Farmer functionality test failed:', error.response?.data || error.message);
  }
}

async function testSpecificNegotiation() {
  console.log('\n=== TESTING SPECIFIC NEGOTIATION ===');
  
  const token = await login('farmer@gmail.com', '123456');
  if (!token) return;

  const headers = { Authorization: `Bearer ${token}` };
  const listingId = 'a189e87e-39af-4915-8f13-3c6075bd1318';

  try {
    console.log(`\nTesting negotiation for listing: ${listingId}`);
    
    // Get current listing details
    const listingResponse = await axios.get(`${API_BASE}/farmer/listings/${listingId}`, { headers });
    const listing = listingResponse.data.listing;
    
    console.log('Current listing:', {
      cropType: listing.cropType,
      minimumPrice: listing.minimumPrice,
      status: listing.status
    });

    // Test negotiation with price update
    const negotiationData = {
      minimumPrice: 2250,
      quantity: listing.quantity,
      qualityGrade: listing.qualityGrade || 'A',
      negotiationNotes: 'Updated price after market analysis'
    };

    const negotiationResponse = await axios.put(`${API_BASE}/farmer/listings/${listingId}/negotiate`, negotiationData, { headers });
    console.log(`✓ Negotiation successful: ${negotiationResponse.data.success}`);
    console.log(`✓ New price: ₹${negotiationResponse.data.listing.minimumPrice}`);

  } catch (error) {
    console.error('Specific negotiation test failed:', error.response?.data || error.message);
  }
}

async function testCreateNewListing() {
  console.log('\n=== TESTING CREATE NEW LISTING ===');
  
  const token = await login('farmer@gmail.com', '123456');
  if (!token) return;

  const headers = { Authorization: `Bearer ${token}` };

  try {
    const newListingData = {
      cropType: 'Test Wheat',
      variety: 'HD-2967',
      quantity: 50,
      quantityUnit: 'quintal',
      qualityGrade: 'A',
      minimumPrice: 2500,
      pickupLocation: 'Test Farm, Punjab',
      availableFrom: new Date().toISOString(),
      description: 'High quality wheat for testing'
    };

    const createResponse = await axios.post(`${API_BASE}/farmer/purchase-requests`, newListingData, { headers });
    console.log(`✓ New listing created: ${createResponse.data.purchaseRequest.id}`);
    console.log(`✓ Crop: ${createResponse.data.purchaseRequest.cropType}`);
    
    // Test delete the created listing
    const deleteResponse = await axios.delete(`${API_BASE}/farmer/purchase-requests/${createResponse.data.purchaseRequest.id}`, { headers });
    console.log(`✓ Listing deleted successfully`);

  } catch (error) {
    console.error('Create new listing test failed:', error.response?.data || error.message);
  }
}

async function runComprehensiveTests() {
  console.log('🧪 Running Comprehensive Functionality Tests...\n');
  
  await testBuyerFunctionality();
  await testFarmerFunctionality();
  await testSpecificNegotiation();
  await testCreateNewListing();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📋 Summary:');
  console.log('- Buyer pages: Browse listings & My procurement requests');
  console.log('- Farmer pages: My listings & Browse buyer requests');
  console.log('- Negotiation: Price updates and status changes');
  console.log('- Edit/Delete: Full CRUD operations');
  console.log('- View Details: Consistent data loading');
}

runComprehensiveTests().catch(console.error);