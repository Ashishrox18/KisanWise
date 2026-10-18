import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

import { dynamoDBService } from './services/firestore.service';

async function seedTestData() {
  console.log('🌱 Seeding test data...');

  try {
    // Create a test procurement request from buyer
    const procurementRequest = {
      id: uuidv4(),
      buyerId: 'buyer-test-id', // We'll need to get the actual buyer ID
      cropType: 'Wheat',
      variety: 'Durum',
      quantity: 100,
      quantityUnit: 'Quintals',
      qualityGrade: 'A',
      maxPricePerUnit: 2500,
      deliveryLocation: 'Delhi, India',
      requiredBy: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      description: 'High quality wheat needed for flour production',
      status: 'released',
      type: 'procurement_request',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create a test farmer listing
    const farmerListing = {
      id: uuidv4(),
      farmerId: 'farmer-test-id', // We'll need to get the actual farmer ID
      cropType: 'Rice',
      variety: 'Basmati',
      quantity: 50,
      quantityUnit: 'Quintals',
      qualityGrade: 'A',
      minimumPrice: 3000,
      pickupLocation: 'Punjab, India',
      harvestDate: new Date().toISOString(),
      description: 'Premium basmati rice, freshly harvested',
      status: 'released',
      type: 'farmer_listing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Get existing users to use their IDs
    const users = await dynamoDBService.scan('users');
    const buyer = users.find(u => u.email === 'buyer@gmail.com');
    const farmer = users.find(u => u.email === 'test@example.com');

    if (buyer) {
      procurementRequest.buyerId = buyer.id;
      await dynamoDBService.put('procurementRequests', procurementRequest);
      console.log('✅ Created procurement request for buyer');
    }

    if (farmer) {
      farmerListing.farmerId = farmer.id;
      await dynamoDBService.put('procurementRequests', farmerListing);
      console.log('✅ Created farmer listing');
    }

    // Create a test quote for the procurement request
    if (buyer && farmer) {
      const quote = {
        id: uuidv4(),
        requestId: procurementRequest.id,
        farmerId: farmer.id,
        farmerName: farmer.name,
        pricePerUnit: 2400,
        quantity: 100,
        quantityUnit: 'Quintals',
        message: 'I can provide high quality wheat at competitive price',
        status: 'pending',
        negotiationHistory: [],
        type: 'quote',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put('procurementRequests', quote);
      console.log('✅ Created test quote');
    }

    console.log('🎉 Test data seeded successfully!');
    console.log('📋 Created:');
    console.log('   - 1 Procurement Request (Wheat)');
    console.log('   - 1 Farmer Listing (Rice)');
    console.log('   - 1 Quote for procurement request');
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedTestData().then(() => process.exit(0));
}

export { seedTestData };