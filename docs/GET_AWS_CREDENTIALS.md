# How to Get AWS Access Keys

Step-by-step guide to create and retrieve your AWS Access Key ID and Secret Access Key.

## Prerequisites

- An AWS account (create one at [aws.amazon.com](https://aws.amazon.com) if you don't have one)
- Access to AWS Console

---

## Method 1: Create Access Keys for Your Root User (Quick Start)

⚠️ **Note**: For production, use Method 2 (IAM User) instead for better security.

### Step 1: Sign in to AWS Console

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Sign in with your AWS account email and password

### Step 2: Access Security Credentials

1. Click on your account name in the top-right corner
2. Select **"Security credentials"** from the dropdown menu

   ![AWS Account Menu](https://docs.aws.amazon.com/images/IAM/latest/UserGuide/images/security-credentials-root.console.png)

### Step 3: Create Access Key

1. Scroll down to **"Access keys"** section
2. Click **"Create access key"**
3. You'll see a warning about root user access keys
4. Check the box "I understand the above recommendation..."
5. Click **"Create access key"**

### Step 4: Save Your Credentials

⚠️ **IMPORTANT**: This is the ONLY time you can view the Secret Access Key!

1. You'll see:
   - **Access Key ID**: Starts with `AKIA...`
   - **Secret Access Key**: A long random string

2. **Save these credentials** by either:
   - Click **"Download .csv file"** (recommended)
   - Copy both values to a secure location

3. Click **"Done"**

### Step 5: Use the Credentials

```bash
# Configure AWS CLI
aws configure

# When prompted, enter:
AWS Access Key ID: AKIA... (paste your Access Key ID)
AWS Secret Access Key: (paste your Secret Access Key)
Default region name: us-east-1
Default output format: json
```

---

## Method 2: Create IAM User with Access Keys (Recommended for Production)

This is more secure as it follows AWS best practices.

### Step 1: Go to IAM Console

1. Sign in to [AWS Console](https://console.aws.amazon.com/)
2. Search for **"IAM"** in the search bar
3. Click on **"IAM"** service

### Step 2: Create a New User

1. In the left sidebar, click **"Users"**
2. Click **"Create user"** button
3. Enter a username (e.g., `krishi-era-admin`)
4. Click **"Next"**

### Step 3: Set Permissions

Choose one of these options:

**Option A: Administrator Access (Full Access)**
1. Select **"Attach policies directly"**
2. Search for **"AdministratorAccess"**
3. Check the box next to it
4. Click **"Next"**

**Option B: Custom Permissions (More Secure)**
1. Select **"Attach policies directly"**
2. Search and select these policies:
   - `AmazonDynamoDBFullAccess`
   - `AmazonS3FullAccess`
   - `AmazonSNSFullAccess`
   - `AmazonRekognitionFullAccess`
   - `AmazonLocationFullAccess`
   - `AWSIoTFullAccess`
3. Click **"Next"**

### Step 4: Review and Create

1. Review the user details
2. Click **"Create user"**
3. You'll see a success message

### Step 5: Create Access Key for the User

1. Click on the username you just created
2. Go to **"Security credentials"** tab
3. Scroll down to **"Access keys"** section
4. Click **"Create access key"**

### Step 6: Choose Use Case

1. Select **"Command Line Interface (CLI)"**
2. Check the confirmation box at the bottom
3. Click **"Next"**

### Step 7: Add Description (Optional)

1. Add a description like "Krishi Era AI Development"
2. Click **"Create access key"**

### Step 8: Save Your Credentials

⚠️ **CRITICAL**: Save these now - you can't retrieve the Secret Key later!

1. You'll see:
   - **Access Key ID**: `AKIA...`
   - **Secret Access Key**: Long random string

2. **Save by**:
   - Click **"Download .csv file"** ✅ Recommended
   - Or copy both values to a password manager

3. Click **"Done"**

---

## Verify Your Access Keys

After configuring AWS CLI, test your credentials:

```bash
# Test AWS connection
aws sts get-caller-identity
```

You should see output like:
```json
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/krishi-era-admin"
}
```

---

## Security Best Practices

### ✅ DO:
- Store credentials in a password manager
- Use IAM users instead of root user
- Enable MFA (Multi-Factor Authentication)
- Rotate access keys regularly (every 90 days)
- Use least privilege principle (only grant needed permissions)
- Delete unused access keys

### ❌ DON'T:
- Share access keys with others
- Commit access keys to Git/GitHub
- Use root user access keys for daily operations
- Store keys in plain text files
- Email or message keys

---

## What If I Lost My Secret Access Key?

You **cannot** retrieve a lost Secret Access Key. You must:

1. Go to IAM → Users → Your User
2. Go to "Security credentials" tab
3. Find the old access key
4. Click **"Actions"** → **"Deactivate"** (or Delete)
5. Create a new access key (follow steps above)
6. Update your `aws configure` with new credentials

---

## Configure AWS CLI with Your Keys

Once you have your Access Key ID and Secret Access Key:

```bash
# Run configuration
aws configure

# Enter when prompted:
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

Your credentials are saved in:
- macOS/Linux: `~/.aws/credentials`
- Windows: `C:\Users\USERNAME\.aws\credentials`

---

## Troubleshooting

### Issue: "Access Denied" errors

**Solution**: Your user needs more permissions
1. Go to IAM → Users → Your User
2. Click "Add permissions"
3. Attach required policies (see Step 3 in Method 2)

### Issue: Can't find "Create access key" button

**Solution**: You might not have permission
- Ask your AWS administrator to create keys for you
- Or use root account to create an IAM user

### Issue: Access key is not working

**Solution**: Verify credentials
```bash
# Check configured credentials
cat ~/.aws/credentials

# Test connection
aws sts get-caller-identity
```

---

## Next Steps

After getting your AWS credentials:

1. ✅ Configure AWS CLI: `aws configure`
2. ✅ Test connection: `aws sts get-caller-identity`
3. ✅ Run setup script: `./scripts/setup-aws.sh`
4. ✅ Continue with [Quick Start Guide](QUICK_START.md)

---

## Additional Resources

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Managing Access Keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)
- [AWS Security Credentials](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html)

---

## Need Help?

If you're stuck:
1. Check AWS documentation: [IAM User Guide](https://docs.aws.amazon.com/IAM/latest/UserGuide/)
2. AWS Support: [AWS Support Center](https://console.aws.amazon.com/support/)
3. Review our [Quick Start Guide](QUICK_START.md)
