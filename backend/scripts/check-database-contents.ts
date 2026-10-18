// Script to check what's in the database
import { dynamoDBService } from '../src/services/aws/dynamodb.service';
import * as dotenv from 'dotenv';

dotenv.config();

const TABLE_NAME = process.env.DYNAMODB_ORDERS_TABLE || 'krishi-orders';

async function checkDatabaseContents() {
  console.log('🔍 Checking database contents...\n');
  console.log(`📋 Table: ${TABLE_NAME}\n`);

  try {
    const allItems = await dynamoDBService.scan(TABLE_NAME);
    console.log(`Total items: ${allItems.length}\n`);

    // Group by type
    const typeGroups: any = {};
    allItems.forEach((item: any) => {
      const type = item.type || 'no-type';
      if (!typeGroups[type]) {
        typeGroups[type] = [];
      }
      typeGroups[type].push(item);
    });

    console.log('Items grouped by type:');
    console.log('═'.repeat(80));
    
    Object.keys(typeGroups).forEach(type => {
      console.log(`\n${type.toUpperCase()} (${typeGroups[type].length} items):`);
      console.log('─'.repeat(80));
      
      typeGroups[type].slice(0, 3).forEach((item: any, index: number) => {
        console.log(`${index + 1}. ID: ${item.id?.substring(0, 20)}...`);
        
        // Show relevant fields based on type
        if (item.cropType) console.log(`   Crop: ${item.cropType}`);
        if (item.farmerId) console.log(`   Farmer ID: ${item.farmerId?.substring(0, 20)}...`);
        if (item.buyerId) console.log(`   Buyer ID: ${item.buyerId?.substring(0, 20)}...`);
        if (item.status) console.log(`   Status: ${item.status}`);
        if (item.quantity) console.log(`   Quantity: ${item.quantity} ${item.quantityUnit || ''}`);
        if (item.minimumPrice) console.log(`   Price: ₹${item.minimumPrice}/${item.quantityUnit || 'unit'}`);
        if (item.createdAt) console.log(`   Created: ${item.createdAt}`);
        console.log('');
      });
      
      if (typeGroups[type].length > 3) {
        console.log(`   ... and ${typeGroups[type].length - 3} more\n`);
      }
    });

    console.log('═'.repeat(80));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabaseContents();
