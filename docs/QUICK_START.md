# Quick Start Guide - Krishi Era AI

Get up and running with Krishi Era AI in 15 minutes.

## Step 1: Prerequisites

Install required tools:
- Node.js 18+ ([Download](https://nodejs.org/))
- AWS CLI ([Install Guide](./INSTALL_AWS_CLI.md))
- Git

### Install AWS CLI (macOS without Homebrew)

```bash
# Download and install
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
aws --version
rm AWSCLIV2.pkg
```

See [detailed installation guide](./INSTALL_AWS_CLI.md) for other methods.

## Step 2: Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd krishi-era-ai

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

## Step 2: AWS Setup

### Option A: Automated Setup (Recommended)

```bash
# 1. Get AWS credentials first
# See: docs/GET_AWS_CREDENTIALS.md

# 2. Configure AWS credentials
aws configure

# 3. Run automated setup
chmod +x scripts/setup-aws.sh
./scripts/setup-aws.sh

# 4. Verify setup
chmod +x scripts/verify-aws-setup.sh
./scripts/verify-aws-setup.sh
```

### Option B: Manual Setup

Follow the detailed guide: [AWS Setup Guide](./AWS_SETUP_GUIDE.md)

## Step 3: Configure Environment

```bash
# Copy example env file
cp backend/.env.example backend/.env

# Edit backend/.env with your AWS values
# (Values are provided by setup script output)
```

Required variables:
- AWS credentials (Access Key, Secret Key)
- DynamoDB table names
- S3 bucket names
- SNS topic ARN
- IoT endpoint

## Step 4: Enable Amazon Bedrock

Amazon Bedrock provides AI models for crop recommendations, harvest timing, and more.

### Quick Steps:

1. **Go to Bedrock Console**
   - Sign in to [AWS Console](https://console.aws.amazon.com/)
   - Search for "Bedrock" and click it
   - Make sure you're in **us-east-1** region (top-right)

2. **Enable Model Access**
   - Click **"Foundation models"** in left sidebar
   - Search for **"Claude 3.5 Sonnet v2"** (Active model)
   - Click on the model card
   - Click **"Request model access"** or **"Enable"**
   - Fill in use case details (see guide below)

3. **Verify Access**
   - Wait for status: **"Access granted"** ✅
   - Usually instant (refresh if needed)

**Detailed guide with use case details:** [ENABLE_BEDROCK.md](./ENABLE_BEDROCK.md)

## Step 5: Start Application

```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Start frontend
npm run dev
```

Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Step 6: Create Test User

Use the registration endpoint or create directly:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@test.com",
    "password": "password123",
    "name": "Test Farmer",
    "role": "farmer",
    "phone": "+919876543210"
  }'
```

## Troubleshooting

### AWS Connection Issues
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check region
echo $AWS_REGION
```

### Backend Won't Start
- Check .env file has all required values
- Verify AWS resources exist
- Check logs in backend/logs/

### Frontend Can't Connect
- Ensure backend is running on port 3000
- Check VITE_API_BASE_URL in .env

## Next Steps

- Read [AWS Setup Guide](./AWS_SETUP_GUIDE.md) for details
- Review [Workflows Documentation](../workflows-and-integrations.md)
- Check [Backend README](../backend/README.md) for API docs

## Support

For issues:
1. Run verification script: `./scripts/verify-aws-setup.sh`
2. Check logs: `backend/logs/combined.log`
3. Review AWS CloudWatch logs
