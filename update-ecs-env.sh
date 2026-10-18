#!/bin/bash

echo "🔧 Updating ECS Task Definition with Missing Environment Variables"
echo "===================================================================="
echo ""

# Get current task definition
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition krishi-era-backend \
  --region us-east-1 \
  --query 'taskDefinition')

# Extract relevant fields and add missing environment variable
NEW_TASK_DEF=$(echo $TASK_DEF | jq '
  .containerDefinitions[0].environment += [
    {"name": "DYNAMODB_NOTIFICATIONS_TABLE", "value": "krishi-notifications"}
  ] |
  {
    family: .family,
    taskRoleArn: .taskRoleArn,
    executionRoleArn: .executionRoleArn,
    networkMode: .networkMode,
    containerDefinitions: .containerDefinitions,
    requiresCompatibilities: .requiresCompatibilities,
    cpu: .cpu,
    memory: .memory
  }
')

# Register new task definition
echo "📝 Registering new task definition..."
NEW_TASK_ARN=$(aws ecs register-task-definition \
  --cli-input-json "$NEW_TASK_DEF" \
  --region us-east-1 \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "✅ New task definition registered: $NEW_TASK_ARN"
echo ""

# Update service to use new task definition
echo "🚀 Updating ECS service..."
aws ecs update-service \
  --cluster krishi-era-cluster \
  --service krishi-backend-service \
  --task-definition krishi-era-backend \
  --force-new-deployment \
  --region us-east-1 > /dev/null

echo "✅ Service update initiated"
echo ""
echo "⏳ Waiting for service to stabilize..."

aws ecs wait services-stable \
  --cluster krishi-era-cluster \
  --services krishi-backend-service \
  --region us-east-1

echo "✅ Service is stable"
echo ""
echo "======================================"
echo "✅ Environment Variable Added!"
echo "======================================"
echo ""
echo "Added: DYNAMODB_NOTIFICATIONS_TABLE=krishi-notifications"
echo ""
echo "Test the notifications endpoint:"
echo "  curl https://d2ah0elagm6okv.cloudfront.net/api/notifications"
echo ""
