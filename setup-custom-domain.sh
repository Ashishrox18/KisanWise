#!/bin/bash

echo "🌐 Custom Domain Setup for Krishi Era"
echo "======================================"
echo ""

# Check if domain name is provided
if [ -z "$1" ]; then
  echo "Usage: ./setup-custom-domain.sh <your-domain.com>"
  echo ""
  echo "Example: ./setup-custom-domain.sh krishiera.com"
  echo ""
  echo "This script will:"
  echo "1. Check if domain is available (if not registered)"
  echo "2. Create/verify hosted zone in Route 53"
  echo "3. Request SSL certificate for API subdomain"
  echo "4. Configure DNS records"
  echo "5. Set up HTTPS on load balancer"
  echo ""
  exit 1
fi

DOMAIN="$1"
API_SUBDOMAIN="api.$DOMAIN"
ALB_ARN="arn:aws:elasticloadbalancing:us-east-1:120569622669:loadbalancer/app/krishi-era-alb/d53e5e4b83f0c5f3"
TARGET_GROUP_ARN="arn:aws:elasticloadbalancing:us-east-1:120569622669:targetgroup/krishi-backend-tg/8237f1c017c88936"
ALB_DNS="krishi-era-alb-536422943.us-east-1.elb.amazonaws.com"
ALB_ZONE_ID="Z35SXDOTRQ7X7K"  # us-east-1 ALB zone ID

echo "Domain: $DOMAIN"
echo "API Subdomain: $API_SUBDOMAIN"
echo ""

# Step 1: Check if domain is available
echo "📋 Step 1: Checking domain availability..."
AVAILABILITY=$(aws route53domains check-domain-availability \
  --domain-name $DOMAIN \
  --region us-east-1 \
  --query 'Availability' \
  --output text 2>/dev/null)

if [ "$AVAILABILITY" == "AVAILABLE" ]; then
  echo "✅ Domain is available for registration!"
  echo ""
  echo "To register this domain via Route 53:"
  echo "1. Go to: https://console.aws.amazon.com/route53/home#DomainRegistration:"
  echo "2. Search for: $DOMAIN"
  echo "3. Complete registration (~\$12/year)"
  echo ""
  read -p "Have you registered the domain? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please register the domain first, then run this script again."
    exit 1
  fi
elif [ "$AVAILABILITY" == "UNAVAILABLE" ]; then
  echo "ℹ️  Domain is already registered (possibly by you)"
else
  echo "⚠️  Could not check availability. Assuming domain exists."
fi

# Step 2: Check/Create hosted zone
echo ""
echo "📋 Step 2: Setting up hosted zone..."
ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='$DOMAIN.'].Id" \
  --output text 2>/dev/null | cut -d'/' -f3)

if [ -z "$ZONE_ID" ]; then
  echo "Creating hosted zone for $DOMAIN..."
  ZONE_ID=$(aws route53 create-hosted-zone \
    --name $DOMAIN \
    --caller-reference $(date +%s) \
    --query 'HostedZone.Id' \
    --output text | cut -d'/' -f3)
  
  echo "✅ Hosted zone created: $ZONE_ID"
  
  # Get nameservers
  echo ""
  echo "📝 Nameservers for your domain:"
  aws route53 get-hosted-zone --id $ZONE_ID \
    --query 'DelegationSet.NameServers' \
    --output table
  
  echo ""
  echo "⚠️  IMPORTANT: Update your domain's nameservers to the above values"
  echo "   (at your domain registrar's website)"
  echo ""
  read -p "Press enter when nameservers are updated..."
else
  echo "✅ Found existing hosted zone: $ZONE_ID"
fi

# Step 3: Request SSL certificate
echo ""
echo "🔒 Step 3: Requesting SSL certificate for $API_SUBDOMAIN..."

# Check if certificate already exists
EXISTING_CERT=$(aws acm list-certificates \
  --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='$API_SUBDOMAIN'].CertificateArn" \
  --output text 2>/dev/null)

if [ -n "$EXISTING_CERT" ]; then
  echo "✅ Found existing certificate: $EXISTING_CERT"
  CERT_ARN="$EXISTING_CERT"
else
  CERT_ARN=$(aws acm request-certificate \
    --domain-name $API_SUBDOMAIN \
    --validation-method DNS \
    --region us-east-1 \
    --query 'CertificateArn' \
    --output text)
  
  echo "✅ Certificate requested: $CERT_ARN"
  echo "⏳ Waiting for validation records..."
  sleep 10
