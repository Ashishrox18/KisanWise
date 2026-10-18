#!/bin/bash

# Krishi Era AI - AWS Setup Verification Script
# This script verifies all AWS resources are properly configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

AWS_REGION=${AWS_REGION:-us-east-1}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Krishi Era AI - Setup Verification${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Function to check resource
check_resource() {
    local resource_name=$1
    local check_command=$2
    
    if eval "$check_command" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $resource_name"
        return 0
    else
        echo -e "${RED}✗${NC} $resource_name"
        ((ERRORS++))
        return 1
    fi
}

# Check AWS CLI
echo -e "${YELLOW}Checking Prerequisites...${NC}"
check_resource "AWS CLI installed" "command -v aws"
check_resource "AWS credentials configured" "aws sts get-caller-identity"
echo ""

# Check DynamoDB Tables
echo -e "${YELLOW}Checking DynamoDB Tables...${NC}"
check_resource "krishi-users table" "aws dynamodb describe-table --table-name krishi-users --region $AWS_REGION"
check_resource "krishi-crops table" "aws dynamodb describe-table --table-name krishi-crops --region $AWS_REGION"
check_resource "krishi-orders table" "aws dynamodb describe-table --table-name krishi-orders --region $AWS_REGION"
check_resource "krishi-shipments table" "aws dynamodb describe-table --table-name krishi-shipments --region $AWS_REGION"
check_resource "krishi-storage table" "aws dynamodb describe-table --table-name krishi-storage --region $AWS_REGION"
check_resource "krishi-transactions table" "aws dynamodb describe-table --table-name krishi-transactions --region $AWS_REGION"
echo ""

# Check S3 Buckets
echo -e "${YELLOW}Checking S3 Buckets...${NC}"
IMAGES_BUCKET=$(aws s3 ls | grep krishi-images | awk '{print $3}' | head -1)
DOCUMENTS_BUCKET=$(aws s3 ls | grep krishi-documents | awk '{print $3}' | head -1)

if [ -n "$IMAGES_BUCKET" ]; then
    echo -e "${GREEN}✓${NC} Images bucket: $IMAGES_BUCKET"
else
    echo -e "${RED}✗${NC} Images bucket not found"
    ((ERRORS++))
fi

if [ -n "$DOCUMENTS_BUCKET" ]; then
    echo -e "${GREEN}✓${NC} Documents bucket: $DOCUMENTS_BUCKET"
else
    echo -e "${RED}✗${NC} Documents bucket not found"
    ((ERRORS++))
fi
echo ""

# Check SNS
echo -e "${YELLOW}Checking SNS...${NC}"
TOPIC_ARN=$(aws sns list-topics --region "$AWS_REGION" --query 'Topics[?contains(TopicArn, `krishi-notifications`)].TopicArn' --output text)
if [ -n "$TOPIC_ARN" ]; then
    echo -e "${GREEN}✓${NC} SNS Topic: $TOPIC_ARN"
else
    echo -e "${RED}✗${NC} SNS Topic not found"
    ((ERRORS++))
fi
echo ""

# Check Location Service
echo -e "${YELLOW}Checking Location Service...${NC}"
check_resource "Place Index (KrishiPlaceIndex)" "aws location describe-place-index --index-name KrishiPlaceIndex --region $AWS_REGION"
check_resource "Route Calculator (KrishiRouteCalculator)" "aws location describe-route-calculator --calculator-name KrishiRouteCalculator --region $AWS_REGION"
echo ""

# Check IoT
echo -e "${YELLOW}Checking IoT Core...${NC}"
IOT_ENDPOINT=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS --region "$AWS_REGION" --query 'endpointAddress' --output text 2>/dev/null)
if [ -n "$IOT_ENDPOINT" ]; then
    echo -e "${GREEN}✓${NC} IoT Endpoint: $IOT_ENDPOINT"
else
    echo -e "${YELLOW}⚠${NC} IoT Endpoint not configured (optional)"
    ((WARNINGS++))
fi
echo ""

# Check Bedrock
echo -e "${YELLOW}Checking Amazon Bedrock...${NC}"
if aws bedrock list-foundation-models --region "$AWS_REGION" &> /dev/null; then
    echo -e "${GREEN}✓${NC} Bedrock API accessible"
    
    # Check if Claude model is available
    if aws bedrock list-foundation-models --region "$AWS_REGION" --query 'modelSummaries[?contains(modelId, `claude-3-sonnet`)]' --output text | grep -q "claude"; then
        echo -e "${GREEN}✓${NC} Claude 3 Sonnet model available"
    else
        echo -e "${YELLOW}⚠${NC} Claude 3 Sonnet model access not enabled"
        echo -e "  ${YELLOW}→${NC} Enable via AWS Console: Bedrock → Model access"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} Bedrock API not accessible"
    ((ERRORS++))
fi
echo ""

# Check CloudWatch
echo -e "${YELLOW}Checking CloudWatch...${NC}"
check_resource "Application log group" "aws logs describe-log-groups --log-group-name-prefix /aws/krishi-era/application --region $AWS_REGION"
check_resource "Bedrock log group" "aws logs describe-log-groups --log-group-name-prefix /aws/bedrock/krishi-era --region $AWS_REGION"
echo ""

# Check Rekognition
echo -e "${YELLOW}Checking Rekognition...${NC}"
if aws rekognition list-collections --region "$AWS_REGION" &> /dev/null; then
    echo -e "${GREEN}✓${NC} Rekognition API accessible"
else
    echo -e "${RED}✗${NC} Rekognition API not accessible"
    ((ERRORS++))
fi
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Verification Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo -e "${GREEN}Your AWS setup is complete and ready to use.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo ""
    echo -e "${YELLOW}Setup is functional but some optional features may not work.${NC}"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo -e "${RED}Please fix the errors above before proceeding.${NC}"
    echo -e "See docs/AWS_SETUP_GUIDE.md for detailed setup instructions."
    exit 1
fi
