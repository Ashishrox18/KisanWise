# How to Enable Amazon Bedrock Model Access (Updated 2024)

Step-by-step guide to enable Claude 3 Sonnet model access in Amazon Bedrock with the new interface.

## Prerequisites

- AWS Account with admin access
- Signed in to AWS Console

---

## Step-by-Step Instructions (New Interface)

### Step 1: Go to Amazon Bedrock Console

1. **Sign in** to [AWS Console](https://console.aws.amazon.com/)

2. **Search for "Bedrock"** in the top search bar
   - Type: `Bedrock`
   - Click on **"Amazon Bedrock"** from the results

   **Direct link:** https://console.aws.amazon.com/bedrock/

3. **Select your region** (top-right corner)
   - Choose: **US East (N. Virginia) us-east-1**
   - Or your preferred region

---

### Step 2: Navigate to Foundation Models

With the new interface, there are two ways to access models:

#### Option A: Via Bedrock Studio (New Interface)

1. In the left sidebar, look for **"Bedrock Studio"** or **"Get started"**

2. Click on **"Foundation models"** or **"Model catalog"**

3. You'll see a catalog of available models

#### Option B: Via Base Models (Alternative)

1. In the left sidebar, click **"Foundation models"** under "Bedrock configurations"

2. Or click **"Base models"** if you see that option

---

### Step 3: Find and Enable Claude 3.5 Sonnet

1. **Browse or search** for Claude models:
   - Use the search bar: Type `Claude 3.5 Sonnet`
   - Or filter by provider: Select **"Anthropic"**

2. **Find Claude 3.5 Sonnet v2** (Latest):
   - Look for: **"Claude 3.5 Sonnet v2"**
   - Model ID: `anthropic.claude-3-5-sonnet-20241022-v2:0`
   - Status: **Active** ✅

3. **Click on the model card** to open details

4. You'll see a button: **"Request model access"** or **"Enable"**

5. **Click the button** to request access

6. **Fill in the use case form**:
   - **Use Case:** Agricultural Intelligence Platform
   - **Description:** AI-powered agricultural recommendations and market intelligence
   - **Intended Users:** Farmers, buyers, transporters, storage providers
   - **Company Website:** Your GitHub URL or "In Development"

7. **Submit the request**

---

### Step 4: Alternative - Use Bedrock Configuration

If you don't see the above options:

1. Look for **"Bedrock configurations"** in the left sidebar

2. Click on **"Model access"** or **"Providers"**

3. Find **"Anthropic"** in the list

4. Click **"Manage"** or **"Configure"**

5. Enable **Claude 3 Sonnet**

6. Click **"Save"** or **"Update"**

---

### Step 5: Verify Access

#### Check Status

1. Go back to **Foundation models** or **Model catalog**

2. Find **Claude 3.5 Sonnet v2**

3. Status should show:
   - ✅ **"Available"** or **"Enabled"**
   - Or a green checkmark

#### Test with AWS CLI

```bash
# List available models
aws bedrock list-foundation-models \
  --region us-east-1 \
  --query 'modelSummaries[?contains(modelId, `claude-3-5-sonnet`)]'

# Test invocation with Claude 3.5 Sonnet v2
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-5-sonnet-20241022-v2:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}' \
  --region us-east-1 \
  output.json

# Check response
cat output.json
```

---

## If You See "Model Access is Retired" Message

AWS has moved model access to a new location. Try these steps:

### Method 1: Direct Model Enablement

1. Go to Bedrock Console
2. Click **"Get started"** or **"Bedrock Studio"**
3. Look for **"Foundation models"** or **"Model catalog"**
4. Click on **Claude 3 Sonnet** card
5. Click **"Use model"** or **"Enable"**

### Method 2: Via Playgrounds

1. In Bedrock Console, click **"Playgrounds"** in left sidebar
2. Click **"Chat"** or **"Text"**
3. Select **Claude 3 Sonnet** from model dropdown
4. If not available, click **"Enable model"** or **"Request access"**

### Method 3: Via Cross-region Inference

1. Look for **"Cross-region inference"** in left sidebar
2. Click **"Inference profiles"**
3. Find Claude 3 Sonnet
4. Enable if needed

---

## New Bedrock Interface Navigation

The new interface has these main sections:

```
Bedrock Console
├── Get started / Bedrock Studio
│   ├── Foundation models (Model catalog)
│   ├── Playgrounds
│   └── Prompt management
├── Bedrock configurations
│   ├── Model access (may be retired)
│   ├── Providers
│   └── Guardrails
└── Inference
    ├── Base models
    └── Custom models
```

---

## Troubleshooting New Interface

### Issue: Can't find "Model access" page

**Solution:**
- AWS retired the old "Model access" page
- Use **"Foundation models"** or **"Model catalog"** instead
- Or go to **"Playgrounds"** → Select model → Enable

### Issue: "Request access" button not showing

**Solution:**
- Model might already be enabled
- Try using it in a Playground to verify
- Check **"Foundation models"** for status

### Issue: Model shows as "Not available"

**Solution:**
- Check you're in a supported region (us-east-1, us-west-2)
- Verify IAM permissions include `bedrock:*`
- Try a different region

### Issue: Access denied when testing

**Solution:**
```bash
# Check your IAM permissions
aws iam get-user

# Verify Bedrock is available in your region
aws bedrock list-foundation-models --region us-east-1
```

---

## Supported Regions (2024)

Bedrock with Claude 3 is available in:
- ✅ US East (N. Virginia) - **us-east-1** (Recommended)
- ✅ US West (Oregon) - us-west-2
- ✅ Asia Pacific (Singapore) - ap-southeast-1
- ✅ Asia Pacific (Tokyo) - ap-northeast-1
- ✅ Europe (Frankfurt) - eu-central-1
- ✅ Europe (Paris) - eu-west-3

---

## Quick Test After Enabling

### Test in Playground (Easiest)

1. Go to Bedrock Console
2. Click **"Playgrounds"** → **"Chat"**
3. Select **"Claude 3 Sonnet"** from dropdown
4. Type a message: "Hello, test message"
5. Click **"Run"**
6. If you get a response, it's working! ✅

### Test via CLI

```bash
# Simple test
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-sonnet-20240229-v1:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":50,"messages":[{"role":"user","content":"Say hello"}]}' \
  --region us-east-1 \
  test-output.json && cat test-output.json
```

---

## What If Nothing Works?

### Check IAM Permissions

Your IAM user needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### Verify Account Status

Some AWS accounts need to request Bedrock access:

1. Go to AWS Support Center
2. Create a case: "Service limit increase"
3. Select: "Amazon Bedrock"
4. Request access to Claude models

---

## Pricing (2024)

**Claude 3.5 Sonnet v2 (Recommended):**
- Input: $3 per million tokens (~750,000 words)
- Output: $15 per million tokens

**Claude 3.5 Haiku (Budget Option):**
- Input: $1 per million tokens
- Output: $5 per million tokens

**Estimated Costs:**
- Development: $5-10/month
- Production (1000 users): $50-100/month

**Free Tier:**
- Check current offers at: https://aws.amazon.com/bedrock/pricing/

---

## After Enabling

### 1. Update .env File

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### 2. Test Backend

```bash
cd backend
npm run dev
```

### 3. Verify in Application

The backend will use Bedrock for:
- Crop recommendations
- Harvest timing suggestions
- Route optimization
- Price analysis

---

## Alternative: Use Different Model

If Claude 3.5 Sonnet v2 is not available, you can use:

**Claude 3.5 Sonnet v1** (stable):
```typescript
modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0'
```

**Claude 3.5 Haiku** (faster, cheaper):
```typescript
modelId: 'anthropic.claude-3-5-haiku-20241022-v1:0'
```

Update in: `backend/src/services/aws/bedrock.service.ts`

---

## Need Help?

- **New Bedrock Docs:** https://docs.aws.amazon.com/bedrock/latest/userguide/
- **Model Catalog:** https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html
- **AWS Support:** https://console.aws.amazon.com/support/
- **Community:** https://repost.aws/tags/TA4IvCeWI1TE-6qHz0cI_tPg/amazon-bedrock

---

## Summary

With the new Bedrock interface:

1. ✅ Go to Bedrock Console
2. ✅ Click **"Foundation models"** or **"Playgrounds"**
3. ✅ Find **Claude 3.5 Sonnet v2** (Active model)
4. ✅ Click **"Enable"** or **"Use model"**
5. ✅ Fill in use case details
6. ✅ Test in Playground or via CLI
7. ✅ Continue with [Quick Start Guide](QUICK_START.md)

The old "Model access" page is retired, but model enablement is now simpler and more integrated into the Bedrock Studio experience!
