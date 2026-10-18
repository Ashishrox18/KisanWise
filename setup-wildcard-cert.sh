#!/bin/bash

echo "🔒 Alternative Approach: Wildcard SSL Certificate"
echo "=================================================="
echo ""
echo "This will request a wildcard certificate for *.krishiai.in"
echo "which covers api.krishiai.in and any other subdomains."
echo ""

DOMAIN="krishiai.in"
WILDCARD_DOMAIN="*.krishiai.in"
HOSTED_ZONE_ID="Z00113231Y82SSVG01924"
ALB_ARN="arn:aws:elasticloadbalancing:us-east-1:120569622669:loadbalancer/app/krishi-era-alb/d53e5e4b83f0c5f3"
TARGET_GROUP_ARN="arn:aws:elasticloadbalancing:us-east-1:120569622669:targetgroup/krishi-backend-tg/8237f1c017c88936"

# Check if wildcard certificate already exists
echo "🔍 Checking for existing wildcard certificate..."
EXISTING_WILDCARD=$(aws acm list-certificates \
  --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='$WILDCARD_DOMAIN'].CertificateArn" \
  --output text 2>/dev/null)

if [ -n "$EXISTING_WILDCARD" ]; then
  echo "✅ Found existing wildcard certificate: $EXISTING_WILDCARD"
  CERT_ARN="$EXISTING_WILDCARD"
  
  # Check status
  STATUS=$(aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region us-east-1 \
    --query 'Certificate.Status' \
    --output text)
  
  echo "   Status: $STATUS"
  
  if [ "$STATUS" == "ISSUED" ]; then
    echo ""
    echo "✅ Certificate is already validated!"
    echo ""
    echo "Proceeding to configure HTTPS listener..."
    
    # Check if HTTPS listener exists
    EXISTING_LISTENER=$(aws elbv2 describe-listeners \
      --load-balancer-arn $ALB_ARN \
      --region us-east-1 \
      --query "Listeners[?Protocol=='HTTPS'].ListenerArn" \
      --output text 2>/dev/null)
    
    if [ -n "$EXISTING_LISTENER" ]; then
      echo "✅ HTTPS listener already exists"
    else
      echo "📋 Creating HTTPS listener..."
      aws elbv2 create-listener \
        --load-balancer-arn $ALB_ARN \
        --protocol HTTPS \
        --port 443 \
        --certificates CertificateArn=$CERT_ARN \
        --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
        --region us-east-1 > /dev/null
      
      echo "✅ HTTPS listener created"
    fi
    
    echo ""
    echo "✅ Setup complete! You can now:"
    echo "   1. Run: ./update-backend-cors.sh"
    echo "   2. Update Amplify API URL to: https://api.krishiai.in/api"
    echo ""
    exit 0
  fi
else
  echo "📋 Requesting new wildcard certificate..."
  
  # Request wildcard certificate with both wildcard and apex domain
  CERT_ARN=$(aws acm request-certificate \
    --domain-name $WILDCARD_DOMAIN \
    --subject-alternative-names $DOMAIN \
    --validation-method DNS \
    --region us-east-1 \
    --query 'CertificateArn' \
    --output text)
  
  echo "✅ Wildcard certificate requested: $CERT_ARN"
  echo "⏳ Waiting for validation records..."
  sleep 10
fi

# Get validation records
echo ""
echo "📝 Getting DNS validation records..."

VALIDATION_JSON=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions' \
  --output json)

echo "$VALIDATION_JSON" | jq -r '.[] | "Domain: \(.DomainName)\nName: \(.ResourceRecord.Name)\nValue: \(.ResourceRecord.Value)\n"'

# Add validation records to Route 53
echo "📝 Adding validation records to Route 53..."

# Extract unique validation records (wildcard and apex might share the same record)
UNIQUE_RECORDS=$(echo "$VALIDATION_JSON" | jq -r '[.[] | .ResourceRecord] | unique | .[]')

echo "$VALIDATION_JSON" | jq -c '.[] | .ResourceRecord' | while read -r record; do
  NAME=$(echo "$record" | jq -r '.Name')
  VALUE=$(echo "$record" | jq -r '.Value')
  
  if [ "$NAME" != "null" ]; then
    echo "   Adding: $NAME"
    
    aws route53 change-resource-record-sets \
      --hosted-zone-id $HOSTED_ZONE_ID \
      --change-batch '{
        "Changes": [{
          "Action": "UPSERT",
          "ResourceRecordSet": {
            "Name": "'$NAME'",
            "Type": "CNAME",
            "TTL": 300,
            "ResourceRecords": [{"Value": "'$VALUE'"}]
          }
        }]
      }' > /dev/null 2>&1
  fi
done

echo "✅ Validation records added"
echo ""
echo "⏳ Waiting for certificate validation..."
echo "   This typically takes 5-30 minutes"
echo ""

# Wait for validation with progress indicator
for i in {1..60}; do
  STATUS=$(aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region us-east-1 \
    --query 'Certificate.Status' \
    --output text)
  
  if [ "$STATUS" == "ISSUED" ]; then
    echo ""
    echo "✅ Certificate validated and issued!"
    break
  fi
  
  echo "   [$i/60] Status: $STATUS (checking every 30 seconds...)"
  sleep 30
done

if [ "$STATUS" != "ISSUED" ]; then
  echo ""
  echo "⚠️  Certificate validation is taking longer than expected."
  echo ""
  echo "The certificate ARN is: $CERT_ARN"
  echo ""
  echo "Check status with:"
  echo "  aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1"
  echo ""
  echo "Once validated, run: ./check-cert-and-deploy.sh"
  exit 0
fi

# Create HTTPS listener
echo ""
echo "🔧 Configuring HTTPS on load balancer..."

EXISTING_LISTENER=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region us-east-1 \
  --query "Listeners[?Protocol=='HTTPS'].ListenerArn" \
  --output text 2>/dev/null)

if [ -n "$EXISTING_LISTENER" ]; then
  echo "✅ HTTPS listener already exists"
else
  echo "📋 Creating HTTPS listener..."
  aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
    --region us-east-1 > /dev/null
  
  echo "✅ HTTPS listener created"
fi

echo ""
echo "======================================"
echo "✅ Wildcard Certificate Setup Complete!"
echo "======================================"
echo ""
echo "Certificate ARN: $CERT_ARN"
echo "Covers: *.krishiai.in and krishiai.in"
echo ""
echo "Your API is now accessible via HTTPS:"
echo "  https://api.krishiai.in/health"
echo ""
echo "Next steps:"
echo "1. Run: ./update-backend-cors.sh"
echo "2. Update Amplify API URL to: https://api.krishiai.in/api"
echo "3. Add custom domain in Amplify console"
echo ""
