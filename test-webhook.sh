#!/bin/bash

# Script to test the webhook with mock data
# Usage: ./test-webhook.sh

# Check if server is running
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "❌ Server is not running on port 3000"
    echo "Please start the server first: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""
echo "Sending mock webhook payload..."
echo ""

# Send the mock payload
curl -X POST http://localhost:3000/test/mock-webhook \
  -H "Content-Type: application/json" \
  -d @mock-webhook-payload.json

echo ""
echo ""
echo "Check your terminal logs and Slack channel for results!"

