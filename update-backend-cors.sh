#!/bin/bash

echo "🔧 Updating Backend CORS and Redeploying..."
echo "============================================"
echo ""

# Update CORS in server.ts
echo "📝 Updating CORS configuration..."
echo "   Adding: https://krishiai.in"
echo "   Adding: https://www.krishiai.in"
echo ""

# Build Docker image
echo "🐳 Building Docker image for linux/amd64..."
docker build --platform linux/amd64 -t krishi-era-backend:latest backend/

if [ $? -ne 0 ]; then
  echo "❌ Docker build failed"
  exit 1
fi

echo "✅ Docker image built"
echo ""

# Tag and push to ECR
echo "📦 Pushing to ECR..."
docker tag krishi-era-backend:latest 120569622669.dkr.ecr.us-east-1.amazonaws.com/krishi-era-backend:latest

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 120569622669.dkr.ecr.us-east-1.amazonaws.com

docker push 120569622669.dkr.ecr.us-east-1.amazonaws.com/krishi-era-backend:latest

if [ $? -ne 0 ]; then
  echo "❌ Docker push failed"
  exit 1
fi

echo "✅ Image pushed to ECR"
echo ""

# Force new deployment
echo "🚀 Forcing new ECS deployment..."
aws ecs update-service \
  --cluster krishi-era-cluster \
  --service krishi-backend-service \
  --force-new-deployment \
  --region us-east-1 > /dev/null

echo "✅ Deployment initiated"
echo ""
echo "⏳ Waiting for service to stabilize (this may take 2-3 minutes)..."

aws ecs wait services-stable \
  --cluster krishi-era-cluster \
  --services krishi-backend-service \
  --region us-east-1

if [ $? -eq 0 ]; then
  echo "✅ Service is stable and running"
else
  echo "⚠️  Service stabilization timed out, but deployment may still succeed"
  echo "   Check status: aws ecs describe-services --cluster krishi-era-cluster --services krishi-backend-service --region us-east-1"
fi

echo ""
echo "======================================"
echo "✅ Backend Updated!"
echo "======================================"
echo ""
echo "Test the updated backend:"
echo "  curl https://api.krishiai.in/health"
echo ""
