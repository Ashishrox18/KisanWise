// Script to clear all farmer sell listings from DynamoDB
const AWS = require('aws-sdk');
require('dotenv').config({ path: './backend/.env' });

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB_ORDERS_TABLE || 'krishi-orders';

async function clearFarmerListings() {
  console.log('🗑️  Starting to clear farmer sell listings...\n');
  console.log(`📋 Table: ${TABLE_NAME}\n`);

  try {
    // Step 1: Scan for all items
    console.log('1️⃣  Scanning for all items in table...');
    const scanParams = {
      TableName: TABLE_NAME
    };

    const scanResult = await dynamoDB.scan(scanParams).promise();
    const allItems = scanResult.Items || [];
    console.log(`   Found ${allItems.length} total items\n`);

    // Step 2: Filter for farmer listings (type: 'listing')
    const farmerListings = allItems.filter(item => 
      item.type === 'listing' && item.farmerId
    );
    
    console.log(`2️⃣  Identified ${farmerListings.length} farmer sell listings\n`);

    if (farmerListings.length === 0) {
      console.log('✅ No farmer listings found. Nothing to delete.\n');
      return;
    }

    // Step 3: Display listings to be deleted
    console.log('📋 Listings to be deleted:');
    console.log('─'.repeat(80));
    farmerListings.forEach((listing, index) => {
      console.log(`${index + 1}. ${listing.cropType || 'Unknown'} - ${listing.quantity || 0} ${listing.quantityUnit || 'units'}`);
      console.log(`   ID: ${listing.id}`);
      console.log(`   Status: ${listing.status || 'unknown'}`);
      console.log(`   Created: ${listing.createdAt || 'unknown'}`);
      console.log('');
    });
    console.log('─'.repeat(80));
    console.log('');

    // Step 4: Delete each listing
    console.log('3️⃣  Deleting farmer listings...\n');
    
    let successCount = 0;
    let errorCount = 0;

    for (const listing of farmerListings) {
      try {
        const deleteParams = {
          TableName: TABLE_NAME,
          Key: {
            id: listing.id
          }
        };

        await dynamoDB.delete(deleteParams).promise();
        console.log(`   ✅ Deleted: ${listing.cropType || 'Unknown'} (${listing.id})`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Failed to delete ${listing.id}:`, error.message);
        errorCount++;
      }
    }

    // Step 5: Summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total farmer listings found: ${farmerListings.length}`);
    console.log(`Successfully deleted: ${successCount}`);
    console.log(`Failed to delete: ${errorCount}`);
    console.log('═'.repeat(80));
    console.log('');

    if (successCount > 0) {
      console.log('✅ Farmer sell listings have been cleared!\n');
    }

    // Step 6: Verify deletion
    console.log('4️⃣  Verifying deletion...');
    const verifyResult = await dynamoDB.scan(scanParams).promise();
    const remainingListings = (verifyResult.Items || []).filter(item => 
      item.type === 'listing' && item.farmerId
    );
    
    if (remainingListings.length === 0) {
      console.log('   ✅ Verification successful: No farmer listings remain\n');
    } else {
      console.log(`   ⚠️  Warning: ${remainingListings.length} farmer listings still exist\n`);
    }

  } catch (error) {
    console.error('❌ Error clearing farmer listings:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the script
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║         CLEAR FARMER SELL LISTINGS FROM DATABASE             ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');

clearFarmerListings()
  .then(() => {
    console.log('🎉 Script completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
