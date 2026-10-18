#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

REGION="us-east-1"

echo -e "${YELLOW}🔍 Checking Deployment Status...${NC}"
echo "=================================="
echo ""

# Check ALB
echo -e "${YELLOW}⚖️  Application Load Balancer:${NC}"
ALB_STATUS=$(aws elbv2 describe-load-balancers \
  --names krishi-era-alb \
  --region ${REGION} \
  --query 'LoadBalancers[0].[State.Code,DNSName]' \
  --output text 2>/dev/null)

if [ $? -eq 0 ]; then
    STATE=$(echo $ALB_STATUS | awk '{print $1}')
    DNS=$(echo $ALB_STATUS | awk '{print $2}')
    if [ "$STATE" == "active" ]; then
        echo -e "${GREEN}✅ Status: Active${NC}"
        echo -e "${GREEN}🌐 DNS: ${DNS}${NC}"
    else
        echo -e "${YELLOW}⏳ Status: ${STATE}${NC}"
    fi
else
    echo -e "${RED}❌ Not created yet${NC}"
fi
echo ""

# Check ECS Cluster
echo -e "${YELLOW}🏗️  ECS Cluster:${NC}"
CLUSTER_STATUS=$(aws ecs describe-clusters \
  --clusters krishi-era-cluster \
  --region ${REGION} \
  --query 'clusters[0].[status,runningTasksCount,pendingTasksCount]' \
  --output text 2>/dev/null)

if [ $? -eq 0 ]; then
    STATUS=$(echo $CLUSTER_STATUS | awk '{print $1}')
    RUNNING=$(echo $CLUSTER_STATUS | awk '{print $2}')
    PENDING=$(echo $CLUSTER_STATUS | awk '{print $3}')
    echo -e "${GREEN}✅ Status: ${STATUS}${NC}"
    echo -e "   Running tasks: ${RUNNING}"
    echo -e "   Pending tasks: ${PENDING}"
else
    echo -e "${RED}❌ Not created yet${NC}"
fi
echo ""

# Check ECS Service
echo -e "${YELLOW}🚀 ECS Service:${NC}"
SERVICE_STATUS=$(aws ecs describe-services \
  --cluster krishi-era-cluster \
  --services krishi-backend-service \
  --region ${REGION} \
  --query 'services[0].[status,runningCount,desiredCount]' \
  --output text 2>/dev/null)

if [ $? -eq 0 ]; then
    STATUS=$(echo $SERVICE_STATUS | awk '{print $1}')
    RUNNING=$(echo $SERVICE_STATUS | awk '{print $2}')
    DESIRED=$(echo $SERVICE_STATUS | awk '{print $3}')
    echo -e "${GREEN}✅ Status: ${STATUS}${NC}"
    echo -e "   Running: ${RUNNING}/${DESIRED}"
else
    echo -e "${YELLOW}⏳ Not created yet${NC}"
fi
echo ""

# Check ECR
echo -e "${YELLOW}📦 ECR Repository:${NC}"
ECR_STATUS=$(aws ecr describe-repositories \
  --repository-names krishi-era-backend \
  --region ${REGION} \
  --query 'repositories[0].repositoryUri' \
  --output text 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ ${ECR_STATUS}${NC}"
    
    # Check for images
    IMAGE_COUNT=$(aws ecr list-images \
      --repository-name krishi-era-backend \
      --region ${REGION} \
      --query 'length(imageIds)' \
      --output text 2>/dev/null)
    echo -e "   Images: ${IMAGE_COUNT}"
else
    echo -e "${RED}❌ Not created yet${NC}"
fi
echo ""

echo "=================================="
echo -e "${YELLOW}💡 Tip: Run this script again to check updated status${NC}"
