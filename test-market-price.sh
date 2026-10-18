#!/bin/bash

# Test Market Price API Endpoint
# This script tests the market price endpoint with a valid token

echo "🧪 Testing Market Price API..."
echo ""

# Get token from localStorage (you'll need to replace this with an actual token)
# For now, we'll test without auth to see the response
echo "📡 Testing endpoint: GET /api/farmer/market-prices?product=Wheat"
echo ""

# Test 1: Fetch price for Wheat
echo "Test 1: Fetching price for Wheat..."
curl -X GET "http://localhost:3000/api/farmer/market-prices?product=Wheat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "---"
echo ""

# Test 2: Fetch prices for all crops
echo "Test 2: Fetching prices for all crops..."
curl -X GET "http://localhost:3000/api/farmer/market-prices" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "---"
echo ""

# Test 3: Fetch price with state filter
echo "Test 3: Fetching price for Rice in Punjab..."
curl -X GET "http://localhost:3000/api/farmer/market-prices?product=Rice&state=Punjab" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Tests complete!"
echo ""
echo "Note: Replace YOUR_TOKEN_HERE with a valid JWT token from localStorage"
echo "You can get this by:"
echo "1. Login to the app"
echo "2. Open browser console (F12)"
echo "3. Run: localStorage.getItem('token')"
echo "4. Copy the token and replace YOUR_TOKEN_HERE in this script"
