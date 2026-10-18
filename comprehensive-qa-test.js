const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api';

// Test results storage
const testResults = [];

// Test users for different roles
const testUsers = {
  buyer: { email: 'buyer@gmail.com', password: '123456' },
  farmer: { email: 'farmer@gmail.com', password: '123456' },
  admin: { email: 'test@example.com', password: 'password123' }
};

let tokens = {};

// Utility functions
async function login(role) {
  try {
    const user = testUsers[role];
    const response = await axios.post(`${API_BASE}/auth/login`, user);
    tokens[role] = response.data.token;
    return response.data.token;
  } catch (error) {
    console.error(`Login failed for ${role}:`, error.response?.data || error.message);
    return null;
  }
}

function recordTest(pageName, buttonName, buttonLocation, expectedAction, actualBehavior, apiEndpoint, responseStatus, errorObserved, severity) {
  testResults.push({
    pageName,
    buttonName,
    buttonLocation,
    expectedAction,
    actualBehavior,
    apiEndpoint,
    responseStatus,
    errorObserved,
    severity,
    timestamp: new Date().toISOString()
  });
}

async function testEndpoint(method, endpoint, data = null, token = null, expectedStatus = 200) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      ...(data && { data })
    };

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      data: null,
      error: error.response?.data?.error || error.message
    };
  }
}

// Page-specific tests
async function testBuyerPages() {
  console.log('\n=== TESTING BUYER PAGES ===');
  const token = await login('buyer');
  if (!token) return;

  // 1. Buyer Dashboard
  console.log('\n1. Testing Buyer Dashboard...');
  
  // Test dashboard data loading
  let result = await testEndpoint('GET', '/buyer/dashboard', null, token);
  recordTest(
    'Buyer Dashboard',
    'Dashboard Load',
    'Page Load',
    'Load dashboard data',
    result.success ? 'SUCCESS' : 'FAILED',
    '/buyer/dashboard',
    result.status,
    result.error,
    result.success ? 'Low' : 'Critical'
  );

  // 2. Browse Farmer Listings (Procurement Page)
  console.log('\n2. Testing Browse Farmer Listings...');
  
  result = await testEndpoint('GET', '/buyer/available-produce', null, token);
  recordTest(
    'Browse Farmer Listings',
    'Load Listings',
    'Page Load',
    'Load available produce listings',
    result.success ? `SUCCESS - ${result.data?.listings?.length || 0} listings` : 'FAILED',
    '/buyer/available-produce',
    result.status,
    result.error,
    result.success ? 'Low' : 'Critical'
  );

  // Test Create Procurement Request button
  result = await testEndpoint('POST', '/buyer/procurement-requests', {
    cropType: 'Test Wheat',
    variety: 'HD-2967',
    quantity: 100,
    quantityUnit: 'quintal',
    qualityGrade: 'A',
    maxPricePerUnit: 2500,
    deliveryLocation: 'Test Location',
    requiredBy: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'QA Test Request'
  }, token);
  
  recordTest(
    'Browse Farmer Listings',
    'Create Request Button',
    'Top Right',
    'Create new procurement request',
    result.success ? 'SUCCESS' : 'FAILED',
    '/buyer/procurement-requests',
    result.status,
    result.error,
    result.success ? 'Low' : 'High'
  );

  // 3. My Procurement Requests
  console.log('\n3. Testing My Procurement Requests...');
  
  result = await testEndpoint('GET', '/buyer/procurement-requests', null, token);
  recordTest(
    'My Procurement Requests',
    'Load Requests',
    'Page Load',
    'Load user procurement requests',
    result.success ? `SUCCESS - ${result.data?.requests?.length || 0} requests` : 'FAILED',
    '/buyer/procurement-requests',
    result.status,
    result.error,
    result.success ? 'Low' : 'Critical'
  );

  // Test Edit functionality if requests exist
  if (result.success && result.data?.requests?.length > 0) {
    const testRequest = result.data.requests[0];
    
    // Test Edit/Negotiate button
    const editResult = await testEndpoint('PUT', `/buyer/procurement-requests/${testRequest.id}/negotiate`, {
      maxPricePerUnit: (testRequest.maxPricePerUnit || 2000) + 100,
      quantity: testRequest.quantity,
      qualityGrade: testRequest.qualityGrade,
      negotiationNotes: 'QA Test Edit'
    }, token);
    
    recordTest(
      'My Procurement Requests',
      'Edit/Negotiate Button',
      'Request Card',
      'Edit procurement request',
      editResult.success ? 'SUCCESS' : 'FAILED',
      `/buyer/procurement-requests/${testRequest.id}/negotiate`,
      editResult.status,
      editResult.error,
      editResult.success ? 'Low' : 'High'
    );

    // Test View Details button
    const detailResult = await testEndpoint('GET', `/buyer/procurement-requests/${testRequest.id}`, null, token);
    recordTest(
      'My Procurement Requests',
      'View Details Button',
      'Request Card',
      'View request details',
      detailResult.success ? 'SUCCESS' : 'FAILED',
      `/buyer/procurement-requests/${testRequest.id}`,
      detailResult.status,
      detailResult.error,
      detailResult.success ? 'Low' : 'Medium'
    );
  }

  // 4. Test Farmer Listing Detail Page
  console.log('\n4. Testing Farmer Listing Detail...');
  
  // First get available listings
  const listingsResult = await testEndpoint('GET', '/buyer/available-produce', null, token);
  if (listingsResult.success && listingsResult.data?.listings?.length > 0) {
    const testListing = listingsResult.data.listings[0];
    
    // Test view listing details
    const listingDetailResult = await testEndpoint('GET', `/farmer/listings/${testListing.id}`, null, token);
    recordTest(
      'Farmer Listing Detail',
      'View Details',
      'Listing Card',
      'View farmer listing details',
      listingDetailResult.success ? 'SUCCESS' : 'FAILED',
      `/farmer/listings/${testListing.id}`,
      listingDetailResult.status,
      listingDetailResult.error,
      listingDetailResult.success ? 'Low' : 'Medium'
    );

    // Test Make Offer button
    const offerResult = await testEndpoint('POST', '/buyer/offers', {
      listingId: testListing.id,
      farmerId: testListing.farmerId,
      pricePerUnit: testListing.minimumPrice + 50,
      quantity: Math.min(testListing.quantity, 10),
      quantityUnit: testListing.quantityUnit,
      message: 'QA Test Offer'
    }, token);
    
    recordTest(
      'Farmer Listing Detail',
      'Make Offer Button',
      'Listing Detail Page',
      'Submit offer to farmer',
      offerResult.success ? 'SUCCESS' : 'FAILED',
      '/buyer/offers',
      offerResult.status,
      offerResult.error,
      offerResult.success ? 'Low' : 'High'
    );
  }
}

