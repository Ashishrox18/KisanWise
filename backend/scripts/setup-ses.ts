import { SESClient, VerifyEmailIdentityCommand, GetIdentityVerificationAttributesCommand, GetSendQuotaCommand } from '@aws-sdk/client-ses';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupSES() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 AWS SES Setup Wizard');
  console.log('='.repeat(70) + '\n');

  // Check AWS credentials
  console.log('📋 Step 1: Checking AWS Configuration...\n');
  
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.error('❌ AWS credentials not found in environment variables!');
    console.log('\nPlease ensure backend/.env has:');
    console.log('   AWS_ACCESS_KEY_ID=your_access_key');
    console.log('   AWS_SECRET_ACCESS_KEY=your_secret_key');
    console.log('   AWS_REGION=us-east-1');
    process.exit(1);
  }

  console.log('✅ AWS credentials found');
  console.log(`   Region: ${region}`);
  console.log(`   Access Key: ${accessKeyId.substring(0, 10)}...`);
  console.log('');

  // Initialize SES client
  const sesClient = new SESClient({ region });

  // Check current sending quota
  try {
    console.log('📊 Checking SES sending quota...\n');
    const quotaCommand = new GetSendQuotaCommand({});
    const quotaResponse = await sesClient.send(quotaCommand);
    
    console.log('Current SES Status:');
    console.log(`   Max 24 Hour Send: ${quotaResponse.Max24HourSend}`);
    console.log(`   Max Send Rate: ${quotaResponse.MaxSendRate} emails/second`);
    console.log(`   Sent Last 24 Hours: ${quotaResponse.SentLast24Hours}`);
    
    if (quotaResponse.Max24HourSend === 200) {
      console.log('\n⚠️  You are in SANDBOX mode (200 emails/day limit)');
      console.log('   You can only send to verified email addresses.');
      console.log('   To send to any email, request production access in AWS Console.');
    } else {
      console.log('\n✅ You have PRODUCTION access!');
    }
    console.log('');
  } catch (error: any) {
    console.log('⚠️  Could not check sending quota:', error.message);
    console.log('');
  }

  // Ask for email to verify
  console.log('📧 Step 2: Email Verification\n');
  console.log('Enter the email address you want to use for sending OTPs.');
  console.log('This can be:');
  console.log('  - Your personal email (e.g., yourname@gmail.com)');
  console.log('  - Your domain email (e.g., noreply@yourdomain.com)');
  console.log('');
  
  const email = await question('Email address to verify: ');
  
  if (!email || !email.includes('@')) {
    console.error('\n❌ Invalid email address!');
    rl.close();
    process.exit(1);
  }

  console.log('');

  // Check if already verified
  try {
    console.log('🔍 Checking verification status...\n');
    const checkCommand = new GetIdentityVerificationAttributesCommand({
      Identities: [email]
    });
    const checkResponse = await sesClient.send(checkCommand);
    
    const status = checkResponse.VerificationAttributes?.[email]?.VerificationStatus;
    
    if (status === 'Success') {
      console.log('✅ Email is already verified!');
      console.log(`   ${email} is ready to send emails.\n`);
      
      // Update .env file
      await updateEnvFile(email);
      
      console.log('='.repeat(70));
      console.log('🎉 Setup Complete!');
      console.log('='.repeat(70));
      console.log('\nYour SES is configured and ready to use.');
      console.log('\nNext steps:');
      console.log('1. Restart your backend server');
      console.log('2. Test with: npm run test:ses');
      console.log('3. Try registration at http://localhost:5173/login');
      console.log('');
      rl.close();
      return;
    } else if (status === 'Pending') {
      console.log('⏳ Email verification is pending.');
      console.log(`   Check your inbox at ${email} for verification email.\n`);
    } else {
      console.log('📬 Email is not verified yet.\n');
    }
  } catch (error: any) {
    console.log('⚠️  Could not check verification status:', error.message);
    console.log('');
  }

  // Send verification email
  console.log('📤 Sending verification email...\n');
  
  try {
    const verifyCommand = new VerifyEmailIdentityCommand({
      EmailAddress: email
    });
    await sesClient.send(verifyCommand);
    
    console.log('✅ Verification email sent successfully!');
    console.log('');
    console.log('='.repeat(70));
    console.log('📬 CHECK YOUR EMAIL');
    console.log('='.repeat(70));
    console.log('');
    console.log(`AWS has sent a verification email to: ${email}`);
    console.log('');
    console.log('Please:');
    console.log('1. Check your inbox (and spam folder)');
    console.log('2. Click the verification link in the email');
    console.log('3. Return here and press Enter to continue...');
    console.log('');
    
    await question('Press Enter after clicking the verification link...');
    
    // Check verification status again
    console.log('\n🔍 Checking verification status...\n');
    
    let verified = false;
    for (let i = 0; i < 3; i++) {
      const checkCommand = new GetIdentityVerificationAttributesCommand({
        Identities: [email]
      });
      const checkResponse = await sesClient.send(checkCommand);
      const status = checkResponse.VerificationAttributes?.[email]?.VerificationStatus;
      
      if (status === 'Success') {
        console.log('✅ Email verified successfully!');
        verified = true;
        break;
      } else {
        console.log(`⏳ Status: ${status || 'Unknown'} - Waiting...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!verified) {
      console.log('\n⚠️  Email not verified yet.');
      console.log('   This might take a few minutes.');
      console.log('   You can check status later with: npm run test:ses');
      console.log('');
    } else {
      // Update .env file
      await updateEnvFile(email);
      
      console.log('');
      console.log('='.repeat(70));
      console.log('🎉 Setup Complete!');
      console.log('='.repeat(70));
      console.log('\nYour SES is configured and ready to use.');
      console.log('\nNext steps:');
      console.log('1. Restart your backend server');
      console.log('2. Test with: npm run test:ses');
      console.log('3. Try registration at http://localhost:5173/login');
      console.log('');
    }
    
  } catch (error: any) {
    console.error('\n❌ Failed to send verification email:');
    console.error(`   ${error.message}`);
    console.log('');
    console.log('Possible issues:');
    console.log('1. AWS credentials might not have SES permissions');
    console.log('2. Email address might be invalid');
    console.log('3. You might have reached verification limit');
    console.log('');
    console.log('Try verifying manually in AWS Console:');
    console.log('https://console.aws.amazon.com/ses/');
    console.log('');
  }

  rl.close();
}

async function updateEnvFile(email: string) {
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update USE_SES
    if (envContent.includes('USE_SES=')) {
      envContent = envContent.replace(/USE_SES=false/g, 'USE_SES=true');
    } else {
      envContent += '\nUSE_SES=true';
    }
    
    // Update or add SES_FROM_EMAIL
    if (envContent.includes('SES_FROM_EMAIL=')) {
      envContent = envContent.replace(/SES_FROM_EMAIL=.*/g, `SES_FROM_EMAIL=${email}`);
    } else if (envContent.includes('# SES_FROM_EMAIL=')) {
      envContent = envContent.replace(/# SES_FROM_EMAIL=.*/g, `SES_FROM_EMAIL=${email}`);
    } else {
      envContent += `\nSES_FROM_EMAIL=${email}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Updated backend/.env:');
    console.log(`   USE_SES=true`);
    console.log(`   SES_FROM_EMAIL=${email}`);
  } catch (error: any) {
    console.log('\n⚠️  Could not update .env file automatically.');
    console.log('   Please manually add to backend/.env:');
    console.log(`   USE_SES=true`);
    console.log(`   SES_FROM_EMAIL=${email}`);
  }
}

// Run setup
setupSES().catch(error => {
  console.error('\n❌ Setup failed:', error);
  rl.close();
  process.exit(1);
});
