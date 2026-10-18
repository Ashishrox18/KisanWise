# AWS Setup Guide for Krishi Era AI

Complete step-by-step guide to set up all required AWS resources for the Krishi Era AI platform.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [IAM Setup](#iam-setup)
3. [DynamoDB Tables](#dynamodb-tables)
4. [S3 Buckets](#s3-buckets)
5. [Amazon Bedrock](#amazon-bedrock)
6. [Amazon Rekognition](#amazon-rekognition)
7. [Amazon Location Service](#amazon-location-service)
8. [Amazon SNS](#amazon-sns)
9. [AWS IoT Core](#aws-iot-core)
10. [CloudWatch](#cloudwatch)
11. [Verification](#verification)

---

## Prerequisites

### Required Tools
- AWS Account with admin access
- AWS CLI installed and configured
- Node.js 18+ installed
- Basic understanding of AWS services

### Install AWS CLI

**macOS (without Homebrew):**
```bash
# Download the installer
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"

# Install
sudo installer -pkg AWSCLIV2.pkg -target /

# Verify
aws --version

# Clean up
rm AWSCLIV2.pkg
```

**macOS (with Homebrew):**
```bash
brew install awscli
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Windows:**
Download and run the AWS CLI MSI installer from AWS website.

**Detailed installation guide:** See [INSTALL_AWS_CLI.md](INSTALL_AWS_CLI.md)

### Configure AWS CLI

```bash
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `us-east-1`)
- Default output format: `json`

---

## IAM Setup

### Step 1: Create IAM User for Application

```bash
# Create IAM user
aws iam create-user --user-name krishi-era-app

# Create access key
aws iam create-access-key --user-name krishi-era-app
```

**Save the output** - you'll need the `AccessKeyId` and `SecretAccessKey` for your `.env` file.

### Step 2: Create IAM Policy

Create a file `krishi-era-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/krishi-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::krishi-*/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectLabels",
        "rekognition:DetectText"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "geo:CalculateRoute",
        "geo:SearchPlaceIndexForText"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:*:*:krishi-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iot:Publish",
        "iot:Subscribe",
        "iot:Connect",
        "iot:Receive"
      ],
      "Resource": "*"
    }
  ]
}
```

Apply the policy:

```bash
# Create policy
aws iam create-policy \
  --policy-name KrishiEraAppPolicy \
  --policy-document file://krishi-era-policy.json

# Attach policy to user (replace ACCOUNT_ID with your AWS account ID)
aws iam attach-user-policy \
  --user-name krishi-era-app \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/KrishiEraAppPolicy
```

---

## DynamoDB Tables

### Step 1: Create Users Table

```bash
aws dynamodb create-table \
  --table-name krishi-users \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    "[{
      \"IndexName\": \"email-index\",
      \"KeySchema\": [{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],
      \"Projection\": {\"ProjectionType\":\"ALL\"}
    }]" \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Step 2: Create Crops Table

```bash
aws dynamodb create-table \
  --table-name krishi-crops \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
    AttributeName=userId,KeyType=RANGE \
  --global-secondary-indexes \
    "[{
      \"IndexName\": \"userId-index\",
      \"KeySchema\": [{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}],
      \"Projection\": {\"ProjectionType\":\"ALL\"}
    }]" \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Step 3: Create Orders Table

```bash
aws dynamodb create-table \
  --table-name krishi-orders \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=farmerId,AttributeType=S \
    AttributeName=buyerId,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    "[{
      \"IndexName\": \"farmerId-index\",
      \"KeySchema\": [{\"AttributeName\":\"farmerId\",\"KeyType\":\"HASH\"}],
      \"Projection\": {\"ProjectionType\":\"ALL\"}
    },
    {
      \"IndexName\": \"buyerId-index\",
      \"KeySchema\": [{\"AttributeName\":\"buyerId\",\"KeyType\":\"HASH\"}],
      \"Projection\": {\"ProjectionType\":\"ALL\"}
    }]" \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Step 4: Create Shipments Table

```bash
aws dynamodb create-table \
  --table-name krishi-shipments \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=transporterId,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    "[{
      \"IndexName\": \"transporterId-index\",
      \"KeySchema\": [{\"AttributeName\":\"transporterId\",\"KeyType\":\"HASH\"}],
      \"Projection\": {\"ProjectionType\":\"ALL\"}
    }]" \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Step 5: Create Storage Table

```bash
aws dynamodb create-table \
  --table-name krishi-storage \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=providerId,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    "[{
      \"IndexName\": \"providerId-index\",
      \"KeySchema\": [{\"AttributeName\":\"providerId\",\"KeyType\":\"HASH\"}],
      \"Projection\": {\"ProjectionType\":\"ALL\"}
    }]" \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Step 6: Create Transactions Table

```bash
aws dynamodb create-table \
  --table-name krishi-transactions \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
    AttributeName=createdAt,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Verify Tables

```bash
aws dynamodb list-tables --region us-east-1
```

---

## S3 Buckets

### Step 1: Create Images Bucket

```bash
# Create bucket (replace YOUR-UNIQUE-NAME with a unique identifier)
aws s3 mb s3://krishi-images-YOUR-UNIQUE-NAME --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket krishi-images-YOUR-UNIQUE-NAME \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket krishi-images-YOUR-UNIQUE-NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Set CORS configuration
cat > cors.json << EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket krishi-images-YOUR-UNIQUE-NAME \
  --cors-configuration file://cors.json
```

### Step 2: Create Documents Bucket

```bash
# Create bucket
aws s3 mb s3://krishi-documents-YOUR-UNIQUE-NAME --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket krishi-documents-YOUR-UNIQUE-NAME \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket krishi-documents-YOUR-UNIQUE-NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Step 3: Set Lifecycle Policies (Optional)

```bash
cat > lifecycle.json << EOF
{
  "Rules": [
    {
      "Id": "MoveToIA",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        }
      ]
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket krishi-images-YOUR-UNIQUE-NAME \
  --lifecycle-configuration file://lifecycle.json
```

### Verify Buckets

```bash
aws s3 ls
```

---

## Amazon Bedrock

### Step 1: Enable Model Access

**Via AWS Console:**

1. Go to AWS Console → Amazon Bedrock
2. Click "Model access" in left sidebar
3. Click "Manage model access"
4. Select "Anthropic" → "Claude 3 Sonnet"
5. Click "Request model access"
6. Wait for approval (usually instant for Claude models)

**Via AWS CLI:**

```bash
# Check available models
aws bedrock list-foundation-models --region us-east-1

# Request access (if not already granted)
aws bedrock put-model-invocation-logging-configuration \
  --logging-config '{
    "cloudWatchConfig": {
      "logGroupName": "/aws/bedrock/krishi-era",
      "roleArn": "arn:aws:iam::ACCOUNT_ID:role/BedrockLoggingRole"
    }
  }' \
  --region us-east-1
```

### Step 2: Test Bedrock Access

```bash
# Test with a simple invocation
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-sonnet-20240229-v1:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}' \
  --region us-east-1 \
  output.json

cat output.json
```

---

## Amazon Rekognition

### Step 1: Verify Rekognition Access

Rekognition is available by default. Test access:

```bash
# Create a test image (or use an existing one)
# Test label detection
aws rekognition detect-labels \
  --image '{"S3Object":{"Bucket":"krishi-images-YOUR-UNIQUE-NAME","Name":"test-image.jpg"}}' \
  --region us-east-1
```

### Step 2: Set Up Custom Labels (Optional)

For custom quality detection models:

```bash
# Create project
aws rekognition create-project \
  --project-name krishi-quality-detection \
  --region us-east-1
```

---

## Amazon Location Service

### Step 1: Create Place Index

```bash
aws location create-place-index \
  --index-name KrishiPlaceIndex \
  --data-source Esri \
  --pricing-plan RequestBasedUsage \
  --region us-east-1
```

### Step 2: Create Route Calculator

```bash
aws location create-route-calculator \
  --calculator-name KrishiRouteCalculator \
  --data-source Esri \
  --pricing-plan RequestBasedUsage \
  --region us-east-1
```

### Step 3: Test Location Services

```bash
# Test geocoding
aws location search-place-index-for-text \
  --index-name KrishiPlaceIndex \
  --text "Delhi, India" \
  --region us-east-1

# Test route calculation
aws location calculate-route \
  --calculator-name KrishiRouteCalculator \
  --departure-position 77.2090 28.6139 \
  --destination-position 77.1025 28.7041 \
  --region us-east-1
```

---

## Amazon SNS

### Step 1: Create SNS Topic

```bash
aws sns create-topic \
  --name krishi-notifications \
  --region us-east-1
```

**Save the TopicArn** from the output.

### Step 2: Set Topic Attributes

```bash
# Get the topic ARN
TOPIC_ARN=$(aws sns list-topics --region us-east-1 --query 'Topics[?contains(TopicArn, `krishi-notifications`)].TopicArn' --output text)

# Set display name
aws sns set-topic-attributes \
  --topic-arn $TOPIC_ARN \
  --attribute-name DisplayName \
  --attribute-value "Krishi Era Notifications" \
  --region us-east-1
```

### Step 3: Subscribe Email (Optional)

```bash
aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol email \
  --notification-endpoint your-email@example.com \
  --region us-east-1
```

Check your email and confirm the subscription.

### Step 4: Test SNS

```bash
aws sns publish \
  --topic-arn $TOPIC_ARN \
  --message "Test notification from Krishi Era" \
  --subject "Test Alert" \
  --region us-east-1
```

### Step 5: Enable SMS (Optional)

```bash
# Set SMS preferences
aws sns set-sms-attributes \
  --attributes DefaultSMSType=Transactional \
  --region us-east-1

# Test SMS
aws sns publish \
  --phone-number "+919876543210" \
  --message "Test SMS from Krishi Era" \
  --region us-east-1
```

---

## AWS IoT Core

### Step 1: Create IoT Thing Type

```bash
aws iot create-thing-type \
  --thing-type-name KrishiStorageSensor \
  --thing-type-properties "thingTypeDescription=Storage facility sensors" \
  --region us-east-1
```

### Step 2: Create IoT Policy

Create file `iot-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iot:Connect"
      ],
      "Resource": "arn:aws:iot:us-east-1:*:client/krishi-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iot:Publish",
        "iot:Receive"
      ],
      "Resource": "arn:aws:iot:us-east-1:*:topic/krishi/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iot:Subscribe"
      ],
      "Resource": "arn:aws:iot:us-east-1:*:topicfilter/krishi/*"
    }
  ]
}
```

Apply policy:

```bash
aws iot create-policy \
  --policy-name KrishiIoTPolicy \
  --policy-document file://iot-policy.json \
  --region us-east-1
