#!/bin/bash

echo "🔍 Monitoring SSL Certificate Validation"
echo "========================================"
echo ""
echo "Certificate: api.krishiai.in"
echo "Press Ctrl+C to stop"
echo ""

CERT_ARN="arn:aws:acm:us-east-1:120569622669:certificate/3cacc7aa-aabf-4204-9207-5cf8852da907"

while true; do
  STATUS=$(aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region us-east-1 \
    --query 'Certificate.Status' \
    --output text 2>/dev/null)
  
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  
  if [ "$STATUS" == "ISSUED" ]; then
    echo "[$TIMESTAMP] ✅ Certificate Status: $STATUS"
    echo ""
    echo "🎉 Certificate is validated!"
    echo ""
    echo "Run the next step:"
    echo "  ./check-cert-and-deploy.sh"
    echo ""
    break
  else
    echo "[$TIMESTAMP] ⏳ Certificate Status: $STATUS (waiting for DNS propagation...)"
  fi
  
  sleep 30
done
