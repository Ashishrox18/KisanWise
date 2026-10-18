#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="us-east-1"
CLUSTER_NAME="krishi-era-cluster"
SERVICE_NAME="krishi-backend-service"
ECR_REPO_NAME="krishi-era-backend"
TASK_FAMILY="krishi-era-backend"
LOG_GROUP="/ecs/krishi-era-backend"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ECS Fargate Infrastructure Setup     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Get AWS account ID
echo -e "${YELLOW}📋 Step 1: Getting AWS account ID...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Failed to get AWS account ID. Is AWS CLI configured?${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Account ID: ${ACCOUNT_ID}${NC}"
echo ""

# Create ECR repository
echo -e "${YELLOW}📦 Step 2: Creating ECR repository...${NC}"
aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} --region ${REGION} 2>/dev/null || \
aws ecr create-repository \
  --repository-name ${ECR_REPO_NAME} \
  --region ${REGION} \
  --output json > /dev/null

ECR_URL="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO_NAME}"
echo -e "${GREEN}✅ ECR Repository: ${ECR_URL}${NC}"
echo ""

# Create ECS cluster
echo -e "${YELLOW}🏗️  Step 3: Creating ECS cluster...${NC}"
aws ecs describe-clusters --clusters ${CLUSTER_NAME} --region ${REGION} 2>/dev/null | grep -q ${CLUSTER_NAME} || \
aws ecs create-cluster \
  --cluster-name ${CLUSTER_NAME} \
  --region ${REGION} \
  --output json > /dev/null
echo -e "${GREEN}✅ ECS Cluster: ${CLUSTER_NAME}${NC}"
echo ""

# Create CloudWatch log group
echo -e "${YELLOW}📊 Step 4: Creating CloudWatch log group...${NC}"
aws logs describe-log-groups --log-group-name-prefix ${LOG_GROUP} --region ${REGION} 2>/dev/null | grep -q ${LOG_GROUP} || \
aws logs create-log-group \
  --log-group-name ${LOG_GROUP} \
  --region ${REGION}
echo -e "${GREEN}✅ Log Group: ${LOG_GROUP}${NC}"
echo ""

# Create secrets in Secrets Manager
echo -e "${YELLOW}🔐 Step 5: Setting up secrets...${NC}"
echo -e "${BLUE}Please provide the following secrets:${NC}"

# JWT Secret
read -sp "Enter JWT_SECRET (press enter to use existing): " JWT_SECRET
echo ""
if [ ! -z "$JWT_SECRET" ]; then
    aws secretsmanager describe-secret --secret-id krishi/jwt-secret --region ${REGION} 2>/dev/null && \
    aws secretsmanager update-secret \
      --secret-id krishi/jwt-secret \
      --secret-string "${JWT_SECRET}" \
      --region ${REGION} > /dev/null || \
    aws secretsmanager create-secret \
      --name krishi/jwt-secret \
      --secret-string "${JWT_SECRET}" \
      --region ${REGION} > /dev/null
    echo -e "${GREEN}✅ JWT secret configured${NC}"
fi

# Groq API Key
read -sp "Enter GROQ_API_KEY (press enter to use existing): " GROQ_KEY
echo ""
if [ ! -z "$GROQ_KEY" ]; then
    aws secretsmanager describe-secret --secret-id krishi/groq-api-key --region ${REGION} 2>/dev/null && \
    aws secretsmanager update-secret \
      --secret-id krishi/groq-api-key \
      --secret-string "${GROQ_KEY}" \
      --region ${REGION} > /dev/null || \
    aws secretsmanager create-secret \
      --name krishi/groq-api-key \
      --secret-string "${GROQ_KEY}" \
      --region ${REGION} > /dev/null
    echo -e "${GREEN}✅ Groq API key configured${NC}"
fi
echo ""

# Create IAM roles
echo -e "${YELLOW}👤 Step 6: Creating IAM roles...${NC}"

# Task execution role
aws iam get-role --role-name KrishiECSExecutionRole 2>/dev/null || \
aws iam create-role \
  --role-name KrishiECSExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' > /dev/null

aws iam attach-role-policy \
  --role-name KrishiECSExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true

# Add secrets access
aws iam put-role-policy \
  --role-name KrishiECSExecutionRole \
  --policy-name SecretsAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": ["arn:aws:secretsmanager:'${REGION}':'${ACCOUNT_ID}':secret:krishi/*"]
    }]
  }' 2>/dev/null || true

echo -e "${GREEN}✅ Execution role created${NC}"

# Task role
aws iam get-role --role-name KrishiECSTaskRole 2>/dev/null || \
aws iam create-role \
  --role-name KrishiECSTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' > /dev/null

aws iam put-role-policy \
  --role-name KrishiECSTaskRole \
  --policy-name KrishiECSTaskPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ],
        "Resource": ["arn:aws:dynamodb:'${REGION}':'${ACCOUNT_ID}':table/krishi-*"]
      },
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ],
        "Resource": ["arn:aws:s3:::krishi-*/*"]
      },
      {
        "Effect": "Allow",
        "Action": ["sns:Publish"],
        "Resource": ["arn:aws:sns:'${REGION}':'${ACCOUNT_ID}':krishi-*"]
      }
    ]
  }' 2>/dev/null || true