```

### Step 3: Create Sample IoT Thing

```bash
# Create thing
aws iot create-thing \
  --thing-name krishi-sensor-001 \
  --thing-type-name KrishiStorageSensor \
  --region us-east-1

# Create certificate
aws iot create-keys-and-certificate \
  --set-as-active \
  --certificate-pem-outfile certificate.pem \
  --public-key-outfile public.key \
  --private-key-outfile private.key \
  --region us-east-1
```

**Save the certificate ARN** from the output.

### Step 4: Attach Policy to Certificate

```bash
# Replace CERTIFICATE_ARN with the ARN from previous step
aws iot attach-policy \
  --policy-name KrishiIoTPolicy \
  --target CERTIFICATE_ARN \
  --region us-east-1

# Attach certificate to thing
aws iot attach-thing-principal \
  --thing-name krishi-sensor-001 \
  --principal CERTIFICATE_ARN \
  --region us-east-1
```

### Step 5: Get IoT Endpoint

```bash
aws iot describe-endpoint \
  --endpoint-type iot:Data-ATS \
  --region us-east-1
```

**Save the endpoint URL** for your `.env` file.

### Step 6: Create IoT Rule for Data Storage

```bash
cat > iot-rule.json << EOF
{
  "sql": "SELECT * FROM 'krishi/sensors/+/data'",
  "description": "Store sensor data in DynamoDB",
  "actions": [
    {
      "dynamoDBv2": {
        "roleArn": "arn:aws:iam::ACCOUNT_ID:role/IoTDynamoDBRole",
        "putItem": {
          "tableName": "krishi-storage"
        }
      }
    }
  ],
  "ruleDisabled": false
}
EOF

