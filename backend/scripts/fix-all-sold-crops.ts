import { DynamoDBService } from '../src/services/aws/dynamodb.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const dynamoDBService = new DynamoDBService();

async function fixAllSoldCrops() {
  try {
    const cropsTable = process.env.DYNAMODB_CROPS_TABLE;
    const ordersTable = process.env.DYNAMODB_ORDERS_TABLE;

    console.log('🔍 Finding all finalized sales and updating crop statuses...\n');

    // Get all orders
    const allOrders = await dynamoDBService.scan(ordersTable!);
    
    // Get all accepted/finalized offers
    const acceptedOffers = allOrders.filter((item: any) => 
      item.type === 'offer' && item.status === 'accepted'
    );

    console.log(`✅ Found ${acceptedOffers.length} finalized sale(s)\n`);

    if (acceptedOffers.length === 0) {
      console.log('No finalized sales found. Nothing to update.');
      return;
    }

    // Get all crops
    const allCrops = await dynamoDBService.scan(cropsTable!);
    console.log(`📊 Total crops in database: ${allCrops.length}\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const offer of acceptedOffers) {
      console.log(`\n💰 Processing sale: ${offer.cropType}`);
      console.log(`   Offer ID: ${offer.id.substring(0, 8)}...`);
      console.log(`   Listing ID: ${offer.listingId.substring(0, 8)}...`);

      // Try to find the crop by matching crop type and farmer
      const matchingCrops = allCrops.filter((crop: any) => {
        const cropName = (crop.name || crop.cropType || '').toLowerCase();
        const offerCropName = (offer.cropType || '').toLowerCase();
        return cropName === offerCropName && crop.userId === offer.farmerId;
      });

      if (matchingCrops.length === 0) {
        console.log(`   ⚠️ No matching crop found for ${offer.cropType}`);
        notFoundCount++;
        continue;
      }

      // Find crops that are not already marked as sold
      const cropsToUpdate = matchingCrops.filter((crop: any) => crop.status !== 'sold');

      if (cropsToUpdate.length === 0) {
        console.log(`   ✅ Crop already marked as sold`);
        skippedCount++;
        continue;
      }

      // Update the first matching crop (or all if multiple)
      for (const crop of cropsToUpdate) {
        console.log(`   🔄 Updating crop: ${crop.name || crop.cropType} (ID: ${crop.id.substring(0, 8)}...)`);
        console.log(`      Old status: ${crop.status}`);
        
        await dynamoDBService.put(cropsTable!, {
          ...crop,
          status: 'sold',
          soldDate: offer.updatedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        console.log(`      New status: sold ✅`);
        updatedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Updated: ${updatedCount} crop(s)`);
    console.log(`⏭️  Skipped (already sold): ${skippedCount} crop(s)`);
    console.log(`⚠️  Not found: ${notFoundCount} crop(s)`);
    console.log('\n📊 All sold crops should now be properly marked!');

  } catch (error) {
    console.error('Error:', error);
  }
}

fixAllSoldCrops();
