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

async function checkAcceptedOffer() {
  try {
    const tableName = process.env.DYNAMODB_ORDERS_TABLE;
    const offerId = '7ea83f5e-4cf6-4cd3-b201-bc31a185eb9a'; // Accepted offer

    console.log(`\n🔍 Checking accepted offer: ${offerId}\n`);

    const command = new ScanCommand({
      TableName: tableName,
    });

    const response = await client.send(command);
    const items = response.Items?.map(item => unmarshall(item)) || [];

    const offer = items.find((item: any) => item.id === offerId);

    if (offer) {
      console.log('✅ Accepted Offer Details:\n');
      console.log(JSON.stringify(offer, null, 2));
    } else {
      console.log('❌ Offer not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAcceptedOffer();
