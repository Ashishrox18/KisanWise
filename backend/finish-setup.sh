#!/bin/bash
set -e

REGION="us-east-1"
ACCOUNT_ID="120569622669"
ECR_URL="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/krishi-era-backend"

echo "Registering task definition..."

# Create task definition
cat > /tmp/task-def.json <<'EOF'
{
  "family": "krishi-era-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::120569622669:role/KrishiECSExecutionRole",
  "taskRoleArn": "arn:aws:iam::120569622669:role/KrishiECSTaskRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "120569622669.dkr.ecr.us-east-1.amazonaws.com/krishi-era-backend:latest",
      "portMappings": [{"containerPort": 3000, "protocol": "tcp"}],
      "essential": true,
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "AWS_REGION", "value": "us-east-1"},
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
        {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:us-east-1:120569622669:secret:krishi/jwt-secret"},
        {"name": "GROQ_API_KEY", "valueFrom": "arn:aws:secretsmanager:us-east-1:120569622669:secret:krishi/groq-api-key"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/krishi-era-backend",
          "awslogs-region": "us-east-1",
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

aws ecs register-task-definition --cli-input-json file:///tmp/task-def.json --region us-east-1 > /dev/null
echo "✅ Task definition registered"

echo ""
echo "Creating ECS service..."

# Get subnets and security group
SUBNET1=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-0059bfa39e539a44f" --query 'Subnets[0].SubnetId' --output text --region us-east-1)
SUBNET2=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-0059bfa39e539a44f" --query 'Subnets[1].SubnetId' --output text --region us-east-1)

aws ecs create-service \
  --cluster krishi-era-cluster \
  --service-name krishi-backend-service \
  --task-definition krishi-era-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET1},${SUBNET2}],securityGroups=[sg-0dd255d9e650fe3d9],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:120569622669:targetgroup/krishi-backend-tg/8237f1c017c88936,containerName=backend,containerPort=3000" \
  --health-check-grace-period-seconds 60 \
  --region us-east-1 > /dev/null

echo "✅ ECS service created"
echo ""
echo "========================================="
echo "Infrastructure Setup Complete! 🎉"
echo "========================================="
echo ""
echo "ALB URL: krishi-era-alb-536422943.us-east-1.elb.amazonaws.com"
echo ""
echo "Next: Run ./deploy-ecs.sh to build and deploy your app"
