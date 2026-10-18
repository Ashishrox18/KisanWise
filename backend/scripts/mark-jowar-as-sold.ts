import { DynamoDBService } from '../src/services/aws/dynamodb.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const dynamoDBService = new DynamoDBService();

async function markJowarAsSold() {
  try {
    const cropsTable = process.env.DYNAMODB_CROPS_TABLE;
    const ordersTable = process.env.DYNAMODB_ORDERS_TABLE;

    console.log('🔍 Finding Jowar crop and its sale...\n');

    // Get all crops
    const allCrops = await dynamoDBService.scan(cropsTable!);
    
    // Find Jowar crop
    const jowarCrop = allCrops.find((crop: any) => 
      (crop.name && crop.name.toLowerCase().includes('jowar')) ||
      (crop.cropType && crop.cropType.toLowerCase().includes('jowar'))
    );

    if (!jowarCrop) {
      console.log('❌ Jowar crop not found in database');
      return;
    }

    console.log('✅ Found Jowar crop:');
    console.log(`   ID: ${jowarCrop.id}`);
    console.log(`   Name: ${jowarCrop.name || jowarCrop.cropType}`);
    console.log(`   Current Status: ${jowarCrop.status}`);
    console.log(`   Area: ${jowarCrop.area} acres`);

    // Check if there's a finalized sale for Jowar
    const allOrders = await dynamoDBService.scan(ordersTable!);
    const jowarSale = allOrders.find((item: any) => 
      item.type === 'offer' && 
      item.status === 'accepted' &&
      item.cropType && 
      item.cropType.toLowerCase().includes('jowar')
    );

    if (jowarSale) {
      console.log('\n💰 Found finalized Jowar sale:');
      console.log(`   Buyer: ${jowarSale.buyerName}`);
      console.log(`   Price: ₹${jowarSale.pricePerUnit}/${jowarSale.quantityUnit}`);
      console.log(`   Quantity: ${jowarSale.quantity} ${jowarSale.quantityUnit}`);
      console.log(`   Total: ₹${jowarSale.totalAmount || (jowarSale.pricePerUnit * jowarSale.quantity)}`);
    }

    if (jowarCrop.status === 'sold') {
      console.log('\n✅ Jowar crop is already marked as sold. No action needed.');
      return;
    }

    // Update the crop status to 'sold'
    console.log('\n🔄 Updating Jowar crop status to "sold"...');
    
    await dynamoDBService.put(cropsTable!, {
      ...jowarCrop,
      status: 'sold',
      soldDate: jowarSale ? jowarSale.updatedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Jowar crop status updated to "sold"');
    console.log('\n📊 Summary:');
    console.log(`   - Crop will no longer appear in "Planted Crops" tab`);
    console.log(`   - Crop will no longer appear in "Harvest Ready" tab`);
    console.log(`   - Crop will no longer appear in "Listed Produce" tab`);
    console.log(`   - Revenue from this sale will be included in the "Revenue" statistic`);

  } catch (error) {
    console.error('Error:', error);
  }
}

markJowarAsSold();
