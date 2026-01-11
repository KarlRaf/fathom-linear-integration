# Testing Guide for Webapp-Based Validation

This guide walks you through testing the new webapp-based validation system.

## Prerequisites

1. **Environment Variables Set:**
   - `KV_REST_API_URL` and `KV_REST_API_TOKEN` (for Vercel KV)
   - `LINEAR_API_KEY` (for creating issues)
   - `OPENAI_API_KEY` (for AI extraction)
   - `FATHOM_WEBHOOK_SECRET` (for webhook verification)
   - Other required env vars (GitHub, etc.)

2. **Build the Project:**
   ```bash
   npm run build
   ```

## Testing Options

### Option 1: Test Locally with Express Server (Recommended for Backend Testing)

The Express server handles webhooks. You can test the webhook flow:

```bash
# Start the Express server
npm run dev
# or
npm start  # (after building)
```

The server will run on `http://localhost:3000` (or the PORT env var).

**Test Webhook:**
```bash
# Send a test webhook (you'll need to create a test script or use the existing test route)
curl -X POST http://localhost:3000/test/mock-webhook \
  -H "Content-Type: application/json" \
  -d @mock-webhook-payload.json
```

**Check Reviews:**
- Reviews should be stored in KV
- Check logs to see reviewId
- Review URL will be in the response: `/reviews/{reviewId}`

### Option 2: Test with Next.js (Recommended for UI Testing)

Since we have Next.js for the UI, you can test the full stack:

```bash
# In one terminal - start Next.js dev server
npx next dev

# In another terminal - start Express server (if needed for webhooks)
npm run dev
```

**Note:** Next.js and Express might conflict on the same port. You may need to:
- Run Express on port 3000
- Run Next.js on port 3001
- Or use Vercel's dev server which handles both

### Option 3: Test on Vercel (Recommended for Full Integration)

Deploy to Vercel and test the full integration:

```bash
# Deploy to Vercel
vercel --prod

# Or use Vercel dev for local testing with Vercel's infrastructure
vercel dev
```

## Testing Steps

### 1. Test Webhook Reception

Send a Fathom webhook (or use the test route):

```bash
# Using the test route (if in development mode)
curl -X POST http://localhost:3000/test/mock-webhook \
  -H "Content-Type: application/json" \
  -d @mock-webhook-payload.json
```

**Expected Result:**
- Response should include `reviewId` and `reviewUrl`
- Review should be stored in KV with status 'pending'
- Check server logs for confirmation

### 2. Test Reviews List Page

Navigate to: `http://localhost:3000/reviews` (or your deployment URL)

**Expected:**
- List of pending reviews
- Each review shows: title, timestamp, action items count, status
- Can filter by status
- Click on a review to see details

### 3. Test Review Detail Page

Navigate to: `http://localhost:3000/reviews/{reviewId}`

**Expected:**
- Full review details
- All action items displayed
- Linear issue previews
- Approve/Reject buttons
- Individual approve/reject buttons per issue
- Edit buttons for action items

### 4. Test Individual Issue Approval

1. Open a review detail page
2. Click "✅ Approve" on an individual issue
3. Check that the issue shows "✅ Approved" status
4. Review status should change to "partially-approved" if not all are approved

### 5. Test Action Item Editing

1. Open a review detail page
2. Click "✏️ Edit" on an action item
3. Modify the title, description, assignee, priority, or due date
4. Click "Save"
5. Check that changes are saved and "Has edits" indicator appears

### 6. Test Finalize Review

1. Approve some (but not all) issues individually
2. Click "Finalize & Create X Issue(s)" button
3. Check that Linear issues are created for approved items only
4. Review status should change to "approved"
5. Check Linear workspace to verify issues were created

### 7. Test Approve All

1. Open a review detail page
2. Click "Approve All & Create Issues"
3. Check that all Linear issues are created
4. Review status should change to "approved"
5. Check Linear workspace to verify all issues were created

### 8. Test Reject

1. Open a review detail page
2. Click "Reject" (individual or all)
3. Review status should change to "rejected"
4. No Linear issues should be created

## API Testing (Manual)

You can also test the API routes directly:

### List Reviews
```bash
curl http://localhost:3000/api/reviews
```

### Get Review Details
```bash
curl http://localhost:3000/api/reviews/{reviewId}
```

### Approve Individual Issue
```bash
curl -X POST http://localhost:3000/api/reviews/{reviewId}/issues/0/approve
```

### Reject Individual Issue
```bash
curl -X POST http://localhost:3000/api/reviews/{reviewId}/issues/0/reject
```

### Update Action Item
```bash
curl -X PUT http://localhost:3000/api/reviews/{reviewId}/action-items/0 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "priority": "high"}'
```

### Finalize Review
```bash
curl -X POST http://localhost:3000/api/reviews/{reviewId}/finalize
```

### Approve All
```bash
curl -X POST http://localhost:3000/api/reviews/{reviewId}/approve
```

## Troubleshooting

### Issue: Reviews not appearing
- Check KV connection (verify env vars)
- Check server logs for errors
- Verify webhook was received successfully
- Check KV storage directly (if you have access)

### Issue: Linear issues not created
- Verify LINEAR_API_KEY is set
- Check API route logs for errors
- Verify Linear API key has proper permissions
- Check that issues are actually approved before finalizing

### Issue: Next.js and Express conflict
- Use `vercel dev` which handles both
- Or run Express on one port and Next.js on another
- Or deploy to Vercel and test there

### Issue: TypeScript errors
- Run `npm run build` to check for compilation errors
- Check that all dependencies are installed
- Verify tsconfig files are correct

## Next Steps After Testing

1. Verify all features work as expected
2. Test error handling (invalid reviewId, network errors, etc.)
3. Test with real Fathom webhooks
4. Verify Linear issue creation works correctly
5. Check that edited action items are properly handled
6. Test partial approvals and finalization