fi

# Step 4: Get and add validation record
echo ""
echo "📝 Step 4: Adding DNS validation record..."

VALIDATION=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json)

VALIDATION_NAME=$(echo $VALIDATION | jq -r '.Name')
VALIDATION_VALUE=$(echo $VALIDATION | jq -r '.Value')

if [ "$VALIDATION_NAME" != "null" ]; then
  echo "Adding validation record:"
  echo "  Name: $VALIDATION_NAME"
  echo "  Value: $VALIDATION_VALUE"
  
  aws route53 change-resource-record-sets \
    --hosted-zone-id $ZONE_ID \
    --change-batch '{
      "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "'$VALIDATION_NAME'",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [{"Value": "'$VALIDATION_VALUE'"}]
        }
      }]
    }' > /dev/null 2>&1
  
  echo "✅ Validation record added"
  echo "⏳ Waiting for certificate validation (this may take 5-10 minutes)..."
  
  # Wait for validation
  for i in {1..30}; do
    STATUS=$(aws acm describe-certificate \
      --certificate-arn $CERT_ARN \
      --region us-east-1 \
      --query 'Certificate.Status' \
      --output text)
    
    if [ "$STATUS" == "ISSUED" ]; then
      echo "✅ Certificate validated and issued!"
      break
    fi
    
    echo "   Waiting... ($i/30)"
    sleep 20
  done
  
  if [ "$STATUS" != "ISSUED" ]; then
    echo "⚠️  Certificate validation is taking longer than expected."
    echo "   Check status with: aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1"
    echo "   Continue once validated."
    read -p "Press enter to continue..."
  fi
else
  echo "✅ Certificate already validated"
fi

# Step 5: Add HTTPS listener to ALB
echo ""
echo "🔧 Step 5: Configuring HTTPS on load balancer..."

# Check if HTTPS listener exists
EXISTING_LISTENER=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region us-east-1 \
  --query "Listeners[?Protocol=='HTTPS'].ListenerArn" \
  --output text 2>/dev/null)

if [ -n "$EXISTING_LISTENER" ]; then
  echo "✅ HTTPS listener already exists: $EXISTING_LISTENER"
else
  echo "Creating HTTPS listener..."
  aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
    --region us-east-1 > /dev/null
  
  echo "✅ HTTPS listener created"
fi

# Step 6: Create DNS record for API
echo ""
echo "🌐 Step 6: Creating DNS record for $API_SUBDOMAIN..."

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "'$API_SUBDOMAIN'",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'$ALB_ZONE_ID'",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }' > /dev/null

echo "✅ DNS record created for $API_SUBDOMAIN"

# Step 7: Update backend CORS
echo ""
echo "🔧 Step 7: Updating backend CORS configuration..."
echo ""
echo "Add these domains to backend/src/server.ts CORS config:"
echo "  - https://$DOMAIN"
echo "  - https://www.$DOMAIN"
echo ""
echo "Then redeploy backend with: ./backend/deploy-ecs.sh"
echo ""

# Step 8: Update Amplify
echo "📱 Step 8: Updating frontend configuration..."
echo ""
echo "Run these commands:"
echo ""
echo "# Update API URL"
echo "aws amplify update-app \\"
echo "  --app-id d3o65ri2eglx5a \\"
echo "  --environment-variables VITE_API_BASE_URL=https://$API_SUBDOMAIN/api \\"
echo "  --region us-east-1"
echo ""
echo "# Add custom domain to Amplify (do this in console)"
echo "1. Go to: https://console.aws.amazon.com/amplify/home?region=us-east-1#/d3o65ri2eglx5a"
echo "2. App settings → Domain management → Add domain"
echo "3. Enter: $DOMAIN"
echo "4. Follow the instructions to add DNS records"
echo ""

# Summary
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "Your domains:"
echo "  Frontend: https://$DOMAIN (configure in Amplify)"
echo "  Backend API: https://$API_SUBDOMAIN"
echo ""
echo "Test your API:"
echo "  curl https://$API_SUBDOMAIN/health"
echo ""
echo "Next steps:"
echo "1. Update backend CORS and redeploy"
echo "2. Update Amplify API URL"
echo "3. Add custom domain in Amplify console"
echo "4. Wait for DNS propagation (5-30 minutes)"
echo "5. Test your application!"
echo ""
