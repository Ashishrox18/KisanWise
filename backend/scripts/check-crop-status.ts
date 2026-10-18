import { DynamoDBService } from '../src/services/aws/dynamodb.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const dynamoDBService = new DynamoDBService();

async function checkCropStatus() {
  try {
    const cropsTable = process.env.DYNAMODB_CROPS_TABLE;
    const ordersTable = process.env.DYNAMODB_ORDERS_TABLE;

    console.log('📊 Checking crop statuses...\n');

    // Get all crops
    const allCrops = await dynamoDBService.scan(cropsTable!);
    console.log(`Total crops: ${allCrops.length}\n`);

    // Get all accepted offers
    const allOrders = await dynamoDBService.scan(ordersTable!);
    const acceptedOffers = allOrders.filter((item: any) => 
      item.type === 'offer' && item.status === 'accepted'
    );

    console.log(`Accepted offers: ${acceptedOffers.length}\n`);

    // Check crops with status 'listed'
    const listedCrops = allCrops.filter((crop: any) => crop.status === 'listed');
    console.log(`Crops with status 'listed': ${listedCrops.length}`);
    listedCrops.forEach((crop: any) => {
      console.log(`  - ${crop.name || crop.cropType} (ID: ${crop.id})`);
    });

    // Check crops with status 'sold'
    const soldCrops = allCrops.filter((crop: any) => crop.status === 'sold');
    console.log(`\nCrops with status 'sold': ${soldCrops.length}`);
    soldCrops.forEach((crop: any) => {
      console.log(`  - ${crop.name || crop.cropType} (ID: ${crop.id}, Sold: ${crop.soldDate})`);
    });

    // Check if any accepted offers have cropId
    console.log('\n📋 Accepted offers with cropId:');
    acceptedOffers.forEach((offer: any) => {
      if (offer.cropId) {
        console.log(`  - Offer ${offer.id}: cropId=${offer.cropId}, listingId=${offer.listingId}`);
      }
    });

    // Check listings to see if they have cropId
    const listings = allOrders.filter((item: any) => item.type === 'farmer_listing');
    console.log(`\n📦 Total farmer listings: ${listings.length}`);
    const listingsWithCropId = listings.filter((listing: any) => listing.cropId);
    console.log(`Listings with cropId: ${listingsWithCropId.length}`);
    listingsWithCropId.forEach((listing: any) => {
      console.log(`  - Listing ${listing.id}: cropId=${listing.cropId}, status=${listing.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkCropStatus();
