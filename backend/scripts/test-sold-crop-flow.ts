import { DynamoDBService } from '../src/services/aws/dynamodb.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const dynamoDBService = new DynamoDBService();

async function testSoldCropFlow() {
  try {
    const cropsTable = process.env.DYNAMODB_CROPS_TABLE;
    const ordersTable = process.env.DYNAMODB_ORDERS_TABLE;

    console.log('🧪 Testing Sold Crop Flow\n');
    console.log('=' .repeat(60));

    // Get all crops
    const allCrops = await dynamoDBService.scan(cropsTable!);
    console.log(`\n📊 Total crops in database: ${allCrops.length}`);

    // Get all orders
    const allOrders = await dynamoDBService.scan(ordersTable!);
    
    // Get farmer listings
    const listings = allOrders.filter((item: any) => item.type === 'farmer_listing');
    console.log(`📦 Total farmer listings: ${listings.length}`);
    
    // Get accepted/finalized offers
    const acceptedOffers = allOrders.filter((item: any) => 
      item.type === 'offer' && item.status === 'accepted'
    );
    console.log(`✅ Accepted/finalized offers: ${acceptedOffers.length}`);

    console.log('\n' + '='.repeat(60));
    console.log('CROP STATUS BREAKDOWN');
    console.log('='.repeat(60));

    // Group crops by status
    const cropsByStatus: any = {};
    allCrops.forEach((crop: any) => {
      const status = crop.status || 'unknown';
      if (!cropsByStatus[status]) {
        cropsByStatus[status] = [];
      }
      cropsByStatus[status].push(crop);
    });

    Object.keys(cropsByStatus).sort().forEach(status => {
      const crops = cropsByStatus[status];
      console.log(`\n${status.toUpperCase()}: ${crops.length} crop(s)`);
      crops.forEach((crop: any) => {
        console.log(`  - ${crop.name || crop.cropType} (ID: ${crop.id.substring(0, 8)}...)`);
        if (crop.soldDate) {
          console.log(`    Sold on: ${new Date(crop.soldDate).toLocaleString()}`);
        }
      });
    });

    console.log('\n' + '='.repeat(60));
    console.log('LISTINGS WITH CROP IDs');
    console.log('='.repeat(60));

    const listingsWithCropId = listings.filter((l: any) => l.cropId);
    console.log(`\nListings with cropId: ${listingsWithCropId.length}/${listings.length}`);
    
    listingsWithCropId.forEach((listing: any) => {
      console.log(`\n📦 Listing: ${listing.cropType}`);
      console.log(`   ID: ${listing.id.substring(0, 8)}...`);
      console.log(`   Crop ID: ${listing.cropId.substring(0, 8)}...`);
      console.log(`   Status: ${listing.status}`);
      console.log(`   Price: ₹${listing.minimumPrice}/${listing.quantityUnit}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('FINALIZED SALES');
    console.log('='.repeat(60));

    if (acceptedOffers.length > 0) {
      console.log('\n✅ Finalized sales:');
      acceptedOffers.forEach((offer: any) => {
        console.log(`\n💰 Sale: ${offer.cropType}`);
        console.log(`   Offer ID: ${offer.id.substring(0, 8)}...`);
        console.log(`   Listing ID: ${offer.listingId.substring(0, 8)}...`);
        console.log(`   Crop ID: ${offer.cropId ? offer.cropId.substring(0, 8) + '...' : 'N/A'}`);
        console.log(`   Buyer: ${offer.buyerName}`);
        console.log(`   Price: ₹${offer.pricePerUnit}/${offer.quantityUnit}`);
        console.log(`   Quantity: ${offer.quantity} ${offer.quantityUnit}`);
        console.log(`   Total: ₹${offer.totalAmount || (offer.pricePerUnit * offer.quantity)}`);
        
        // Check if corresponding crop is marked as sold
        if (offer.cropId) {
          const crop = allCrops.find((c: any) => c.id === offer.cropId);
          if (crop) {
            console.log(`   Crop Status: ${crop.status} ${crop.status === 'sold' ? '✅' : '❌'}`);
          } else {
            console.log(`   Crop Status: Not found ❌`);
          }
        }
      });

      // Calculate total revenue
      const totalRevenue = acceptedOffers.reduce((sum: number, offer: any) => {
        return sum + (offer.totalAmount || (offer.pricePerUnit * offer.quantity));
      }, 0);
      
      console.log(`\n💵 Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`);
    } else {
      console.log('\nNo finalized sales yet.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION');
    console.log('='.repeat(60));

    let allGood = true;

    // Check 1: All accepted offers should have cropId
    const offersWithoutCropId = acceptedOffers.filter((o: any) => !o.cropId);
    if (offersWithoutCropId.length > 0) {
      console.log(`\n❌ ${offersWithoutCropId.length} accepted offer(s) missing cropId`);
      allGood = false;
    } else if (acceptedOffers.length > 0) {
      console.log(`\n✅ All accepted offers have cropId`);
    }

    // Check 2: All crops referenced in accepted offers should be marked as sold
    const soldCropIds = new Set(acceptedOffers.map((o: any) => o.cropId).filter(Boolean));
    const cropsNotMarkedSold = Array.from(soldCropIds).filter(cropId => {
      const crop = allCrops.find((c: any) => c.id === cropId);
      return crop && crop.status !== 'sold';
    });

    if (cropsNotMarkedSold.length > 0) {
      console.log(`\n❌ ${cropsNotMarkedSold.length} sold crop(s) not marked as 'sold'`);
      cropsNotMarkedSold.forEach(cropId => {
        const crop = allCrops.find((c: any) => c.id === cropId);
        console.log(`   - ${crop.name || crop.cropType} (Status: ${crop.status})`);
      });
      allGood = false;
    } else if (soldCropIds.size > 0) {
      console.log(`✅ All sold crops are marked as 'sold'`);
    }

    // Check 3: Crops with status 'sold' should not appear in 'listed' status
    const soldCrops = allCrops.filter((c: any) => c.status === 'sold');
    const listedCrops = allCrops.filter((c: any) => c.status === 'listed');
    
    console.log(`\n📊 Crops with status 'sold': ${soldCrops.length}`);
    console.log(`📊 Crops with status 'listed': ${listedCrops.length}`);

    if (allGood) {
      console.log(`\n✅ All checks passed! The sold crop flow is working correctly.`);
    } else {
      console.log(`\n⚠️ Some issues found. Please review the output above.`);
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('Error:', error);
  }
}

testSoldCropFlow();
