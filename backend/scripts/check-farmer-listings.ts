import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function checkFarmerListings() {
  try {
    const tableName = process.env.DYNAMODB_ORDERS_TABLE;
    console.log(`\n🔍 Checking farmer listings in table: ${tableName}\n`);

    const command = new ScanCommand({
      TableName: tableName,
    });

    const response = await client.send(command);
    const items = response.Items?.map(item => unmarshall(item)) || [];

    console.log(`📊 Total items in orders table: ${items.length}\n`);

    // Filter for farmer listings
    const farmerListings = items.filter((item: any) => 
      item.farmerId && item.type === 'farmer_listing'
    );

    console.log(`🌾 Farmer listings (type='farmer_listing'): ${farmerListings.length}\n`);

    if (farmerListings.length > 0) {
      console.log('📋 Farmer Listings Details:\n');
      farmerListings.forEach((listing: any, index: number) => {
        console.log(`${index + 1}. ID: ${listing.id}`);
        console.log(`   Crop: ${listing.cropType}`);
        console.log(`   Status: ${listing.status}`);
        console.log(`   Farmer ID: ${listing.farmerId}`);
        console.log(`   Created: ${listing.createdAt}`);
        console.log(`   Type: ${listing.type}`);
        console.log('');
      });
    }

    // Check for offers
    const offers = items.filter((item: any) => 
      item.type === 'offer' || (item.buyerId && item.listingId)
    );

    console.log(`💼 Offers: ${offers.length}\n`);

    if (offers.length > 0) {
      console.log('📋 Offers Details:\n');
      offers.forEach((offer: any, index: number) => {
        console.log(`${index + 1}. ID: ${offer.id}`);
        console.log(`   Listing ID: ${offer.listingId}`);
        console.log(`   Buyer ID: ${offer.buyerId}`);
        console.log(`   Status: ${offer.status}`);
        console.log(`   Price: ₹${offer.pricePerUnit}/${offer.quantityUnit}`);
        console.log(`   Type: ${offer.type || 'N/A'}`);
        console.log('');
      });
    }

    // Check for items without type field
    const noTypeItems = items.filter((item: any) => !item.type);
    console.log(`❓ Items without type field: ${noTypeItems.length}\n`);

    if (noTypeItems.length > 0) {
      console.log('📋 Items without type:\n');
      noTypeItems.forEach((item: any, index: number) => {
        console.log(`${index + 1}. ID: ${item.id}`);
        console.log(`   Has farmerId: ${!!item.farmerId}`);
        console.log(`   Has buyerId: ${!!item.buyerId}`);
        console.log(`   Has listingId: ${!!item.listingId}`);
        console.log(`   Status: ${item.status}`);
        console.log(`   CropType: ${item.cropType || 'N/A'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkFarmerListings();
