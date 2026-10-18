import { DynamoDBClient, GetItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
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

async function findListing() {
  try {
    const tableName = process.env.DYNAMODB_ORDERS_TABLE;
    const listingId = 'a189e87e-39af-4915-8f13-3c6075bd1318'; // The listing with accepted offer

    console.log(`\n🔍 Looking for listing: ${listingId}\n`);

    // Scan the entire table
    const command = new ScanCommand({
      TableName: tableName,
    });

    const response = await client.send(command);
    const items = response.Items?.map(item => unmarshall(item)) || [];

    const listing = items.find((item: any) => item.id === listingId);

    if (listing) {
      console.log('✅ Found listing:\n');
      console.log(JSON.stringify(listing, null, 2));
    } else {
      console.log('❌ Listing not found in database');
      console.log('\n📋 All items with this ID in any field:\n');
      
      const relatedItems = items.filter((item: any) => 
        item.listingId === listingId || item.id === listingId
      );

      relatedItems.forEach((item: any) => {
        console.log('---');
        console.log(JSON.stringify(item, null, 2));
        console.log('---\n');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findListing();
