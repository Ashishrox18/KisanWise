const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api';

// Test results storage
const finalResults = [];

async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
    return response.data.token;
  } catch (error) {
    console.error(`Login failed for ${email}:`, error.response?.data || error.message);
    return null;
  }
}

function recordResult(category, test, status, details = '') {
  finalResults.push({
    category,
    test,
    status,
    details,
    timestamp: new Date().toISOString()
  });
}

async function testCriticalFixes() {
  console.log('\n🔥 TESTING CRITICAL FIXES');
  
  const buyerToken = await login('buyer@gmail.com', '123456');
  const farmerToken = await login('farmer@gmail.com', '123456');
  
  if (!buyerToken || !farmerToken) {
    recordResult('Critical', 'User Authentication', 'FAILED', 'Cannot login test users');
    return;
  }

  // 1. Test Negotiation Flow
  try {
    console.log('\n1. Testing Complete Negotiation Flow...');
    
    // Get available listings
    const listingsResponse = await axios.get(`${API_BASE}/buyer/available-produce`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });

    const listings = listingsResponse.data.listings || [];
    if (listings.length === 0) {
      recordResult('Critical', 'Negotiation Flow', 'FAILED', 'No listings available');
      return;
    }

    const testListing = listings.find(l => l.status === 'open' || l.status === 'released');
    if (!testListing) {
      recordResult('Critical', 'Negotiation Flow', 'FAILED', 'No open listings for offers');
      return;
    }

    console.log(`   Using listing: ${testListing.id} (${testListing.cropType}) - Status: ${testListing.status}`);

    // Test making an offer
    const offerResponse = await axios.post(`${API_BASE}/buyer/offers`, {
      listingId: testListing.id,
      farmerId: testListing.farmerId,
      pricePerUnit: testListing.minimumPrice + 100,
      quantity: Math.min(testListing.quantity, 5),
      quantityUnit: testListing.quantityUnit,
      message: 'Final QA test offer'
    }, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });

    console.log('   ✅ Buyer offer submitted successfully');
    recordResult('Critical', 'Buyer Offer Submission', 'PASSED', `Offer ID: ${offerResponse.data.offer?.id}`);

    // Test farmer counter-offer
    const counterResponse = await axios.put(`${API_BASE}/farmer/listings/${testListing.id}/negotiate`, {
      minimumPrice: testListing.minimumPrice + 150,
      quantity: testListing.quantity,
      qualityGrade: testListing.qualityGrade || 'A',
      negotiationNotes: 'Final QA counter offer'
    }, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });

    console.log('   ✅ Farmer counter-offer successful');
    recordResult('Critical', 'Farmer Counter Offer', 'PASSED', `Success: ${counterResponse.data.success}`);

    // Test negotiation history
    try {
      const historyResponse = await axios.get(`${API_BASE}/negotiation/listing/${testListing.id}/history`, {
        headers: { Authorization: `Bearer ${farmerToken}` }
      });

      console.log('   ✅ Negotiation history retrieved');
      recordResult('Critical', 'Negotiation History', 'PASSED', `Entries: ${historyResponse.data.negotiationHistory?.length || 0}`);
    } catch (historyError) {
      console.log('   ❌ Negotiation history failed');
      recordResult('Critical', 'Negotiation History', 'FAILED', historyError.response?.data?.error || historyError.message);
    }

  } catch (error) {
    console.log('   ❌ Negotiation flow failed');
    recordResult('Critical', 'Negotiation Flow', 'FAILED', error.response?.data?.error || error.message);
  }
}

async function testMissingEndpoints() {
  console.log('\n🔧 TESTING MISSING ENDPOINTS');
  
  const token = await login('buyer@gmail.com', '123456');
  if (!token) return;

  const headers = { Authorization: `Bearer ${token}` };

  // Test warehouses endpoint
  try {
    console.log('\n1. Testing Warehouses Endpoint...');
    const warehousesResponse = await axios.get(`${API_BASE}/warehouses`, { headers });
    console.log(`   ✅ Warehouses: ${warehousesResponse.data.warehouses?.length || 0} found`);
    recordResult('Endpoints', 'Warehouses API', 'PASSED', `${warehousesResponse.data.warehouses?.length || 0} warehouses`);
  } catch (error) {
    console.log(`   ❌ Warehouses failed: ${error.response?.status}`);
    recordResult('Endpoints', 'Warehouses API', 'FAILED', `${error.response?.status} - ${error.response?.data?.error}`);
  }

  // Test vehicles endpoint
  try {
    console.log('\n2. Testing Vehicles Endpoint...');
    const vehiclesResponse = await axios.get(`${API_BASE}/vehicles`, { headers });
    console.log(`   ✅ Vehicles: ${vehiclesResponse.data.vehicles?.length || 0} found`);
    recordResult('Endpoints', 'Vehicles API', 'PASSED', `${vehiclesResponse.data.vehicles?.length || 0} vehicles`);
  } catch (error) {
    console.log(`   ❌ Vehicles failed: ${error.response?.status}`);
    recordResult('Endpoints', 'Vehicles API', 'FAILED', `${error.response?.status} - ${error.response?.data?.error}`);
  }

  // Test storage booking
  try {
    console.log('\n3. Testing Storage Booking...');
    const storageResponse = await axios.post(`${API_BASE}/storage/bookings`, {
      product: 'Final QA Test Wheat',
      quantity: 50,
      duration: 15
    }, { headers });
    console.log(`   ✅ Storage booking: ${storageResponse.data.booking?.id}`);
    recordResult('Endpoints', 'Storage Booking', 'PASSED', `Booking ID: ${storageResponse.data.booking?.id}`);
  } catch (error) {
    console.log(`   ❌ Storage booking failed: ${error.response?.status}`);
    recordResult('Endpoints', 'Storage Booking', 'FAILED', `${error.response?.status} - ${error.response?.data?.error}`);
  }
}