async function testFarmerPages() {
  console.log('\n=== TESTING FARMER PAGES ===');
  const token = await login('farmer');
  if (!token) return;

  // 1. Farmer Dashboard
  console.log('\n1. Testing Farmer Dashboard...');
  
  let result = await testEndpoint('GET', '/farmer/dashboard', null, token);
  recordTest(
    'Farmer Dashboard',
    'Dashboard Load',
    'Page Load',
    'Load dashboard data',
    result.success ? 'SUCCESS' : 'FAILED',
    '/farmer/dashboard',
    result.status,
    result.error,
    result.success ? 'Low' : 'Critical'
  );

  // 2. My Listings
  console.log('\n2. Testing My Listings...');
  
  result = await testEndpoint('GET', '/farmer/purchase-requests', null, token);
  recordTest(
    'My Listings',
    'Load Listings',
    'Page Load',
    'Load farmer listings',
    result.success ? `SUCCESS - ${result.data?.requests?.length || 0} listings` : 'FAILED',
    '/farmer/purchase-requests',
    result.status,
    result.error,
    result.success ? 'Low' : 'Critical'
  );

  // Test Create Listing functionality
  const createResult = await testEndpoint('POST', '/farmer/purchase-requests', {
    cropType: 'QA Test Rice',
    variety: 'Basmati',
    quantity: 25,
    quantityUnit: 'quintal',
    qualityGrade: 'A',
    minimumPrice: 3000,
    pickupLocation: 'QA Test Farm',
    availableFrom: new Date().toISOString(),
    description: 'QA Test Listing'
  }, token);
  
  recordTest(
    'My Listings',
    'Create Listing Button',
    'Page Header/FAB',
    'Create new listing',
    createResult.success ? 'SUCCESS' : 'FAILED',
    '/farmer/purchase-requests',
    createResult.status,
    createResult.error,
    createResult.success ? 'Low' : 'High'
  );

  let createdListingId = null;
  if (createResult.success) {
    createdListingId = createResult.data.purchaseRequest.id;
  }

  // Test Edit/Negotiate functionality if listings exist
  if (result.success && result.data?.requests?.length > 0) {
    const testListing = result.data.requests[0];
    
    // Test Edit/Negotiate button
    const editResult = await testEndpoint('PUT', `/farmer/listings/${testListing.id}/negotiate`, {
      minimumPrice: (testListing.minimumPrice || 2000) + 100,
      quantity: testListing.quantity,
      qualityGrade: testListing.qualityGrade,
      negotiationNotes: 'QA Test Edit'
    }, token);
    
    recordTest(
      'My Listings',
      'Edit/Negotiate Button',
      'Listing Card',
      'Edit listing',
      editResult.success ? 'SUCCESS' : 'FAILED',
      `/farmer/listings/${testListing.id}/negotiate`,
      editResult.status,
      editResult.error,
      editResult.success ? 'Low' : 'High'
    );

    // Test View Details button
    const detailResult = await testEndpoint('GET', `/farmer/listings/${testListing.id}`, null, token);
    recordTest(
      'My Listings',
      'View Details Button',
      'Listing Card',
      'View listing details',
      detailResult.success ? 'SUCCESS' : 'FAILED',
      `/farmer/listings/${testListing.id}`,
      detailResult.status,
      detailResult.error,
      detailResult.success ? 'Low' : 'Medium'
    );

    // Test Delete button
    if (createdListingId) {
      const deleteResult = await testEndpoint('DELETE', `/farmer/purchase-requests/${createdListingId}`, null, token);
      recordTest(
        'My Listings',
        'Delete Button',
        'Listing Card',
        'Delete listing',
        deleteResult.success ? 'SUCCESS' : 'FAILED',
        `/farmer/purchase-requests/${createdListingId}`,
        deleteResult.status,
        deleteResult.error,
        deleteResult.success ? 'Low' : 'Medium'
      );
    }
  }

  // 3. Browse Buyer Procurement Requests
  console.log('\n3. Testing Browse Buyer Procurement Requests...');
  
  result = await testEndpoint('GET', '/farmer/buyer-procurement-requests', null, token);
  recordTest(
    'Browse Buyer Requests',
    'Load Requests',
    'Page Load',
    'Load buyer procurement requests',
    result.success ? `SUCCESS - ${result.data?.requests?.length || 0} requests` : 'FAILED',
    '/farmer/buyer-procurement-requests',
    result.status,
    result.error,
    result.success ? 'Low' : 'Critical'
  );

  // Test Submit Quote functionality if requests exist
  if (result.success && result.data?.requests?.length > 0) {
    const testRequest = result.data.requests[0];
    
    const quoteResult = await testEndpoint('POST', '/quotes', {
      requestId: testRequest.id,
      buyerId: testRequest.buyerId,
      pricePerUnit: (testRequest.maxPricePerUnit || 2000) - 100,
      quantity: Math.min(testRequest.quantity, 10),
      quantityUnit: testRequest.quantityUnit,
      message: 'QA Test Quote'
    }, token);
    
    recordTest(
      'Browse Buyer Requests',
      'Submit Quote Button',
      'Request Card',
      'Submit quote to buyer',
      quoteResult.success ? 'SUCCESS' : 'FAILED',
      '/quotes',
      quoteResult.status,
      quoteResult.error,
      quoteResult.success ? 'Low' : 'High'
    );
  }

  // 4. Test Crop Management Pages
  console.log('\n4. Testing Crop Management...');
  
  // Test Get Crops
  result = await testEndpoint('GET', '/farmer/crops', null, token);
  recordTest(
    'Crop Management',
    'Load Crops',
    'Page Load',
    'Load farmer crops',
    result.success ? `SUCCESS - ${result.data?.crops?.length || 0} crops` : 'FAILED',
    '/farmer/crops',
    result.status,
    result.error,
    result.success ? 'Low' : 'Medium'
  );

  // Test Create Crop
  const cropResult = await testEndpoint('POST', '/farmer/crops', {
    name: 'QA Test Crop',
    area: 5,
    plantingDate: new Date().toISOString(),
    expectedHarvestDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    variety: 'Test Variety',
    expectedYield: 100
  }, token);
  
  recordTest(
    'Crop Management',
    'Add Crop Button',
    'Crop Planning Page',
    'Create new crop',
    cropResult.success ? 'SUCCESS' : 'FAILED',
    '/farmer/crops',
    cropResult.status,
    cropResult.error,
    cropResult.success ? 'Low' : 'Medium'
  );
}

