import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

async function testRegistration() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 Testing Registration Flow');
  console.log('='.repeat(70) + '\n');

  const baseURL = 'http://localhost:3000/api';
  
  const testData = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'Test@123',
    role: 'farmer',
    phone: '9876543210'
  };

  console.log('📋 Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('');

  try {
    console.log('📤 Sending OTP request...\n');
    
    const response = await axios.post(`${baseURL}/auth/send-otp`, testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('🔍 Check your backend console for the OTP');
    console.log('');
    
  } catch (error: any) {
    console.error('❌ Failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Is the backend running? (npm run dev)');
    } else {
      console.error('Error:', error.message);
    }
    console.log('');
  }

  console.log('='.repeat(70) + '\n');
}

testRegistration().catch(console.error);
