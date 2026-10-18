import 'dotenv/config';
import { bedrockService } from '../src/services/aws/bedrock.service';

async function testBedrock() {
  console.log('🧪 Testing AWS Bedrock Connection\n');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Test if Bedrock is enabled
    console.log('📋 Step 1: Checking Bedrock Configuration...');
    const isEnabled = bedrockService.isEnabled();
    console.log(`   ${isEnabled ? '✅' : '❌'} Bedrock Enabled: ${isEnabled}`);
    
    if (!isEnabled) {
      console.log('');
      console.log('❌ Bedrock is not enabled. Please check:');
      console.log('   1. backend/.env has USE_BEDROCK=true');
      console.log('   2. AWS_REGION is set (e.g., us-east-1)');
      console.log('   3. AWS_ACCESS_KEY_ID is set');
      console.log('   4. AWS_SECRET_ACCESS_KEY is set');
      console.log('');
      console.log('💡 Using fallback mode - AI features will work with rule-based recommendations');
      return;
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('');

    // Test 1: Crop Recommendations
    console.log('📋 Test 1: Crop Recommendations');
    console.log('   Testing AI-powered crop suggestions...');
    const startTime1 = Date.now();
    
    const cropRec = await bedrockService.getCropRecommendations({
      landSize: 5,
      soilType: 'Loamy',
      location: 'Punjab',
      waterAvailability: 'High',
      budget: 50000,
      season: 'Kharif'
    });
    
    const duration1 = Date.now() - startTime1;
    console.log(`   ✅ Success! (${duration1}ms)`);
    console.log(`   📊 Received ${cropRec.recommendations?.length || 0} crop recommendations`);
    
    if (cropRec.recommendations && cropRec.recommendations.length > 0) {
      console.log(`   🌾 Top recommendation: ${cropRec.recommendations[0].name} (${cropRec.recommendations[0].suitability}% suitable)`);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('');

    // Test 2: Selling Strategy
    console.log('📋 Test 2: Selling Strategy');
    console.log('   Testing AI-powered market analysis...');
    const startTime2 = Date.now();
    
    const strategy = await bedrockService.getSellingStrategy({
      cropType: 'Wheat',
      expectedYield: 100,
      yieldUnit: 'quintal',
      harvestMonth: 'April',
      currentMarketPrice: 2200,
      storageAvailable: true,
      location: 'Punjab'
    });
    
    const duration2 = Date.now() - startTime2;
    console.log(`   ✅ Success! (${duration2}ms)`);
    
    if (strategy.strategy) {
      console.log(`   💡 Recommendation: ${strategy.strategy.recommendation}`);
      console.log(`   💰 Expected Revenue: ${strategy.strategy.expectedRevenue}`);
      console.log(`   📈 Confidence: ${strategy.strategy.confidence}`);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('');

    // Test 3: Harvest Timing
    console.log('📋 Test 3: Harvest Timing');
    console.log('   Testing AI-powered harvest recommendations...');
    const startTime3 = Date.now();
    
    const harvestRec = await bedrockService.generateHarvestRecommendation({
      cropType: 'Rice',
      plantingDate: '2026-01-01',
      currentConditions: { temperature: 28, humidity: 65 },
      marketPrices: { current: 3500, trend: 'rising' }
    });
    
    const duration3 = Date.now() - startTime3;
    console.log(`   ✅ Success! (${duration3}ms)`);
    
    if (harvestRec.optimalHarvestDate) {
      console.log(`   📅 Optimal Harvest Date: ${harvestRec.optimalHarvestDate}`);
      console.log(`   ⏱️  Days Remaining: ${harvestRec.daysRemaining}`);
      console.log(`   📊 Readiness Score: ${harvestRec.readinessScore}%`);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('');

    // Test 4: Route Optimization
    console.log('📋 Test 4: Route Optimization');
    console.log('   Testing AI-powered logistics planning...');
    const startTime4 = Date.now();
    
    const routeOpt = await bedrockService.optimizeRoute({
      origin: { name: 'Farm', lat: 30.7333, lng: 76.7794 },
      destinations: [
        { name: 'Market A', lat: 30.7500, lng: 76.8000 },
        { name: 'Market B', lat: 30.7200, lng: 76.7500 }
      ],
      vehicleType: 'Truck'
    });
    
    const duration4 = Date.now() - startTime4;
    console.log(`   ✅ Success! (${duration4}ms)`);
    
    if (routeOpt.totalDistance) {
      console.log(`   🚚 Total Distance: ${routeOpt.totalDistance}`);
      console.log(`   ⏱️  Total Time: ${routeOpt.totalTime}`);
      console.log(`   💰 Cost Estimate: ${routeOpt.costEstimate}`);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('');

    // Test 5: Price Analysis
    console.log('📋 Test 5: Price Analysis');
    console.log('   Testing AI-powered market trends...');
    const startTime5 = Date.now();
    
    const priceAnalysis = await bedrockService.analyzePricetrends({
      cropType: 'Cotton',
      region: 'Gujarat',
      timeframe: 'Last 6 months'
    });
    
    const duration5 = Date.now() - startTime5;
    console.log(`   ✅ Success! (${duration5}ms)`);
    
    if (priceAnalysis.currentPrice) {
      console.log(`   💰 Current Price: ₹${priceAnalysis.currentPrice}`);
      console.log(`   📈 Trend: ${priceAnalysis.trend} (${priceAnalysis.changePercentage}%)`);
      console.log(`   ⚠️  Risk Level: ${priceAnalysis.riskLevel}`);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('');

    // Summary
    const totalTime = duration1 + duration2 + duration3 + duration4 + duration5;
    const avgTime = Math.round(totalTime / 5);
    
    console.log('✅ ALL TESTS PASSED!');
    console.log('');
    console.log('📊 Performance Summary:');
    console.log(`   • Total Time: ${totalTime}ms`);
    console.log(`   • Average Time: ${avgTime}ms per request`);
    console.log(`   • All 5 AI features working correctly`);
    console.log('');
    console.log('🎉 AWS Bedrock is configured correctly and ready to use!');
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Start the backend server: npm start');
    console.log('   2. Start the frontend: npm run dev');
    console.log('   3. Test AI features from the UI');
    console.log('');

  } catch (error: any) {
    console.log('');
    console.log('='.repeat(60));
    console.log('');
    console.log('❌ TEST FAILED');
    console.log('');
    console.log('Error:', error.message);
    console.log('');
    
    if (error.name === 'UnrecognizedClientException') {
      console.log('🔍 Issue: Invalid AWS credentials');
      console.log('');
      console.log('Solutions:');
      console.log('   1. Check AWS_ACCESS_KEY_ID in backend/.env');
      console.log('   2. Check AWS_SECRET_ACCESS_KEY in backend/.env');
      console.log('   3. Verify credentials are correct in AWS Console');
      console.log('');
    } else if (error.name === 'AccessDeniedException') {
      console.log('🔍 Issue: Insufficient permissions');
      console.log('');
      console.log('Solutions:');
      console.log('   1. Go to AWS IAM Console');
      console.log('   2. Find your user/role');
      console.log('   3. Attach AmazonBedrockFullAccess policy');
      console.log('   4. Ensure model access is granted in Bedrock Console');
      console.log('');
    } else if (error.message.includes('model')) {
      console.log('🔍 Issue: Model access not granted');
      console.log('');
      console.log('Solutions:');
      console.log('   1. Go to AWS Bedrock Console');
      console.log('   2. Click "Model access" in left sidebar');
      console.log('   3. Request access to Claude 3.5 Sonnet v2');
      console.log('   4. Wait for approval (usually instant)');
      console.log('');
    } else {
      console.log('🔍 Full error details:');
      console.log(error);
      console.log('');
    }
    
    console.log('📚 For more help, see: AWS_BEDROCK_SETUP_GUIDE.md');
    console.log('');
  }
}

testBedrock();
