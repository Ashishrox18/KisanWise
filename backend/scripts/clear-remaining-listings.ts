// Script to clear remaining farmer listings (including no-type items)
import { dynamoDBService } from '../src/services/aws/dynamodb.service';
import * as dotenv from 'dotenv';

dotenv.config();

const TABLE_NAME = process.env.DYNAMODB_ORDERS_TABLE || 'krishi-orders';

async function clearRemainingListings() {
  console.log('🗑️  Clearing remaining farmer listings...\n');
  console.log(`📋 Table: ${TABLE_NAME}\n`);

  try {
    const allItems = await dynamoDBService.scan(TABLE_NAME);
    console.log(`Total items in table: ${allItems.length}\n`);

    // Find farmer listings - including those without type field
    const farmerListings = allItems.filter((item: any) => {
      // Has explicit farmer listing type
      if (item.type === 'listing' || item.type === 'farmer_listing' || item.type === 'FARMER_LISTING') {
        return item.farmerId;
      }
      
      // No type but has farmer listing characteristics
      if (!item.type) {
        const hasFarmerId = !!item.farmerId;
        const hasMinimumPrice = !!item.minimumPrice;
        const hasPickupLocation = !!item.pickupLocation;
        const hasCropType = !!item.cropType;
        const hasExpectedPrice = !!item.expectedPrice;
        
        // It's a farmer listing if it has farmerId AND (minimumPrice OR pickupLocation OR expectedPrice)
        // AND has cropType
        if (hasFarmerId && hasCropType && (hasMinimumPrice || hasPickupLocation || hasExpectedPrice)) {
          return true;
        }
      }
      
      return false;
    });

    console.log(`Found ${farmerListings.length} farmer listings to delete\n`);

    if (farmerListings.length === 0) {
      console.log('✅ No farmer listings found.\n');
      return;
    }

    // Display listings
    console.log('📋 Listings to be deleted:');
    console.log('─'.repeat(80));
    farmerListings.forEach((listing: any, index: number) => {
      console.log(`${index + 1}. ${listing.cropType || 'Unknown'} - ${listing.quantity || 0} ${listing.quantityUnit || 'units'}`);
      console.log(`   ID: ${listing.id}`);
      console.log(`   Farmer: ${listing.farmerId?.substring(0, 20)}...`);
      console.log(`   Type: ${listing.type || 'NO-TYPE'}`);
      console.log(`   Status: ${listing.status || 'unknown'}`);
      if (listing.minimumPrice) console.log(`   Min Price: ₹${listing.minimumPrice}/${listing.quantityUnit || 'unit'}`);
      if (listing.expectedPrice) console.log(`   Expected Price: ₹${listing.expectedPrice}/${listing.quantityUnit || 'unit'}`);
      if (listing.pickupLocation) console.log(`   Pickup: ${listing.pickupLocation}`);
      console.log(`   Created: ${listing.createdAt || 'unknown'}`);
      console.log('');
    });
    console.log('─'.repeat(80));
    console.log('');

    // Delete
    console.log('Deleting listings...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const listing of farmerListings) {
      try {
        await dynamoDBService.delete(TABLE_NAME, { id: listing.id });
        console.log(`   ✅ Deleted: ${listing.cropType || 'Unknown'} (${listing.id.substring(0, 8)}...)`);
        successCount++;
      } catch (error: any) {
        console.error(`   ❌ Failed: ${listing.id}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total found: ${farmerListings.length}`);
    console.log(`Successfully deleted: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log('═'.repeat(80));
    console.log('');

    if (successCount > 0) {
      console.log('✅ Remaining farmer listings cleared!\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║      CLEAR REMAINING FARMER LISTINGS (INCLUDING NO-TYPE)     ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');

clearRemainingListings()
  .then(() => {
    console.log('🎉 Script completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
