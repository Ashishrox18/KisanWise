import { SESClient, VerifyEmailIdentityCommand, GetIdentityVerificationAttributesCommand, GetSendQuotaCommand, ListIdentitiesCommand } from '@aws-sdk/client-ses';
import { IAMClient, GetUserCommand, ListAttachedUserPoliciesCommand, AttachUserPolicyCommand } from '@aws-sdk/client-iam';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function autoSetupSES() {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 AWS SES Automatic Setup');
  console.log('='.repeat(70) + '\n');

  // Check AWS credentials
  console.log('📋 Step 1: Verifying AWS Configuration...\n');
  
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.error('❌ AWS credentials not found!');
    console.log('\nPlease ensure backend/.env has:');
    console.log('   AWS_ACCESS_KEY_ID=your_access_key');
    console.log('   AWS_SECRET_ACCESS_KEY=your_secret_key');
    console.log('   AWS_REGION=us-east-1');
    process.exit(1);
  }

  console.log('✅ AWS credentials found');
  console.log(`   Region: ${region}`);
  console.log(`   Access Key: ${accessKeyId.substring(0, 10)}...${accessKeyId.substring(accessKeyId.length - 4)}`);
  console.log('');

  // Initialize clients
  const sesClient = new SESClient({ region });
  const iamClient = new IAMClient({ region });

  // Check IAM permissions
  console.log('🔐 Step 2: Checking IAM Permissions...\n');
  
  try {
    const userCommand = new GetUserCommand({});
    const userResponse = await iamClient.send(userCommand);
    const userName = userResponse.User?.UserName;
    
    console.log(`✅ IAM User: ${userName}`);
    
    // Check attached policies
    const policiesCommand = new ListAttachedUserPoliciesCommand({
      UserName: userName
    });
    const policiesResponse = await iamClient.send(policiesCommand);
    
    const hasSESPolicy = policiesResponse.AttachedPolicies?.some(
      policy => policy.PolicyName?.includes('SES') || policy.PolicyName?.includes('FullAccess')
    );
    
    if (hasSESPolicy) {
      console.log('✅ SES permissions detected');
    } else {
      console.log('⚠️  No explicit SES policy found');
      console.log('   Attempting to attach AmazonSESFullAccess policy...');
      
      try {
        const attachCommand = new AttachUserPolicyCommand({
          UserName: userName,
          PolicyArn: 'arn:aws:iam::aws:policy/AmazonSESFullAccess'
        });
        await iamClient.send(attachCommand);
        console.log('✅ SES policy attached successfully!');
      } catch (attachError: any) {
        console.log('⚠️  Could not attach policy automatically');
        console.log('   You may need to add SES permissions manually in IAM Console');
      }
    }
    console.log('');
  } catch (error: any) {
    console.log('⚠️  Could not check IAM permissions:', error.message);
    console.log('   Continuing anyway...\n');
  }

  // Check SES quota
  console.log('📊 Step 3: Checking SES Status...\n');
  
  try {
    const quotaCommand = new GetSendQuotaCommand({});
    const quotaResponse = await sesClient.send(quotaCommand);
    
    console.log('Current SES Limits:');
    console.log(`   Max 24 Hour Send: ${quotaResponse.Max24HourSend}`);
    console.log(`   Max Send Rate: ${quotaResponse.MaxSendRate} emails/second`);
    console.log(`   Sent Last 24 Hours: ${quotaResponse.SentLast24Hours}`);
    
    if (quotaResponse.Max24HourSend === 200) {
      console.log('\n⚠️  SANDBOX MODE (200 emails/day limit)');
      console.log('   Can only send to verified email addresses.');
      console.log('   To send to any email, request production access:');
      console.log('   https://console.aws.amazon.com/ses/ → Account Dashboard → Request production access');
    } else {
      console.log('\n✅ PRODUCTION ACCESS enabled!');
    }
    console.log('');
  } catch (error: any) {
    console.log('⚠️  Could not check SES quota:', error.message);
    console.log('');
  }

  // List existing verified identities
  console.log('📧 Step 4: Checking Verified Email Addresses...\n');
  
  try {
    const listCommand = new ListIdentitiesCommand({
      IdentityType: 'EmailAddress'
    });
    const listResponse = await sesClient.send(listCommand);
    
    if (listResponse.Identities && listResponse.Identities.length > 0) {
      console.log('Already verified emails:');
      for (const identity of listResponse.Identities) {
        const checkCommand = new GetIdentityVerificationAttributesCommand({
          Identities: [identity]
        });
        const checkResponse = await sesClient.send(checkCommand);
        const status = checkResponse.VerificationAttributes?.[identity]?.VerificationStatus;
        
        if (status === 'Success') {
          console.log(`   ✅ ${identity}`);
        } else {
          console.log(`   ⏳ ${identity} (${status})`);
        }
      }
      console.log('');
      
      // Use first verified email
      const verifiedEmail = listResponse.Identities.find(async (identity) => {
        const checkCommand = new GetIdentityVerificationAttributesCommand({
          Identities: [identity]
        });
        const checkResponse = await sesClient.send(checkCommand);
        return checkResponse.VerificationAttributes?.[identity]?.VerificationStatus === 'Success';
      });
      
      if (verifiedEmail) {
        console.log(`✅ Using verified email: ${verifiedEmail}\n`);
        await updateEnvFile(verifiedEmail);
        
        console.log('='.repeat(70));
        console.log('🎉 SES Setup Complete!');
        console.log('='.repeat(70));
        console.log('\nConfiguration:');
        console.log(`   USE_SES=true`);
        console.log(`   SES_FROM_EMAIL=${verifiedEmail}`);
        console.log('\nNext steps:');
        console.log('1. Restart backend: npm run dev');
        console.log('2. Test SES: npm run test:ses');
        console.log('3. Try registration: http://localhost:5173/login');
        console.log('');
        return;
      }
    } else {
      console.log('No verified emails found yet.\n');
    }
  } catch (error: any) {
    console.log('⚠️  Could not list identities:', error.message);
    console.log('');
  }

  // Suggest email to verify
  console.log('📬 Step 5: Email Verification Needed\n');
  console.log('To send OTP emails, you need to verify an email address.');
  console.log('');
  console.log('Options:');
  console.log('1. Run interactive setup: npm run setup-ses');
  console.log('2. Verify manually in AWS Console:');
  console.log('   https://console.aws.amazon.com/ses/');
  console.log('   → Verified identities → Create identity → Email address');
  console.log('');
  console.log('Recommended emails to verify:');
  console.log('   - noreply@yourdomain.com (if you have a domain)');
  console.log('   - your-personal-email@gmail.com (for testing)');
  console.log('');
  console.log('After verification, run this script again or update backend/.env:');
  console.log('   USE_SES=true');
  console.log('   SES_FROM_EMAIL=your-verified-email@example.com');
  console.log('');
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
    
    console.log('✅ Updated backend/.env automatically');
  } catch (error: any) {
    console.log('⚠️  Could not update .env file');
    console.log('   Please manually update backend/.env');
  }
}

// Run setup
autoSetupSES().catch(error => {
  console.error('\n❌ Setup failed:', error);
  process.exit(1);
});
