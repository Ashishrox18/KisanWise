import { sesService } from '../src/services/aws/ses.service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSES() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 AWS SES Configuration Test');
  console.log('='.repeat(70) + '\n');

  // Check environment variables
  console.log('📋 Environment Configuration:');
  console.log(`   AWS_REGION: ${process.env.AWS_REGION || 'NOT SET'}`);
  console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   USE_SES: ${process.env.USE_SES || 'NOT SET (defaults to false)'}`);
  console.log(`   SES_FROM_EMAIL: ${process.env.SES_FROM_EMAIL || 'NOT SET (using default)'}`);
  console.log('');

  // Test email address (change this to your verified email)
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  const testOTP = '123456';

  console.log('📧 Sending Test OTP Email:');
  console.log(`   To: ${testEmail}`);
  console.log(`   OTP: ${testOTP}`);
  console.log('');

  try {
    await sesService.sendOTP(testEmail, testOTP);
    console.log('\n✅ Test completed successfully!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. If you see the OTP in console logs above, SES is NOT configured');
    console.log('   2. Check your email inbox (and spam folder) for the OTP');
    console.log('   3. If no email received, follow the AWS_SES_SETUP_GUIDE.md');
    console.log('');
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Verify AWS credentials are correct in backend/.env');
    console.log('   2. Ensure your email is verified in AWS SES Console');
    console.log('   3. Check if you need to request production access');
    console.log('   4. Review AWS_SES_SETUP_GUIDE.md for detailed setup');
    console.log('');
  }

  console.log('='.repeat(70) + '\n');
}

// Run the test
testSES().catch(console.error);
