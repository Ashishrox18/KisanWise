#!/bin/bash

# Krishi Era AI - AWS Cleanup Script
# WARNING: This script will DELETE all AWS resources created for Krishi Era AI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

AWS_REGION=${AWS_REGION:-us-east-1}

echo -e "${RED}========================================${NC}"
echo -e "${RED}Krishi Era AI - AWS Cleanup${NC}"
echo -e "${RED}========================================${NC}"
echo ""
echo -e "${RED}WARNING: This will DELETE all AWS resources!${NC}"
echo -e "${YELLOW}This action cannot be undone.${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Starting cleanup...${NC}"
echo ""

# Delete DynamoDB Tables
echo -e "${YELLOW}Deleting DynamoDB Tables...${NC}"
for table in krishi-users krishi-crops krishi-orders krishi-shipments krishi-storage krishi-transactions; do
    if aws dynamodb describe-table --table-name "$table" --region "$AWS_REGION" &> /dev/null; then
        echo "Deleting table: $table"
        aws dynamodb delete-table --table-name "$table" --region "$AWS_REGION" > /dev/null
        echo -e "${GREEN}✓ Deleted: $table${NC}"
    else
        echo -e "${YELLOW}Table $table not found, skipping...${NC}"
    fi
done
echo ""

# Delete S3 Buckets
echo -e "${YELLOW}Deleting S3 Buckets...${NC}"
for bucket in $(aws s3 ls | grep krishi | awk '{print $3}'); do
    echo "Emptying and deleting bucket: $bucket"
    aws s3 rm "s3://$bucket" --recursive > /dev/null 2>&1 || true
    aws s3 rb "s3://$bucket" --force > /dev/null 2>&1 || true
    echo -e "${GREEN}✓ Deleted: $bucket${NC}"
done
echo ""

# Delete SNS Topics
echo -e "${YELLOW}Deleting SNS Topics...${NC}"
for topic_arn in $(aws sns list-topics --region "$AWS_REGION" --query 'Topics[?contains(TopicArn, `krishi`)].TopicArn' --output text); do
    echo "Deleting topic: $topic_arn"
    aws sns delete-topic --topic-arn "$topic_arn" --region "$AWS_REGION"
    echo -e "${GREEN}✓ Deleted: $topic_arn${NC}"
done
echo ""

# Delete Location Service Resources
echo -e "${YELLOW}Deleting Location Service Resources...${NC}"
if aws location describe-place-index --index-name KrishiPlaceIndex --region "$AWS_REGION" &> /dev/null; then
    aws location delete-place-index --index-name KrishiPlaceIndex --region "$AWS_REGION"
    echo -e "${GREEN}✓ Deleted Place Index: KrishiPlaceIndex${NC}"
fi

if aws location describe-route-calculator --calculator-name KrishiRouteCalculator --region "$AWS_REGION" &> /dev/null; then
    aws location delete-route-calculator --calculator-name KrishiRouteCalculator --region "$AWS_REGION"
    echo -e "${GREEN}✓ Deleted Route Calculator: KrishiRouteCalculator${NC}"
fi
echo ""

# Delete CloudWatch Log Groups
echo -e "${YELLOW}Deleting CloudWatch Log Groups...${NC}"
for log_group in $(aws logs describe-log-groups --region "$AWS_REGION" --query 'logGroups[?contains(logGroupName, `krishi`)].logGroupName' --output text); do
    echo "Deleting log group: $log_group"
    aws logs delete-log-group --log-group-name "$log_group" --region "$AWS_REGION"
    echo -e "${GREEN}✓ Deleted: $log_group${NC}"
done
echo ""

# Delete IoT Things (optional)
echo -e "${YELLOW}Deleting IoT Things...${NC}"
for thing in $(aws iot list-things --region "$AWS_REGION" --query 'things[?contains(thingName, `krishi`)].thingName' --output text); do
    echo "Deleting thing: $thing"
    
    # Detach principals
    for principal in $(aws iot list-thing-principals --thing-name "$thing" --region "$AWS_REGION" --query 'principals' --output text); do
        aws iot detach-thing-principal --thing-name "$thing" --principal "$principal" --region "$AWS_REGION"
    done
    
    aws iot delete-thing --thing-name "$thing" --region "$AWS_REGION"
    echo -e "${GREEN}✓ Deleted: $thing${NC}"
done
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Cleanup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Note: Some resources may take a few minutes to fully delete.${NC}"
echo -e "${YELLOW}IAM users and policies must be deleted manually via AWS Console.${NC}"
