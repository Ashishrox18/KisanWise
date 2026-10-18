#!/bin/bash

# Krishi Era AI - AWS Setup Script
# This script automates the creation of AWS resources

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
UNIQUE_SUFFIX=$(date +%s)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Krishi Era AI - AWS Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Please run: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}AWS Account ID: ${ACCOUNT_ID}${NC}"
echo -e "${GREEN}Region: ${AWS_REGION}${NC}"
echo ""

# Function to check if resource exists
resource_exists() {
    local resource_type=$1
    local resource_name=$2
    
    case $resource_type in
        "dynamodb")
            aws dynamodb describe-table --table-name "$resource_name" --region "$AWS_REGION" &> /dev/null
            ;;
        "s3")
            aws s3 ls "s3://$resource_name" &> /dev/null
            ;;
        "sns")
            aws sns get-topic-attributes --topic-arn "$resource_name" --region "$AWS_REGION" &> /dev/null
            ;;
        *)
            return 1
            ;;
    esac
}

# Create DynamoDB Tables
echo -e "${YELLOW}Creating DynamoDB Tables...${NC}"

create_dynamodb_table() {
    local table_name=$1
    local key_schema=$2
    local attribute_definitions=$3
    local gsi=$4
    
    if resource_exists "dynamodb" "$table_name"; then
        echo -e "${YELLOW}Table $table_name already exists, skipping...${NC}"
        return
    fi
    
    echo "Creating table: $table_name"
    
    if [ -z "$gsi" ]; then
        aws dynamodb create-table \
            --table-name "$table_name" \
            --attribute-definitions $attribute_definitions \
            --key-schema $key_schema \
            --billing-mode PAY_PER_REQUEST \
            --region "$AWS_REGION" > /dev/null
    else
        aws dynamodb create-table \
            --table-name "$table_name" \
            --attribute-definitions $attribute_definitions \
            --key-schema $key_schema \
            --global-secondary-indexes "$gsi" \
            --billing-mode PAY_PER_REQUEST \
            --region "$AWS_REGION" > /dev/null
    fi
    
    echo -e "${GREEN}✓ Created table: $table_name${NC}"
}

# Users table
create_dynamodb_table "krishi-users" \
    "AttributeName=id,KeyType=HASH" \
    "AttributeName=id,AttributeType=S AttributeName=email,AttributeType=S" \
    '[{"IndexName":"email-index","KeySchema":[{"AttributeName":"email","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]'

# Crops table
create_dynamodb_table "krishi-crops" \
    "AttributeName=id,KeyType=HASH AttributeName=userId,KeyType=RANGE" \
    "AttributeName=id,AttributeType=S AttributeName=userId,AttributeType=S" \
    '[{"IndexName":"userId-index","KeySchema":[{"AttributeName":"userId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]'

# Orders table
create_dynamodb_table "krishi-orders" \
    "AttributeName=id,KeyType=HASH" \
    "AttributeName=id,AttributeType=S AttributeName=farmerId,AttributeType=S AttributeName=buyerId,AttributeType=S" \
    '[{"IndexName":"farmerId-index","KeySchema":[{"AttributeName":"farmerId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"buyerId-index","KeySchema":[{"AttributeName":"buyerId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]'

# Shipments table
create_dynamodb_table "krishi-shipments" \
    "AttributeName=id,KeyType=HASH" \
    "AttributeName=id,AttributeType=S AttributeName=transporterId,AttributeType=S" \
    '[{"IndexName":"transporterId-index","KeySchema":[{"AttributeName":"transporterId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]'

# Storage table
create_dynamodb_table "krishi-storage" \
    "AttributeName=id,KeyType=HASH" \
    "AttributeName=id,AttributeType=S AttributeName=providerId,AttributeType=S" \
    '[{"IndexName":"providerId-index","KeySchema":[{"AttributeName":"providerId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]'

# Transactions table
create_dynamodb_table "krishi-transactions" \
    "AttributeName=id,KeyType=HASH AttributeName=createdAt,KeyType=RANGE" \
    "AttributeName=id,AttributeType=S AttributeName=createdAt,AttributeType=S" \
    ""

echo ""

# Create S3 Buckets
echo -e "${YELLOW}Creating S3 Buckets...${NC}"

create_s3_bucket() {
    local bucket_name=$1
    
    if resource_exists "s3" "$bucket_name"; then
        echo -e "${YELLOW}Bucket $bucket_name already exists, skipping...${NC}"
        return
    fi
    
    echo "Creating bucket: $bucket_name"
    
    aws s3 mb "s3://$bucket_name" --region "$AWS_REGION"
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$bucket_name" \
        --versioning-configuration Status=Enabled
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "$bucket_name" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'
    
    echo -e "${GREEN}✓ Created bucket: $bucket_name${NC}"
}

