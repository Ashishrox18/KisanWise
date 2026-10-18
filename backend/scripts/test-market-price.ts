import { marketPriceService } from '../src/services/market-price.service';

async function testMarketPrice() {
  console.log('🧪 Testing Market Price Service\n');

  try {
    // Test 1: Get price for Wheat
    console.log('Test 1: Fetching price for Wheat...');
    const wheatPrice = await marketPriceService.getAveragePrice('Wheat');
    console.log('✅ Wheat price:', wheatPrice);
    console.log('');

    // Test 2: Get price for Rice
    console.log('Test 2: Fetching price for Rice...');
    const ricePrice = await marketPriceService.getAveragePrice('Rice');
    console.log('✅ Rice price:', ricePrice);
    console.log('');

    // Test 3: Get price for Jowar
    console.log('Test 3: Fetching price for Jowar...');
    const jowarPrice = await marketPriceService.getAveragePrice('Jowar');
    console.log('✅ Jowar price:', jowarPrice);
    console.log('');

    // Test 4: Get market prices for Wheat
    console.log('Test 4: Fetching market prices for Wheat...');
    const wheatMarkets = await marketPriceService.getMarketPrices('Wheat');
    console.log(`✅ Found ${wheatMarkets.length} market prices for Wheat`);
    if (wheatMarkets.length > 0) {
      console.log('Sample:', wheatMarkets[0]);
    }
    console.log('');

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMarketPrice();