async function testSharedPages() {
  console.log('\n=== TESTING SHARED PAGES ===');
  const token = await login('buyer');
  if (!token) return;

  // 1. Invoices Page
  console.log('\n1. Testing Invoices...');
  
  let result = await testEndpoint('GET', '/invoices', null, token);
  recordTest(
    'Invoices',
    'Load Invoices',
    'Page Load',
    'Load user invoices',
    result.success ? `SUCCESS - ${result.data?.invoices?.length || 0} invoices` : 'FAILED',
    '/invoices',
    result.status,
    result.error,
    result.success ? 'Low' : 'Medium'
  );

  // 2. Notifications
  console.log('\n2. Testing Notifications...');
  
  result = await testEndpoint('GET', '/notifications', null, token);
  recordTest(
    'Notifications',
    'Load Notifications',
    'Notification Bell',
    'Load user notifications',
    result.success ? `SUCCESS - ${result.data?.notifications?.length || 0} notifications` : 'FAILED',
    '/notifications',
    result.status,
    result.error,
    result.success ? 'Low' : 'Medium'
  );

  // Test Mark All Read
  result = await testEndpoint('PUT', '/notifications/mark-all-read', null, token);
  recordTest(
    'Notifications',
    'Mark All Read Button',
    'Notification Panel',
    'Mark all notifications as read',
    result.success ? 'SUCCESS' : 'FAILED',
    '/notifications/mark-all-read',
    result.status,
    result.error,
    result.success ? 'Low' : 'Medium'
  );

  // 3. Profile Update
  console.log('\n3. Testing Profile Update...');
  
  result = await testEndpoint('PUT', '/auth/profile', {
    name: 'QA Test User Updated',
    phone: '+1234567890'
  }, token);
  
  recordTest(
    'Profile Update',
    'Update Profile Button',
    'Profile Form',
    'Update user profile',
    result.success ? 'SUCCESS' : 'FAILED',
    '/auth/profile',
    result.status,
    result.error,
    result.success ? 'Low' : 'Medium'
  );
}