IMAGES_BUCKET="krishi-images-${UNIQUE_SUFFIX}"
DOCUMENTS_BUCKET="krishi-documents-${UNIQUE_SUFFIX}"

create_s3_bucket "$IMAGES_BUCKET"
create_s3_bucket "$DOCUMENTS_BUCKET"

echo ""

# Create SNS Topic
echo -e "${YELLOW}Creating SNS Topic...${NC}"

TOPIC_ARN=$(aws sns create-topic \
    --name krishi-notifications \
    --region "$AWS_REGION" \
    --query 'TopicArn' \
    --output text 2>/dev/null || aws sns list-topics --region "$AWS_REGION" --query 'Topics[?contains(TopicArn, `krishi-notifications`)].TopicArn' --output text)

echo -e "${GREEN}✓ SNS Topic ARN: $TOPIC_ARN${NC}"

echo ""

# Create Location Service Resources
echo -e "${YELLOW}Creating Location Service Resources...${NC}"

# Place Index
if aws location describe-place-index --index-name KrishiPlaceIndex --region "$AWS_REGION" &> /dev/null; then
    echo -e "${YELLOW}Place Index already exists, skipping...${NC}"
else
    aws location create-place-index \
        --index-name KrishiPlaceIndex \
        --data-source Esri \
        --pricing-plan RequestBasedUsage \
        --region "$AWS_REGION" > /dev/null
    echo -e "${GREEN}✓ Created Place Index: KrishiPlaceIndex${NC}"
fi

# Route Calculator
if aws location describe-route-calculator --calculator-name KrishiRouteCalculator --region "$AWS_REGION" &> /dev/null; then
    echo -e "${YELLOW}Route Calculator already exists, skipping...${NC}"
else
    aws location create-route-calculator \
        --calculator-name KrishiRouteCalculator \
        --data-source Esri \
        --pricing-plan RequestBasedUsage \
        --region "$AWS_REGION" > /dev/null
    echo -e "${GREEN}✓ Created Route Calculator: KrishiRouteCalculator${NC}"
fi

echo ""

# Get IoT Endpoint
echo -e "${YELLOW}Getting IoT Endpoint...${NC}"
IOT_ENDPOINT=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS --region "$AWS_REGION" --query 'endpointAddress' --output text)
echo -e "${GREEN}✓ IoT Endpoint: $IOT_ENDPOINT${NC}"

echo ""

# Create CloudWatch Log Groups
echo -e "${YELLOW}Creating CloudWatch Log Groups...${NC}"

create_log_group() {
    local log_group=$1
    
    if aws logs describe-log-groups --log-group-name-prefix "$log_group" --region "$AWS_REGION" --query 'logGroups[0]' --output text &> /dev/null; then
        echo -e "${YELLOW}Log group $log_group already exists, skipping...${NC}"
    else
        aws logs create-log-group --log-group-name "$log_group" --region "$AWS_REGION"
        aws logs put-retention-policy --log-group-name "$log_group" --retention-in-days 30 --region "$AWS_REGION"
        echo -e "${GREEN}✓ Created log group: $log_group${NC}"
    fi
}

create_log_group "/aws/krishi-era/application"
create_log_group "/aws/bedrock/krishi-era"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Update your backend/.env file with these values:${NC}"
echo ""
echo "AWS_REGION=$AWS_REGION"
echo "AWS_ACCESS_KEY_ID=<your-access-key>"
echo "AWS_SECRET_ACCESS_KEY=<your-secret-key>"
echo ""
echo "DYNAMODB_USERS_TABLE=krishi-users"
echo "DYNAMODB_CROPS_TABLE=krishi-crops"
echo "DYNAMODB_ORDERS_TABLE=krishi-orders"
echo "DYNAMODB_SHIPMENTS_TABLE=krishi-shipments"
echo "DYNAMODB_STORAGE_TABLE=krishi-storage"
echo "DYNAMODB_TRANSACTIONS_TABLE=krishi-transactions"
echo ""
echo "S3_IMAGES_BUCKET=$IMAGES_BUCKET"
echo "S3_DOCUMENTS_BUCKET=$DOCUMENTS_BUCKET"
echo ""
echo "SNS_NOTIFICATIONS_TOPIC_ARN=$TOPIC_ARN"
echo ""
echo "IOT_ENDPOINT=$IOT_ENDPOINT"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Enable Amazon Bedrock model access via AWS Console"
echo "2. Update your .env file with the values above"
echo "3. Run: cd backend && npm install && npm run dev"
echo ""
echo -e "${GREEN}For detailed setup instructions, see: docs/AWS_SETUP_GUIDE.md${NC}"
