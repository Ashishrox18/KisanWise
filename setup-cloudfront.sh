#!/bin/bash

echo "🚀 Setting up CloudFront for HTTPS Backend Access"
echo "=================================================="
echo ""

# Create CloudFront distribution config
cat > /tmp/cloudfront-config.json << 'EOF'
{
  "CallerReference": "krishi-backend-TIMESTAMP",
  "Comment": "Krishi Era Backend HTTPS Proxy",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "krishi-alb",
      "DomainName": "krishi-era-alb-536422943.us-east-1.elb.amazonaws.com",
      "CustomOriginConfig": {
        "HTTPPort": 80,
        "HTTPSPort": 443,
        "OriginProtocolPolicy": "http-only"
      }
    }]
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
      "Cookies": {"Forward": "all"},
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
}
EOF

# Replace timestamp
sed -i.bak "s/TIMESTAMP/$(date +%s)/" /tmp/cloudfront-config.json

echo "📝 Creating CloudFront distribution..."
DISTRIBUTION=$(aws cloudfront create-distribution \
  --distribution-config file:///tmp/cloudfront-config.json \
  --region us-east-1 \
  --query 'Distribution.{Id:Id,DomainName:DomainName,Status:Status}' \
  --output json)

if [ $? -eq 0 ]; then
  echo "✅ CloudFront distribution created!"
  echo ""
  echo "$DISTRIBUTION" | jq .
  
  DOMAIN=$(echo "$DISTRIBUTION" | jq -r '.DomainName')
  
  echo ""
  echo "=================================================="
  echo "🎉 Setup Complete!"
  echo "=================================================="
  echo ""
  echo "Your HTTPS backend URL:"
  echo "https://$DOMAIN"
  echo ""
  echo "Next steps:"
  echo "1. Wait 5-10 minutes for CloudFront to deploy"
  echo "2. Test: curl https://$DOMAIN/health"
  echo "3. Update Amplify environment variable:"
  echo "   aws amplify update-app --app-id d3o65ri2eglx5a \\"
  echo "     --environment-variables VITE_API_BASE_URL=https://$DOMAIN/api \\"
  echo "     --region us-east-1"
  echo ""
  echo "4. Update backend CORS to include CloudFront domain"
  echo ""
else
  echo "❌ Failed to create CloudFront distribution"
  exit 1
fi

# Cleanup
rm /tmp/cloudfront-config.json /tmp/cloudfront-config.json.bak 2>/dev/null
