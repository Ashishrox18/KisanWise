#!/bin/bash

echo "🔍 Checking SSL Certificate Status..."
echo "======================================"
echo ""

CERT_ARN="arn:aws:acm:us-east-1:120569622669:certificate/3cacc7aa-aabf-4204-9207-5cf8852da907"
ALB_ARN="arn:aws:elasticloadbalancing:us-east-1:120569622669:loadbalancer/app/krishi-era-alb/d53e5e4b83f0c5f3"
TARGET_GROUP_ARN="arn:aws:elasticloadbalancing:us-east-1:120569622669:targetgroup/krishi-backend-tg/8237f1c017c88936"

# Check certificate status
STATUS=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text)

echo "Certificate Status: $STATUS"
echo ""

if [ "$STATUS" != "ISSUED" ]; then
  echo "⏳ Certificate is still validating..."
  echo ""
  echo "This typically takes 5-30 minutes. The DNS validation record is properly configured."
  echo ""
  echo "Run this script again in a few minutes, or use:"
  echo "  watch -n 30 './check-cert-and-deploy.sh'"
  echo ""
  exit 0
fi

echo "✅ Certificate is ISSUED!"
echo ""

# Check if HTTPS listener already exists
echo "🔍 Checking for existing HTTPS listener..."
EXISTING_LISTENER=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region us-east-1 \
  --query "Listeners[?Protocol=='HTTPS'].ListenerArn" \
  --output text 2>/dev/null)

if [ -n "$EXISTING_LISTENER" ]; then
  echo "✅ HTTPS listener already exists: $EXISTING_LISTENER"
  echo ""
else
  echo "📋 Creating HTTPS listener on port 443..."
  
  LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
    --region us-east-1 \
    --query 'Listeners[0].ListenerArn' \
    --output text)
  
  echo "✅ HTTPS listener created: $LISTENER_ARN"
  echo ""
fi

echo "======================================"
echo "✅ HTTPS Setup Complete!"
echo "======================================"
echo ""
echo "Your API is now accessible via HTTPS:"
echo "  https://api.krishiai.in/health"
echo ""
echo "Next steps:"
echo ""
echo "1. Update backend CORS (add https://krishiai.in and https://www.krishiai.in)"
echo "   Run: ./update-backend-cors.sh"
echo ""
echo "2. Update Amplify environment variable:"
echo "   aws amplify update-app \\"
echo "     --app-id d3o65ri2eglx5a \\"
echo "     --environment-variables VITE_API_BASE_URL=https://api.krishiai.in/api \\"
echo "     --region us-east-1"
echo ""
echo "3. Add custom domain to Amplify (in console):"
echo "   https://console.aws.amazon.com/amplify/home?region=us-east-1#/d3o65ri2eglx5a"
echo ""
echo "4. Test the API:"
echo "   curl https://api.krishiai.in/health"
echo ""
