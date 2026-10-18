// Script to check no-type items in detail
import { dynamoDBService } from '../src/services/aws/dynamodb.service';
import * as dotenv from 'dotenv';

dotenv.config();

const TABLE_NAME = process.env.DYNAMODB_ORDERS_TABLE || 'krishi-orders';

async function checkNoTypeItems() {
  console.log('🔍 Checking NO-TYPE items in detail...\n');

  try {
    const allItems = await dynamoDBService.scan(TABLE_NAME);
    const noTypeItems = allItems.filter((item: any) => !item.type);

    console.log(`Found ${noTypeItems.length} items without type field:\n`);
    console.log('═'.repeat(100));

    noTypeItems.forEach((item: any, index: number) => {
      console.log(`\n${index + 1}. ID: ${item.id}`);
      console.log('   All fields:');
      Object.keys(item).forEach(key => {
        if (key !== 'id') {
          let value = item[key];
          if (typeof value === 'object') {
            value = JSON.stringify(value).substring(0, 50) + '...';
          }
          console.log(`   - ${key}: ${value}`);
        }
      });
      console.log('   ---');
      
      // Determine if this looks like a farmer listing
      const hasCropType = !!item.cropType;
      const hasFarmerId = !!item.farmerId;
      const hasMinimumPrice = !!item.minimumPrice;
      const hasPickupLocation = !!item.pickupLocation;
      
      if (hasCropType || (hasFarmerId && hasMinimumPrice) || hasPickupLocation) {
        console.log('   ⚠️  LOOKS LIKE A FARMER LISTING!');
      }
    });

    console.log('\n' + '═'.repeat(100));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkNoTypeItems();