async function testNegotiationFlow() {
  console.log('\n=== TESTING NEGOTIATION FLOW ===');
  
  const buyerToken = await login('buyer');
  const farmerToken = await login('farmer');
  
  if (!buyerToken || !farmerToken) return;

  // 1. Test complete negotiation flow
  console.log('\n1. Testing Complete Negotiation Flow...');
  
  // Get farmer listings
  let result = await testEndpoint('GET', '/buyer/available-produce', null, buyerToken);
  if (result.success && result.data?.listings?.length > 0) {
    const testListing = result.data.listings[0];
    
    // Buyer makes initial offer
    const offerResult = await testEndpoint('POST', '/buyer/offers', {
      listingId: testListing.id,
      farmerId: testListing.farmerId,
      pricePerUnit: testListing.minimumPrice + 100,
      quantity: Math.min(testListing.quantity, 5),
      quantityUnit: testListing.quantityUnit,
      message: 'Initial negotiation offer'
    }, buyerToken);
    
    recordTest(
      'Negotiation Flow',
      'Initial Offer',
      'Listing Detail',
      'Buyer makes initial offer',
      offerResult.success ? 'SUCCESS' : 'FAILED',
      '/buyer/offers',
      offerResult.status,
      offerResult.error,
      offerResult.success ? 'Low' : 'Critical'
    );

    // Farmer counter-offers
    const counterResult = await testEndpoint('PUT', `/farmer/listings/${testListing.id}/negotiate`, {
      minimumPrice: testListing.minimumPrice + 150,
      quantity: testListing.quantity,
      qualityGrade: testListing.qualityGrade,
      negotiationNotes: 'Counter offer from farmer'
    }, farmerToken);
    
    recordTest(
      'Negotiation Flow',
      'Counter Offer',
      'Listing Management',
      'Farmer makes counter offer',
      counterResult.success ? 'SUCCESS' : 'FAILED',
      `/farmer/listings/${testListing.id}/negotiate`,
      counterResult.status,
      counterResult.error,
      counterResult.success ? 'Low' : 'Critical'
    );

    // Test negotiation history
    const historyResult = await testEndpoint('GET', `/negotiation/listing/${testListing.id}/history`, null, farmerToken);
    recordTest(
      'Negotiation Flow',
      'View History',
      'Negotiation Modal',
      'View negotiation history',
      historyResult.success ? 'SUCCESS' : 'FAILED',
      `/negotiation/listing/${testListing.id}/history`,
      historyResult.status,
      historyResult.error,
      historyResult.success ? 'Low' : 'Medium'
    );
  }
}

