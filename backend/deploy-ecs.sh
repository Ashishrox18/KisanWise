#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION="us-east-1"
CLUSTER_NAME="krishi-era-cluster"
SERVICE_NAME="krishi-backend-service"
ECR_REPO_NAME="krishi-era-backend"

echo -e "${GREEN}🚀 Starting ECS Fargate Deployment${NC}"
echo "=================================="

# Get AWS account ID
echo -e "${YELLOW}📋 Getting AWS account ID...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Failed to get AWS account ID. Is AWS CLI configured?${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Account ID: ${ACCOUNT_ID}${NC}"

ECR_URL="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO_NAME}"

# Build Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t ${ECR_REPO_NAME}:latest .
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker image built successfully${NC}"

# Login to ECR
echo -e "${YELLOW}🔐 Logging into ECR...${NC}"
aws ecr get-login-password --region ${REGION} | \
  docker login --username AWS --password-stdin ${ECR_URL}
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ECR login failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Logged into ECR${NC}"

# Tag image
echo -e "${YELLOW}🏷️  Tagging image...${NC}"
docker tag ${ECR_REPO_NAME}:latest ${ECR_URL}:latest
docker tag ${ECR_REPO_NAME}:latest ${ECR_URL}:$(date +%Y%m%d-%H%M%S)
echo -e "${GREEN}✅ Image tagged${NC}"

# Push to ECR
echo -e "${YELLOW}📤 Pushing image to ECR...${NC}"
docker push ${ECR_URL}:latest
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to push image to ECR${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Image pushed to ECR${NC}"

# Update ECS service
echo -e "${YELLOW}🔄 Updating ECS service...${NC}"
aws ecs update-service \
  --cluster ${CLUSTER_NAME} \
  --service ${SERVICE_NAME} \
  --force-new-deployment \
  --region ${REGION} \
  --output json > /dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to update ECS service${NC}"
    exit 1
fi
echo -e "${GREEN}✅ ECS service update initiated${NC}"

# Wait for service to stabilize
echo -e "${YELLOW}⏳ Waiting for service to stabilize (this may take a few minutes)...${NC}"
aws ecs wait services-stable \
  --cluster ${CLUSTER_NAME} \
  --services ${SERVICE_NAME} \
  --region ${REGION}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Service is stable and running!${NC}"
    
    # Get ALB URL
    echo -e "${YELLOW}🔍 Getting Application Load Balancer URL...${NC}"
    ALB_ARN=$(aws ecs describe-services \
      --cluster ${CLUSTER_NAME} \
      --services ${SERVICE_NAME} \
      --region ${REGION} \
      --query 'services[0].loadBalancers[0].targetGroupArn' \
      --output text)
    
    if [ ! -z "$ALB_ARN" ] && [ "$ALB_ARN" != "None" ]; then
        ALB_NAME=$(aws elbv2 describe-target-groups \
          --target-group-arns ${ALB_ARN} \
          --region ${REGION} \
          --query 'TargetGroups[0].LoadBalancerArns[0]' \
          --output text)
        
        ALB_DNS=$(aws elbv2 describe-load-balancers \
          --load-balancer-arns ${ALB_NAME} \
          --region ${REGION} \
          --query 'LoadBalancers[0].DNSName' \
          --output text)
        
        echo -e "${GREEN}🌐 Your API is available at: http://${ALB_DNS}${NC}"
        echo -e "${GREEN}🏥 Health check: http://${ALB_DNS}/health${NC}"
    fi
else
    echo -e "${RED}❌ Service failed to stabilize${NC}"
    echo -e "${YELLOW}📋 Check logs with: aws logs tail /ecs/krishi-era-backend --follow${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo "=================================="
