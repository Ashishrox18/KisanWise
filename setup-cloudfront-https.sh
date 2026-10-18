#!/bin/bash

echo "☁️  Alternative Approach: CloudFront HTTPS Proxy"
echo "================================================"
echo ""
echo "This approach uses CloudFront as an HTTPS proxy in front of your ALB."
echo "Benefits:"
echo "  - Immediate HTTPS (uses CloudFront's default certificate)"
echo "  - No waiting for DNS validation"
echo "  - Can add custom domain later"
echo "  - Includes CDN caching benefits"
echo ""

ALB_DNS="krishi-era-alb-536422943.us-east-1.elb.amazonaws.com"

# Create CloudFront distribution
echo "📋 Creating CloudFront distribution..."
echo "   This may take 5-10 minutes to deploy..."
echo ""

DISTRIBUTION_CONFIG='{
  "CallerReference": "'$(date +%s)'",
  "Comment": "Krishi Era Backend HTTPS Proxy",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "krishi-alb",
        "DomainName": "'$ALB_DNS'",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "krishi-alb",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {
        "Forward": "all"
      },
      "Headers": {
        "Quantity": 4,
        "Items": ["Authorization", "Content-Type", "Accept", "Origin"]
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 0,
    "MaxTTL": 0,
    "Compress": true,
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    }
  },
  "PriceClass": "PriceClass_100"
}'

# Create distribution
DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config "$DISTRIBUTION_CONFIG" \
  --query 'Distribution.Id' \
  --output text 2>&1)

if [[ $DISTRIBUTION_ID == *"error"* ]] || [[ $DISTRIBUTION_ID == *"Error"* ]]; then
  echo "❌ Failed to create CloudFront distribution"
  echo "$DISTRIBUTION_ID"
  exit 1
fi

echo "✅ CloudFront distribution created: $DISTRIBUTION_ID"
echo ""

# Get CloudFront domain
CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id $DISTRIBUTION_ID \
  --query 'Distribution.DomainName' \
  --output text)

echo "⏳ Waiting for distribution to deploy (this takes 5-10 minutes)..."
echo "   CloudFront Domain: $CLOUDFRONT_DOMAIN"
echo ""

# Wait for deployment
aws cloudfront wait distribution-deployed --id $DISTRIBUTION_ID

echo "✅ CloudFront distribution deployed!"
echo ""
echo "======================================"
echo "✅ HTTPS Setup Complete (via CloudFront)"
echo "======================================"
echo ""
echo "Your API is now accessible via HTTPS:"
echo "  https://$CLOUDFRONT_DOMAIN/api/auth/login"
echo "  https://$CLOUDFRONT_DOMAIN/health"
echo ""
echo "Update Amplify environment variable:"
echo "  VITE_API_BASE_URL=https://$CLOUDFRONT_DOMAIN/api"
echo ""
echo "Commands:"
echo "  aws amplify update-app \\"
echo "    --app-id d3o65ri2eglx5a \\"
echo "    --environment-variables VITE_API_BASE_URL=https://$CLOUDFRONT_DOMAIN/api \\"
echo "    --region us-east-1"
echo ""
echo "  aws amplify start-job \\"
echo "    --app-id d3o65ri2eglx5a \\"
echo "    --branch-name feature/deployment \\"
echo "    --job-type RELEASE \\"
echo "    --region us-east-1"
echo ""
echo "Note: You can add a custom domain to CloudFront later once your"
echo "      SSL certificate is validated."
echo ""
echo "Cost: ~$1-2/month (minimal with low traffic)"
echo ""
