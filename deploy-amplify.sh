#!/bin/bash

echo "🚀 AWS Amplify Deployment Guide"
echo "================================"
echo ""
echo "Since this is the first deployment, please follow these steps:"
echo ""
echo "1. Open AWS Amplify Console:"
echo "   https://console.aws.amazon.com/amplify/home?region=us-east-1"
echo ""
echo "2. Click 'New app' → 'Host web app'"
echo ""
echo "3. Choose 'GitHub' and authorize AWS Amplify"
echo ""
echo "4. Select repository: Ashishrox18/Krishi_Era"
echo ""
echo "5. Select branch: feature/deployment (or main)"
echo ""
echo "6. Amplify will auto-detect the build settings from amplify.yml"
echo ""
echo "7. Add environment variable:"
echo "   Key: VITE_API_BASE_URL"
echo "   Value: http://krishi-era-alb-536422943.us-east-1.elb.amazonaws.com/api"
echo ""
echo "8. Click 'Save and deploy'"
echo ""
echo "9. Wait for deployment to complete (~5-10 minutes)"
echo ""
echo "Your app will be available at:"
echo "https://[branch-name].[app-id].amplifyapp.com"
echo ""
echo "================================"
echo ""
echo "After first deployment, you can use this script to trigger rebuilds:"
echo ""

# Check if app exists
APP_ID=$(aws amplify list-apps --region us-east-1 --query "apps[?name=='krishi-era'].appId" --output text 2>/dev/null)

if [ -z "$APP_ID" ]; then
    echo "❌ No Amplify app found. Please complete the manual setup first."
    exit 1
fi

echo "✅ Found Amplify app: $APP_ID"
echo ""
echo "Triggering new deployment..."

# Get the branch name
BRANCH_NAME=$(git branch --show-current)

# Start a new build
aws amplify start-job \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH_NAME" \
    --job-type RELEASE \
    --region us-east-1

echo ""
echo "✅ Deployment triggered!"
echo "Monitor progress at:"
echo "https://console.aws.amazon.com/amplify/home?region=us-east-1#/$APP_ID"