echo -e "${GREEN}✅ Task role created${NC}"
echo ""

# Get default VPC
echo -e "${YELLOW}🌐 Step 7: Setting up networking...${NC}"
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text \
  --region ${REGION})

if [ -z "$VPC_ID" ] || [ "$VPC_ID" == "None" ]; then
    echo -e "${RED}❌ No default VPC found. Please create a VPC first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Using VPC: ${VPC_ID}${NC}"

# Get subnets (pick first 2 from different AZs)
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=${VPC_ID}" \
  --query 'Subnets[0:2].SubnetId' \
  --output text \
  --region ${REGION} | tr '\t' ' ')
echo -e "${GREEN}✅ Found subnets${NC}"

# Create security group for ALB
ALB_SG_NAME="krishi-alb-sg"
ALB_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${ALB_SG_NAME}" "Name=vpc-id,Values=${VPC_ID}" \
  --query 'SecurityGroups[0].GroupId' \
  --output text \
  --region ${REGION} 2>/dev/null)

if [ -z "$ALB_SG" ] || [ "$ALB_SG" == "None" ]; then
    ALB_SG=$(aws ec2 create-security-group \
      --group-name ${ALB_SG_NAME} \
      --description "Security group for Krishi ALB" \
      --vpc-id ${VPC_ID} \
      --query 'GroupId' \
      --output text \
      --region ${REGION})
    
    # Allow HTTP
    aws ec2 authorize-security-group-ingress \
      --group-id ${ALB_SG} \
      --protocol tcp \
      --port 80 \
      --cidr 0.0.0.0/0 \
      --region ${REGION} 2>/dev/null || true
    
    # Allow HTTPS
    aws ec2 authorize-security-group-ingress \
      --group-id ${ALB_SG} \
      --protocol tcp \
      --port 443 \
      --cidr 0.0.0.0/0 \
      --region ${REGION} 2>/dev/null || true
fi
echo -e "${GREEN}✅ ALB Security Group: ${ALB_SG}${NC}"

# Create security group for ECS tasks
ECS_SG_NAME="krishi-ecs-tasks-sg"
ECS_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${ECS_SG_NAME}" "Name=vpc-id,Values=${VPC_ID}" \
  --query 'SecurityGroups[0].GroupId' \
  --output text \
  --region ${REGION} 2>/dev/null)

if [ -z "$ECS_SG" ] || [ "$ECS_SG" == "None" ]; then
    ECS_SG=$(aws ec2 create-security-group \
      --group-name ${ECS_SG_NAME} \
      --description "Security group for Krishi ECS tasks" \
      --vpc-id ${VPC_ID} \
      --query 'GroupId' \
      --output text \
      --region ${REGION})
    
    # Allow traffic from ALB
    aws ec2 authorize-security-group-ingress \
      --group-id ${ECS_SG} \
      --protocol tcp \
      --port 3000 \
      --source-group ${ALB_SG} \
      --region ${REGION} 2>/dev/null || true
fi
echo -e "${GREEN}✅ ECS Security Group: ${ECS_SG}${NC}"
echo ""

# Create Application Load Balancer
echo -e "${YELLOW}⚖️  Step 8: Creating Application Load Balancer...${NC}"
ALB_NAME="krishi-era-alb"
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names ${ALB_NAME} \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text \
  --region ${REGION} 2>/dev/null)

if [ -z "$ALB_ARN" ] || [ "$ALB_ARN" == "None" ]; then
    ALB_ARN=$(aws elbv2 create-load-balancer \
      --name ${ALB_NAME} \
      --subnets ${SUBNET_IDS} \
      --security-groups ${ALB_SG} \
      --scheme internet-facing \
      --type application \
      --query 'LoadBalancers[0].LoadBalancerArn' \
      --output text \
      --region ${REGION})
    
    echo -e "${YELLOW}⏳ Waiting for ALB to become active...${NC}"
    aws elbv2 wait load-balancer-available \
      --load-balancer-arns ${ALB_ARN} \
      --region ${REGION}
fi

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns ${ALB_ARN} \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region ${REGION})
echo -e "${GREEN}✅ ALB DNS: ${ALB_DNS}${NC}"

# Create target group
TG_NAME="krishi-backend-tg"
TG_ARN=$(aws elbv2 describe-target-groups \
  --names ${TG_NAME} \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text \
  --region ${REGION} 2>/dev/null)

