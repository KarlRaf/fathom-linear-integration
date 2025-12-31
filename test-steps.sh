#!/bin/bash

# Script to test each step individually
# Usage: ./test-steps.sh [step]
# Steps: github, extract, slack, linear, all

STEP=${1:-all}
BASE_URL="http://localhost:3000/test"
PAYLOAD_FILE="mock-webhook-payload.json"

# Check if server is running
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "❌ Server is not running on port 3000"
    echo "Please start the server first: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

case $STEP in
  github)
    echo "📝 Step 1: Testing GitHub Logging..."
    echo ""
    curl -X POST $BASE_URL/test-github \
      -H "Content-Type: application/json" \
      -d @$PAYLOAD_FILE | jq .
    ;;
  
  extract)
    echo "🤖 Step 2: Testing Action Items Extraction..."
    echo ""
    curl -X POST $BASE_URL/test-extract \
      -H "Content-Type: application/json" \
      -d @$PAYLOAD_FILE | jq .
    ;;
  
  slack)
    echo "💬 Step 3: Testing Slack Review..."
    echo ""
    curl -X POST $BASE_URL/test-slack \
      -H "Content-Type: application/json" \
      -d @$PAYLOAD_FILE | jq .
    ;;
  
  linear)
    echo "📋 Step 4: Testing Linear Issue Creation..."
    echo ""
    curl -X POST $BASE_URL/test-linear \
      -H "Content-Type: application/json" \
      -d @$PAYLOAD_FILE | jq .
    ;;
  
  all)
    echo "🚀 Testing all steps in sequence..."
    echo ""
    
    echo "📝 Step 1: GitHub Logging"
    curl -X POST $BASE_URL/test-github \
      -H "Content-Type: application/json" \
      -d @$PAYLOAD_FILE | jq .
    echo ""
    echo "Press Enter to continue to next step..."
    read
    
    echo "🤖 Step 2: Action Items Extraction"
    curl -X POST $BASE_URL/test-extract \
      -H "Content-Type: application/json" \
      -d @$PAYLOAD_FILE | jq .
    echo ""
    echo "Press Enter to continue to next step..."
    read
    
    echo "💬 Step 3: Slack Review"
    curl -X POST $BASE_URL/test-slack \
      -H "Content-Type: application/json" \
      -d @$PAYLOAD_FILE | jq .
    echo ""
    echo "Press Enter to continue to next step..."
    read
    
    echo "📋 Step 4: Linear Issue Creation"
    curl -X POST $BASE_URL/test-linear \
      -H "Content-Type: application/json" \
      -d @$PAYLOAD_FILE | jq .
    ;;
  
  *)
    echo "Usage: $0 [step]"
    echo "Steps: github, extract, slack, linear, all"
    exit 1
    ;;
esac

echo ""
echo "✅ Test complete!"