aws iot create-topic-rule \
  --rule-name KrishiSensorDataRule \
  --topic-rule-payload file://iot-rule.json \
  --region us-east-1
```

---

## CloudWatch

### Step 1: Create Log Groups

```bash
# Application logs
aws logs create-log-group \
  --log-group-name /aws/krishi-era/application \
  --region us-east-1

# Bedrock logs
aws logs create-log-group \
  --log-group-name /aws/bedrock/krishi-era \
  --region us-east-1

# API Gateway logs (if using)
aws logs create-log-group \
  --log-group-name /aws/apigateway/krishi-era \
  --region us-east-1
```

### Step 2: Set Retention Policies

```bash
aws logs put-retention-policy \
  --log-group-name /aws/krishi-era/application \
  --retention-in-days 30 \
  --region us-east-1
```

### Step 3: Create CloudWatch Dashboard

```bash
cat > dashboard.json << EOF
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", {"stat": "Sum"}],
          [".", "ConsumedWriteCapacityUnits", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "DynamoDB Capacity"
      }
    }
  ]
}
EOF

aws cloudwatch put-dashboard \
  --dashboard-name KrishiEraDashboard \
  --dashboard-body file://dashboard.json \
  --region us-east-1
```

---

## Verification

### Step 1: Verify All Resources

```bash
# DynamoDB tables
aws dynamodb list-tables --region us-east-1

