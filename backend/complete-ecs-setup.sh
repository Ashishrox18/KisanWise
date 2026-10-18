#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text --region ${REGION})
ALB_ARN="arn:aws:elasticloadbalancing:us-east-1:120569622669:loadbalancer/app/krishi-era-alb/d53e5e4b83f0c5f3"
ECR_URL="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/krishi-era-backend"

echo -e "${BLUE}Completing ECS Infrastructure Setup${NC}"
echo "===================================="
echo ""

# Step 1: Create Target Group
echo -e "${YELLOW}📍 Step 1: Creating Target Group...${NC}"
TG_ARN=$(aws elbv2 describe-target-groups \
  --names krishi-backend-tg \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text \
  --region ${REGION} 2>/dev/null)

if [ -z "$TG_ARN" ] || [ "$TG_ARN" == "None" ]; then
    TG_ARN=$(aws elbv2 create-target-group \
      --name krishi-backend-tg \
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
echo -e "${GREEN}✅ Target Group: ${TG_ARN}${NC}"
echo ""

# Step 2: Create Listener
echo -e "${YELLOW}🎧 Step 2: Creating Listener...${NC}"
LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn ${ALB_ARN} \
  --query 'Listeners[0].ListenerArn' \
  --output text \
  --region ${REGION} 2>/dev/null)

if [ -z "$LISTENER_ARN" ] || [ "$LISTENER_ARN" == "None" ]; then
    LISTENER_ARN=$(aws elbv2 create-listener \
      --load-balancer-arn ${ALB_ARN} \
      --protocol HTTP \
      --port 80 \
      --default-actions Type=forward,TargetGroupArn=${TG_ARN} \
      --query 'Listeners[0].ListenerArn' \
      --output text \
      --region ${REGION})
fi
echo -e "${GREEN}✅ Listener created${NC}"
echo ""

# Step 3: Register Task Definition
echo -e "${YELLOW}📝 Step 3: Registering Task Definition...${NC}"

cat > /tmp/task-definition.json <<EOF
{
  "family": "krishi-era-backend",
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
          "awslogs-group": "/ecs/krishi-era-backend",
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

# Step 4: Create ECS Service
echo -e "${YELLOW}🚀 Step 4: Creating ECS Service...${NC}"

# Get subnets and security group
SUBNET1=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query 'Subnets[0].SubnetId' --output text --region ${REGION})
SUBNET2=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query 'Subnets[1].SubnetId' --output text --region ${REGION})
ECS_SG=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=krishi-ecs-tasks-sg" "Name=vpc-id,Values=${VPC_ID}" --query 'SecurityGroups[0].GroupId' --output text --region ${REGION})

# Check if service exists
SERVICE_EXISTS=$(aws ecs describe-services \
  --cluster krishi-era-cluster \
  --services krishi-backend-service \
  --region ${REGION} 2>/dev/null | grep -c "krishi-backend-service" || echo "0")

if [ "$SERVICE_EXISTS" == "0" ]; then
    aws ecs create-service \
      --cluster krishi-era-cluster \
      --service-name krishi-backend-service \
      --task-definition krishi-era-backend \
      --desired-count 1 \
      --launch-type FARGATE \
      --platform-version LATEST \
      --network-configuration "awsvpcConfiguration={subnets=[${SUBNET1},${SUBNET2}],securityGroups=[${ECS_SG}],assignPublicIp=ENABLED}" \
      --load-balancers "targetGroupArn=${TG_ARN},containerName=backend,containerPort=3000" \
      --health-check-grace-period-seconds 60 \
      --region ${REGION} > /dev/null
    
    echo -e "${GREEN}✅ ECS service created${NC}"
else
    echo -e "${GREEN}✅ ECS service already exists${NC}"
fi
echo ""

# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns ${ALB_ARN} \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region ${REGION})

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Infrastructure Setup Complete! 🎉   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📋 Summary:${NC}"
echo -e "  ALB DNS: ${ALB_DNS}"
echo -e "  Target Group: Created"
echo -e "  Listener: Port 80 → Backend"
echo -e "  Task Definition: Registered"
echo -e "  ECS Service: Created (desired count: 1)"
echo ""
echo -e "${YELLOW}⚠️  Important: No Docker image in ECR yet!${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "  1. Build and push Docker image:"
echo -e "     ${BLUE}./deploy-ecs.sh${NC}"
echo ""
echo -e "  2. Your API will be available at:"
echo -e "     ${GREEN}http://${ALB_DNS}${NC}"
echo ""
echo -e "  3. Update frontend .env.production:"
echo -e "     ${BLUE}VITE_API_BASE_URL=http://${ALB_DNS}/api${NC}"
echo ""
echo -e "${GREEN}✨ Ready to deploy!${NC}"
