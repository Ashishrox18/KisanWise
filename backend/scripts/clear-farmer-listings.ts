// Script to clear all farmer sell listings from DynamoDB
import { dynamoDBService } from '../src/services/aws/dynamodb.service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const TABLE_NAME = process.env.DYNAMODB_ORDERS_TABLE || 'krishi-orders';

async function clearFarmerListings() {
  console.log('🗑️  Starting to clear farmer sell listings...\n');
  console.log(`📋 Table: ${TABLE_NAME}\n`);

  try {
    // Step 1: Scan for all items
    console.log('1️⃣  Scanning for all items in table...');
    const allItems = await dynamoDBService.scan(TABLE_NAME);
    console.log(`   Found ${allItems.length} total items\n`);

    // Step 2: Filter for farmer listings (type: 'farmer_listing' or 'FARMER_LISTING')
    const farmerListings = allItems.filter((item: any) => 
      (item.type === 'listing' || item.type === 'farmer_listing' || item.type === 'FARMER_LISTING') && item.farmerId
    );
    
    console.log(`2️⃣  Identified ${farmerListings.length} farmer sell listings\n`);

    if (farmerListings.length === 0) {
      console.log('✅ No farmer listings found. Nothing to delete.\n');
      return;
    }

    // Step 3: Display listings to be deleted
    console.log('📋 Listings to be deleted:');
    console.log('─'.repeat(80));
    farmerListings.forEach((listing: any, index: number) => {
      console.log(`${index + 1}. ${listing.cropType || 'Unknown'} - ${listing.quantity || 0} ${listing.quantityUnit || 'units'}`);
      console.log(`   ID: ${listing.id}`);
      console.log(`   Farmer: ${listing.farmerId}`);
      console.log(`   Status: ${listing.status || 'unknown'}`);
      console.log(`   Price: ₹${listing.minimumPrice || 0}/${listing.quantityUnit || 'unit'}`);
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
        await dynamoDBService.delete(TABLE_NAME, { id: listing.id });
        console.log(`   ✅ Deleted: ${listing.cropType || 'Unknown'} (${listing.id.substring(0, 8)}...)`);
        successCount++;
      } catch (error: any) {
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
    const verifyItems = await dynamoDBService.scan(TABLE_NAME);
    const remainingListings = verifyItems.filter((item: any) => 
      (item.type === 'listing' || item.type === 'farmer_listing' || item.type === 'FARMER_LISTING') && item.farmerId
    );
    
    if (remainingListings.length === 0) {
      console.log('   ✅ Verification successful: No farmer listings remain\n');
    } else {
      console.log(`   ⚠️  Warning: ${remainingListings.length} farmer listings still exist\n`);
    }

  } catch (error: any) {
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