# S3 buckets
aws s3 ls | grep krishi

# SNS topics
aws sns list-topics --region us-east-1 | grep krishi

# IoT things
aws iot list-things --region us-east-1

# Location resources
aws location list-place-indexes --region us-east-1
aws location list-route-calculators --region us-east-1

# CloudWatch log groups
aws logs describe-log-groups --region us-east-1 | grep krishi
```

### Step 2: Update .env File

Update your `backend/.env` file with all the values:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_from_iam_step
AWS_SECRET_ACCESS_KEY=your_secret_key_from_iam_step

# DynamoDB Tables
DYNAMODB_USERS_TABLE=krishi-users
DYNAMODB_CROPS_TABLE=krishi-crops
DYNAMODB_ORDERS_TABLE=krishi-orders
DYNAMODB_SHIPMENTS_TABLE=krishi-shipments
DYNAMODB_STORAGE_TABLE=krishi-storage
DYNAMODB_TRANSACTIONS_TABLE=krishi-transactions

# S3 Buckets
S3_IMAGES_BUCKET=krishi-images-YOUR-UNIQUE-NAME
S3_DOCUMENTS_BUCKET=krishi-documents-YOUR-UNIQUE-NAME

# SNS
SNS_NOTIFICATIONS_TOPIC_ARN=your_topic_arn_from_sns_step

# IoT
IOT_ENDPOINT=your_iot_endpoint_from_iot_step

# JWT
JWT_SECRET=generate_a_random_secret_key_here
JWT_EXPIRES_IN=7d
```

### Step 3: Test Backend Connection

```bash
cd backend
npm install
npm run dev
```

Check logs for successful AWS connections.

---

## Cost Optimization Tips

1. **DynamoDB**: Use on-demand billing for development, switch to provisioned for production
2. **S3**: Enable lifecycle policies to move old data to cheaper storage classes
3. **Bedrock**: Monitor token usage, implement caching for repeated queries
4. **Location Service**: Cache geocoding results
5. **CloudWatch**: Set appropriate log retention periods
6. **IoT Core**: Batch sensor data when possible

---

## Troubleshooting

### Issue: Access Denied Errors

**Solution**: Verify IAM policy is attached correctly:
```bash
aws iam list-attached-user-policies --user-name krishi-era-app
```

### Issue: DynamoDB Table Not Found

**Solution**: Check table exists and region is correct:
```bash
aws dynamodb describe-table --table-name krishi-users --region us-east-1
```

### Issue: Bedrock Model Access Denied

**Solution**: Request model access via console (can take a few minutes)

### Issue: S3 Bucket Name Already Exists

**Solution**: S3 bucket names must be globally unique. Add a unique suffix.

---

## Next Steps

1. Run the verification script
2. Test each service individually
3. Start the backend server
4. Monitor CloudWatch for any errors
5. Set up CloudWatch alarms for production

For production deployment, consider:
- Setting up VPC for enhanced security
- Enabling AWS WAF for API protection
- Configuring Auto Scaling
- Setting up multi-region replication
- Implementing AWS Backup for data protection