async function testUIFunctionality() {
  console.log('\n🖱️  TESTING UI FUNCTIONALITY');
  
  const buyerToken = await login('buyer@gmail.com', '123456');
  const farmerToken = await login('farmer@gmail.com', '123456');
  
  if (!buyerToken || !farmerToken) return;

  // Test buyer pages
  try {
    console.log('\n1. Testing Buyer Pages...');
    
    // Browse farmer listings
    const procurementResponse = await axios.get(`${API_BASE}/buyer/available-produce`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    console.log(`   ✅ Browse Listings: ${procurementResponse.data.listings?.length || 0} listings`);
    recordResult('UI', 'Buyer Browse Listings', 'PASSED', `${procurementResponse.data.listings?.length || 0} listings loaded`);

    // My procurement requests
    const requestsResponse = await axios.get(`${API_BASE}/buyer/procurement-requests`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    console.log(`   ✅ My Requests: ${requestsResponse.data.requests?.length || 0} requests`);
    recordResult('UI', 'Buyer My Requests', 'PASSED', `${requestsResponse.data.requests?.length || 0} requests loaded`);

  } catch (error) {
    console.log('   ❌ Buyer pages failed');
    recordResult('UI', 'Buyer Pages', 'FAILED', error.response?.data?.error || error.message);
  }

  // Test farmer pages
  try {
    console.log('\n2. Testing Farmer Pages...');
    
    // My listings
    const listingsResponse = await axios.get(`${API_BASE}/farmer/purchase-requests`, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    console.log(`   ✅ My Listings: ${listingsResponse.data.requests?.length || 0} listings`);
    recordResult('UI', 'Farmer My Listings', 'PASSED', `${listingsResponse.data.requests?.length || 0} listings loaded`);

    // Browse buyer requests
    const buyerRequestsResponse = await axios.get(`${API_BASE}/farmer/buyer-procurement-requests`, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    console.log(`   ✅ Browse Buyer Requests: ${buyerRequestsResponse.data.requests?.length || 0} requests`);
    recordResult('UI', 'Farmer Browse Requests', 'PASSED', `${buyerRequestsResponse.data.requests?.length || 0} requests loaded`);

  } catch (error) {
    console.log('   ❌ Farmer pages failed');
    recordResult('UI', 'Farmer Pages', 'FAILED', error.response?.data?.error || error.message);
  }
}

async function testCRUDOperations() {
  console.log('\n📝 TESTING CRUD OPERATIONS');
  
  const farmerToken = await login('farmer@gmail.com', '123456');
  const buyerToken = await login('buyer@gmail.com', '123456');
  
  if (!farmerToken || !buyerToken) return;

  // Test farmer CRUD
  try {
    console.log('\n1. Testing Farmer CRUD...');
    
    // Create listing
    const createResponse = await axios.post(`${API_BASE}/farmer/purchase-requests`, {
      cropType: 'Final QA Test Crop',
      variety: 'Premium',
      quantity: 25,
      quantityUnit: 'quintal',
      qualityGrade: 'A',
      minimumPrice: 2000,
      pickupLocation: 'QA Test Farm',
      availableFrom: new Date().toISOString(),
      description: 'Final QA test listing'
    }, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });

    const listingId = createResponse.data.purchaseRequest.id;
    console.log(`   ✅ Create: ${listingId}`);
    recordResult('CRUD', 'Farmer Create Listing', 'PASSED', `ID: ${listingId}`);

    // Update listing
    const updateResponse = await axios.put(`${API_BASE}/farmer/listings/${listingId}/negotiate`, {
      minimumPrice: 2200,
      quantity: 25,
      qualityGrade: 'A',
      negotiationNotes: 'Updated for final QA'
    }, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });

    console.log(`   ✅ Update: Success ${updateResponse.data.success}`);
    recordResult('CRUD', 'Farmer Update Listing', 'PASSED', `Success: ${updateResponse.data.success}`);

    // Delete listing
    const deleteResponse = await axios.delete(`${API_BASE}/farmer/purchase-requests/${listingId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });

    console.log(`   ✅ Delete: Successful`);
    recordResult('CRUD', 'Farmer Delete Listing', 'PASSED', 'Listing deleted successfully');

  } catch (error) {
    console.log('   ❌ Farmer CRUD failed');
    recordResult('CRUD', 'Farmer CRUD Operations', 'FAILED', error.response?.data?.error || error.message);
  }

  // Test buyer CRUD
  try {
    console.log('\n2. Testing Buyer CRUD...');
    
    // Create procurement request
    const createResponse = await axios.post(`${API_BASE}/buyer/procurement-requests`, {
      cropType: 'Final QA Test Wheat',
      variety: 'HD-2967',
      quantity: 100,
      quantityUnit: 'quintal',
      qualityGrade: 'A',
      maxPricePerUnit: 2500,
      deliveryLocation: 'QA Test Location',
      requiredBy: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Final QA test request'
    }, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });

    const requestId = createResponse.data.procurementRequest.id;
    console.log(`   ✅ Create: ${requestId}`);
    recordResult('CRUD', 'Buyer Create Request', 'PASSED', `ID: ${requestId}`);

    // Update request
    const updateResponse = await axios.put(`${API_BASE}/buyer/procurement-requests/${requestId}/negotiate`, {
      maxPricePerUnit: 2700,
      quantity: 100,
      qualityGrade: 'A',
      negotiationNotes: 'Updated for final QA'
    }, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });

    console.log(`   ✅ Update: Success ${updateResponse.data.success}`);
    recordResult('CRUD', 'Buyer Update Request', 'PASSED', `Success: ${updateResponse.data.success}`);

  } catch (error) {
    console.log('   ❌ Buyer CRUD failed');
    recordResult('CRUD', 'Buyer CRUD Operations', 'FAILED', error.response?.data?.error || error.message);
  }
}

async function generateFinalReport() {
  console.log('\n📊 GENERATING FINAL QA REPORT');
  
  const passed = finalResults.filter(r => r.status === 'PASSED');
  const failed = finalResults.filter(r => r.status === 'FAILED');
  
  const report = {
    summary: {
      totalTests: finalResults.length,
      passed: passed.length,
      failed: failed.length,
      passRate: ((passed.length / finalResults.length) * 100).toFixed(2) + '%'
    },
    categories: {
      critical: finalResults.filter(r => r.category === 'Critical'),
      endpoints: finalResults.filter(r => r.category === 'Endpoints'),
      ui: finalResults.filter(r => r.category === 'UI'),
      crud: finalResults.filter(r => r.category === 'CRUD')
    },
    failedTests: failed,
    allResults: finalResults,
    timestamp: new Date().toISOString()
  };

  // Write final report
  fs.writeFileSync('final-qa-report.json', JSON.stringify(report, null, 2));
  
  console.log('\n🎯 FINAL QA RESULTS:');
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`Passed: ${report.summary.passed} (${report.summary.passRate})`);
  console.log(`Failed: ${report.summary.failed}`);
  
  console.log('\nCategory Breakdown:');
  console.log(`Critical: ${report.categories.critical.length} tests`);
  console.log(`Endpoints: ${report.categories.endpoints.length} tests`);
  console.log(`UI: ${report.categories.ui.length} tests`);
  console.log(`CRUD: ${report.categories.crud.length} tests`);

  if (failed.length > 0) {
    console.log('\n❌ REMAINING ISSUES:');
    failed.forEach(test => {
      console.log(`- ${test.category} > ${test.test}: ${test.details}`);
    });
  } else {
    console.log('\n🎉 ALL TESTS PASSED! Platform is fully functional.');
  }

  return report;
}

async function runFinalVerification() {
  console.log('🏁 FINAL QA VERIFICATION SUITE');
  console.log('Testing all fixes and architectural improvements...\n');
  
  try {
    await testCriticalFixes();
    await testMissingEndpoints();
    await testUIFunctionality();
    await testCRUDOperations();
    
    const report = await generateFinalReport();
    
    console.log('\n✅ Final QA Verification Completed!');
    console.log('📄 Report saved: final-qa-report.json');
    
    // Determine overall status
    const passRate = parseFloat(report.summary.passRate);
    if (passRate >= 95) {
      console.log('\n🏆 EXCELLENT: Platform is production-ready!');
    } else if (passRate >= 85) {
      console.log('\n✅ GOOD: Platform is functional with minor issues');
    } else if (passRate >= 70) {
      console.log('\n⚠️  ACCEPTABLE: Platform works but needs attention');
    } else {
      console.log('\n❌ NEEDS WORK: Significant issues remain');
    }
    
    return report;
  } catch (error) {
    console.error('Final verification failed:', error);
    throw error;
  }
}

// Run the final verification
runFinalVerification().catch(console.error);