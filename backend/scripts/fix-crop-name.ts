import { DynamoDBClient, ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function fixCropName() {
  try {
    const tableName = process.env.DYNAMODB_ORDERS_TABLE;
    console.log(`\n🔧 Fixing crop name in table: ${tableName}\n`);

    // Get the Mustard listing
    const scanCommand = new ScanCommand({
      TableName: tableName,
    });

    const response = await client.send(scanCommand);
    const items = response.Items?.map(item => unmarshall(item)) || [];

    const mustardListing = items.find((item: any) => 
      item.id === '2ecbcffc-a16a-464f-973d-cba2c4478ae3'
    );

    if (!mustardListing) {
      console.log('❌ Mustard listing not found');
      return;
    }

    console.log('📋 Found listing:');
    console.log(`   Current crop: ${mustardListing.cropType}`);
    console.log(`   ID: ${mustardListing.id}`);

    // Update to Moong
    const updatedListing = {
      ...mustardListing,
      cropType: 'Moong',
      updatedAt: new Date().toISOString()
    };

    const putCommand = new PutItemCommand({
      TableName: tableName,
      Item: marshall(updatedListing)
    });

    await client.send(putCommand);

    console.log('\n✅ Successfully updated crop name to Moong');
    console.log(`   New crop: ${updatedListing.cropType}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixCropName();
