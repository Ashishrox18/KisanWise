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

async function checkLatestListings() {
  try {
    const tableName = process.env.DYNAMODB_ORDERS_TABLE;
    console.log(`\n🔍 Checking latest farmer listings in table: ${tableName}\n`);

    const command = new ScanCommand({
      TableName: tableName,
    });

    const response = await client.send(command);
    const items = response.Items?.map(item => unmarshall(item)) || [];

    // Filter for farmer listings
    const farmerListings = items.filter((item: any) => 
      item.type === 'farmer_listing'
    );

    // Sort by creation date (newest first)
    farmerListings.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log(`📊 Total farmer listings: ${farmerListings.length}\n`);

    if (farmerListings.length > 0) {
      console.log('📋 Latest Farmer Listings:\n');
      farmerListings.slice(0, 5).forEach((listing: any, index: number) => {
        console.log(`${index + 1}. Crop: ${listing.cropType}`);
        console.log(`   ID: ${listing.id}`);
        console.log(`   Farmer ID: ${listing.farmerId}`);
        console.log(`   Status: ${listing.status}`);
        console.log(`   Quantity: ${listing.quantity} ${listing.quantityUnit}`);
        console.log(`   Price: ₹${listing.minimumPrice}/${listing.quantityUnit}`);
        console.log(`   Created: ${listing.createdAt}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkLatestListings();
