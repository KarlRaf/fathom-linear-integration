#!/bin/bash
# Quick script to test webhook and get review URL

echo "📤 Sending test webhook..."
RESPONSE=$(curl -s -X POST http://localhost:3000/test/mock-webhook \
  -H 'Content-Type: application/json' \
  -d @mock-webhook-payload.json)

echo ""
echo "📥 Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
REVIEW_ID=$(echo "$RESPONSE" | grep -o '"reviewId":"[^"]*"' | cut -d'"' -f4)
if [ -n "$REVIEW_ID" ]; then
  echo "✅ Review created!"
  echo "📋 Review ID: $REVIEW_ID"
  echo "🔗 Review URL: http://localhost:3000/reviews/$REVIEW_ID"
  echo ""
  echo "Open in browser:"
  echo "  open http://localhost:3000/reviews/$REVIEW_ID"
else
  echo "⚠️  Could not extract reviewId from response"
fi
