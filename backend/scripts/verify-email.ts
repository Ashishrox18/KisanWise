import { SESClient, VerifyEmailIdentityCommand, GetIdentityVerificationAttributesCommand } from '@aws-sdk/client-ses';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function verifyEmail() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('\n❌ Please provide an email address to verify');
    console.log('\nUsage:');
    console.log('   npm run verify-email your@email.com');
    console.log('\nExample:');
    console.log('   npm run verify-email noreply@krishiera.com');
    console.log('   npm run verify-email yourname@gmail.com');
    console.log('');
    process.exit(1);
  }

  if (!email.includes('@')) {
    console.log('\n❌ Invalid email address format');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📧 AWS SES Email Verification');
  console.log('='.repeat(70) + '\n');

  const region = process.env.AWS_REGION || 'us-east-1';
  const sesClient = new SESClient({ region });

  // Check if already verified
  console.log(`🔍 Checking verification status for: ${email}\n`);
  
  try {
    const checkCommand = new GetIdentityVerificationAttributesCommand({
      Identities: [email]
    });
    const checkResponse = await sesClient.send(checkCommand);
    const status = checkResponse.VerificationAttributes?.[email]?.VerificationStatus;
    
    if (status === 'Success') {
      console.log('✅ Email is already verified!');
      console.log(`   ${email} is ready to send emails.\n`);
      
      // Update .env
      await updateEnvFile(email);
      
      console.log('='.repeat(70));
      console.log('🎉 Setup Complete!');
      console.log('='.repeat(70));
      console.log('\nNext steps:');
      console.log('1. Restart backend: npm run dev');
      console.log('2. Test SES: npm run test:ses');
      console.log('3. Try registration: http://localhost:5173/login');
      console.log('');
      return;
    } else if (status === 'Pending') {
      console.log('⏳ Email verification is pending.');
      console.log(`   Check your inbox at ${email} for verification email.\n`);
      console.log('If you haven\'t received it, we\'ll send a new one...\n');
    }
  } catch (error: any) {
    console.log('📬 Email not verified yet. Sending verification email...\n');
  }

  // Send verification email
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
    console.log('1. Check your inbox (and spam/junk folder)');
    console.log('2. Look for email from: no-reply-aws@amazon.com');
    console.log('3. Subject: "Amazon SES Email Address Verification Request"');
    console.log('4. Click the verification link in the email');
    console.log('');
    console.log('After clicking the link, run:');
    console.log(`   npm run verify-email ${email}`);
    console.log('');
    console.log('Or check status with:');
    console.log('   npm run auto-setup-ses');
    console.log('');
    
  } catch (error: any) {
    console.error('❌ Failed to send verification email:');
    console.error(`   ${error.message}`);
    console.log('');
    
    if (error.message.includes('already exists')) {
      console.log('💡 Email verification already requested.');
      console.log('   Check your inbox for the verification email.');
      console.log('   If you can\'t find it, check spam folder.');
    } else if (error.message.includes('AccessDenied')) {
      console.log('💡 Permission issue. The SES policy should be attached now.');
      console.log('   Wait a minute and try again.');
    } else {
      console.log('💡 Try verifying manually in AWS Console:');
      console.log('   https://console.aws.amazon.com/ses/');
      console.log('   → Verified identities → Create identity → Email address');
    }
    console.log('');
  }
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
    
    console.log('✅ Updated backend/.env:');
    console.log(`   USE_SES=true`);
    console.log(`   SES_FROM_EMAIL=${email}`);
    console.log('');
  } catch (error: any) {
    console.log('⚠️  Could not update .env file automatically.');
    console.log('   Please manually add to backend/.env:');
    console.log(`   USE_SES=true`);
    console.log(`   SES_FROM_EMAIL=${email}`);
    console.log('');
  }
}

// Run verification
verifyEmail().catch(error => {
  console.error('\n❌ Verification failed:', error);
  process.exit(1);
});