async function testMissingEndpoints() {
  console.log('\n=== TESTING FOR MISSING ENDPOINTS ===');
  
  const token = await login('buyer');
  if (!token) return;

  // Test common endpoints that might be missing
  const endpointsToTest = [
    { method: 'GET', endpoint: '/warehouses', description: 'Browse warehouses' },
    { method: 'GET', endpoint: '/vehicles', description: 'Browse vehicles' },
    { method: 'GET', endpoint: '/transporter/vehicles/available', description: 'Available vehicles' },
    { method: 'GET', endpoint: '/storage/available', description: 'Available storage' },
    { method: 'POST', endpoint: '/storage/bookings', description: 'Book storage' },
    { method: 'POST', endpoint: '/transporter/bookings', description: 'Book vehicle' },
    { method: 'GET', endpoint: '/admin/dashboard', description: 'Admin dashboard' },
    { method: 'GET', endpoint: '/admin/users', description: 'User management' }
  ];

  for (const test of endpointsToTest) {
    const result = await testEndpoint(test.method, test.endpoint, null, token);
    recordTest(
      'Missing Endpoints Check',
      test.description,
      'Various Pages',
      `${test.method} ${test.endpoint}`,
      result.success ? 'SUCCESS' : 'MISSING/FAILED',
      test.endpoint,
      result.status,
      result.error,
      result.success ? 'Low' : (result.status === 404 ? 'High' : 'Medium')
    );
  }
}

async function generateReport() {
  console.log('\n=== GENERATING QA REPORT ===');
  
  // Categorize results
  const critical = testResults.filter(r => r.severity === 'Critical');
  const high = testResults.filter(r => r.severity === 'High');
  const medium = testResults.filter(r => r.severity === 'Medium');
  const low = testResults.filter(r => r.severity === 'Low');
  
  const failed = testResults.filter(r => r.actualBehavior.includes('FAILED') || r.actualBehavior.includes('MISSING'));
  const passed = testResults.filter(r => r.actualBehavior.includes('SUCCESS'));

  const report = {
    summary: {
      totalTests: testResults.length,
      passed: passed.length,
      failed: failed.length,
      passRate: ((passed.length / testResults.length) * 100).toFixed(2) + '%'
    },
    severityBreakdown: {
      critical: critical.length,
      high: high.length,
      medium: medium.length,
      low: low.length
    },
    failedTests: failed,
    allResults: testResults,
    timestamp: new Date().toISOString()
  };

  // Write detailed report
  fs.writeFileSync('qa-test-report.json', JSON.stringify(report, null, 2));
  
  // Write CSV for easy analysis
  const csvHeader = 'Page Name,Button Name,Button Location,Expected Action,Actual Behavior,API Endpoint,Response Status,Error Observed,Severity\n';
  const csvRows = testResults.map(r => 
    `"${r.pageName}","${r.buttonName}","${r.buttonLocation}","${r.expectedAction}","${r.actualBehavior}","${r.apiEndpoint}",${r.responseStatus},"${r.errorObserved || ''}","${r.severity}"`
  ).join('\n');
  
  fs.writeFileSync('qa-test-report.csv', csvHeader + csvRows);

  console.log('\n📊 QA TEST SUMMARY:');
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`Passed: ${report.summary.passed} (${report.summary.passRate})`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log('\nSeverity Breakdown:');
  console.log(`Critical: ${report.severityBreakdown.critical}`);
  console.log(`High: ${report.severityBreakdown.high}`);
  console.log(`Medium: ${report.severityBreakdown.medium}`);
  console.log(`Low: ${report.severityBreakdown.low}`);

  if (failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failed.forEach(test => {
      console.log(`- ${test.pageName} > ${test.buttonName}: ${test.errorObserved || test.actualBehavior}`);
    });
  }

  return report;
}

async function runComprehensiveQATest() {
  console.log('🧪 Starting Comprehensive QA Test Suite...\n');
  
  try {
    await testBuyerPages();
    await testFarmerPages();
    await testSharedPages();
    await testNegotiationFlow();
    await testMissingEndpoints();
    
    const report = await generateReport();
    
    console.log('\n✅ QA Test Suite Completed!');
    console.log('📄 Reports generated: qa-test-report.json, qa-test-report.csv');
    
    return report;
  } catch (error) {
    console.error('QA Test Suite failed:', error);
    throw error;
  }
}

// Run the test suite
runComprehensiveQATest().catch(console.error);