if [ -z "$TG_ARN" ] || [ "$TG_ARN" == "None" ]; then
    TG_ARN=$(aws elbv2 create-target-group \
      --name ${TG_NAME} \
      --protocol HTTP \
      --port 3000 \
      --vpc-id ${VPC_ID} \
      --target-type ip \
      --health-check-path /health \
      --health-check-interval-seconds 30 \
      --health-check-timeout-seconds 5 \
      --healthy-threshold-count 2 \
      --unhealthy-threshold-count 3 \
      --query 'TargetGroups[0].TargetGroupArn' \
      --output text \
      --region ${REGION})
fi
echo -e "${GREEN}✅ Target Group created${NC}"

# Create listener
LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn ${ALB_ARN} \
  --query 'Listeners[0].ListenerArn' \
  --output text \
  --region ${REGION} 2>/dev/null)

if [ -z "$LISTENER_ARN" ] || [ "$LISTENER_ARN" == "None" ]; then
    aws elbv2 create-listener \
      --load-balancer-arn ${ALB_ARN} \
      --protocol HTTP \
      --port 80 \
      --default-actions Type=forward,TargetGroupArn=${TG_ARN} \
      --region ${REGION} > /dev/null
fi
echo -e "${GREEN}✅ Listener configured${NC}"
echo ""

# Register task definition
echo -e "${YELLOW}📝 Step 9: Registering task definition...${NC}"

# Create task definition JSON
cat > /tmp/task-definition.json <<EOF
{
  "family": "${TASK_FAMILY}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::${ACCOUNT_ID}:role/KrishiECSExecutionRole",
  "taskRoleArn": "arn:aws:iam::${ACCOUNT_ID}:role/KrishiECSTaskRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "${ECR_URL}:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "AWS_REGION", "value": "${REGION}"},
        {"name": "USE_LOCAL_STORAGE", "value": "false"},
        {"name": "DYNAMODB_USERS_TABLE", "value": "krishi-users"},
        {"name": "DYNAMODB_CROPS_TABLE", "value": "krishi-crops"},
        {"name": "DYNAMODB_ORDERS_TABLE", "value": "krishi-orders"},
        {"name": "DYNAMODB_STORAGE_TABLE", "value": "krishi-storage"},
        {"name": "DYNAMODB_SHIPMENTS_TABLE", "value": "krishi-shipments"},
        {"name": "DYNAMODB_TRANSACTIONS_TABLE", "value": "krishi-transactions"},
        {"name": "S3_IMAGES_BUCKET", "value": "krishi-images-1772218008"},
        {"name": "S3_DOCUMENTS_BUCKET", "value": "krishi-documents-1772218008"},
        {"name": "USE_GROQ", "value": "true"}
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:krishi/jwt-secret"
        },
        {
          "name": "GROQ_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:krishi/groq-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "${LOG_GROUP}",
          "awslogs-region": "${REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-definition.json \
  --region ${REGION} > /dev/null

echo -e "${GREEN}✅ Task definition registered${NC}"
echo ""

# Create ECS service
echo -e "${YELLOW}🚀 Step 10: Creating ECS service...${NC}"

# Convert subnet IDs to comma-separated list
SUBNETS_CSV=$(echo ${SUBNET_IDS} | tr ' ' ',')

aws ecs describe-services \
  --cluster ${CLUSTER_NAME} \
  --services ${SERVICE_NAME} \
  --region ${REGION} 2>/dev/null | grep -q ${SERVICE_NAME} || \
aws ecs create-service \
  --cluster ${CLUSTER_NAME} \
  --service-name ${SERVICE_NAME} \
  --task-definition ${TASK_FAMILY} \
  --desired-count 1 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS_CSV}],securityGroups=[${ECS_SG}],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=${TG_ARN},containerName=backend,containerPort=3000" \
  --health-check-grace-period-seconds 60 \
  --region ${REGION} > /dev/null

echo -e "${GREEN}✅ ECS service created${NC}"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Infrastructure Setup Complete!    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📋 Summary:${NC}"
echo -e "  ECR Repository: ${ECR_URL}"
echo -e "  ECS Cluster: ${CLUSTER_NAME}"
echo -e "  ECS Service: ${SERVICE_NAME}"
echo -e "  ALB DNS: ${ALB_DNS}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "  1. Build and push your Docker image:"
echo -e "     ${BLUE}cd backend && ./deploy-ecs.sh${NC}"
echo ""
echo -e "  2. Your API will be available at:"
echo -e "     ${GREEN}http://${ALB_DNS}${NC}"
echo ""
echo -e "  3. Update your frontend .env.production:"
echo -e "     ${BLUE}VITE_API_BASE_URL=http://${ALB_DNS}/api${NC}"
echo ""
echo -e "${GREEN}✨ Happy deploying!${NC}"
